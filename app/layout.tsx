import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SosedBeri — аренда вещей рядом",
    template: "%s | SosedBeri",
  },
  description:
    "SosedBeri помогает брать и сдавать вещи в аренду рядом: инструменты, технику, товары для отдыха и дома.",
  applicationName: "SosedBeri",
  metadataBase: new URL("https://sosedberi.vercel.app"),
  openGraph: {
    title: "SosedBeri — аренда вещей рядом",
    description:
      "Берите нужные вещи у соседей и сдавайте свои вещи в аренду.",
    url: "https://sosedberi.vercel.app",
    siteName: "SosedBeri",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-[#F7F7F5]">
        <Navbar />
        {children}
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}
