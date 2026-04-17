"use client";

import { useEffect, useState } from "react";

interface Props {
  jobId: string;
  onDone: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued...",
  extracting: "Extracting text from ebook...",
  summarizing: "Generating summary...",
  storyboarding: "Building storyboard...",
  rendering: "Rendering video...",
  done: "Done!",
  error: "Error",
};

export function ProgressLog({ jobId, onDone }: Props) {
  const [status, setStatus] = useState("pending");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();
        setStatus(job.status);

        const label = STATUS_LABELS[job.status] ?? job.status;
        setLogs((prev) => {
          if (prev[prev.length - 1] !== label) return [...prev, label];
          return prev;
        });

        if (job.status === "done" || job.status === "error") {
          clearInterval(interval);
          if (job.status === "done") onDone();
        }
      } catch {
        // ignore polling errors
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, onDone]);

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        {status !== "done" && status !== "error" && (
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        )}
        <span className="text-lg font-medium">
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
        {logs.map((line, i) => (
          <div key={i} className="text-zinc-400">
            <span className="text-zinc-600 mr-2">[{i + 1}]</span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
