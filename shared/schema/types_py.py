"""PlotCut shared schema — mirrors shared/schema/types.ts"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Literal, Optional
import json


Style = Literal["cinematic", "anime", "documentary", "explainer"]
AspectRatio = Literal["9:16", "16:9", "1:1"]
JobStatus = Literal[
    "pending", "extracting", "summarizing", "storyboarding", "rendering", "done", "error"
]


@dataclass
class Scene:
    startSec: float
    durationSec: float
    visualPrompt: str
    narration: str
    caption: str


@dataclass
class Storyboard:
    title: str
    summary: str
    scenes: list[Scene]
    style: Style = "explainer"
    aspectRatio: AspectRatio = "9:16"

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self, **kwargs) -> str:
        return json.dumps(self.to_dict(), **kwargs)

    @classmethod
    def from_dict(cls, d: dict) -> "Storyboard":
        scenes = [Scene(**s) for s in d["scenes"]]
        return cls(
            title=d["title"],
            summary=d["summary"],
            scenes=scenes,
            style=d.get("style", "explainer"),
            aspectRatio=d.get("aspectRatio", "9:16"),
        )


@dataclass
class Job:
    id: str
    status: JobStatus
    inputFilename: str
    chapterIndex: Optional[int] = None
    storyboard: Optional[Storyboard] = None
    outputUrl: Optional[str] = None
    error: Optional[str] = None
    createdAt: str = ""
    updatedAt: str = ""
