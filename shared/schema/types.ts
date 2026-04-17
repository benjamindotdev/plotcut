export interface Scene {
  startSec: number;
  durationSec: number;
  visualPrompt: string;
  narration: string;
  caption: string;
}

export type Style = "cinematic" | "anime" | "documentary" | "explainer";
export type AspectRatio = "9:16" | "16:9" | "1:1";

export interface Storyboard {
  title: string;
  summary: string;
  scenes: Scene[];
  style: Style;
  aspectRatio: AspectRatio;
}

export type JobStatus = "pending" | "extracting" | "summarizing" | "storyboarding" | "rendering" | "done" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  inputFilename: string;
  chapterIndex?: number;
  storyboard?: Storyboard;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
