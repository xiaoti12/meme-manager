/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
  readonly VITE_HF_TOKEN: string
  readonly VITE_GITHUB_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}