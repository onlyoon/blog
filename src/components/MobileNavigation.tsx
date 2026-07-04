import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import MaxWidthWrapper from './MaxWidthWrapper.tsx';
import DarkModeButton from './DarkModeButton.tsx';
import LanguageSelector from './LanguageSelector.tsx';
import { translations, type Locale } from '../i18n/translation.ts';

interface MenuItem {
  name: string;
  path: string;
}

interface MobileMenuProps {
  menuItems: MenuItem[];
  currentLocale: Locale;
}

const MobileNavigation: React.FC<MobileMenuProps> = ({ menuItems, currentLocale }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[currentLocale]
  // 메뉴 토글 함수
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // 메뉴 닫기 함수
  const closeMenu = () => {
    setIsOpen(false);
  };

  // Escape 키로 메뉴 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // body 스크롤 방지
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 메뉴 아이템 클릭 핸들러
  const handleMenuClick = () => {
    closeMenu();
  };

  // 메뉴가 열릴 때 GSAP 애니메이션 적용
  useEffect(() => {
    if (isOpen) {
      gsap.from('.mobile-menu-item', {
        opacity: 0,
        x: 20,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1,
      });
    }
  }, [isOpen]);

  // 토글 버튼 (메뉴가 닫혀 있을 때만 표시)
  const ToggleButton = () => (
    <button
      onClick={toggleMenu}
      aria-label="open menu"
      aria-expanded="false"
      aria-controls="mobile-menu"
      className="md:hidden z-50 p-2 rounded-lg transition-colors cursor-pointer"
    >
      <svg
        className="w-6 h-6 text-custom-text"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  );

  // 닫기 버튼 (메뉴가 열려 있을 때만 표시)
  const CloseButton = () => (
    <button
      onClick={closeMenu}
      aria-label="close menu"
      aria-expanded="true"
      aria-controls="mobile-menu"
      className="z-60 p-2 rounded-lg transition-colors cursor-pointer"
    >
      <svg
        className="w-6 h-6 text-custom-text"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );

  // 메뉴가 닫혀 있을 때: 토글 버튼만 표시
  if (!isOpen) {
    return (
      <nav id="mobile-navigation__closed"
        aria-label="mobile navigation"
        className="h-14 md:hidden sticky z-50 inset-x-0 top-0 w-full bg-custom-background/25 backdrop-blur-md transition-all"
      >
        <MaxWidthWrapper>
          <div className="w-full h-14 inset-x-0 top-0 flex items-center justify-between border-b border-custom-border">
            <a href="/" className="flex z-40 font-semibold text-custom-text">yoonlog</a>
            <ToggleButton />
          </div>
        </MaxWidthWrapper>
      </nav>);
  } else {
    // 메뉴가 열려 있을 때: 닫기 버튼 + 전체 화면 메뉴
    return (
      <>
        <div className='h-14'></div>
        <nav id="mobile-navigation__opened"
          aria-label="mobile navigation"
          className="fixed top-0 z-50 inset-x-0 w-full bg-custom-background/25 backdrop-blur-md transition-all"
        >
          <MaxWidthWrapper>
            <div className="h-14 w-full flex items-center justify-between border-b border-custom-border">
              <a href="/" className="flex z-40 font-semibold text-custom-text">yoonlog</a>
              <CloseButton />
            </div>
            <div className="h-screen w-full md:hidden overflow-y-auto">
              {/* <div className="h-screen bg-custom-background backdrop-blur-md transition-all max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> */}
              {/* 다크모드 토글과 언어 선택 */}
              <div className="flex items-center justify-between py-4 border-b border-custom-border">
                <div className="flex items-center space-x-2">
                  {/* 언어 선택 */}
                  <p className="pl-2 text-sm text-custom-text">{t.nav.language}</p>
                  <LanguageSelector currentLocale={currentLocale} />
                </div>

                {/* 다크모드 토글 */}
                <DarkModeButton />
              </div>

              <nav aria-label="mobile navigation">
                <ul className="flex flex-col py-4 gap-2">
                  {menuItems.map((item) => (
                    <li key={item.path}>
                      <a
                        href={item.path}
                        onClick={handleMenuClick}
                        className="mobile-menu-item block py-3 px-3 rounded-lg text-custom-text hover:bg-white/10 hover:text-blue-500 transition-colors dark:hover:bg-black/20"

                      // className="mobile-menu-item block py-3 px-3 mx-2 rounded-lg text-custom-text transition-all duration-200 hover:bg-white/10 hover:text-blue-500 dark:hover:bg-black/20"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              {/* </div> */}
            </div>
          </MaxWidthWrapper>
        </nav>
      </>
    );
  }

};

export default MobileNavigation;