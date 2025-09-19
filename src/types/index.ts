export interface MemeData {
  id: string
  filename: string
  imageUrl: string
  category: string
  ocrText: string
  aiDescription: string
  tags: string[]
  uploadDate: Date
  fileSize: number
}

export interface SearchFilters {
  category: string
  keyword: string
}

export type CategoryType = 'all' | 'emoji' | 'anime' | 'other'

export interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
}