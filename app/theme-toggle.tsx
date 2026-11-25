"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ccu-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {}
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ccu-theme", next);
    } catch {}
  };
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Light ya dark mode badlo">
      {theme === "dark" ? "☀ Light mode" : "🌙 Dark mode"}
    </button>
  );
}
