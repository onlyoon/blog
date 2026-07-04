import React from 'react';
// import { useAppStore } from '../stores/useAppStore.ts';
// import type { Language } from '../types/app.ts';

import type { Locale } from '../i18n/translation.ts';

interface LanguageSelectorProps {
  currentLocale: Locale;
}


const LanguageSelector: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & LanguageSelectorProps> = ({
  className = "backdrop-blur-md text-sm text-custom-text rounded-md p-1 cursor-pointer",
  currentLocale,
  ...props
}) => {
  // const { language, setLanguage } = useAppStore();

  // const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const selectedLanguage: Language = e.target.value as Language;
  //   setLanguage(selectedLanguage);
  // };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    if (newLocale === currentLocale) return;


    const currentPath = window.location.pathname;

    // const pathWithoutLocale = currentPath.replace(`/${currentLocale}`, '') || '/';
    const pathWithoutLocale = currentPath.replace(/^\/(kr|en|cn)/, '');


    const newPath = `/${newLocale}${pathWithoutLocale || '/'}`;
    window.location.href = newPath;
  }



  return (
    <div className="flex items-center">
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className={className}
      >
        <option value="kr" className='bg-custom-background'>한국어</option>
        <option value="en" className='bg-custom-background'>English</option>
        <option value="cn" className='bg-custom-background'>中文</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
