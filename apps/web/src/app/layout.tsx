import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PersonalApp", template: "%s · PersonalApp" },
  description: "Gestão de alunos, planos, agenda, treinos e cobranças para personal trainers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#09090b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
