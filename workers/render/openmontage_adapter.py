"""Adapter: Storyboard + generated asset paths -> OpenMontage VideoCompose.render().

Only invoked when PLOTCUT_RENDERER=openmontage. Requires a working Remotion setup
inside vendor/openmontage/remotion-composer (Node.js + npm install).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_VENDOR = Path(__file__).resolve().parent / "vendor" / "openmontage"
if _VENDOR.exists() and str(_VENDOR) not in sys.path:
    sys.path.insert(0, str(_VENDOR))


def _build_edit_decisions_and_manifest(
    storyboard, image_paths: dict[int, Path], audio_paths: dict[int, Path]
) -> tuple[dict[str, Any], dict[str, Any]]:
    cuts = []
    assets = []
    cursor = 0.0
    for i, scene in enumerate(storyboard.scenes):
        asset_id = f"scene_{i}"
        image_path = image_paths[i]
        duration = float(scene.durationSec)
        cuts.append({
            "source": asset_id,
            "type": "image",
            "start_seconds": cursor,
            "end_seconds": cursor + duration,
            "duration_seconds": duration,
            "caption": scene.caption,
            "narration": scene.narration,
        })
        assets.append({
            "id": asset_id,
            "type": "image",
            "path": str(image_path.resolve()),
        })
        cursor += duration

    profile_map = {"9:16": "tiktok", "16:9": "youtube_landscape", "1:1": "instagram_square"}
    edit_decisions = {
        "title": storyboard.title,
        "summary": storyboard.summary,
        "renderer_family": "explainer-data",
        "aspect_ratio": storyboard.aspectRatio,
        "profile": profile_map.get(storyboard.aspectRatio, "tiktok"),
        "cuts": cuts,
        "total_duration_seconds": cursor,
    }
    asset_manifest = {"assets": assets}
    return edit_decisions, asset_manifest


def render_via_openmontage(
    storyboard,
    image_paths: dict[int, Path],
    audio_paths: dict[int, Path],
    mixed_audio_path: Path,
    out_mp4: Path,
) -> Path:
    """Call OpenMontage VideoCompose.render(). Raises RuntimeError on failure."""
    from tools.video.video_compose import VideoCompose

    edit_decisions, asset_manifest = _build_edit_decisions_and_manifest(
        storyboard, image_paths, audio_paths
    )

    profile = edit_decisions.get("profile", "tiktok")
    result = VideoCompose().execute({
        "operation": "render",
        "edit_decisions": edit_decisions,
        "asset_manifest": asset_manifest,
        "audio_path": str(mixed_audio_path.resolve()),
        "output_path": str(out_mp4.resolve()),
        "profile": profile,
        "options": {"subtitle_burn": False},
    })

    if not result.success:
        raise RuntimeError(f"OpenMontage render failed: {result.error}")
    if not out_mp4.exists():
        raise RuntimeError(f"OpenMontage reported success but {out_mp4} is missing")
    return out_mp4
