/**
 * GET /api/jobs/:id/output — serve the rendered MP4 video for a completed job.
 *
 * HOW IT WORKS:
 *   The pipeline downloads the rendered MP4 from the Daytona sandbox and saves
 *   it to outputs/<jobId>/output.mp4 on the local filesystem. This endpoint
 *   reads that file and streams it back as video/mp4.
 *
 * FOR THE TS DEV:
 *   - The ResultView component uses job.outputUrl which points here
 *   - The <video> tag and download button both hit this endpoint
 *   - If you add other output formats (e.g. WebM, transcript), add more
 *     routes here: /api/jobs/:id/transcript, /api/jobs/:id/thumbnail, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";
import { readFile, stat } from "fs/promises";
import path from "path";

const OUTPUTS_DIR = path.join(process.cwd(), "outputs");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify the job exists and is done
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "done") {
    return NextResponse.json({ error: "Job not finished yet" }, { status: 409 });
  }

  // Read the video file
  const videoPath = path.join(OUTPUTS_DIR, id, "output.mp4");
  try {
    const fileStat = await stat(videoPath);
    const fileBuffer = await readFile(videoPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `inline; filename="plotcut-${id}.mp4"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Video file not found — render may not be wired yet" },
      { status: 404 }
    );
  }
}
