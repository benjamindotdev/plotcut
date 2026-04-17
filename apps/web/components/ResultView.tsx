"use client";

import { useEffect, useState } from "react";

interface Props {
  jobId: string;
}

export function ResultView({ jobId }: Props) {
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(setJob)
      .catch(console.error);
  }, [jobId]);

  if (!job) return <p className="text-zinc-500">Loading result...</p>;

  if (job.error) {
    return (
      <div className="w-full max-w-lg bg-red-950 border border-red-800 rounded-lg p-4">
        <p className="text-red-400 font-medium">Error</p>
        <p className="text-red-300 text-sm mt-1">{job.error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Video player */}
      {job.outputUrl && (
        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black">
          <video
            src={job.outputUrl}
            controls
            className="w-full max-h-[70vh]"
          />
        </div>
      )}

      {/* Summary */}
      {job.storyboard && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{job.storyboard.title}</h2>
          <p className="text-zinc-400 text-sm">{job.storyboard.summary}</p>

          <h3 className="text-sm font-semibold text-zinc-300 mt-4">Scenes</h3>
          <div className="space-y-2">
            {job.storyboard.scenes.map((scene: any, i: number) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm"
              >
                <p className="text-violet-400 text-xs mb-1">
                  Scene {i + 1} &middot; {scene.durationSec}s
                </p>
                <p className="text-zinc-300">{scene.narration}</p>
                <p className="text-zinc-600 text-xs mt-1 italic">
                  {scene.visualPrompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download */}
      {job.outputUrl && (
        <a
          href={job.outputUrl}
          download
          className="block w-full text-center py-3 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 transition-colors"
        >
          Download MP4
        </a>
      )}
    </div>
  );
}
