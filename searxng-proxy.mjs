import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';

let BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY || '';
if (!BRAVE_API_KEY) {
  try {
    const envLocal = readFileSync('.env.local', 'utf8');
    const match = envLocal.match(/BRAVE_SEARCH_API_KEY=(.+)/);
    if (match) BRAVE_API_KEY = match[1].trim();
  } catch {}
}

if (!BRAVE_API_KEY) {
  console.error('[SearxNG Proxy] ERROR: BRAVE_SEARCH_API_KEY not found in environment or .env.local');
  process.exit(1);
}

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100;
const requestQueue = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (requestQueue.length > 0) {
    const { resolve, reject, fn } = requestQueue.shift();
    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestTime));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequestTime = Date.now();
    try {
      resolve(await fn());
    } catch (e) {
      reject(e);
    }
  }
  processing = false;
}

function rateLimited(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn });
    processQueue();
  });
}

function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'identity',
        ...headers,
      },
      timeout: 10000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function searchBraveNews(query, count = 20) {
  const results = [];
  try {
    const data = await rateLimited(() =>
      fetchJSON(
        `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&search_lang=en`,
        { 'X-Subscription-Token': BRAVE_API_KEY }
      )
    );

    const newsResults = data.results || [];
    for (const r of newsResults) {
      results.push({
        url: r.url,
        title: r.title || '',
        content: r.description || r.title || '',
        thumbnail: r.thumbnail?.src || r.meta_url?.favicon || '',
        img_src: r.thumbnail?.src || '',
        thumbnail_src: r.thumbnail?.src || '',
        author: r.meta_url?.hostname || '',
        engine: 'brave_api_news',
        category: 'news',
      });
    }
  } catch (err) {
    console.error('[SearxNG Proxy] Brave News API error:', err.message);
  }
  return results;
}

async function searchBrave(query, count = 10) {
  const results = [];
  try {
    const data = await rateLimited(() =>
      fetchJSON(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&search_lang=en`,
        { 'X-Subscription-Token': BRAVE_API_KEY }
      )
    );

    const webResults = data.web?.results || [];
    for (const r of webResults) {
      results.push({
        url: r.url,
        title: r.title || '',
        content: r.description || r.title || '',
        thumbnail: r.thumbnail?.src || '',
        img_src: r.thumbnail?.src || '',
        thumbnail_src: r.thumbnail?.src || '',
        engine: 'brave_api',
        category: 'general',
      });
    }

    if (data.news?.results) {
      for (const r of data.news.results) {
        if (!results.find(existing => existing.url === r.url)) {
          results.push({
            url: r.url,
            title: r.title || '',
            content: r.description || r.title || '',
            thumbnail: r.thumbnail?.src || '',
            img_src: r.thumbnail?.src || '',
            thumbnail_src: r.thumbnail?.src || '',
            engine: 'brave_api_news',
            category: 'news',
          });
        }
      }
    }
  } catch (err) {
    console.error('[SearxNG Proxy] Brave API error:', err.message);
  }
  return results;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost`);

  if (url.pathname === '/search') {
    const query = url.searchParams.get('q') || '';
    const engines = url.searchParams.get('engines') || '';

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing query parameter' }));
      return;
    }

    const isNewsSearch = engines.toLowerCase().includes('news');
    console.log(`[SearxNG Proxy] ${isNewsSearch ? 'News' : 'Web'} search: "${query}" (queue: ${requestQueue.length})`);

    try {
      const results = isNewsSearch
        ? await searchBraveNews(query)
        : await searchBrave(query);
      console.log(`[SearxNG Proxy] Got ${results.length} results`);

      const response = {
        query: query,
        number_of_results: results.length,
        results: results,
        suggestions: [],
        infoboxes: [],
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (err) {
      console.error('[SearxNG Proxy] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', engine: 'brave-search-api' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SearxNG Proxy] Running on http://localhost:${PORT} (Brave Search API, rate limited 1/s)`);
});
