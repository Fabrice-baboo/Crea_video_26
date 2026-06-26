// ─── Extraction de texte depuis un document de référence ─────────────────────
// Prend en charge PDF, Word moderne (.docx), Word ancien (.doc) et texte brut
// (.txt/.md). Utilisé par la route /api/extraire-document pour transformer un
// fichier importé en texte que l'IA suivra lors de la génération du script.

// Plafond de caractères conservés : au-delà, on tronque pour éviter de saturer
// le contexte du modèle (le script est généré à partir de ce texte).
export const MAX_CARACTERES = 20000;

export interface ResultatExtraction {
  texte: string;
  caracteres: number;
  tronque: boolean;
}

type TypeDocument = "pdf" | "docx" | "doc" | "texte";

/** Devine le type de document à partir du nom de fichier et du type MIME. */
function detecterType(nom: string, mime: string): TypeDocument | null {
  const ext = nom.toLowerCase().split(".").pop() || "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (ext === "doc" || mime === "application/msword") return "doc";
  if (ext === "txt" || ext === "md" || mime.startsWith("text/")) return "texte";
  return null;
}

/** Normalise les espaces multiples et lignes vides en excès. */
function nettoyer(texte: string): string {
  return texte
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extrairePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const res = await parser.getText();
  return res.text;
}

async function extraireDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const res = await mammoth.extractRawText({ buffer });
  return res.value;
}

async function extraireDoc(buffer: Buffer): Promise<string> {
  const mod = await import("word-extractor");
  const WordExtractor = mod.default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return doc.getBody();
}

/**
 * Extrait le texte d'un document de référence selon son type.
 * Lève une erreur (message français) si le format n'est pas pris en charge.
 */
export async function extraireTexteDocument(
  fichier: { nom: string; mime: string; buffer: Buffer }
): Promise<ResultatExtraction> {
  const type = detecterType(fichier.nom, fichier.mime);
  if (!type) {
    throw new Error(
      "Format non pris en charge. Importe un fichier PDF, Word (.docx/.doc), .txt ou .md."
    );
  }

  let brut: string;
  try {
    if (type === "pdf") brut = await extrairePdf(fichier.buffer);
    else if (type === "docx") brut = await extraireDocx(fichier.buffer);
    else if (type === "doc") brut = await extraireDoc(fichier.buffer);
    else brut = fichier.buffer.toString("utf-8");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Impossible de lire le document (${type}) : ${msg}`);
  }

  const propre = nettoyer(brut);
  if (!propre) {
    throw new Error(
      "Aucun texte exploitable n'a été trouvé dans le document (fichier vide, scanné ou protégé ?)."
    );
  }

  const tronque = propre.length > MAX_CARACTERES;
  const texte = tronque ? propre.slice(0, MAX_CARACTERES) : propre;
  return { texte, caracteres: texte.length, tronque };
}
