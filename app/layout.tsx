import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CréaVidéo — Générateur de vidéos explicatives IA",
  description:
    "Transformez vos prompts, scripts ou documents en vidéos whiteboard animées grâce à l'intelligence artificielle.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
