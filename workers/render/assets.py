"""Per-scene asset generation: narration WAV (Piper TTS) + background image card (Pillow)."""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

_VENDOR = Path(__file__).resolve().parent / "vendor" / "openmontage"
if _VENDOR.exists() and str(_VENDOR) not in sys.path:
    sys.path.insert(0, str(_VENDOR))


DEFAULT_VOICE = os.environ.get("PLOTCUT_PIPER_MODEL", "en_US-lessac-medium")
DEFAULT_SIZE = (1080, 1920)  # 9:16 portrait


def _piper_available() -> bool:
    return shutil.which("piper") is not None


def synthesize_narration(text: str, out_path: Path, voice: str | None = None) -> Path:
    """Run Piper TTS via OpenMontage's wrapper if vendored, else shell out to `piper` directly.

    Falls back to a silent WAV if Piper isn't installed so the pipeline still produces an MP4.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    model = voice or DEFAULT_VOICE

    try:
        from tools.audio.piper_tts import PiperTTS  # OpenMontage
    except ImportError:
        PiperTTS = None  # type: ignore

    if PiperTTS is not None and _piper_available():
        result = PiperTTS().execute({
            "text": text,
            "model": model,
            "output_path": str(out_path),
        })
        if result.success and out_path.exists():
            return out_path

    if _piper_available():
        proc = subprocess.run(
            ["piper", "--model", model, "--output_file", str(out_path)],
            input=text, capture_output=True, text=True, timeout=300,
        )
        if proc.returncode == 0 and out_path.exists():
            return out_path

    _silent_wav(out_path, seconds=max(2.0, len(text.split()) / 3.0))
    return out_path


def _silent_wav(out_path: Path, seconds: float) -> None:
    """Generate a silent WAV as a last-resort fallback."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"anullsrc=channel_layout=mono:sample_rate=22050",
            "-t", f"{seconds:.2f}", str(out_path),
        ],
        capture_output=True, check=False,
    )


_PALETTES = [
    ((20, 24, 82), (96, 62, 196)),
    ((12, 54, 74), (34, 193, 195)),
    ((82, 12, 44), (252, 74, 116)),
    ((30, 30, 30), (120, 88, 40)),
    ((8, 32, 16), (76, 175, 80)),
    ((40, 10, 60), (200, 100, 220)),
]


def _palette_for(seed: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    h = int(hashlib.sha1(seed.encode("utf-8")).hexdigest(), 16)
    return _PALETTES[h % len(_PALETTES)]


def _gradient(size: tuple[int, int], top: tuple[int, int, int], bot: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", (w, h), top)
    pixels = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(w):
            pixels[x, y] = (r, g, b)
    return img


def _load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVu-Sans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def render_scene_card(
    caption: str,
    visual_prompt: str,
    out_path: Path,
    size: tuple[int, int] = DEFAULT_SIZE,
    scene_number: int | None = None,
) -> Path:
    """Render a 9:16 card: gradient background + wrapped caption text + subtle scene number."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    top, bot = _palette_for(visual_prompt or caption)
    img = _gradient(size, top, bot)
    draw = ImageDraw.Draw(img)

    w, h = size
    title_font = _load_font(72)
    num_font = _load_font(36)

    wrapped = textwrap.fill(caption or "", width=18)
    _, _, tw, th = draw.multiline_textbbox((0, 0), wrapped, font=title_font, spacing=16)
    tx = (w - tw) // 2
    ty = (h - th) // 2
    draw.multiline_textbbox  # type: ignore
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        draw.multiline_text((tx + dx, ty + dy), wrapped, font=title_font,
                            fill=(0, 0, 0), align="center", spacing=16)
    draw.multiline_text((tx, ty), wrapped, font=title_font,
                        fill=(255, 255, 255), align="center", spacing=16)

    if scene_number is not None:
        label = f"Scene {scene_number}"
        _, _, lw, lh = draw.textbbox((0, 0), label, font=num_font)
        draw.text(((w - lw) // 2, h - lh - 80), label, font=num_font,
                  fill=(255, 255, 255, 180))

    img.save(out_path, format="PNG", optimize=True)
    return out_path
