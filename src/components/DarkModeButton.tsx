import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore.ts';

const DarkModeButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = "p-2 rounded-lg hover:bg-custom-background-secondary cursor-pointer",
}) => {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  if (!mounted) {
    // SSR 중에는 아무 아이콘도 렌더하지 않음 → mismatch 사라짐
    return (
      <button className="w-[36px] h-[36px]" aria-label="toggle dark mode">

      </button>
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={className}
      aria-label="toggle dark mode"
    >
      {darkMode === "light" ? (
        // 태양 아이콘 (라이트모드)
        <svg
          className="w-5 h-5 text-custom-text"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // 달 아이콘 (다크모드)
        <svg
          className="w-5 h-5 text-custom-text"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
};

export default DarkModeButton;
