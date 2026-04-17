import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createJob, listJobs } from "@/lib/store";
import { runPipeline } from "@/lib/pipeline";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  return NextResponse.json(listJobs());
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const text = form.get("text") as string | null;

  if (!file && (!text || text.trim().length < 50)) {
    return NextResponse.json(
      { error: "Provide an .epub/.txt file or at least 50 characters of text" },
      { status: 400 }
    );
  }

  const id = uuid();
  const now = new Date().toISOString();

  // Save uploaded file to disk
  let inputPath = "";
  if (file) {
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const ext = path.extname(file.name) || ".txt";
    const safeName = `${id}${ext}`;
    inputPath = path.join(uploadsDir, safeName);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buf);
  } else if (text) {
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    inputPath = path.join(uploadsDir, `${id}.txt`);
    await writeFile(inputPath, text, "utf-8");
  }

  createJob({
    id,
    status: "pending",
    inputFilename: file?.name ?? "pasted-text.txt",
    createdAt: now,
    updatedAt: now,
  });

  // Fire and forget — pipeline runs in background
  runPipeline(id, inputPath).catch((err) => {
    console.error(`Pipeline failed for job ${id}:`, err);
  });

  return NextResponse.json({ id }, { status: 201 });
}
