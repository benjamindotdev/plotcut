"""
Main pipeline entrypoint.
Usage: python run.py <input_file> <output_dir> [chapter_index]

Reads input, extracts text, generates storyboard, writes storyboard JSON.
OpenMontage render step is a TODO placeholder.
"""

from __future__ import annotations
import json
import os
import sys
from pathlib import Path

# Allow importing shared schema
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "shared", "schema"))

from extract import extract  # noqa: E402
from storyboard import generate_storyboard  # noqa: E402


def run(input_path: str, output_dir: str, chapter_index: int | None = None) -> dict:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # 1. Extract
    print("[1/4] Extracting text...")
    content = extract(input_path)
    print(f"  Title: {content.title}, Chapters: {len(content.chapters)}")

    # 2. Select chapter
    if chapter_index is not None and 0 <= chapter_index < len(content.chapters):
        chapter = content.chapters[chapter_index]
    elif content.chapters:
        # Pick the longest chapter as the most interesting
        chapter = max(content.chapters, key=lambda c: len(c.text))
    else:
        raise ValueError("No chapters found in input")

    print(f"  Selected: {chapter.title} ({len(chapter.text)} chars)")

    # 3. Generate storyboard
    print("[2/4] Generating storyboard...")
    sb = generate_storyboard(chapter.text, chapter.title)

    # Write storyboard JSON
    sb_path = out / "storyboard.json"
    sb_path.write_text(sb.to_json(indent=2), encoding="utf-8")
    print(f"  Storyboard written to {sb_path}")

    # 4. Render (TODO: integrate OpenMontage)
    print("[3/4] Rendering video...")
    print("  TODO: invoke OpenMontage render here")

    # 5. Done
    print("[4/4] Done!")

    return {
        "storyboard_path": str(sb_path),
        "storyboard": sb.to_dict(),
        # "output_video": str(out / "output.mp4"),  # when render is wired up
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
