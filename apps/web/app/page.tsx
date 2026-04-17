"use client";

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { ProgressLog } from "@/components/ProgressLog";
import { ResultView } from "@/components/ResultView";

type AppState = "upload" | "processing" | "done";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [jobId, setJobId] = useState<string | null>(null);

  function handleJobCreated(id: string) {
    setJobId(id);
    setState("processing");
  }

  function handleJobDone() {
    setState("done");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">PlotCut</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-md">
        Turn any chapter or short ebook into a social-ready video summary.
      </p>

      {state === "upload" && <UploadForm onJobCreated={handleJobCreated} />}

      {state === "processing" && jobId && (
        <ProgressLog jobId={jobId} onDone={handleJobDone} />
      )}

      {state === "done" && jobId && <ResultView jobId={jobId} />}
    </main>
  );
}
