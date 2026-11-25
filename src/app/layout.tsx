import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/info-tip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Forkly — Seu restaurante. Sob controle.", template: "%s · Forkly" },
  description: "Pedidos, finanças, estoque, cardápio e equipe do seu restaurante em um só lugar. Teste grátis por 7 dias.",
};

export const viewport: Viewport = { themeColor: "#0a1120", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" toastOptions={{ classNames: { toast: "!rounded-lg !shadow-pop !border-0 !font-sans !bg-[var(--surface-2)] !text-[var(--ink)]" } }} />
      </body>
    </html>
  );
}
