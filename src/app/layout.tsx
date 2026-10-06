import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/Toaster";
import { StoreProvider } from "@/store/StoreProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Stockroom · Inventory Management", template: "%s · Stockroom" },
  description: "Inventory directory and product onboarding wizard built with Next.js, Redux Toolkit and Tailwind CSS.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <StoreProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
