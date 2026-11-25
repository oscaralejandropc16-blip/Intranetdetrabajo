import { executeFileGet, executeFilePost } from '../server/neonHandler.mjs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost');
    const query = {
      bucket: req.query?.bucket || urlObj.searchParams.get('bucket'),
      path: req.query?.path || urlObj.searchParams.get('path'),
    };
    const result = await executeFileGet(query, process.env.DATABASE_URL);
    res.statusCode = result.status;
    if (result.status === 200) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(result.buffer);
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(result.body);
    }
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const result = await executeFilePost(body, process.env.DATABASE_URL);
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body));
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}
