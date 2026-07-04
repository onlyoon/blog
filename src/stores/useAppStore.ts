import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppState, DarkMode } from "../types/app";

const initialDarkMode = getInitialDarkMode();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      darkMode: initialDarkMode,

      toggleDarkMode: () => {
        const newMode: DarkMode = get().darkMode === "light" ? "dark" : "light";
        set({ darkMode: newMode });
        applyDarkModeClass(newMode);
      },

      setDarkMode: (mode: DarkMode) => {
        set({ darkMode: mode });
        applyDarkModeClass(mode);
      },
    }),
    {
      name: "app-storage",
      partialize: ({ darkMode }) => ({ darkMode }),
    }
  )
);

function applyDarkModeClass(mode: DarkMode) {
  if (mode === "dark") {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add(mode);
  } else if (mode === "light") {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
}

function getInitialDarkMode(): DarkMode {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem("app-storage");

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      console.log("parsed", parsed);
      if (
        parsed.state.darkMode === "dark" ||
        parsed.state.darkMode === "light"
      ) {
        return parsed.state.darkMode as DarkMode;
      }
    } catch (error) {
      console.error("Failed to parse stored dark mode:", error);
    }
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
