"""Render orchestrator: Storyboard -> MP4 at <out_dir>/output.mp4.

Two renderers:
- ffmpeg (default): Pillow cards + Piper narration + FFmpeg Ken Burns concat. Bulletproof.
- openmontage: calls OpenMontage's VideoCompose.render() (needs Node + Remotion setup).

Select with PLOTCUT_RENDERER=openmontage|ffmpeg (default ffmpeg).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "shared" / "schema"))
from types_py import Storyboard  # noqa: E402

from assets import DEFAULT_SIZE, render_scene_card, synthesize_narration  # noqa: E402


OUTPUT_NAME = "output.mp4"


def render_video(storyboard: Storyboard, out_dir: Path) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    work = out_dir / "work"
    work.mkdir(parents=True, exist_ok=True)

    size = _size_for(storyboard.aspectRatio)
    image_paths: dict[int, Path] = {}
    audio_paths: dict[int, Path] = {}

    for i, scene in enumerate(storyboard.scenes):
        img_path = work / f"scene_{i:02d}.png"
        render_scene_card(
            caption=scene.caption or scene.narration or "",
            visual_prompt=scene.visualPrompt,
            out_path=img_path,
            size=size,
            scene_number=i + 1,
        )
        image_paths[i] = img_path

        aud_path = work / f"scene_{i:02d}.wav"
        synthesize_narration(scene.narration or scene.caption or "", aud_path)
        audio_paths[i] = aud_path

    mixed_audio = work / "narration.wav"
    _concat_audio([audio_paths[i] for i in range(len(storyboard.scenes))], mixed_audio)

    out_mp4 = out_dir / OUTPUT_NAME
    renderer = os.environ.get("PLOTCUT_RENDERER", "ffmpeg").lower()
    if renderer == "openmontage":
        try:
            from openmontage_adapter import render_via_openmontage
            return render_via_openmontage(
                storyboard, image_paths, audio_paths, mixed_audio, out_mp4
            )
        except Exception as e:
            print(f"  [warn] OpenMontage render failed ({e}); falling back to FFmpeg", flush=True)

    _ffmpeg_render(storyboard, image_paths, audio_paths, mixed_audio, out_mp4, size)
    return out_mp4


def _size_for(aspect: str) -> tuple[int, int]:
    return {
        "9:16": (1080, 1920),
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
    }.get(aspect, DEFAULT_SIZE)


def _concat_audio(wavs: list[Path], out_wav: Path) -> None:
    """Concat WAVs into a single track via FFmpeg concat demuxer."""
    if not wavs:
        subprocess.run(
            ["ffmpeg", "-y", "-f", "lavfi", "-i",
             "anullsrc=channel_layout=mono:sample_rate=22050",
             "-t", "1", str(out_wav)],
            capture_output=True, check=True,
        )
        return
    listfile = out_wav.with_suffix(".txt")
    listfile.write_text("\n".join(f"file '{w.resolve()}'" for w in wavs), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-ac", "1", "-ar", "22050", str(out_wav)],
        capture_output=True, check=True,
    )


def _audio_duration(wav: Path) -> float:
    """Return the duration of a WAV file in seconds via ffprobe."""
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries",
             "format=duration", "-of", "default=nw=1:nk=1", str(wav)],
            text=True,
        ).strip()
        return max(0.1, float(out))
    except (subprocess.CalledProcessError, ValueError):
        return 1.0


def _ffmpeg_render(
    storyboard: Storyboard,
    image_paths: dict[int, Path],
    audio_paths: dict[int, Path],
    mixed_audio: Path,
    out_mp4: Path,
    size: tuple[int, int],
) -> None:
    """Build per-scene video segments with Ken Burns zoom, concat, mux narration."""
    work = out_mp4.parent / "work"
    segments: list[Path] = []
    w, h = size

    for i in range(len(storyboard.scenes)):
        img = image_paths[i]
        aud = audio_paths[i]
        seg = work / f"seg_{i:02d}.mp4"
        duration = max(_audio_duration(aud), float(storyboard.scenes[i].durationSec))
        fps = 30
        total_frames = max(int(duration * fps), fps)
        zoom_expr = f"min(zoom+0.0008,1.15)"
        filter_graph = (
            f"scale={w*2}:{h*2},"
            f"zoompan=z='{zoom_expr}':d={total_frames}"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":s={w}x{h}:fps={fps},"
            f"format=yuv420p"
        )
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-loop", "1", "-t", f"{duration:.2f}", "-i", str(img),
                "-i", str(aud),
                "-filter_complex", filter_graph,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-shortest", "-movflags", "+faststart",
                str(seg),
            ],
            check=True, capture_output=True,
        )
        segments.append(seg)

    listfile = work / "segments.txt"
    listfile.write_text("\n".join(f"file '{s.resolve()}'" for s in segments), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-c", "copy", "-movflags", "+faststart", str(out_mp4)],
        check=True, capture_output=True,
    )
