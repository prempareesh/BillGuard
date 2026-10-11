import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIAssistantChat } from "@/components/audit/AIAssistantChat";
import { I18nProvider } from "@/components/providers/I18nProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BillGuard — Official Electricity Tariff Audit & Consumer Transparency",
  description:
    "Official Andhra Pradesh Electricity Regulatory Commission (APERC) consumer tariff verification platform. Deterministic statutory audit, overcharge detection, and dispute resolution.",
  keywords: [
    "electricity bill audit",
    "APERC tariff rules",
    "APSPDCL",
    "APCPDCL",
    "APEPDCL",
    "power tariff compliance",
    "utility billing dispute",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#0F172A] font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <I18nProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <AIAssistantChat />
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
