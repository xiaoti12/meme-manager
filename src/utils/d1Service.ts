import type { MemeData, D1SyncConfig } from '@/types'

const D1_CONFIG_KEY = 'd1-sync-config'

// Worker 端已配置 CORS (Access-Control-Allow-Origin: *)，浏览器可以直接请求，
// 无需经过 Vite Node.js 代理（Node.js 不使用系统代理，会导致连接超时）
const D1_DIRECT_URL = (import.meta.env.VITE_D1_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
const D1_BASE = D1_DIRECT_URL ?? '/api/d1-proxy'

// ─── 配置管理 ────────────────────────────────────────────────────────────────

export function getD1Config(): D1SyncConfig {
  try {
    const raw = localStorage.getItem(D1_CONFIG_KEY)
    if (!raw) return defaultConfig()
    return { ...defaultConfig(), ...JSON.parse(raw) }
  } catch {
    return defaultConfig()
  }
}

export function saveD1Config(config: D1SyncConfig): void {
  localStorage.setItem(D1_CONFIG_KEY, JSON.stringify(config))
}

function defaultConfig(): D1SyncConfig {
  return {
    enabled: false,
    username: '',
    groupId: undefined,
    showSyncButtons: true,
  }
}

// ─── API 请求工具 ──────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${D1_BASE}${path}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`
    try {
      const body = await response.json() as { error?: string }
      if (body.error) errMsg = body.error
    } catch { /* ignore */ }
    throw new Error(errMsg)
  }

  return response.json() as Promise<T>
}

// ─── 组管理 ──────────────────────────────────────────────────────────────────

/**
 * 通过用户名获取或创建表情包组，返回 group_id。
 * 同时将 group_id 缓存到配置中。
 */
export async function getOrCreateGroup(username: string): Promise<string> {
  const result = await apiFetch<{ group_id: string; username: string }>(
    `/group?username=${encodeURIComponent(username)}`
  )
  // 写回缓存
  const config = getD1Config()
  config.groupId = result.group_id
  saveD1Config(config)
  return result.group_id
}

// ─── 表情包 CRUD ──────────────────────────────────────────────────────────────

export async function addRemoteMeme(groupId: string, meme: MemeData): Promise<void> {
  await apiFetch('/memes', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, ...normalizeMeme(meme) }),
  })
}

export async function updateRemoteMeme(id: string, updates: Partial<MemeData>): Promise<void> {
  await apiFetch(`/memes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(normalizeMeme(updates as MemeData)),
  })
}

export async function deleteRemoteMeme(id: string): Promise<void> {
  await apiFetch(`/memes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function fetchRemoteMemes(groupId: string): Promise<MemeData[]> {
  const result = await apiFetch<{ memes: MemeData[] }>(
    `/memes?group_id=${encodeURIComponent(groupId)}`
  )
  return result.memes
}

// ─── 批量同步 ────────────────────────────────────────────────────────────────

/**
 * 全量覆盖同步：将本地所有表情包写入 D1（事务操作，先清空再写入）
 */
export async function syncAllToRemote(
  groupId: string,
  memes: MemeData[]
): Promise<{ count: number }> {
  return apiFetch<{ success: boolean; count: number }>('/sync', {
    method: 'POST',
    body: JSON.stringify({
      group_id: groupId,
      memes: memes.map(normalizeMeme),
    }),
  })
}

/**
 * 清空 D1 中该组的所有表情包数据
 */
export async function deleteAllRemoteData(groupId: string): Promise<void> {
  await apiFetch(`/sync?group_id=${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
  })
}

// ─── 工具 ────────────────────────────────────────────────────────────────────

/**
 * 将 MemeData 中的 Date 对象序列化为字符串，确保 JSON 传输格式一致
 */
function normalizeMeme(meme: MemeData): MemeData {
  return {
    ...meme,
    uploadDate: meme.uploadDate instanceof Date
      ? meme.uploadDate.toISOString()
      : meme.uploadDate,
    deletedAt: meme.deletedAt instanceof Date
      ? (meme.deletedAt as Date).toISOString()
      : meme.deletedAt ?? null,
  }
}
