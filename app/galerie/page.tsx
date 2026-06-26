"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import VideoCard from "@/components/VideoCard";
import { LayoutGrid, Plus } from "lucide-react";
import type { Video } from "@/lib/types";
import Link from "next/link";

// Vidéos de démonstration pour la galerie
const VIDEOS_DEMO: Video[] = [
  {
    id: "demo-1",
    titre: "L'intelligence artificielle pour les débutants",
    prompt: "Explique le fonctionnement de l'intelligence artificielle générative à des débutants",
    statut: "termine",
    url_video:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    url_miniature: "https://picsum.photos/seed/ai-demo/640/360",
    duree_secondes: 102,
    cree_le: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    parametres: {
      prompt: "Explique le fonctionnement de l'intelligence artificielle générative",
      style_rendu: "canvas",
      style_canvas: "whiteboard",
      voix: "solo-female-3",
      langue_narration: "french",
      couleur: true,
      musique: "lofi",
      orientation: "landscape",
      rythme: "normal",
      style_stylet: "stylus",
    },
  },
  {
    id: "demo-2",
    titre: "Le changement climatique expliqué simplement",
    prompt: "Présente les causes et conséquences du changement climatique pour un grand public",
    statut: "termine",
    url_video:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    url_miniature: "https://picsum.photos/seed/climate/640/360",
    duree_secondes: 88,
    cree_le: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    parametres: {
      prompt: "Changement climatique causes et conséquences",
      style_rendu: "sketch",
      style_sketch: "advanced",
      voix: "solo-male-3",
      langue_narration: "french",
      couleur: true,
      musique: "documentary",
      orientation: "landscape",
      rythme: "normal",
      style_stylet: "marker",
    },
  },
  {
    id: "demo-3",
    titre: "Introduction au machine learning",
    prompt: "C'est quoi le machine learning et à quoi ça sert dans le quotidien",
    statut: "termine",
    url_video:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    url_miniature: "https://picsum.photos/seed/ml-intro/640/360",
    duree_secondes: 75,
    cree_le: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    parametres: {
      prompt: "Introduction au machine learning pour le grand public",
      style_rendu: "canvas",
      style_canvas: "modern_minimal",
      voix: "solo-female-4",
      langue_narration: "french",
      couleur: false,
      musique: "engaging",
      orientation: "landscape",
      rythme: "fast",
      style_stylet: "stylus",
    },
  },
];

export default function GaleriePage() {
  const [videos] = useState<Video[]>(VIDEOS_DEMO);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <NavBar />

      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="w-5 h-5 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Galerie</h1>
            </div>
            <p className="text-slate-400 text-sm">
              {videos.length} vidéo{videos.length > 1 ? "s" : ""} générée
              {videos.length > 1 ? "s" : ""}
            </p>
          </div>

          <Link
            href="/playground"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle vidéo
          </Link>
        </div>

        {/* Note démo */}
        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
          <strong className="text-slate-300">Galerie de démonstration</strong> — Ces vidéos sont
          des exemples. En production, cette page affichera les vidéos que tu as
          générées par la pipeline custom.
        </div>

        {/* Grille */}
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <LayoutGrid className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-2">
              Aucune vidéo pour l&apos;instant
            </p>
            <p className="text-slate-600 text-sm mb-6">
              Crée ta première vidéo dans le playground.
            </p>
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Créer une vidéo
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
