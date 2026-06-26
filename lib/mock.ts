// ─── Moteur mock (simulation locale) ─────────────────────────────────────────
// Fallback quand aucune clé n'est configurée (ou NEXT_PUBLIC_MOCK_MODE=true) :
// simule une génération de ~15 s en mémoire et renvoie des MP4 d'exemple.
// Aucune dépendance externe — utile pour tester l'UI sans consommer de crédits.

import type {
  ParamsGeneration,
  ReponseGeneration,
  ReponseStatut,
} from "./types";

// Stockage en mémoire des jobs mock (réinitialisé au redémarrage serveur).
const mockJobs = new Map<
  string,
  { startTime: number; params: ParamsGeneration }
>();

export function mockGenerer(params: ParamsGeneration): ReponseGeneration {
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

export function mockStatut(jobId: string): ReponseStatut {
  const job = mockJobs.get(jobId);

  // Job inconnu → on simule quand même.
  const startTime = job?.startTime ?? Date.now() - 5000;
  const elapsed = Date.now() - startTime;

  // Simulation : 15 secondes de traitement.
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

  // Terminé.
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
