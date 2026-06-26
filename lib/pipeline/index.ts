// ─── Orchestrateur du pipeline de génération custom ───────────────────────────
// Enchaîne : script (OpenRouter/Claude) → voix off (ElevenLabs) → illustrations
// (Kie/Flux-2) → assemblage (ffmpeg) → upload + nettoyage. Musique (Suno) en
// parallèle.
//
// La progression est remontée via le callback onProgression (branché sur le
// store mémoire des jobs).

import type { CoutVideo, ParamsGeneration } from "@/lib/types";
import type { ClipScene } from "./types";
import { genererStoryboard } from "./script";
import { genererVoixOff } from "./tts";
import { genererIllustrations } from "./illustrations";
import { genererAnimations } from "./animation";
import { genererMusiqueFond } from "./suno";
import { assemblerVideo } from "./assemblage";
import { calculerCout } from "./cout";
import { preparerDossiers, nettoyerJob } from "./util";

export interface ResultatPipeline {
  url: string;
  titre: string;
  duree_secondes: number;
  cout: CoutVideo;
}

/**
 * Génère une vidéo de bout en bout.
 * @returns l'URL de la vidéo finale, son titre et sa durée.
 */
export async function genererVideoPipeline(
  jobId: string,
  params: ParamsGeneration,
  onProgression: (pct: number, message: string) => void
): Promise<ResultatPipeline> {
  console.log(`[pipeline] === Démarrage du job ${jobId} ===`);

  // 0-10 % — Storyboard via Claude.
  onProgression(2, "Préparation de l'espace de travail…");
  const { base, audio, images } = await preparerDossiers(jobId);

  onProgression(5, "Génération du script et du storyboard…");
  const { storyboard, tokens_entree, tokens_sortie } = await genererStoryboard(params);
  onProgression(10, `Storyboard prêt : ${storyboard.scenes.length} scènes.`);

  // Musique de fond (Suno) lancée en parallèle dès maintenant pour masquer sa
  // latence ; on l'attendra juste avant le montage. Non bloquante (peut être null).
  const promesseMusique = genererMusiqueFond(params, base);

  // 10-35 % — Voix off (toutes scènes en parallèle).
  onProgression(15, "Synthèse de la voix off…");
  const audios = await genererVoixOff(storyboard, params, audio);
  onProgression(35, "Voix off générée.");

  // 35-50 % — Illustrations (toutes scènes en parallèle).
  onProgression(40, "Création des illustrations…");
  const illustrations = await genererIllustrations(storyboard, params, images);
  onProgression(50, "Illustrations prêtes.");

  // 50-80 % — Animation des scènes (image→vidéo, clips dans le même dossier).
  onProgression(55, "Animation des scènes (vidéo)…");
  const animations = await genererAnimations(
    storyboard,
    illustrations,
    audios,
    params,
    images
  );
  const nbAnimees = animations.filter(Boolean).length;
  onProgression(80, `Scènes animées (${nbAnimees}/${storyboard.scenes.length}).`);

  // Appariement audio + visuel par numéro de scène (clip vidéo si animé, sinon
  // image fixe en repli).
  const clips: ClipScene[] = storyboard.scenes.map((scene) => {
    const a = audios.find((x) => x.numero === scene.numero);
    const img = illustrations.find((x) => x.numero === scene.numero);
    const anim = animations.find((x) => x && x.numero === scene.numero) || null;
    if (!a || !img) {
      throw new Error(`Données manquantes pour la scène ${scene.numero}.`);
    }
    return {
      numero: scene.numero,
      chemin_image: img.chemin,
      chemin_video: anim?.chemin_video,
      chemin_audio: a.chemin,
      duree_secondes: a.duree_reelle,
    };
  });

  // On récupère la musique de fond (lancée en parallèle plus haut).
  const cheminMusique = (await promesseMusique) ?? undefined;

  // 82-95 % — Assemblage ffmpeg.
  onProgression(82, "Montage de la vidéo…");
  const { url } = await assemblerVideo(jobId, clips, params, base, cheminMusique);
  onProgression(95, "Finalisation…");

  // 95-100 % — Nettoyage (sauf si vidéo servie localement : on garde output.mp4).
  const dureeTotale = clips.reduce((acc, c) => acc + c.duree_secondes, 0);
  if (!url.startsWith("/api/video/")) {
    // Vidéo hébergée ailleurs (Supabase) : on peut tout supprimer.
    await nettoyerJob(jobId);
  }
  onProgression(100, "Vidéo prête !");

  // Estimation du coût à partir des quantités réellement consommées.
  const cout = calculerCout({
    tokensEntree: tokens_entree,
    tokensSortie: tokens_sortie,
    caracteresVoix: storyboard.scenes.reduce((acc, s) => acc + s.narration.length, 0),
    nbImages: illustrations.length,
    secondesAnimation: animations.reduce(
      (acc, a) => acc + (a?.secondes_facturees ?? 0),
      0
    ),
    nbMusiques: cheminMusique ? 1 : 0,
  });

  console.log(
    `[pipeline] === Job ${jobId} terminé (${dureeTotale.toFixed(0)}s, ` +
      `coût estimé ≈ ${cout.total_eur.toFixed(3)} €) ===`
  );
  return {
    url,
    titre: storyboard.titre,
    duree_secondes: Math.round(dureeTotale),
    cout,
  };
}
