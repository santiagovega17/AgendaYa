import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GlassBackground } from "@/components/ui/GlassBackground";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AgendaYa — Gestión de agenda y reservas",
  description: "Sistema de gestión de agenda y reservas para profesionales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <GlassBackground />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
