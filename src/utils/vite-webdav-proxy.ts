import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

export function webdavProxy(): Plugin {
  return {
    name: 'webdav-proxy',
    configureServer(server) {
      server.middlewares.use('/api/webdav-proxy', async (req: IncomingMessage, res: ServerResponse) => {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Depth, Content-Length')
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, ETag, Last-Modified')

        // 处理预检请求
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`)
          const targetUrl = url.searchParams.get('targetUrl')

          if (!targetUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing targetUrl parameter' }))
            return
          }

          console.log('本地代理WebDAV请求:', {
            method: req.method,
            targetUrl,
            hasAuth: !!req.headers.authorization
          })

          // 获取Authorization头
          const authorization = req.headers.authorization
          if (!authorization) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Authorization header required' }))
            return
          }

          // 设置请求头
          const headers: Record<string, string> = {
            'Authorization': authorization,
            'User-Agent': 'MemeManager-WebDAV-Client/1.0'
          }

          // 处理Content-Type和Depth头
          if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type']
          }
          if (req.headers['depth']) {
            headers['Depth'] = req.headers['depth']
          }

          // 处理请求体
          let body: string | undefined
          if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk)
            }
            if (chunks.length > 0) {
              body = Buffer.concat(chunks).toString()
            }
          }

          // 转发请求到WebDAV服务器
          const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body
          })

          console.log('代理响应状态:', response.status)

          // 设置响应状态
          res.statusCode = response.status

          // 转发响应头
          response.headers.forEach((value, key) => {
            // 跳过一些可能导致问题的头
            const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection']
            if (!skipHeaders.includes(key.toLowerCase())) {
              res.setHeader(key, value)
            }
          })

          // 转发响应体
          const responseText = await response.text()
          res.end(responseText)

        } catch (error) {
          console.error('WebDAV代理错误:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'Proxy request failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }))
        }
      })
    }
  }
}