-- 用户名 -> 表情包组（1:1）
CREATE TABLE IF NOT EXISTS meme_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  group_id TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 表情包元数据（组 -> 多个 meme，1:N）
CREATE TABLE IF NOT EXISTS memes (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'default',
  ocr_text TEXT DEFAULT '',
  ai_description TEXT DEFAULT '',
  upload_date TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  optimized_url TEXT,
  width INTEGER,
  height INTEGER,
  format TEXT,
  cloudinary_id TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES meme_groups(group_id)
);

CREATE INDEX IF NOT EXISTS idx_memes_group_id ON memes(group_id);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, group_id),
  FOREIGN KEY (group_id) REFERENCES meme_groups(group_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories(group_id);
