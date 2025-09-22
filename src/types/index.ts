export interface MemeData {
  id: string
  filename: string
  imageUrl: string
  category: CategoryType
  ocrText: string
  aiDescription: string
  uploadDate: Date
  fileSize: number
  thumbnailUrl?: string
  width?: number
  height?: number
  format?: string
  cloudinaryId?: string
}

export interface SearchFilters {
  category: string
  keyword: string
}

export type CategoryType = 'all' | 'emoji' | 'anime' | 'other'

export type SortType = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'

export type ViewMode = 'grid' | 'list'

export interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
}

export interface MemeStatistics {
  total: number
  byCategory: {
    emoji: number
    anime: number
    other: number
  }
  totalSize: number
  averageSize: number
  mostRecentUpload: Date | null
  oldestUpload: Date | null
}

export interface ExportData {
  memes: MemeData[]
  exportDate: Date
  version: string
}

export interface MemeSettings {
  sortBy: SortType
  viewMode: ViewMode
  autoSave: boolean
  enableFuzzySearch: boolean
}