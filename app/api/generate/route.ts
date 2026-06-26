import { NextRequest, NextResponse } from "next/server";
import { genererVideo } from "@/lib/golpo";
import { genererVideoPipeline } from "@/lib/pipeline";
import { creerJob, majProgression, terminerJob, echouerJob } from "@/lib/pipeline/jobs";
import type { ParamsGeneration, ReponseGeneration } from "@/lib/types";

// Le pipeline custom écrit des fichiers et lance ffmpeg : runtime Node.js requis.
export const runtime = "nodejs";

/** Sélectionne le moteur de génération selon l'environnement. */
function choisirMoteur(): "golpo" | "pipeline" | "mock" {
  const golpoActif =
    !!process.env.GOLPO_API_KEY && process.env.NEXT_PUBLIC_MOCK_MODE === "false";
  if (golpoActif) return "golpo";

  const pipelineActif =
    !!process.env.OPENROUTER_API_KEY && !!process.env.KIE_API_KEY;
  if (pipelineActif) return "pipeline";

  return "mock";
}

export async function POST(req: NextRequest) {
  try {
    const params: ParamsGeneration = await req.json();

    if (!params.prompt || params.prompt.trim().length < 5) {
      return NextResponse.json(
        { erreur: "Le prompt doit contenir au moins 5 caractères." },
        { status: 400 }
      );
    }

    const moteur = choisirMoteur();

    // ── Pipeline custom : génération longue lancée en arrière-plan ──────────────
    if (moteur === "pipeline") {
      const horodatage = Date.now();
      const jobId = `pipe-job-${horodatage}`;
      const videoId = `pipe-video-${horodatage}`;
      creerJob(jobId, videoId, params);

      // On ne bloque pas la requête : la génération tourne en tâche de fond.
      lancerGenerationFond(jobId, params);

      const reponse: ReponseGeneration = {
        job_id: jobId,
        video_id: videoId,
        message: "Génération démarrée (pipeline custom).",
      };
      return NextResponse.json(reponse);
    }

    // ── Golpo réel ou mock (logique existante inchangée) ────────────────────────
    const resultat = await genererVideo(params);
    return NextResponse.json(resultat);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[API /generate]", message);
    return NextResponse.json({ erreur: message }, { status: 500 });
  }
}

/** Lance le pipeline en tâche de fond et reporte la progression dans le store. */
function lancerGenerationFond(jobId: string, params: ParamsGeneration): void {
  genererVideoPipeline(jobId, params, (pct, message) => {
    majProgression(jobId, pct, message);
  })
    .then((res) => {
      terminerJob(jobId, res.url, res.titre, res.duree_secondes);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Erreur de génération";
      console.error(`[pipeline] Job ${jobId} en échec :`, message);
      echouerJob(jobId, message);
    });
}
