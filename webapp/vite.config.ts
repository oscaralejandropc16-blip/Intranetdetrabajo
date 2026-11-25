import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { executeDbRequest, executeFileGet, executeFilePost } from './server/neonHandler.mjs'

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: any) => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch { resolve({}) }
    })
  })
}

function neonDevApiPlugin(dbUrl: string): Plugin {
  return {
    name: 'kant-neon-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/db', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store')
        if (req.method === 'HEAD') {
          res.statusCode = 200
          res.end()
          return
        }
        if (req.method === 'GET') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }))
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
          return
        }
        const body = await readJsonBody(req)
        const result = await executeDbRequest(body, dbUrl)
        res.statusCode = result.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result.body))
      })

      server.middlewares.use('/api/file', async (req, res) => {
        if (req.method === 'GET') {
          const urlObj = new URL(req.url || '/', 'http://localhost')
          const result = await executeFileGet({
            bucket: urlObj.searchParams.get('bucket'),
            path: urlObj.searchParams.get('path'),
          }, dbUrl)
          res.statusCode = result.status
          if (result.status === 200 && result.buffer) {
            res.setHeader('Content-Type', result.contentType || 'application/octet-stream')
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            res.end(result.buffer)
          } else {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(String(result.body || ''))
          }
          return
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req)
          const result = await executeFilePost(body, dbUrl)
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
          return
        }
        res.statusCode = 405
        res.end('Method not allowed')
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL || ''

  return {
    plugins: [react(), neonDevApiPlugin(dbUrl)],
    build: {
      target: ['es2020', 'safari14'],
      cssTarget: ['es2020', 'safari14'],
    },
  }
})
