// ─── Musique de fond (Kie.ai → Suno) ──────────────────────────────────────────
// Génère une piste INSTRUMENTALE de fond et la télécharge en local.
// Suno utilise des endpoints LEGACY (/api/v1/generate + /api/v1/generate/
// record-info), distincts du pattern unifié image/TTS (/api/v1/jobs/*).
//
// Doc : https://docs.kie.ai/suno-api/generate-music

import path from "path";
import type { MusiqueAmbiante, ParamsGeneration } from "@/lib/types";
import { telechargerFichier } from "./kie";

const BASE = process.env.KIE_API_URL || "https://api.kie.ai";
const MODELE = process.env.KIE_SUNO_MODEL || "V5";

// Description (prompt, ≤500 car.) de la piste instrumentale par genre.
const PROMPT_MUSIQUE: Record<Exclude<MusiqueAmbiante, "none">, string> = {
  jazz: "Smooth mellow jazz, soft piano and brushed drums, relaxed background instrumental",
  lofi: "Chill lo-fi hip hop, mellow beats, warm and calm background instrumental",
  dramatic: "Dramatic cinematic orchestral score, tension and emotion, instrumental",
  engaging: "Upbeat motivating corporate background music, light and positive, instrumental",
  hyper: "Energetic fast-paced electronic music, driving beat, instrumental",
  inspirational: "Inspirational uplifting piano and strings, hopeful and warm, instrumental",
  documentary: "Calm ambient documentary background music, subtle and neutral, instrumental",
};

function cleKie(): string {
  const k = process.env.KIE_API_KEY;
  if (!k) throw new Error("Clé KIE_API_KEY manquante.");
  return k;
}

interface RecordSuno {
  code?: number;
  data?: {
    status?: string;
    response?: { sunoData?: Array<{ audioUrl?: string; duration?: number }> };
    errorMessage?: string;
  };
}

const ETATS_ECHEC = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

/** Crée une tâche Suno et retourne son taskId. */
async function creerTacheSuno(genre: Exclude<MusiqueAmbiante, "none">): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleKie()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: PROMPT_MUSIQUE[genre],
      customMode: false,
      instrumental: true,
      model: MODELE,
      // callBackUrl est requis par le schéma ; on poll quand même le résultat.
      callBackUrl:
        process.env.KIE_CALLBACK_URL || "https://crea-video.local/suno-callback",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    code?: number;
    msg?: string;
    data?: { taskId?: string };
  };
  if (!res.ok || data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno a refusé la tâche : ${data.msg || res.status}`);
  }
  return data.data.taskId;
}

/** Attend la fin de la génération Suno et retourne l'URL du MP3 final. */
async function attendreSuno(
  taskId: string,
  options: { intervalleMs?: number; maxTentatives?: number } = {}
): Promise<string> {
  const intervalle = options.intervalleMs ?? 4000;
  const maxTentatives = options.maxTentatives ?? 90; // ~6 min à 4 s

  for (let i = 0; i < maxTentatives; i++) {
    await new Promise((r) => setTimeout(r, intervalle));

    let res: Response;
    try {
      res = await fetch(`${BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${cleKie()}` },
      });
    } catch {
      continue; // erreur réseau transitoire
    }

    const corps = (await res.json().catch(() => ({}))) as RecordSuno;
    const statut = corps.data?.status;

    if (statut === "SUCCESS") {
      const url = corps.data?.response?.sunoData?.[0]?.audioUrl;
      if (!url) throw new Error("Suno : génération réussie mais audioUrl absente.");
      return url;
    }
    if (statut && ETATS_ECHEC.has(statut)) {
      throw new Error(
        `Suno en échec (${statut})${corps.data?.errorMessage ? ` : ${corps.data.errorMessage}` : ""}.`
      );
    }
    // PENDING / TEXT_SUCCESS / FIRST_SUCCESS → on patiente le fichier final.
  }
  throw new Error("Délai dépassé pour la génération musicale Suno.");
}

/**
 * Génère la musique de fond et la télécharge dans le dossier du job.
 * @returns le chemin local du MP3, ou null si désactivée/échouée (non bloquant).
 */
export async function genererMusiqueFond(
  params: ParamsGeneration,
  dossierBase: string
): Promise<string | null> {
  if (params.musique === "none") return null;
  const genre = params.musique;

  try {
    console.log(`[pipeline:suno] Génération de la musique de fond « ${genre} »…`);
    const taskId = await creerTacheSuno(genre);
    console.log(`[pipeline:suno] Tâche Suno créée (${taskId}), attente…`);
    const url = await attendreSuno(taskId);

    const chemin = path.join(dossierBase, "musique.mp3");
    await telechargerFichier(url, chemin);
    console.log(`[pipeline:suno] Musique téléchargée → ${path.basename(chemin)}`);
    return chemin;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Non bloquant : on poursuit le montage sans musique.
    console.warn(`[pipeline:suno] Musique indisponible (${msg}) — montage sans musique.`);
    return null;
  }
}
