import { NextRequest, NextResponse } from "next/server";
import { extraireTexteDocument } from "@/lib/extraction";

// Extraction de PDF/Word : require dynamiques + parsing → runtime Node.js requis.
export const runtime = "nodejs";

// Limite de taille du fichier importé (20 Mo).
const TAILLE_MAX = 20 * 1024 * 1024;

/**
 * POST multipart/form-data { fichier } → { texte, nom, caracteres, tronque }.
 * Transforme un document de référence importé en texte exploitable par l'IA.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const fichier = form.get("fichier");

    if (!(fichier instanceof File)) {
      return NextResponse.json(
        { erreur: "Aucun fichier reçu." },
        { status: 400 }
      );
    }

    if (fichier.size === 0) {
      return NextResponse.json({ erreur: "Fichier vide." }, { status: 400 });
    }

    if (fichier.size > TAILLE_MAX) {
      return NextResponse.json(
        { erreur: "Fichier trop volumineux (max 20 Mo)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fichier.arrayBuffer());
    const { texte, caracteres, tronque } = await extraireTexteDocument({
      nom: fichier.name,
      mime: fichier.type,
      buffer,
    });

    return NextResponse.json({ texte, nom: fichier.name, caracteres, tronque });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[API /extraire-document]", message);
    return NextResponse.json({ erreur: message }, { status: 500 });
  }
}
