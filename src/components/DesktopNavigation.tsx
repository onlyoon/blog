import React from 'react';
import MaxWidthWrapper from './MaxWidthWrapper.tsx';
import DarkModeButton from './DarkModeButton.tsx';
import LanguageSelector from './LanguageSelector.tsx';
import type { Locale } from '../i18n/translation.ts';

interface MenuItem {
  name: string;
  path: string;
}

interface DesktopNavigationProps {
  menuItems: MenuItem[];
  currentLocale: Locale; // 현재 언어 추가
}

const DesktopNavigation: React.FC<DesktopNavigationProps> = ({ menuItems, currentLocale }) => {

  return (
    <nav
      id="desktop-navigation"
      className="sticky hidden md:block h-14 z-50 inset-x-0 top-0 w-full bg-custom-background/25 backdrop-blur-md transition-all"
    >
      <MaxWidthWrapper>
        <div
          className="h-14 flex items-center justify-between border-b border-custom-border"
        >
          <a href={`/${currentLocale}/`} className="flex z-40 font-semibold text-custom-text">yoonlog</a>

          <div className="h-full flex items-center space-x-4">
            {/* 데스크톱 메뉴 - md 이상에서만 표시 */}
            <div className="hidden md:flex items-center space-x-4">
              <ul className="flex flex-row gap-6">
                {
                  menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.path}
                        className="text-custom-text hover:text-blue-500 transition-colors"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))
                }
              </ul>
            </div>

            {/* 다크모드 토글과 언어 선택 */}
            <div className="hidden md:flex items-center m-0 gap-2">
              {/* 언어 선택 */}
              <LanguageSelector currentLocale={currentLocale} />
              {/* 다크모드 토글 */}
              <DarkModeButton />
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </nav>
  )
}

export default DesktopNavigation;