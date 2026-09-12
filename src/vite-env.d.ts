/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. http://localhost:4000 — enables API auth when set. */
  readonly VITE_API_URL?: string;
  /** When "false", do not fall back to in-memory seed login if API fails. */
  readonly VITE_API_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
