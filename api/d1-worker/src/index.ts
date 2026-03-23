// Cloudflare Workers 全局类型声明（由 @cloudflare/workers-types 提供，运行时可用）
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
  }
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement
    run(): Promise<D1Result>
    first<T = unknown>(colName?: string): Promise<T | null>
    all<T = unknown>(): Promise<{ results: T[] }>
  }
  interface D1Result {
    success: boolean
    meta?: Record<string, unknown>
  }
}

export interface Env {
  DB: D1Database
}

interface MemeRow {
  id: string
  group_id: string
  filename: string
  image_url: string
  category: string
  ocr_text: string
  ai_description: string
  upload_date: string
  file_size: number
  thumbnail_url: string | null
  optimized_url: string | null
  width: number | null
  height: number | null
  format: string | null
  cloudinary_id: string | null
  is_deleted: number
  deleted_at: string | null
  updated_at: string
}

interface MemeData {
  id: string
  filename: string
  imageUrl: string
  category: string
  ocrText: string
  aiDescription: string
  uploadDate: string
  fileSize: number
  thumbnailUrl?: string | null
  optimizedUrl?: string | null
  width?: number | null
  height?: number | null
  format?: string | null
  cloudinaryId?: string | null
  isDeleted?: boolean
  deletedAt?: string | null
}

interface CategoryRow {
  id: string
  group_id: string
  name: string
  color: string | null
  created_at: string
  updated_at: string
}

interface CategoryData {
  id: string
  name: string
  color?: string | null
  createdAt: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  })
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}

function memeRowToData(row: MemeRow): MemeData {
  return {
    id: row.id,
    filename: row.filename,
    imageUrl: row.image_url,
    category: row.category,
    ocrText: row.ocr_text,
    aiDescription: row.ai_description,
    uploadDate: row.upload_date,
    fileSize: row.file_size,
    thumbnailUrl: row.thumbnail_url,
    optimizedUrl: row.optimized_url,
    width: row.width,
    height: row.height,
    format: row.format,
    cloudinaryId: row.cloudinary_id,
    isDeleted: row.is_deleted === 1,
    deletedAt: row.deleted_at,
  }
}

function categoryRowToData(row: CategoryRow): CategoryData {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

function generateGroupId(): string {
  return crypto.randomUUID()
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '') || '/'
    const method = request.method

    try {
      // GET /group?username=xxx
      if (path === '/group' && method === 'GET') {
        return handleGetGroup(url, env)
      }

      // GET /memes?group_id=xxx
      if (path === '/memes' && method === 'GET') {
        return handleGetMemes(url, env)
      }

      // POST /memes
      if (path === '/memes' && method === 'POST') {
        return handleAddMeme(request, env)
      }

      // GET /memes/simple?group_id=xxx
      if (path === '/memes/simple' && method === 'GET') {
        return handleGetMemesSimple(url, env)
      }

      // PUT /memes/:id
      const putMatch = path.match(/^\/memes\/(.+)$/)
      if (putMatch && method === 'PUT') {
        return handleUpdateMeme(putMatch[1], request, env)
      }

      // DELETE /memes/:id
      const deleteMatch = path.match(/^\/memes\/(.+)$/)
      if (deleteMatch && method === 'DELETE') {
        return handleDeleteMeme(deleteMatch[1], env)
      }

      // GET /categories?group_id=xxx
      if (path === '/categories' && method === 'GET') {
        return handleGetCategories(url, env)
      }

      // POST /categories
      if (path === '/categories' && method === 'POST') {
        return handleAddCategory(request, env)
      }

      // DELETE /categories/:id?group_id=xxx
      const deleteCategoryMatch = path.match(/^\/categories\/(.+)$/)
      if (deleteCategoryMatch && method === 'DELETE') {
        return handleDeleteCategory(deleteCategoryMatch[1], url, env)
      }

      // POST /sync
      if (path === '/sync' && method === 'POST') {
        return handleSync(request, env)
      }

      // DELETE /sync?group_id=xxx
      if (path === '/sync' && method === 'DELETE') {
        return handleDeleteSync(url, env)
      }

      return errorResponse('Not found', 404)
    } catch (err) {
      console.error('Worker error:', err)
      return errorResponse('Internal server error', 500)
    }
  },
}

// GET /group?username=xxx
async function handleGetGroup(url: URL, env: Env): Promise<Response> {
  const username = url.searchParams.get('username')
  if (!username) return errorResponse('Missing username')

  const existing = await env.DB.prepare(
    'SELECT group_id FROM meme_groups WHERE username = ?'
  ).bind(username).first<{ group_id: string }>()

  if (existing) {
    return jsonResponse({ group_id: existing.group_id, username })
  }

  const groupId = generateGroupId()
  await env.DB.prepare(
    'INSERT INTO meme_groups (username, group_id) VALUES (?, ?)'
  ).bind(username, groupId).run()

  return jsonResponse({ group_id: groupId, username })
}

// GET /memes?group_id=xxx
async function handleGetMemes(url: URL, env: Env): Promise<Response> {
  const groupId = url.searchParams.get('group_id')
  if (!groupId) return errorResponse('Missing group_id')

  const { results } = await env.DB.prepare(
    'SELECT * FROM memes WHERE group_id = ? ORDER BY upload_date DESC'
  ).bind(groupId).all<MemeRow>()

  return jsonResponse({ memes: results.map(memeRowToData) })
}

// POST /memes
async function handleAddMeme(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { group_id: string } & MemeData
  const { group_id, ...meme } = body

  if (!group_id || !meme.id) return errorResponse('Missing group_id or id')

  await env.DB.prepare(`
    INSERT INTO memes (
      id, group_id, filename, image_url, category, ocr_text, ai_description,
      upload_date, file_size, thumbnail_url, optimized_url, width, height,
      format, cloudinary_id, is_deleted, deleted_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      filename = excluded.filename,
      image_url = excluded.image_url,
      category = excluded.category,
      ocr_text = excluded.ocr_text,
      ai_description = excluded.ai_description,
      upload_date = excluded.upload_date,
      file_size = excluded.file_size,
      thumbnail_url = excluded.thumbnail_url,
      optimized_url = excluded.optimized_url,
      width = excluded.width,
      height = excluded.height,
      format = excluded.format,
      cloudinary_id = excluded.cloudinary_id,
      is_deleted = excluded.is_deleted,
      deleted_at = excluded.deleted_at,
      updated_at = datetime('now')
  `).bind(
    meme.id,
    group_id,
    meme.filename,
    meme.imageUrl,
    meme.category || 'default',
    meme.ocrText || '',
    meme.aiDescription || '',
    typeof meme.uploadDate === 'string' ? meme.uploadDate : new Date(meme.uploadDate).toISOString(),
    meme.fileSize || 0,
    meme.thumbnailUrl || null,
    meme.optimizedUrl || null,
    meme.width || null,
    meme.height || null,
    meme.format || null,
    meme.cloudinaryId || null,
    meme.isDeleted ? 1 : 0,
    meme.deletedAt || null,
  ).run()

  return jsonResponse({ success: true, id: meme.id })
}

// PUT /memes/:id
async function handleUpdateMeme(id: string, request: Request, env: Env): Promise<Response> {
  const updates = await request.json() as Partial<MemeData>

  const fields: string[] = []
  const values: unknown[] = []

  const fieldMap: Record<string, string> = {
    filename: 'filename',
    imageUrl: 'image_url',
    category: 'category',
    ocrText: 'ocr_text',
    aiDescription: 'ai_description',
    uploadDate: 'upload_date',
    fileSize: 'file_size',
    thumbnailUrl: 'thumbnail_url',
    optimizedUrl: 'optimized_url',
    width: 'width',
    height: 'height',
    format: 'format',
    cloudinaryId: 'cloudinary_id',
    isDeleted: 'is_deleted',
    deletedAt: 'deleted_at',
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in updates) {
      fields.push(`${col} = ?`)
      let val = (updates as Record<string, unknown>)[key]
      if (key === 'isDeleted') val = val ? 1 : 0
      values.push(val ?? null)
    }
  }

  if (fields.length === 0) return errorResponse('No fields to update')

  fields.push("updated_at = datetime('now')")
  values.push(id)

  await env.DB.prepare(
    `UPDATE memes SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run()

  return jsonResponse({ success: true, id })
}

// DELETE /memes/:id
async function handleDeleteMeme(id: string, env: Env): Promise<Response> {
  await env.DB.prepare('DELETE FROM memes WHERE id = ?').bind(id).run()
  return jsonResponse({ success: true, id })
}

// GET /memes/simple?group_id=xxx
async function handleGetMemesSimple(url: URL, env: Env): Promise<Response> {
  const groupId = url.searchParams.get('group_id')
  if (!groupId) return errorResponse('Missing group_id')

  const { results } = await env.DB.prepare(
    'SELECT id, filename, image_url, ocr_text, ai_description FROM memes WHERE group_id = ? ORDER BY upload_date DESC'
  ).bind(groupId).all<{ id: string; filename: string; image_url: string; ocr_text: string; ai_description: string }>()

  return jsonResponse({
    memes: results.map(row => ({
      id: row.id,
      filename: row.filename,
      imageUrl: row.image_url,
      ocrText: row.ocr_text,
      aiDescription: row.ai_description,
    }))
  })
}

// GET /categories?group_id=xxx
async function handleGetCategories(url: URL, env: Env): Promise<Response> {
  const groupId = url.searchParams.get('group_id')
  if (!groupId) return errorResponse('Missing group_id')

  const { results } = await env.DB.prepare(
    'SELECT * FROM categories WHERE group_id = ? ORDER BY created_at ASC'
  ).bind(groupId).all<CategoryRow>()

  return jsonResponse({ categories: results.map(categoryRowToData) })
}

// POST /categories
async function handleAddCategory(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { group_id: string } & CategoryData
  const { group_id, ...cat } = body

  if (!group_id || !cat.id) return errorResponse('Missing group_id or id')

  await env.DB.prepare(`
    INSERT INTO categories (id, group_id, name, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id, group_id) DO UPDATE SET
      name = excluded.name,
      color = excluded.color,
      updated_at = datetime('now')
  `).bind(
    cat.id,
    group_id,
    cat.name,
    cat.color || null,
    cat.createdAt || new Date().toISOString(),
  ).run()

  return jsonResponse({ success: true, id: cat.id })
}

// DELETE /categories/:id?group_id=xxx
async function handleDeleteCategory(id: string, url: URL, env: Env): Promise<Response> {
  const groupId = url.searchParams.get('group_id')
  if (!groupId) return errorResponse('Missing group_id')

  await env.DB.prepare(
    'DELETE FROM categories WHERE id = ? AND group_id = ?'
  ).bind(id, groupId).run()

  return jsonResponse({ success: true, id })
}

// POST /sync — 全量覆盖（memes + categories）
async function handleSync(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { group_id: string; memes: MemeData[]; categories?: CategoryData[] }
  const { group_id, memes, categories } = body

  if (!group_id) return errorResponse('Missing group_id')
  if (!Array.isArray(memes)) return errorResponse('memes must be an array')

  // 事务：先清空该组所有 memes（和可选的 categories），再批量插入
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM memes WHERE group_id = ?').bind(group_id),
  ]

  if (Array.isArray(categories)) {
    statements.push(
      env.DB.prepare('DELETE FROM categories WHERE group_id = ?').bind(group_id)
    )
  }

  for (const meme of memes) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO memes (
          id, group_id, filename, image_url, category, ocr_text, ai_description,
          upload_date, file_size, thumbnail_url, optimized_url, width, height,
          format, cloudinary_id, is_deleted, deleted_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        meme.id,
        group_id,
        meme.filename,
        meme.imageUrl,
        meme.category || 'default',
        meme.ocrText || '',
        meme.aiDescription || '',
        typeof meme.uploadDate === 'string' ? meme.uploadDate : new Date(meme.uploadDate).toISOString(),
        meme.fileSize || 0,
        meme.thumbnailUrl || null,
        meme.optimizedUrl || null,
        meme.width || null,
        meme.height || null,
        meme.format || null,
        meme.cloudinaryId || null,
        meme.isDeleted ? 1 : 0,
        meme.deletedAt || null,
      )
    )
  }

  for (const cat of (categories ?? [])) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO categories (id, group_id, name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        cat.id,
        group_id,
        cat.name,
        cat.color || null,
        cat.createdAt || new Date().toISOString(),
      )
    )
  }

  await env.DB.batch(statements)

  return jsonResponse({
    success: true,
    count: memes.length,
    categoryCount: (categories ?? []).length,
  })
}

// DELETE /sync?group_id=xxx — 清空组数据（memes + categories）
async function handleDeleteSync(url: URL, env: Env): Promise<Response> {
  const groupId = url.searchParams.get('group_id')
  if (!groupId) return errorResponse('Missing group_id')

  await env.DB.batch([
    env.DB.prepare('DELETE FROM memes WHERE group_id = ?').bind(groupId),
    env.DB.prepare('DELETE FROM categories WHERE group_id = ?').bind(groupId),
  ])

  return jsonResponse({ success: true })
}
