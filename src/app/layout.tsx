import "./globals.css";
import { Cinzel, Inter } from "next/font/google";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Royals Bloodline",
  description: "Luxury creator recruiting and growth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="bg-black text-white">

        <Navbar />

        {children}

      </body>
    </html>
  );
}
