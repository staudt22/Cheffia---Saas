import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Forkly — Your restaurant. Under control.", template: "%s · Forkly" },
  description: "Orders, finances, inventory, menu and team for restaurants — in one place, made to feel like your own.",
};

export const viewport: Viewport = { themeColor: "#f6f4ef" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="bottom-right" toastOptions={{ classNames: { toast: "!rounded-lg !shadow-pop !border-0 !font-sans" } }} />
      </body>
    </html>
  );
}
