"use client";

import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "@/locales/en.json";
import te from "@/locales/te.json";
import hi from "@/locales/hi.json";
import { useAuditStore } from "./auditStore";

export type Language = "en" | "te" | "hi";

export const I18N_STRINGS = {
  en,
  te,
  hi,
};

const resources = {
  en: { translation: en },
  te: { translation: te },
  hi: { translation: hi },
};

// Initialize i18next instance if not already initialized
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;

export function getDictionary(lang: Language = "en") {
  return I18N_STRINGS[lang] || I18N_STRINGS.en;
}

export function useAppTranslation() {
  const { t } = useTranslation();
  const activeLanguage = useAuditStore((s) => s.activeLanguage);

  return {
    t,
    i18n,
    activeLanguage,
  };
}
