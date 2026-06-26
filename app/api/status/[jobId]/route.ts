import { NextRequest, NextResponse } from "next/server";
import { mockStatut } from "@/lib/mock";
import { jobsPipeline } from "@/lib/pipeline/jobs";
import type { ReponseStatut, Video } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // ── Job du pipeline custom : lecture depuis le store mémoire ────────────────
    const job = jobsPipeline.get(params.jobId);
    if (job) {
      const video: Video | undefined =
        job.statut === "termine" && job.url_video
          ? {
              id: job.video_id,
              titre: job.titre || "Vidéo sans titre",
              prompt: job.params.prompt,
              statut: "termine",
              url_video: job.url_video,
              duree_secondes: job.duree_secondes,
              cree_le: job.cree_le,
              parametres: job.params,
            }
          : undefined;

      const reponse: ReponseStatut = {
        job_id: job.job_id,
        video_id: job.video_id,
        statut: job.statut,
        progression: job.progression,
        message: job.message,
        video,
      };
      return NextResponse.json(reponse);
    }

    // ── Sinon : statut du moteur mock ───────────────────────────────────────────
    const statut = mockStatut(params.jobId);
    return NextResponse.json(statut);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[API /status]", message);
    return NextResponse.json({ erreur: message }, { status: 500 });
  }
}
