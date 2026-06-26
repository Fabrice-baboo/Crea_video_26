// ─── Store mémoire des jobs du pipeline custom ────────────────────────────────
// Partagé entre /api/generate (écriture) et /api/status (lecture).
// La génération custom est longue (30-90s) : on la lance en arrière-plan et on
// suit la progression ici. Perdu au redémarrage serveur (comme le mock Golpo).
//
// Attaché à globalThis pour survivre au Hot Module Reload de Next en dev.

import type { ParamsGeneration, StatutJob } from "@/lib/types";

export interface JobPipeline {
  job_id: string;
  video_id: string;
  params: ParamsGeneration;
  statut: StatutJob;
  progression: number; // 0-100
  message: string;
  titre?: string;
  url_video?: string;
  duree_secondes?: number;
  erreur?: string;
  cree_le: string;
}

const globalAvecJobs = globalThis as typeof globalThis & {
  __creaVideoJobs?: Map<string, JobPipeline>;
};

export const jobsPipeline: Map<string, JobPipeline> =
  globalAvecJobs.__creaVideoJobs ?? (globalAvecJobs.__creaVideoJobs = new Map());

/** Crée un job en attente et le stocke. */
export function creerJob(
  jobId: string,
  videoId: string,
  params: ParamsGeneration
): JobPipeline {
  const job: JobPipeline = {
    job_id: jobId,
    video_id: videoId,
    params,
    statut: "en_attente",
    progression: 0,
    message: "Job en file d'attente…",
    cree_le: new Date().toISOString(),
  };
  jobsPipeline.set(jobId, job);
  return job;
}

/** Met à jour la progression d'un job existant. */
export function majProgression(jobId: string, pct: number, message: string): void {
  const job = jobsPipeline.get(jobId);
  if (!job) return;
  job.progression = Math.max(0, Math.min(100, Math.round(pct)));
  job.message = message;
  job.statut = job.progression >= 100 ? "termine" : "en_cours";
  jobsPipeline.set(jobId, job);
}

/** Marque un job comme terminé avec l'URL finale. */
export function terminerJob(
  jobId: string,
  urlVideo: string,
  titre: string,
  dureeSecondes: number
): void {
  const job = jobsPipeline.get(jobId);
  if (!job) return;
  job.statut = "termine";
  job.progression = 100;
  job.message = "Vidéo prête !";
  job.url_video = urlVideo;
  job.titre = titre;
  job.duree_secondes = dureeSecondes;
  jobsPipeline.set(jobId, job);
}

/** Marque un job en erreur (message français). */
export function echouerJob(jobId: string, erreur: string): void {
  const job = jobsPipeline.get(jobId);
  if (!job) return;
  job.statut = "erreur";
  job.message = erreur;
  job.erreur = erreur;
  jobsPipeline.set(jobId, job);
}
