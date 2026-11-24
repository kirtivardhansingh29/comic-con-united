import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Comic Con United — Live Quiz",
  description:
    "Comic Con United: ek fan-run live online quiz. Har game ka apna champion 🏆 Winners Board par naam — Delhi Comic Con 2026. Hosted by Vitthal Diwedi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${anton.variable} ${archivo.variable}`}>{children}</body>
    </html>
  );
}
