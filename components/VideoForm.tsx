"use client";

import { useRef, useState } from "react";
import {
  Wand2,
  FileText,
  Palette,
  Mic,
  Music,
  Monitor,
  Zap,
  Pen,
  ChevronDown,
  ChevronUp,
  Upload,
  FileUp,
  X,
  Loader2,
} from "lucide-react";
import type { ParamsGeneration } from "@/lib/types";

interface Props {
  onSoumettre: (params: ParamsGeneration) => void;
  chargement: boolean;
}

const STYLES_CANVAS = [
  { valeur: "whiteboard", label: "Tableau blanc" },
  { valeur: "neon", label: "Néon" },
  { valeur: "chalkboard", label: "Tableau noir" },
  { valeur: "modern_minimal", label: "Moderne minimal" },
  { valeur: "playful", label: "Ludique" },
  { valeur: "technical", label: "Technique" },
  { valeur: "editorial", label: "Éditorial" },
  { valeur: "marker", label: "Marqueur" },
  { valeur: "illustrations", label: "Illustrations" },
  { valeur: "chalkboard_black_on_white", label: "Craie (noir/blanc)" },
] as const;

const STYLES_SKETCH = [
  { valeur: "classic", label: "Classique" },
  { valeur: "improved", label: "Amélioré (bêta)" },
  { valeur: "advanced", label: "Avancé" },
  { valeur: "creative", label: "Créatif" },
  { valeur: "infographics", label: "Infographies" },
  { valeur: "chalkboard_black_on_white", label: "Craie (noir/blanc)" },
] as const;

const VOIX = [
  { valeur: "solo-female-3", label: "Féminine 1" },
  { valeur: "solo-female-4", label: "Féminine 2" },
  { valeur: "solo-male-3", label: "Masculine 1" },
  { valeur: "solo-male-4", label: "Masculine 2" },
] as const;

const LANGUES = [
  { valeur: "french", label: "Français" },
  { valeur: "english", label: "Anglais" },
  { valeur: "spanish", label: "Espagnol" },
  { valeur: "german", label: "Allemand" },
  { valeur: "italian", label: "Italien" },
  { valeur: "portuguese", label: "Portugais" },
];

const MUSIQUES = [
  { valeur: "none", label: "Aucune" },
  { valeur: "jazz", label: "Jazz" },
  { valeur: "lofi", label: "Lo-fi" },
  { valeur: "dramatic", label: "Dramatique" },
  { valeur: "engaging", label: "Dynamique" },
  { valeur: "hyper", label: "Hyper" },
  { valeur: "inspirational", label: "Inspirant" },
  { valeur: "documentary", label: "Documentaire" },
] as const;

export default function VideoForm({ onSoumettre, chargement }: Props) {
  const [params, setParams] = useState<ParamsGeneration>({
    prompt: "",
    script_personnalise: "",
    moteur: "golpo_canvas",
    style_canvas: "whiteboard",
    style_sketch: "classic",
    voix: "solo-female-3",
    langue_narration: "french",
    couleur: true,
    musique: "lofi",
    orientation: "landscape",
    rythme: "normal",
    style_stylet: "stylus",
  });

  const [avance, setAvance] = useState(false);

  // Import du document de référence (PDF/Word).
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const [refTronquee, setRefTronquee] = useState(false);

  function maj<K extends keyof ParamsGeneration>(
    champ: K,
    valeur: ParamsGeneration[K]
  ) {
    setParams((p) => ({ ...p, [champ]: valeur }));
  }

  async function importerDocument(fichier: File) {
    setErreurImport(null);
    setRefTronquee(false);
    setImportEnCours(true);
    try {
      const data = new FormData();
      data.append("fichier", fichier);
      const res = await fetch("/api/extraire-document", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erreur || `Erreur HTTP ${res.status}`);

      setParams((p) => ({
        ...p,
        reference_document: json.texte,
        reference_nom: json.nom,
      }));
      setRefTronquee(Boolean(json.tronque));
    } catch (err) {
      setErreurImport(
        err instanceof Error ? err.message : "Échec de l'import du document."
      );
    } finally {
      setImportEnCours(false);
    }
  }

  function retirerDocument() {
    setParams((p) => ({
      ...p,
      reference_document: undefined,
      reference_nom: undefined,
    }));
    setErreurImport(null);
    setRefTronquee(false);
    if (inputFichierRef.current) inputFichierRef.current.value = "";
  }

  function handleSoumettre(e: React.FormEvent) {
    e.preventDefault();
    onSoumettre(params);
  }

  return (
    <form
      onSubmit={handleSoumettre}
      className="space-y-6 bg-slate-900 rounded-2xl p-6 border border-slate-800"
    >
      {/* Prompt */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
          <Wand2 className="w-4 h-4 text-blue-400" />
          Sujet ou prompt
        </label>
        <textarea
          rows={4}
          placeholder="Ex : Explique le fonctionnement de l'intelligence artificielle générative à des débutants…"
          value={params.prompt}
          onChange={(e) => maj("prompt", e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Script personnalisé */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Script personnalisé{" "}
          <span className="text-xs font-normal text-slate-500">(optionnel)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Colle ici ton script si tu ne veux pas que l'IA le génère…"
          value={params.script_personnalise}
          onChange={(e) => maj("script_personnalise", e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Document de référence */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
          <FileUp className="w-4 h-4 text-blue-400" />
          Document de référence{" "}
          <span className="text-xs font-normal text-slate-500">
            (PDF, Word — optionnel)
          </span>
        </label>

        <input
          ref={inputFichierRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importerDocument(f);
          }}
        />

        {!params.reference_nom ? (
          <button
            type="button"
            onClick={() => inputFichierRef.current?.click()}
            disabled={importEnCours}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 text-sm text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
          >
            {importEnCours ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Lecture du document…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importer un fichier (PDF, .docx, .doc, .txt)
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-100 truncate">
                {params.reference_nom}
              </div>
              <div className="text-xs text-slate-500">
                {(params.reference_document?.length ?? 0).toLocaleString("fr-FR")}{" "}
                caractères extraits
                {refTronquee && " (tronqué)"}
              </div>
            </div>
            <button
              type="button"
              onClick={retirerDocument}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex-shrink-0"
              aria-label="Retirer le document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {refTronquee && (
          <p className="mt-2 text-xs text-amber-400">
            Document long : seuls les 20 000 premiers caractères sont utilisés.
          </p>
        )}
        {erreurImport && (
          <p className="mt-2 text-xs text-red-400">{erreurImport}</p>
        )}
      </div>

      {/* Moteur */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
          <Palette className="w-4 h-4 text-blue-400" />
          Moteur vidéo
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                v: "golpo_canvas",
                titre: "Golpo Canvas",
                desc: "Images stylisées IA",
              },
              {
                v: "golpo_sketch",
                titre: "Golpo Sketch",
                desc: "Dessin ligne à ligne",
              },
            ] as const
          ).map(({ v, titre, desc }) => (
            <button
              key={v}
              type="button"
              onClick={() => maj("moteur", v)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                params.moteur === v
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="font-semibold text-sm text-white">{titre}</div>
              <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="text-sm font-semibold text-slate-300 mb-2 block">
          Style visuel
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(params.moteur === "golpo_canvas"
            ? STYLES_CANVAS
            : STYLES_SKETCH
          ).map(({ valeur, label }) => {
            const champ =
              params.moteur === "golpo_canvas" ? "style_canvas" : "style_sketch";
            const actif = params[champ] === valeur;
            return (
              <button
                key={valeur}
                type="button"
                onClick={() => maj(champ as "style_canvas" | "style_sketch", valeur as never)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  actif
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Voix + Langue */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
            <Mic className="w-4 h-4 text-blue-400" />
            Voix
          </label>
          <select
            value={params.voix}
            onChange={(e) => maj("voix", e.target.value as ParamsGeneration["voix"])}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {VOIX.map(({ valeur, label }) => (
              <option key={valeur} value={valeur}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-300 mb-2 block">
            Langue de narration
          </label>
          <select
            value={params.langue_narration}
            onChange={(e) => maj("langue_narration", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUES.map(({ valeur, label }) => (
              <option key={valeur} value={valeur}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Musique + Couleur */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
            <Music className="w-4 h-4 text-blue-400" />
            Musique d'ambiance
          </label>
          <select
            value={params.musique}
            onChange={(e) => maj("musique", e.target.value as ParamsGeneration["musique"])}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MUSIQUES.map(({ valeur, label }) => (
              <option key={valeur} value={valeur}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-300 mb-2 block">
            Mode couleur
          </label>
          <div className="flex gap-2 mt-0.5">
            {[
              { v: true, l: "Couleur" },
              { v: false, l: "N&B" },
            ].map(({ v, l }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => maj("couleur", v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  params.couleur === v
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Options avancées */}
      <div>
        <button
          type="button"
          onClick={() => setAvance(!avance)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {avance ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Options avancées
        </button>

        {avance && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            {/* Orientation */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <Monitor className="w-3.5 h-3.5" />
                Orientation
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { v: "landscape", l: "Paysage" },
                    { v: "portrait", l: "Portrait" },
                  ] as const
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => maj("orientation", v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      params.orientation === v
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Rythme */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <Zap className="w-3.5 h-3.5" />
                Rythme des scènes
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { v: "normal", l: "Normal" },
                    { v: "fast", l: "Rapide" },
                  ] as const
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => maj("rythme", v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      params.rythme === v
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Style stylet */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <Pen className="w-3.5 h-3.5" />
                Style de stylet
              </label>
              <div className="flex gap-1">
                {(
                  [
                    { v: "stylus", l: "Stylet" },
                    { v: "marker", l: "Marqueur" },
                    { v: "pen", l: "Stylo" },
                  ] as const
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => maj("style_stylet", v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      params.style_stylet === v
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bouton */}
      <button
        type="submit"
        disabled={chargement || params.prompt.trim().length < 5}
        className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-base"
      >
        {chargement ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Génération en cours…
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Générer la vidéo
          </>
        )}
      </button>
    </form>
  );
}
