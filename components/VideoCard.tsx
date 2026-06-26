"use client";

import { useState } from "react";
import { Play, Download, X, Clock, Calendar } from "lucide-react";
import type { Video } from "@/lib/types";

interface Props {
  video: Video;
}

function formatDuree(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function VideoCard({ video }: Props) {
  const [lecteurOuvert, setLecteurOuvert] = useState(false);

  return (
    <>
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all group">
        {/* Miniature */}
        <div className="relative aspect-video bg-slate-800 overflow-hidden">
          {video.url_miniature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.url_miniature}
              alt={video.titre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full shimmer" />
          )}

          {/* Overlay play */}
          {video.url_video && (
            <button
              onClick={() => setLecteurOuvert(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                <Play className="w-6 h-6 text-slate-900 ml-1" />
              </div>
            </button>
          )}

          {/* Durée */}
          {video.duree_secondes && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuree(video.duree_secondes)}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-white text-sm line-clamp-2 leading-snug">
            {video.titre}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2">{video.prompt}</p>

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {formatDate(video.cree_le)}
            </span>

            <div className="flex gap-1">
              {video.url_video && (
                <>
                  <button
                    onClick={() => setLecteurOuvert(true)}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    title="Lire la vidéo"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={video.url_video}
                    download
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal lecteur */}
      {lecteurOuvert && video.url_video && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLecteurOuvert(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLecteurOuvert(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1 text-sm"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>

            <video
              src={video.url_video}
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
