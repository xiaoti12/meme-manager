# 表情包管理器 🎭

智能表情包管理器，支持OCR文字识别、AI图片分析、分类管理和快速搜索功能。

## ✨ 功能特性

- 📤 **智能上传**：拖拽上传，支持JPG、PNG、GIF格式
- 🔍 **OCR识别**：自动识别图片中的文字内容
- 🤖 **AI分析**：智能分析图片内容并生成描述
- 📂 **分类管理**：按作品类型分类管理表情包
- 🔎 **快速搜索**：支持关键词搜索和高级筛选
- 🏷️ **智能标签**：自动生成和手动添加标签
- 💾 **本地存储**：数据保存在浏览器本地存储中

## 🛠️ 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI组件库**：Element Plus
- **样式框架**：Tailwind CSS
- **状态管理**：Pinia
- **路由管理**：Vue Router 4
- **OCR识别**：Tesseract.js
- **模糊搜索**：Fuse.js

## 🚀 快速开始

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发环境

\`\`\`bash
npm run dev
\`\`\`

### 构建生产版本

\`\`\`bash
npm run build
\`\`\`

### 预览构建结果

\`\`\`bash
npm run preview
\`\`\`

## 📁 项目结构

\`\`\`
src/
├── components/          # 通用组件
│   ├── AppHeader.vue   # 头部组件
│   ├── CategorySection.vue # 分类展示组件
│   └── MemeCard.vue    # 表情包卡片组件
├── views/              # 页面组件
│   ├── HomeView.vue    # 首页
│   ├── UploadView.vue  # 上传页面
│   └── SearchView.vue  # 搜索页面
├── stores/             # 状态管理
│   └── meme.ts         # 表情包数据管理
├── types/              # 类型定义
│   └── index.ts        # 通用类型
├── utils/              # 工具函数
├── router/             # 路由配置
│   └── index.ts
└── assets/             # 静态资源
\`\`\`

## 🔧 环境配置

复制 \`.env.example\` 为 \`.env\` 并配置相应的环境变量：

\`\`\`env
# Cloudinary配置（图片存储）
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Hugging Face配置（AI图片分析）
VITE_HF_TOKEN=your_hugging_face_token

# GitHub配置（数据备份）
VITE_GITHUB_TOKEN=your_github_token
\`\`\`

## 📱 功能说明

### 1. 首页展示
- 按分类展示表情包集合
- 响应式网格布局
- 悬停显示操作按钮

### 2. 上传功能
- 支持拖拽上传
- 实时图片预览
- 自动OCR识别和AI分析
- 分类选择和标签管理

### 3. 搜索功能
- 关键词模糊搜索
- 分类筛选
- 多种排序方式
- 实时搜索结果统计

## 🎯 开发计划

- [x] 阶段1：项目初始化和基础配置
- [x] 阶段2：基础UI布局和页面结构
- [ ] 阶段3：OCR和AI功能集成
- [ ] 阶段4：图片存储服务集成
- [ ] 阶段5：数据备份和同步
- [ ] 阶段6：性能优化和部署

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！