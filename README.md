# PlotCut

Turn any chapter or short ebook into a social-ready video summary.

Upload text → get a storyboard, narration, subtitles, and a rendered short automatically.

## Structure

```
apps/web/          — Next.js frontend + API (TypeScript)
workers/render/    — Python pipeline (extract → summarize → storyboard → render)
shared/schema/     — Shared JSON contracts (TS types + Python dataclasses)
```

## Quick Start

### Web App

```bash
cd apps/web
npm install
npm run dev
```

### Python Worker

```bash
cd workers/render
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Run the pipeline standalone

```bash
cd workers/render
python run.py <input.epub|input.txt> <output_dir> [chapter_index]
```

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | API key for LLM storyboard generation |
| `OPENAI_BASE_URL` | Optional custom base URL (for proxies / other providers) |
| `PLOTCUT_MODEL` | Model name (default: `gpt-4o-mini`) |

## Pipeline

1. **Extract** — parse `.epub` or `.txt` into chapters
2. **Summarize** — LLM generates title, summary, 5-8 scene storyboard
3. **Render** — feed storyboard into OpenMontage (TODO)
4. **Present** — serve MP4 + storyboard via web UI

## License

Hackathon project. OpenMontage is AGPL-3.0 — review before any hosted deployment.
