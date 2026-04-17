"""
Main pipeline entrypoint.
Usage: python run.py <input_file> <output_dir> [chapter_index]

Extracts text -> generates storyboard -> renders MP4 -> writes manifest.
MP4 is written to <output_dir>/output.mp4 (e.g. /home/user/output/output.mp4 in Daytona).
"""

from __future__ import annotations
import json
import os
import sys
from pathlib import Path

# Allow importing shared schema
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "shared", "schema"))

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:
    pass

from extract import extract  # noqa: E402
from storyboard import generate_storyboard  # noqa: E402
from render import render_video, OUTPUT_NAME  # noqa: E402


def run(input_path: str, output_dir: str, chapter_index: int | None = None) -> dict:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    print("[1/4] Extracting text...", flush=True)
    content = extract(input_path)
    print(f"  Title: {content.title}, Chapters: {len(content.chapters)}", flush=True)

    if chapter_index is not None and 0 <= chapter_index < len(content.chapters):
        chapter = content.chapters[chapter_index]
    elif content.chapters:
        chapter = max(content.chapters, key=lambda c: len(c.text))
    else:
        raise ValueError("No chapters found in input")

    print(f"  Selected: {chapter.title} ({len(chapter.text)} chars)", flush=True)

    print("[2/4] Generating storyboard...", flush=True)
    sb = generate_storyboard(chapter.text, chapter.title)

    sb_path = out / "storyboard.json"
    sb_path.write_text(sb.to_json(indent=2), encoding="utf-8")
    print(f"  Storyboard written to {sb_path}", flush=True)

    print("[3/4] Rendering video...", flush=True)
    video_path = render_video(sb, out)
    print(f"  Video written to {video_path}", flush=True)

    print("[4/4] Done!", flush=True)

    return {
        "storyboard_path": str(sb_path),
        "storyboard": sb.to_dict(),
        "video_path": str(video_path),
        "output_name": OUTPUT_NAME,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python run.py <input_file> <output_dir> [chapter_index]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_directory = sys.argv[2]
    ch_idx = int(sys.argv[3]) if len(sys.argv) > 3 else None

    result = run(input_file, output_directory, ch_idx)
    print(json.dumps(result, indent=2))
