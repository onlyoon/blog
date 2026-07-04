import { translations, type Locale } from "../../i18n/translation.ts";

export function getMenu(locale: Locale) {
  const t = translations[locale];

  return [
    { name: t.nav.home, path: `/${locale}/` },
    { name: t.nav.about, path: `/${locale}/about` },
    { name: t.nav.project, path: `/${locale}/project` },
    { name: t.nav.blog, path: `/${locale}/blog` },
    { name: t.nav.note, path: `/${locale}/note` },
    { name: t.nav.contact, path: `/${locale}/contact` },
  ];
}
