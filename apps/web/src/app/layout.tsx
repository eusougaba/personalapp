import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Forja", template: "%s · Forja" },
  description: "Gestão de alunos, planos, agenda, treinos e cobranças para personal trainers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0E0F0C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
