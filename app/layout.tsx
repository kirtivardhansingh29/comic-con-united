import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./theme-toggle";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Comic Con United — Live Quiz",
  description:
    "Comic Con United: ek fan-run live online quiz. Har game ka apna champion — Winners Board par naam. Delhi Comic Con 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ccu-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${anton.variable} ${archivo.variable}`}>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
