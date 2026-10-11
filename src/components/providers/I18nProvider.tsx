"use client";

import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { useAuditStore } from "@/lib/auditStore";

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeLanguage = useAuditStore((s) => s.activeLanguage);

  useEffect(() => {
    if (i18n.language !== activeLanguage) {
      i18n.changeLanguage(activeLanguage);
    }
  }, [activeLanguage]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
