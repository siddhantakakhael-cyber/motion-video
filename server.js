// Tiny zero-framework server: static studio + render API.
// Bind 0.0.0.0 so the Arena live preview can reach it.

import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { normalizeProject, STYLES, PRESETS, slug } from './src/project.js';
import { renderProject, renderFramePNG } from './src/render.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const SRC = join(ROOT, 'src');
const EXPORTS = join(ROOT, '.cache', 'exports');
mkdirSync(EXPORTS, { recursive: true });

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.wav': 'audio/wav', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
};

const jobs = new Map();
const JOB_TTL = 30 * 60 * 1000;

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = []; let size = 0;
    req.on('data', d => {
      size += d.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(d);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function staticPath(pathname) {
  if (pathname.startsWith('/src/')) return { root: SRC, rel: pathname.slice(5), onlyJs: true };
  if (pathname.startsWith('/css/')) return { root: join(PUBLIC, 'css'), rel: pathname.slice(5) };
  if (pathname.startsWith('/js/')) return { root: join(PUBLIC, 'js'), rel: pathname.slice(4) };
  if (pathname.startsWith('/fonts/')) return { root: join(PUBLIC, 'fonts'), rel: pathname.slice(7) };
  if (pathname.startsWith('/samples/')) return { root: join(PUBLIC, 'samples'), rel: pathname.slice(9) };
  if (pathname.startsWith('/examples/')) return { root: join(ROOT, 'examples'), rel: pathname.slice(10) };
  return { root: PUBLIC, rel: pathname === '/' ? 'index.html' : pathname.slice(1) };
}

function serveFile(req, res, file) {
  let st;
  try { st = statSync(file); } catch { res.writeHead(404); res.end('Not found'); return; }
  if (!st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && /^bytes=\d*-\d*$/.test(range) && type.startsWith('video/')) {
    const [, a, b] = /bytes=(\d*)-(\d*)/.exec(range);
    const start = a ? Number(a) : 0;
    const end = b ? Math.min(Number(b), st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); res.end(); return; }
    res.writeHead(206, {
      'content-type': type, 'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${st.size}`, 'accept-ranges': 'bytes',
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' });
  createReadStream(file).pipe(res);
}

function startJob(P) {
  const id = randomUUID().slice(0, 8);
  const job = { id, status: 'queued', progress: 0, message: 'Queued…', filename: `${slug(P.title)}.mp4`, created: Date.now() };
  jobs.set(id, job);
  const outPath = join(EXPORTS, `${id}.mp4`);
  setImmediate(async () => {
    job.status = 'rendering';
    try {
      await renderProject(P, {
        outPath,
        onProgress: (p, msg) => { job.progress = p; job.message = msg; },
      });
      job.status = 'done'; job.progress = 1; job.message = 'MP4 ready';
      job.file = outPath;
      job.downloadUrl = `/download/${id}`;
    } catch (e) {
      job.status = 'error'; job.error = String(e.message || e); job.message = job.error;
      try { rmSync(outPath, { force: true }); } catch {}
    }
  });
  return job;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    // ------------------------------------------------------------- API ---
    if (pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, ffmpeg: ffmpegInstaller.version, styles: STYLES.length, presets: PRESETS.length });
    }

    if (pathname === '/api/export' && req.method === 'POST') {
      const raw = JSON.parse((await readBody(req)) || '{}');
      const P = normalizeProject(raw);
      const job = startJob(P);
      return json(res, 202, { id: job.id, status: job.status, filename: job.filename });
    }

    if (pathname.startsWith('/api/export/') && req.method === 'GET') {
      const id = pathname.split('/').pop();
      const j = jobs.get(id);
      if (!j) return json(res, 404, { status: 'error', error: 'unknown job' });
      const { file, ...safe } = j;
      return json(res, 200, safe);
    }

    if (pathname === '/api/still' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const P = normalizeProject(body.project || {});
      const png = renderFramePNG(P, Number(body.t) || 0, body.w, body.h);
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': png.length, 'cache-control': 'no-store' });
      return res.end(png);
    }

    if (pathname.startsWith('/download/') && req.method === 'GET') {
      const id = pathname.split('/')[2];
      const j = jobs.get(id);
      if (!j || j.status !== 'done' || !j.file || !existsSync(j.file)) { res.writeHead(404); return res.end('Not ready'); }
      const st = statSync(j.file);
      res.writeHead(200, {
        'content-type': 'video/mp4', 'content-length': st.size, 'accept-ranges': 'bytes',
        'content-disposition': `inline; filename="${j.filename.replace(/[^a-z0-9_.-]/gi, '-')}"`,
      });
      return createReadStream(j.file).pipe(res);
    }

    // ----------------------------------------------------------- static ---
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('Method not allowed'); }
    const { root, rel, onlyJs } = staticPath(pathname);
    const file = resolve(root, rel || 'index.html');
    if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); return res.end('Forbidden'); }
    if (onlyJs && !file.endsWith('.js')) { res.writeHead(403); return res.end('Forbidden'); }
    if (!existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
    return serveFile(req, res, file);
  } catch (e) {
    console.error('[request error]', e);
    if (!res.headersSent) json(res, 500, { error: String(e.message || e) });
    else res.end();
  }
});

// Old renders are removed every 10 minutes.
setInterval(() => {
  const cutoff = Date.now() - JOB_TTL;
  for (const [id, j] of jobs) {
    if (j.created < cutoff) {
      if (j.file) try { rmSync(j.file, { force: true }); } catch {}
      jobs.delete(id);
    }
  }
}, 10 * 60 * 1000).unref();

server.listen(PORT, HOST, () => {
  console.log(`Motion Reels studio → http://${HOST}:${PORT}`);
  console.log(`ffmpeg: ${ffmpegInstaller.path} (${ffmpegInstaller.version})`);
});
