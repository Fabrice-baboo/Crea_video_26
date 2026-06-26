// ─── Utilitaires partagés du pipeline ─────────────────────────────────────────

import { promises as fs } from "fs";
import os from "os";
import path from "path";

/** Racine des fichiers temporaires de génération. */
export function racineTmp(): string {
  return path.join(os.tmpdir(), "crea-video");
}

/** Dossier de travail d'un job (créé si absent). */
export function dossierJob(jobId: string): string {
  return path.join(racineTmp(), jobId);
}

/** Crée les sous-dossiers audio/ et images/ d'un job. */
export async function preparerDossiers(jobId: string): Promise<{
  base: string;
  audio: string;
  images: string;
}> {
  const base = dossierJob(jobId);
  const audio = path.join(base, "audio");
  const images = path.join(base, "images");
  await fs.mkdir(audio, { recursive: true });
  await fs.mkdir(images, { recursive: true });
  return { base, audio, images };
}

/** Supprime le dossier de travail d'un job (nettoyage final, best-effort). */
export async function nettoyerJob(jobId: string): Promise<void> {
  try {
    await fs.rm(dossierJob(jobId), { recursive: true, force: true });
    console.log(`[pipeline:util] Dossier temporaire du job ${jobId} nettoyé.`);
  } catch {
    // Best-effort : on ignore les erreurs de nettoyage.
  }
}

/** Lit la durée (secondes) d'un fichier audio via music-metadata. */
export async function dureeAudio(chemin: string, fallback: number): Promise<number> {
  try {
    const mm = await import("music-metadata");
    const meta = await mm.parseFile(chemin);
    const d = meta.format.duration;
    if (typeof d === "number" && Number.isFinite(d) && d > 0) return d;
  } catch (err) {
    console.warn(
      `[pipeline:util] Durée audio illisible pour ${path.basename(chemin)}, ` +
        `utilisation du fallback ${fallback}s.`
    );
  }
  return fallback;
}
