"""Generate a storyboard from extracted text using an LLM."""

from __future__ import annotations
import json
import os
import sys

# Allow importing shared schema
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "shared", "schema"))
from types_py import Storyboard, Scene  # noqa: E402


SYSTEM_PROMPT = """You are PlotCut, a creative AI that turns book chapters into short video storyboards.

Given chapter text, produce a JSON object with:
- title: catchy short title for the video
- summary: 60-90 word summary of the chapter
- scenes: array of 5-8 scene objects, each with:
  - startSec: number (cumulative start time)
  - durationSec: number (5-8 seconds each)
  - visualPrompt: detailed image generation prompt for the scene
  - narration: 1-2 sentence voiceover text
  - caption: short subtitle text (max 10 words)
- style: one of "cinematic", "anime", "documentary", "explainer"
- aspectRatio: "9:16"

Keep total duration between 30-60 seconds. Make visuals vivid and specific.
Respond with ONLY valid JSON, no markdown fences."""


def generate_storyboard(text: str, chapter_title: str = "") -> Storyboard:
    """Call OpenAI-compatible API to generate a storyboard."""
    from openai import OpenAI

    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        base_url=os.environ.get("OPENAI_BASE_URL"),
    )

    user_msg = f"Chapter: {chapter_title}\n\n{text[:8000]}"

    response = client.chat.completions.create(
        model=os.environ.get("PLOTCUT_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    return Storyboard.from_dict(data)


if __name__ == "__main__":
    sample = "This is a sample chapter about a brave knight who discovers a hidden library beneath the castle."
    sb = generate_storyboard(sample, "The Hidden Library")
    print(sb.to_json(indent=2))
