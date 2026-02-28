export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const workerBaseUrl = process.env.D1_API_BASE_URL
  if (!workerBaseUrl) {
    return res.status(503).json({ error: 'D1 API not configured (D1_API_BASE_URL missing)' })
  }

  try {
    // 从请求 URL 中提取 /api/d1-proxy 之后的子路径
    // Vercel 会将路径作为 req.url，如 /group?username=xxx
    const reqUrl = req.url || ''
    const targetUrl = `${workerBaseUrl.replace(/\/$/, '')}${reqUrl}`

    console.log('[d1-proxy] 转发请求:', req.method, targetUrl)

    const headers = {
      'Content-Type': 'application/json',
    }

    let body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })

    const responseText = await response.text()

    res.status(response.status)

    response.headers.forEach((value, key) => {
      const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection']
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    res.send(responseText)
  } catch (error) {
    console.error('[d1-proxy] 代理错误:', error)
    res.status(500).json({
      error: 'Proxy request failed',
      details: error.message || 'Unknown error',
    })
  }
}
