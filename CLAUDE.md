# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CréaVidéo — a French-language Next.js 14 (App Router) UI for generating AI explainer ("whiteboard") videos. The entire interface, codebase identifiers, and types are written in French.

It supports **two interchangeable generation engines**, selected at runtime from environment variables:
1. **Custom pipeline** (the main engine) — fully in-house, no third-party video API. Builds the video from scratch: **OpenRouter** (Claude) for the script/storyboard, **ElevenLabs** (direct API) for the voice-over, **Kie.ai** for the illustrations (Flux-2) and background music (Suno), then **ffmpeg** to assemble everything into an MP4.
2. **Mock** — local simulation, no API keys needed. Used as the fallback when the pipeline keys are absent, or forced with `NEXT_PUBLIC_MOCK_MODE=true`.

> A third engine, **Golpo AI**, was removed (see git history). The `golpo_canvas`/`golpo_sketch` engine values were renamed to the neutral `style_rendu` (`"canvas"`/`"sketch"`), which only selects the visual render style for the pipeline.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # next lint (eslint-config-next)
```

There is no test suite. The `@/*` path alias maps to the repo root (see `tsconfig.json`). The custom pipeline requires **ffmpeg installed on the host** (`brew install ffmpeg` on macOS); the assembly step fails with an explicit French message otherwise.

## Engine selection (the single most important concept)

`app/api/generate/route.ts` → `choisirMoteur()` picks the engine on each request, in this order:

1. **`mock`** — if `NEXT_PUBLIC_MOCK_MODE === "true"` (explicit override to test the UI without spending credits).
2. **`pipeline`** — else if `OPENROUTER_API_KEY` **and** `KIE_API_KEY` are both set. Runs the custom pipeline.
3. **`mock`** — otherwise. `lib/mock.ts` exposes `mockGenerer`/`mockStatut`: a ~15s in-memory simulation (`mockJobs` Map, lost on restart) returning sample MP4s and synthesized progress. This is the **default** with no keys configured.

When editing generation/status logic, keep both paths working. The mock lives in `lib/mock.ts`; the pipeline is independent.

### Custom pipeline runs in the background

The pipeline takes 30–90s and runs **in-process, detached**. `route.ts` creates a job in the shared in-memory store, fires `genererVideoPipeline` without awaiting (`lancerGenerationFond`), and returns the `job_id` immediately. Progress is written to `lib/pipeline/jobs.ts` (a `Map` pinned to `globalThis` to survive dev HMR). `GET /api/status/[jobId]` checks this store **first**, then falls back to the mock. Pipeline job ids are prefixed `pipe-job-`.

## Architecture

The flow is: **VideoForm → POST /api/generate → returns job_id → StatusPoller polls GET /api/status/[jobId] every 2s → renders VideoCard when `statut === "termine"`**.

- `lib/types.ts` — all shared types, the source of truth. Note the **French domain types** (`ParamsGeneration`, `ReponseStatut`, `StatutJob` with values `en_attente`/`en_cours`/`termine`/`erreur`). `style_rendu` (`StyleRendu` = `"canvas"`/`"sketch"`) selects which style set applies (`style_canvas` vs `style_sketch`).
- `lib/mock.ts` — the mock engine. `mockGenerer`/`mockStatut`: a ~15s in-memory simulation (`mockJobs` Map) returning sample MP4s and synthesized progress.
- `app/api/*` — thin route handlers returning French-keyed error JSON (`{ erreur }`). `generate` selects the engine; `status/[jobId]` reads the pipeline store then the mock; `video/[jobId]` streams the local MP4 (with HTTP Range support) when Supabase isn't configured; `extraire-document` accepts a multipart upload (PDF/`.docx`/`.doc`/`.txt`/`.md`) and returns the extracted text via `lib/extraction.ts` (pdf-parse v2 / mammoth / word-extractor, capped at 20 000 chars).
- **Reference document** (`reference_document`/`reference_nom` in `ParamsGeneration`): the form uploads a file to `extraire-document`, stores the returned text, and the pipeline `script.ts` injects it into the prompt as source material to follow faithfully (distinct from `script_personnalise`, which is verbatim narration).
- **Cost estimate** (`cout` on `Video`, type `CoutVideo`): `lib/pipeline/cout.ts` (`calculerCout`) turns the quantities actually consumed (OpenRouter tokens, ElevenLabs characters, #Flux-2 images, #Suno tracks — gathered in `index.ts`) into a per-provider euro breakdown using **configurable unit prices** (`COUT_*` env vars). Stored on the job by `terminerJob`, surfaced via `status/[jobId]`, displayed (expandable) in `VideoCard`. The mock provides a representative sample cost; gallery demos have none.
- `components/StatusPoller.tsx` — client component, polls every `INTERVALLE_MS` (2000ms), stops on `termine`/`erreur`.

Any new generation parameter must be threaded through `types.ts`, the relevant `lib/pipeline/*` module (custom engine), and the form.

### Custom pipeline (`lib/pipeline/`)

Orchestrated by `index.ts` → `genererVideoPipeline(jobId, params, onProgression)`, which reports progress through fixed ranges: storyboard 0–10% → voice-over 10–35% → illustrations 35–50% → **animation 50–80%** → assembly 82–95% → upload/cleanup 95–100%. Music generation is kicked off in parallel right after the storyboard to hide its latency, and awaited just before assembly. Total ~4–6 min (the animation step dominates).

- `script.ts` — **OpenRouter** (OpenAI SDK with a custom `baseURL`), model `anthropic/claude-sonnet-4.6` (env `OPENROUTER_MODEL`). Forces JSON via `response_format: json_schema` (strict) → `Storyboard`.
- `tts.ts` — **ElevenLabs direct** voice-over (`POST /v1/text-to-speech/{voice_id}`, model `eleven_multilingual_v2`, env `ELEVENLABS_API_KEY`), one MP3 per scene (parallel). Calls ElevenLabs directly — **not** via Kie — so it can use **native French Voice Library voices** (Kie's TTS only allows English default voices). **Requires a paid ElevenLabs plan**: free tier cannot use Library voices via API. The 4 form voices map to French voice IDs (1 female Audrey + 2 male Nicolas/Léo, since the free tier capped Library voices at 3 slots), overridable via `ELEVENLABS_VOIX_FEMALE`/`_FEMALE_4`/`_MALE_3`/`_MALE_4`.
- `illustrations.ts` — **Kie.ai → Flux-2** one PNG per scene (parallel). English prompt + per-style suffix + a no-text suffix (labels would clash with the FR narration); aspect ratio from `params.orientation`. Returns the Kie image **url** too (input to the animation step).
- `animation.ts` — **Kie.ai → Grok Imagine** (`grok-imagine/image-to-video`, env `KIE_VIDEO_MODEL`/`KIE_VIDEO_RESOLUTION`). Turns each Flux still (by its Kie url) into a short motion clip, duration = narration length clamped to 6–30s, concurrency-capped (`ANIMATION_CONCURRENCE`, default 3, ~1–2 min/clip). **Non-blocking per scene**: on failure that scene falls back to the still image. **Always on.**
- `suno.ts` — **Kie.ai → Suno** instrumental background track. **Non-blocking**: on failure it returns `null` and assembly proceeds without music. Uses Suno's *legacy* endpoints (`/api/v1/generate` + `/api/v1/generate/record-info`), distinct from the unified `/api/v1/jobs/*` pattern.
- `kie.ts` — shared Kie.ai client for the **unified async pattern** (illustrations + animation): `createTask` → poll `recordInfo` until `success` → `resultUrls`, plus a download helper (Kie URLs expire fast, so files are fetched immediately).
- `cout.ts` — `calculerCout` turns consumed quantities into a per-provider euro breakdown (`CoutVideo`) using `COUT_*` env rates (incl. `COUT_ANIMATION_USD_PAR_S`).
- `assemblage.ts` — **fluent-ffmpeg**: one clip per scene — the animated video clip if present (fitted to the audio duration, its own audio dropped), else the still image looped — chained with `xfade`/`acrossfade` (0.3s), optional music mixed at 15%, then optional **Supabase Storage** upload (bucket `videos`) — falling back to the local `/api/video/[jobId]` URL.
- `jobs.ts` (progress store), `util.ts` (tmp dirs under `os.tmpdir()/crea-video/{jobId}`, audio duration via `music-metadata`, cleanup), `types.ts` (internal `Storyboard`/`Scene`/`ClipScene`, distinct from the shared UI types).

Pages: `app/page.tsx` (accueil), `app/playground/page.tsx` (generator), `app/galerie/page.tsx` (gallery). There is **no DB persistence** — generated videos aren't catalogued (Supabase Storage only holds the finished MP4 when configured).

## Conventions

- Keep all user-facing strings, log messages, and new domain identifiers in **French**, matching existing code. **Exception:** prompts sent to the image model (`description_visuelle`, style suffixes) are written in **English** for quality.
- Styling is Tailwind with a dark palette (`slate-900`/`slate-800`); icons from `lucide-react`.
- The custom-engine SDKs are externalized from the bundle in `next.config.js` (`serverComponentsExternalPackages`); the pipeline routes set `export const runtime = "nodejs"`.

## Environment variables

See `.env.example`. Custom pipeline: `OPENROUTER_API_KEY` (+ optional `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`), `ELEVENLABS_API_KEY` (voice-over — **paid plan required** for French Library voices; + optional `ELEVENLABS_MODEL`, `ELEVENLABS_VOIX_*` voice ids), `KIE_API_KEY` (images + music — + optional `KIE_IMAGE_MODEL`, `KIE_SUNO_MODEL`), optional `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`, optional `FFMPEG_PATH` / `FFPROBE_PATH`. Mock: `NEXT_PUBLIC_MOCK_MODE=true` forces the local simulation.

> **Note:** the pipeline activates (`choisirMoteur`) on `OPENROUTER_API_KEY` + `KIE_API_KEY` only; `ELEVENLABS_API_KEY` is read at the voice-over step (`tts.ts`), which throws an explicit French error if it's missing. `KIE_TTS_MODEL`/`KIE_VOIX_*` are **no longer used** (TTS moved off Kie).
