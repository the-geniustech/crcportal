/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOME_FLAG?: boolean;
  // add any other env vars you use…
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}