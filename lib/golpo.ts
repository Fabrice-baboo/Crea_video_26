// ─── Client Golpo API ─────────────────────────────────────────────────────────
// Quand GOLPO_API_KEY est défini et NEXT_PUBLIC_MOCK_MODE=false,
// les appels vont vers la vraie API Golpo.
// Sinon → mock local.

import type { ParamsGeneration, ReponseGeneration, ReponseStatut } from "./types";

const API_URL = process.env.GOLPO_API_URL || "https://video.golpoai.com/api/v2";
const API_KEY = process.env.GOLPO_API_KEY || "";
const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true" || !API_KEY;

// ── Correspondances FR → Golpo API v2 ─────────────────────────────────────────

function buildGolpoPayload(params: ParamsGeneration) {
  // Golpo n'a pas de champ « document de référence » : on l'ajoute au prompt.
  const reference = params.reference_document?.trim();
  const prompt = reference
    ? `${params.prompt}\n\nDocument de référence à suivre fidèlement :\n${reference}`
    : params.prompt;

  return {
    prompt,
    custom_script: params.script_personnalise || undefined,
    golpo_video_engine: params.moteur,
    canvas_style_variant: params.moteur === "golpo_canvas" ? params.style_canvas : undefined,
    sketch_style_variant: params.moteur === "golpo_sketch" ? params.style_sketch : undefined,
    narration_voice: params.voix,
    narration_language: params.langue_narration,
    enable_color: params.couleur,
    background_track: params.musique === "none" ? undefined : params.musique,
    video_orientation: params.orientation,
    scene_pacing: params.rythme,
    pen_animation_style: params.style_stylet,
  };
}

// ── Génération ─────────────────────────────────────────────────────────────────

export async function genererVideo(
  params: ParamsGeneration
): Promise<ReponseGeneration> {
  if (IS_MOCK) return mockGenerer(params);

  const res = await fetch(`${API_URL}/videos/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(buildGolpoPayload(params)),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Golpo API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    job_id: data.job_id,
    video_id: data.video_id,
    message: "Génération démarrée",
  };
}

// ── Statut ─────────────────────────────────────────────────────────────────────

export async function obtenirStatut(jobId: string): Promise<ReponseStatut> {
  if (IS_MOCK) return mockStatut(jobId);

  const res = await fetch(`${API_URL}/videos/status/${jobId}`, {
    headers: { "x-api-key": API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Golpo API ${res.status}`);
  }

  const data = await res.json();
  return {
    job_id: jobId,
    video_id: data.video_id,
    statut: mapStatutGolpo(data.status),
    progression: data.progress ?? 0,
    video: data.video_url
      ? {
          id: data.video_id,
          titre: data.title || "Vidéo sans titre",
          prompt: "",
          statut: "termine",
          url_video: data.video_url,
          url_miniature: data.thumbnail_url,
          duree_secondes: data.duration,
          cree_le: new Date().toISOString(),
          parametres: {} as ParamsGeneration,
        }
      : undefined,
  };
}

function mapStatutGolpo(s: string): ReponseStatut["statut"] {
  if (s === "completed") return "termine";
  if (s === "failed") return "erreur";
  if (s === "processing") return "en_cours";
  return "en_attente";
}

// ── MOCK ───────────────────────────────────────────────────────────────────────

// Stockage en mémoire des jobs mock (réinitialisé au redémarrage serveur)
const mockJobs = new Map<
  string,
  { startTime: number; params: ParamsGeneration }
>();

function mockGenerer(params: ParamsGeneration): ReponseGeneration {
  const jobId = `mock-job-${Date.now()}`;
  const videoId = `mock-video-${Date.now()}`;
  mockJobs.set(jobId, { startTime: Date.now(), params });
  return { job_id: jobId, video_id: videoId, message: "Mock: génération démarrée" };
}

const MOCK_VIDEO_SAMPLES = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
];

function mockStatut(jobId: string): ReponseStatut {
  const job = mockJobs.get(jobId);

  // Job inconnu → on simule quand même
  const startTime = job?.startTime ?? Date.now() - 5000;
  const elapsed = Date.now() - startTime;

  // Simulation : 15 secondes de traitement
  const DUREE_SIMULATION = 15_000;
  const progression = Math.min(100, Math.round((elapsed / DUREE_SIMULATION) * 100));

  if (progression < 100) {
    return {
      job_id: jobId,
      video_id: jobId.replace("job", "video"),
      statut: elapsed < 1000 ? "en_attente" : "en_cours",
      progression,
      message: getMessageProgression(progression),
    };
  }

  // Terminé
  const urlVideo =
    MOCK_VIDEO_SAMPLES[Math.floor(Math.random() * MOCK_VIDEO_SAMPLES.length)];

  return {
    job_id: jobId,
    video_id: jobId.replace("job", "video"),
    statut: "termine",
    progression: 100,
    video: {
      id: jobId.replace("job", "video"),
      titre: `Vidéo — ${job?.params.prompt.slice(0, 40) ?? "sans titre"}…`,
      prompt: job?.params.prompt ?? "",
      statut: "termine",
      url_video: urlVideo,
      url_miniature: `https://picsum.photos/seed/${jobId}/640/360`,
      duree_secondes: 90,
      cree_le: new Date().toISOString(),
      parametres: job?.params ?? ({} as ParamsGeneration),
    },
  };
}

function getMessageProgression(p: number): string {
  if (p < 10) return "Initialisation du moteur IA…";
  if (p < 30) return "Génération du script et storyboard…";
  if (p < 55) return "Création des illustrations…";
  if (p < 75) return "Synthèse vocale et animation…";
  if (p < 90) return "Montage et rendu final…";
  return "Finalisation…";
}
