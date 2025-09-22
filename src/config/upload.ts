// 上传配置文件

export interface UploadConfig {
  // 文件数量限制
  maxFiles: number
  // 单个文件大小限制 (MB)
  maxFileSize: number
  // 支持的文件格式
  allowedTypes: string[]
  // 并发处理数量
  batchSize: number
  // 是否启用实时OCR（大量文件时可关闭以提升性能）
  enableRealTimeOCR: boolean
  // 是否启用实时AI分析
  enableRealTimeAI: boolean
}

export const defaultUploadConfig: UploadConfig = {
  maxFiles: 20,
  maxFileSize: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  batchSize: 3, // 同时处理3个文件
  enableRealTimeOCR: true,
  enableRealTimeAI: true
}

// 根据文件数量动态调整配置
export const getOptimalConfig = (fileCount: number): UploadConfig => {
  const config = { ...defaultUploadConfig }

  if (fileCount > 10) {
    // 大量文件时的优化配置
    config.batchSize = 2 // 减少并发数
    config.enableRealTimeOCR = false // 关闭实时OCR，批量处理时再开启
    config.enableRealTimeAI = false // 关闭实时AI分析
  } else if (fileCount > 5) {
    // 中等数量文件
    config.batchSize = 2
  }

  return config
}

// 预设配置方案
export const uploadPresets = {
  // 快速模式 - 适合大量文件
  fast: {
    maxFiles: 50,
    maxFileSize: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    batchSize: 1,
    enableRealTimeOCR: false,
    enableRealTimeAI: false
  } as UploadConfig,

  // 标准模式 - 平衡性能和功能
  standard: {
    maxFiles: 20,
    maxFileSize: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    batchSize: 3,
    enableRealTimeOCR: true,
    enableRealTimeAI: true
  } as UploadConfig,

  // 详细模式 - 最佳分析效果
  detailed: {
    maxFiles: 10,
    maxFileSize: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    batchSize: 2,
    enableRealTimeOCR: true,
    enableRealTimeAI: true
  } as UploadConfig
}