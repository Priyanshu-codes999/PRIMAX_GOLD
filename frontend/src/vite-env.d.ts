/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_DEFAULT_REFRESH_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
