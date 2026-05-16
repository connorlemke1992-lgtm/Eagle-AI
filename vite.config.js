import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local mock of Vercel's /api routing. In production these files are run as
// serverless functions; during `npm run dev` we intercept matching requests
// and execute the handler in-process so the app behaves the same locally.
function localApiPlugin() {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const handlerName = url.pathname.replace(/^\/api\//, '').replace(/\..*$/, '')
        if (!handlerName) return next()

        try {
          const mod = await server.ssrLoadModule(`/api/${handlerName}.js`)
          if (typeof mod.default !== 'function') {
            res.statusCode = 404
            res.end(JSON.stringify({ error: `No default export in /api/${handlerName}.js` }))
            return
          }

          // Collect body for POST/PUT.
          let body = null
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const raw = Buffer.concat(chunks).toString()
            if (raw) {
              try { body = JSON.parse(raw) }
              catch { body = raw }
            }
          }

          const query = Object.fromEntries(url.searchParams)

          // Vercel-shaped req/res shims so the handlers don't need any changes.
          const vReq = Object.assign(req, { query, body })
          const vRes = {
            status(code) { res.statusCode = code; return vRes },
            json(data) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return vRes
            },
            send(data) { res.end(data); return vRes },
            end(...args) { res.end(...args); return vRes },
            setHeader(k, v) { res.setHeader(k, v); return vRes },
          }

          await mod.default(vReq, vRes)
        } catch (err) {
          console.error(`[local-api] /api/${handlerName} threw:`, err)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load every env var (not just VITE_ prefixed ones) into process.env so the
  // /api handlers can read ANTHROPIC_API_KEY, GOLF_API_KEY, etc. — these are
  // server-side only and never reach the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v
  }

  return {
    plugins: [react(), localApiPlugin()],
  }
})
