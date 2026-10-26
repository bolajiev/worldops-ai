import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const display = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorldOps AI — Prompt a world. Change its fate.",
  description:
    "WorldOps AI turns a plain-language brief into a playable flood-rescue simulation. Generate a 3D world, intervene, and edit it with natural language.",
  keywords: [
    "AI",
    "3D",
    "simulation",
    "Three.js",
    "React Three Fiber",
    "Victoria VR",
    "hackathon",
  ],
  authors: [{ name: "WorldOps AI" }],
  openGraph: {
    title: "WorldOps AI — Prompt a world. Change its fate.",
    description:
      "A browser-based AI scene generator with a deterministic flood-rescue simulation underneath.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#061012",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
