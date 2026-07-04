export type DarkMode = "light" | "dark";
export type Language = "ko" | "en" | "cn";

export interface AppState {
  // language: Language;
  darkMode: DarkMode;
  // setLanguage: (language: Language) => void;
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: DarkMode) => void;
}
