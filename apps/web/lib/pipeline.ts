/**
 * PlotCut Pipeline — Daytona sandbox orchestration
 *
 * ARCHITECTURE:
 *   1. User uploads ebook/text via the web UI
 *   2. API route (app/api/jobs/route.ts) saves the file locally and calls runPipeline()
 *   3. This module creates an ephemeral Daytona sandbox, uploads the input,
 *      runs the Python worker pipeline, and downloads the results
 *   4. The job store is updated at each stage so the frontend can poll progress
 *
 * WHAT THE PYTHON WORKER DOES (workers/render/run.py):
 *   - Extracts text from .epub/.txt (extract.py)
 *   - Selects the best chapter or uses the one the user picked
 *   - Calls an LLM to generate a storyboard JSON (storyboard.py)
 *   - (TODO) Feeds storyboard into OpenMontage to render a video
 *   - Outputs: /home/user/output/storyboard.json and (eventually) output.mp4
 *
 * FOR THE PYTHON DEV:
 *   - Your entrypoint is: python workers/render/run.py <input_file> <output_dir> [chapter_index]
 *   - It runs inside a Debian-based Daytona sandbox with Python 3.12
 *   - OPENAI_API_KEY is passed as an env var so storyboard.py can call the LLM
 *   - Write your final outputs to the output_dir:
 *       storyboard.json  — the Storyboard JSON (see shared/schema/types.ts)
 *       output.mp4       — the rendered video (when OpenMontage is wired up)
 *   - stdout is captured for logging — print progress freely
 *
 * FOR THE TS DEV:
 *   - The frontend polls GET /api/jobs/:id to show progress
 *   - When status is "done", the ResultView component shows the storyboard + video
 *   - The video is served from GET /api/jobs/:id/output (see that route)
 *   - To add chapter selection UI, pass chapterIndex through the Job and
 *     forward it as the 3rd arg to run.py
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { getDaytona } from "./daytona";
import { updateJob } from "./store";

/** Local dir where we cache downloaded outputs per job */
const OUTPUTS_DIR = path.join(process.cwd(), "outputs");

export async function runPipeline(jobId: string, inputPath: string): Promise<void> {
  const daytona = getDaytona();

  try {
    // ---------------------------------------------------------------
    // STEP 1: Create an ephemeral Daytona sandbox
    // ---------------------------------------------------------------
    // - ephemeral: true means it auto-deletes when stopped (no cleanup needed)
    // - We use a Debian slim image with Python 3.12 pre-installed
    // - 2 CPU / 4 GB RAM / 8 GB disk is plenty for text processing + render
    // ---------------------------------------------------------------
    updateJob(jobId, { status: "extracting" });
    const sandbox = await daytona.create({
      language: "python",
      resources: { cpu: 2, memory: 4, disk: 8 },
      ephemeral: true,
      autoStopInterval: 15, // auto-stop after 15 min if we crash
    });

    try {
      // ---------------------------------------------------------------
      // STEP 2: Set up the sandbox environment
      // ---------------------------------------------------------------
      // Clone the PlotCut repo so workers/render/* scripts are available.
      // Then install Python dependencies.
      //
      // NOTE for Python dev: if you add new deps to requirements.txt,
      // they'll be installed fresh each sandbox run. For faster iteration,
      // consider creating a Daytona snapshot with deps pre-installed:
      //   const sandbox = await daytona.create({ snapshot: "plotcut-worker" })
      // ---------------------------------------------------------------
      await sandbox.process.executeCommand(
        "git clone --depth 1 https://github.com/benjamindotdev/plotcut.git /home/user/plotcut"
      );
      await sandbox.process.executeCommand(
        "pip install -r /home/user/plotcut/workers/render/requirements.txt"
      );

      // ---------------------------------------------------------------
      // STEP 3: Upload the user's input file into the sandbox
      // ---------------------------------------------------------------
      // The file was saved locally by the API route (app/api/jobs/route.ts).
      // We read it and push it into the sandbox filesystem.
      // ---------------------------------------------------------------
      const inputFilename = path.basename(inputPath);
      const fileBuffer = await readFile(inputPath);
      await sandbox.fs.uploadFile(fileBuffer, `/home/user/${inputFilename}`);

      // ---------------------------------------------------------------
      // STEP 4: Run the Python pipeline
      // ---------------------------------------------------------------
      // The run.py script expects:
      //   arg 1: path to input file (.epub or .txt)
      //   arg 2: output directory (will be created if needed)
      //   arg 3: (optional) chapter index to process
      //
      // We pass OPENAI_API_KEY as an env var so storyboard.py can call the LLM.
      //
      // TODO for Python dev:
      //   - Wire OpenMontage render into run.py step 4
      //   - Output the final MP4 to /home/user/output/output.mp4
      //   - The TS side will download it automatically (see step 5 below)
      // ---------------------------------------------------------------
      updateJob(jobId, { status: "summarizing" });

      const openaiKey = process.env.OPENAI_API_KEY ?? "";
      const openaiBaseUrl = process.env.OPENAI_BASE_URL ?? "";
      const plotcutModel = process.env.PLOTCUT_MODEL ?? "gpt-4o-mini";

      const pipelineCmd = [
        // Export env vars for the Python LLM call
        `export OPENAI_API_KEY="${openaiKey}"`,
        `export OPENAI_BASE_URL="${openaiBaseUrl}"`,
        `export PLOTCUT_MODEL="${plotcutModel}"`,
        // Run the pipeline
        `cd /home/user/plotcut`,
        `python workers/render/run.py /home/user/${inputFilename} /home/user/output`,
      ].join(" && ");

      const result = await sandbox.process.executeCommand(pipelineCmd);

      // Log the Python stdout for debugging
      console.log(`[pipeline:${jobId}] stdout:`, result.result);

      // ---------------------------------------------------------------
      // STEP 5: Download results from the sandbox
      // ---------------------------------------------------------------
      // The Python pipeline writes:
      //   /home/user/output/storyboard.json — always present on success
      //   /home/user/output/output.mp4      — present when render is wired up
      //
      // We download both (if they exist) and save them locally so the
      // API can serve them to the frontend.
      // ---------------------------------------------------------------
      updateJob(jobId, { status: "rendering" });

      // Download storyboard JSON
      const storyboardBytes = await sandbox.fs.downloadFile(
        "/home/user/output/storyboard.json"
      );
      const storyboard = JSON.parse(Buffer.from(storyboardBytes).toString("utf-8"));

      // Save outputs locally for serving
      const jobOutputDir = path.join(OUTPUTS_DIR, jobId);
      await mkdir(jobOutputDir, { recursive: true });
      await writeFile(
        path.join(jobOutputDir, "storyboard.json"),
        JSON.stringify(storyboard, null, 2),
        "utf-8"
      );

      // Try to download the rendered video (may not exist yet if render isn't wired)
      let outputUrl: string | undefined;
      try {
        const videoBytes = await sandbox.fs.downloadFile(
          "/home/user/output/output.mp4"
        );
        const videoBuffer = Buffer.from(videoBytes);
        await writeFile(path.join(jobOutputDir, "output.mp4"), videoBuffer);
        // This URL is served by the /api/jobs/[id]/output route
        outputUrl = `/api/jobs/${jobId}/output`;
      } catch {
        // Video not produced yet — that's OK, storyboard-only result
        console.log(`[pipeline:${jobId}] No video output found (render not wired yet)`);
      }

      // ---------------------------------------------------------------
      // STEP 6: Update job as done
      // ---------------------------------------------------------------
      updateJob(jobId, {
        status: "done",
        storyboard,
        outputUrl,
      });
    } finally {
      // Always stop the sandbox (ephemeral = auto-delete on stop)
      try {
        await sandbox.stop();
      } catch {
        // best-effort cleanup
      }
    }
  } catch (err: any) {
    console.error(`[pipeline:${jobId}] Failed:`, err);
    updateJob(jobId, {
      status: "error",
      error: err?.message ?? String(err),
    });
  }
}

