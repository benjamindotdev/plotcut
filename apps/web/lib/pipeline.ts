import { updateJob } from "./store";

/**
 * Run the Python render pipeline for a job.
 * This is the integration point — right now it's a stub that simulates progress.
 * Replace with actual subprocess / Daytona sandbox call.
 */
export async function runPipeline(jobId: string, inputPath: string): Promise<void> {
  const steps: Array<{ status: string; delayMs: number }> = [
    { status: "extracting", delayMs: 2000 },
    { status: "summarizing", delayMs: 3000 },
    { status: "storyboarding", delayMs: 2000 },
    { status: "rendering", delayMs: 4000 },
  ];

  for (const step of steps) {
    updateJob(jobId, { status: step.status as any });
    await new Promise((r) => setTimeout(r, step.delayMs));
  }

  // TODO: replace with real storyboard output from Python pipeline
  updateJob(jobId, {
    status: "done",
    storyboard: {
      title: "Sample Output",
      summary: "This is a placeholder storyboard. Connect the Python pipeline to get real results.",
      scenes: [
        {
          startSec: 0,
          durationSec: 6,
          visualPrompt: "A dusty old book opening on a wooden desk",
          narration: "Every great story begins with a single page.",
          caption: "Every great story begins with a single page.",
        },
        {
          startSec: 6,
          durationSec: 6,
          visualPrompt: "Words floating off the page into a swirl of light",
          narration: "But what if that page could come alive?",
          caption: "But what if that page could come alive?",
        },
      ],
      style: "explainer",
      aspectRatio: "9:16",
    },
    // outputUrl: "/api/jobs/{id}/output" — set when real render produces MP4
  });
}
