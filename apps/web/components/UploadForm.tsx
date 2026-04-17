"use client";

import { useState, useRef } from "react";

interface Props {
  onJobCreated: (jobId: string) => void;
}

export function UploadForm({ onJobCreated }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    setLoading(true);
    try {
      const form = new FormData();
      if (file) {
        form.append("file", file);
      } else {
        form.append("text", text);
      }

      const res = await fetch("/api/jobs", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      onJobCreated(id);
    } catch (e) {
      console.error(e);
      alert("Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = (file || text.trim().length > 50) && !loading;

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-500"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".epub,.txt"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="text-violet-400">{file.name}</p>
        ) : (
          <p className="text-zinc-500">
            Drop an <span className="text-zinc-300">.epub</span> or{" "}
            <span className="text-zinc-300">.txt</span> file here, or click to browse
          </p>
        )}
      </div>

      <div className="text-center text-zinc-600 text-sm">or paste text directly</div>

      {/* Text input */}
      <textarea
        className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-violet-500"
        placeholder="Paste chapter text here (minimum 50 characters)..."
        value={text}
        onChange={(e) => { setText(e.target.value); setFile(null); }}
      />

      <button
        disabled={!canSubmit}
        onClick={submit}
        className="w-full py-3 rounded-lg font-semibold transition-colors bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Creating job..." : "Generate Video"}
      </button>
    </div>
  );
}
