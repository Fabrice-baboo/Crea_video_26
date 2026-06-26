// ─── Étape 4 — Assemblage vidéo (ffmpeg) ──────────────────────────────────────
// Un clip par scène (image fixe + voix off), enchaînés avec un fondu (xfade),
// musique de fond optionnelle à 15 %, export MP4. Upload Supabase optionnel.

import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import type { ParamsGeneration } from "@/lib/types";
import type { ClipScene } from "./types";

if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);

const DUREE_FONDU = 0.3; // secondes

/** Résolution de sortie selon l'orientation. */
function resolution(params: ParamsGeneration): { l: number; h: number } {
  return params.orientation === "portrait"
    ? { l: 1080, h: 1920 }
    : { l: 1920, h: 1080 };
}

/** Exécute une commande fluent-ffmpeg en promesse, avec erreurs françaises. */
function lancerFfmpeg(commande: ffmpeg.FfmpegCommand, etape: string): Promise<void> {
  return new Promise((resolve, reject) => {
    commande
      .on("end", () => resolve())
      .on("error", (err: Error) => {
        if (/ENOENT|not found|Cannot find ffmpeg/i.test(err.message)) {
          reject(
            new Error(
              "ffmpeg introuvable sur la machine hôte. Installez-le " +
                "(macOS : brew install ffmpeg) puis relancez."
            )
          );
        } else {
          reject(new Error(`Échec ffmpeg (${etape}) : ${err.message}`));
        }
      })
      .run();
  });
}

/** Génère un clip MP4 (image fixe + audio) pour une scène. */
async function genererClip(
  clip: ClipScene,
  params: ParamsGeneration,
  cheminSortie: string
): Promise<void> {
  const { l, h } = resolution(params);
  const vf = [
    `scale=${l}:${h}:force_original_aspect_ratio=decrease`,
    `pad=${l}:${h}:(ow-iw)/2:(oh-ih)/2:color=white`,
    "setsar=1",
    "fps=25",
  ].join(",");

  await lancerFfmpeg(
    ffmpeg()
      .input(clip.chemin_image)
      .inputOptions(["-loop 1"])
      .input(clip.chemin_audio)
      .outputOptions([
        "-c:v libx264",
        `-t ${clip.duree_secondes.toFixed(3)}`,
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        `-vf ${vf}`,
        "-shortest",
      ])
      .output(cheminSortie),
    `clip scène ${clip.numero}`
  );
}

/** Combine les clips avec fondus + musique de fond optionnelle → MP4 final. */
async function combinerClips(
  clipsMp4: string[],
  durees: number[],
  params: ParamsGeneration,
  cheminSortie: string,
  cheminMusique?: string
): Promise<void> {
  const cmd = ffmpeg();
  clipsMp4.forEach((c) => cmd.input(c));

  const filtres: string[] = [];
  let labelVideo: string;
  let labelAudio: string;

  if (clipsMp4.length === 1) {
    // Une seule scène : pas de fondu.
    labelVideo = "0:v";
    labelAudio = "0:a";
  } else {
    // Chaîne d'xfade (vidéo) + acrossfade (audio), offsets cumulés.
    let accDuree = durees[0];
    let vPrec = "0:v";
    let aPrec = "0:a";
    for (let i = 1; i < clipsMp4.length; i++) {
      const offset = Math.max(0, accDuree - DUREE_FONDU);
      const vOut = `v${i}`;
      const aOut = `a${i}`;
      filtres.push(
        `[${vPrec}][${i}:v]xfade=transition=fade:duration=${DUREE_FONDU}:offset=${offset.toFixed(3)}[${vOut}]`
      );
      filtres.push(`[${aPrec}][${i}:a]acrossfade=d=${DUREE_FONDU}[${aOut}]`);
      accDuree = accDuree + durees[i] - DUREE_FONDU;
      vPrec = vOut;
      aPrec = aOut;
    }
    labelVideo = vPrec;
    labelAudio = aPrec;
  }

  // Musique de fond optionnelle (volume 15 %). Source : piste Suno fournie par
  // l'orchestrateur, sinon repli sur un fichier local public/music/{genre}.mp3.
  let sourceMusique = "";
  if (params.musique !== "none") {
    if (cheminMusique && existsSync(cheminMusique)) {
      sourceMusique = cheminMusique;
    } else {
      const local = path.join(process.cwd(), "public", "music", `${params.musique}.mp3`);
      if (existsSync(local)) sourceMusique = local;
    }
  }

  if (sourceMusique) {
    const idxMusique = clipsMp4.length; // dernier input
    cmd.input(sourceMusique).inputOptions(["-stream_loop -1"]);
    filtres.push(`[${idxMusique}:a]volume=0.15[bgm]`);
    filtres.push(
      `[${labelAudio}][bgm]amix=inputs=2:duration=first:dropout_transition=0[amix]`
    );
    labelAudio = "amix";
    console.log(
      `[pipeline:assemblage] Musique de fond : ${path.basename(sourceMusique)} (15 %).`
    );
  } else if (params.musique !== "none") {
    console.warn(
      `[pipeline:assemblage] Aucune piste musicale (${params.musique}) disponible — ` +
        `montage sans musique.`
    );
  }

  // complexFilter exige au moins un filtre ; pour 1 clip sans musique, on en
  // ajoute un neutre pour mapper proprement les sorties.
  if (filtres.length === 0) {
    filtres.push(`[0:v]null[${(labelVideo = "vout")}]`);
    filtres.push(`[0:a]anull[${(labelAudio = "aout")}]`);
  }

  await lancerFfmpeg(
    cmd
      .complexFilter(filtres, [labelVideo, labelAudio])
      .outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        "-movflags +faststart",
      ])
      .output(cheminSortie),
    "montage final"
  );
}

/**
 * Assemble les clips en une vidéo finale, l'upload sur Supabase si configuré,
 * et retourne l'URL accessible de la vidéo.
 */
export async function assemblerVideo(
  jobId: string,
  clips: ClipScene[],
  params: ParamsGeneration,
  dossierBase: string,
  cheminMusique?: string
): Promise<{ url: string; chemin_local: string }> {
  if (clips.length === 0) {
    throw new Error("Aucun clip à assembler.");
  }

  console.log(`[pipeline:assemblage] Génération de ${clips.length} clips…`);
  const dossierClips = path.join(dossierBase, "clips");
  await fs.mkdir(dossierClips, { recursive: true });

  const clipsMp4: string[] = [];
  const durees: number[] = [];
  // Génération séquentielle des clips (ffmpeg est déjà gourmand en CPU).
  for (const clip of clips) {
    const cheminClip = path.join(dossierClips, `clip_${clip.numero}.mp4`);
    await genererClip(clip, params, cheminClip);
    clipsMp4.push(cheminClip);
    durees.push(clip.duree_secondes);
    console.log(`[pipeline:assemblage] Clip ${clip.numero} prêt.`);
  }

  const cheminFinal = path.join(dossierBase, "output.mp4");
  console.log("[pipeline:assemblage] Montage final (fondus + musique)…");
  await combinerClips(clipsMp4, durees, params, cheminFinal, cheminMusique);
  console.log(`[pipeline:assemblage] Vidéo finale : ${cheminFinal}`);

  // Upload Supabase optionnel.
  const url = await uploaderSiPossible(jobId, cheminFinal);
  return { url, chemin_local: cheminFinal };
}

/** Upload vers Supabase Storage si configuré, sinon URL locale servie par l'app. */
async function uploaderSiPossible(jobId: string, cheminLocal: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Pas de Supabase : la vidéo est servie localement par /api/video/[jobId].
    console.log("[pipeline:assemblage] Supabase non configuré — URL locale.");
    return `/api/video/${jobId}`;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey);
    const fichier = await fs.readFile(cheminLocal);
    const chemin = `${jobId}/output.mp4`;

    const { error } = await supabase.storage.from("videos").upload(chemin, fichier, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("videos").getPublicUrl(chemin);
    console.log(`[pipeline:assemblage] Vidéo uploadée sur Supabase : ${data.publicUrl}`);
    return data.publicUrl;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[pipeline:assemblage] Upload Supabase échoué (${msg}) — repli URL locale.`
    );
    return `/api/video/${jobId}`;
  }
}
