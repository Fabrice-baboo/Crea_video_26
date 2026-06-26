import { NextRequest } from "next/server";
import { promises as fs, createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { dossierJob } from "@/lib/pipeline/util";

export const runtime = "nodejs";

// Sert la vidéo finale d'un job depuis le dossier temporaire local, lorsque
// Supabase n'est pas configuré. Gère les requêtes Range (seek dans le lecteur).

function fluxFichier(
  chemin: string,
  options?: { start?: number; end?: number }
): ReadableStream {
  // Adapte un flux de lecture Node en flux Web pour la réponse.
  return Readable.toWeb(createReadStream(chemin, options)) as ReadableStream;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Empêche toute remontée de chemin via jobId.
  const jobId = path.basename(params.jobId);
  const chemin = path.join(dossierJob(jobId), "output.mp4");

  let taille: number;
  try {
    const stat = await fs.stat(chemin);
    taille = stat.size;
  } catch {
    return new Response(JSON.stringify({ erreur: "Vidéo introuvable." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const range = req.headers.get("range");
  if (range) {
    const correspondance = /bytes=(\d*)-(\d*)/.exec(range);
    const debut = correspondance?.[1] ? parseInt(correspondance[1], 10) : 0;
    const fin = correspondance?.[2]
      ? parseInt(correspondance[2], 10)
      : taille - 1;

    if (debut >= taille || fin >= taille) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${taille}` },
      });
    }

    return new Response(fluxFichier(chemin, { start: debut, end: fin }), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${debut}-${fin}/${taille}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(fin - debut + 1),
        "Content-Type": "video/mp4",
      },
    });
  }

  return new Response(fluxFichier(chemin), {
    status: 200,
    headers: {
      "Content-Length": String(taille),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    },
  });
}
