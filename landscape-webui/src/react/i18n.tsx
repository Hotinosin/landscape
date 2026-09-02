import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "@/i18n/en";
import zh from "@/i18n/zh";

type Language = "en" | "zh";
type Messages = typeof zh;
export const LANGUAGE_STORAGE_KEY = "landscape-language";

const dictionaries: Record<Language, Messages> = { en, zh };

function normalizeLanguage(value?: string): Language {
  return value?.toLowerCase().startsWith("en") ? "en" : "zh";
}

function translate(
  messages: Messages,
  key: string,
  args?: Record<string, unknown>,
): string {
  let value = key
    .split(".")
    .reduce<unknown>(
      (current, part) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[part]
          : undefined,
      messages,
    );
  if (value === undefined && key.startsWith("errors.")) {
    value = (messages.errors as Record<string, unknown>)[
      key.slice("errors.".length)
    ];
  }
  const template = typeof value === "string" ? value : key;
  return template.replace(/\{([^}]+)\}/g, (_, name: string) =>
    args?.[name] == null ? `{${name}}` : String(args[name]),
  );
}

const I18nContext = createContext<{
  language: Language;
  setLanguage: (language?: string) => void;
  t: (key: string, args?: Record<string, unknown>) => string;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(() =>
    normalizeLanguage(
      localStorage.getItem(LANGUAGE_STORAGE_KEY) || navigator.language,
    ),
  );
  const setLanguage = useCallback(
    (next?: string) => setLanguageState(normalizeLanguage(next)),
    [],
  );
  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);
  const t = useCallback(
    (key: string, args?: Record<string, unknown>) =>
      translate(dictionaries[language], key, args),
    [language],
  );
  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
