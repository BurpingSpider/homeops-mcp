const http = require('http');
const fs = require('fs');
const path = require('path');
const { Store } = require('./lib/store');
const { createTools } = require('./lib/tools');
const { respond } = require('./lib/agent');

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = process.env.HOMEOPS_DATA || path.join(__dirname, 'data', 'homeops.json');
const PUBLIC = path.join(__dirname, 'public');
const store = new Store(DATA_FILE);
const tools = createTools(store);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,mcp-protocol-version',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(data);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

async function handleMcp(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method === 'GET') {
    return sendJson(res, 200, {
      name: 'HomeOps MCP',
      protocolVersion: '2025-11-25',
      transport: 'Streamable HTTP',
      endpoint: '/mcp'
    });
  }
  if (req.method !== 'POST') return sendJson(res, 405, rpcError(null, -32600, 'Method not allowed'));

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, rpcError(null, -32700, 'Parse error'));
  }

  const { id, method, params = {} } = body;
  try {
    if (method === 'initialize') {
      return sendJson(res, 200, rpcResult(id, {
        protocolVersion: '2025-11-25',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'homeops-mcp', version: '1.0.0' }
      }));
    }
    if (method === 'notifications/initialized') {
      res.writeHead(204, { 'access-control-allow-origin': '*' });
      return res.end();
    }
    if (method === 'ping') return sendJson(res, 200, rpcResult(id, {}));
    if (method === 'tools/list') return sendJson(res, 200, rpcResult(id, { tools: tools.definitions }));
    if (method === 'tools/call') {
      const output = await tools.call(params.name, params.arguments || {});
      return sendJson(res, 200, rpcResult(id, {
        content: [{ type: 'text', text: output.text }],
        structuredContent: output.data,
        isError: false
      }));
    }
    return sendJson(res, 404, rpcError(id, -32601, `Method not found: ${method}`));
  } catch (error) {
    return sendJson(res, 200, rpcResult(id, {
      content: [{ type: 'text', text: error.message }],
      isError: true
    }));
  }
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/agent' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const result = await respond(body.text, tools);
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, {
      assets: store.listAssets(),
      due: store.dueItems({ horizonDays: 3650 })
    });
  }
  if (url.pathname === '/api/reset-demo' && req.method === 'POST') {
    seedDemo();
    return sendJson(res, 200, { ok: true });
  }
  return false;
}

function seedDemo() {
  const today = new Date();
  const ago = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  store.reset({
    version: 1,
    assets: [
      { id: 'asset_hvac_filter', name: 'HVAC filter', category: 'HVAC', intervalDays: 90, lastServiceDate: ago(82), notes: '16x25x1 pleated filter', createdAt: new Date().toISOString(), history: [{ date: ago(82), action: 'service', note: 'Demo baseline' }] },
      { id: 'asset_smoke_alarms', name: 'Smoke alarm batteries', category: 'Safety', intervalDays: 180, lastServiceDate: ago(190), notes: 'Test all alarms after replacement', createdAt: new Date().toISOString(), history: [{ date: ago(190), action: 'service', note: 'Demo baseline' }] },
      { id: 'asset_water_filter', name: 'Refrigerator water filter', category: 'Kitchen', intervalDays: 180, lastServiceDate: ago(120), notes: 'Model WF-2', createdAt: new Date().toISOString(), history: [{ date: ago(120), action: 'service', note: 'Demo baseline' }] }
    ]
  });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const target = path.normalize(path.join(PUBLIC, rel));
  if (!target.startsWith(PUBLIC)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  const ext = path.extname(target);
  const stat = fs.statSync(target);
  res.writeHead(200, {
    'content-type': mime[ext] || 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': 'no-store'
  });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/mcp') return handleMcp(req, res);
  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, url);
    if (handled !== false) return;
  }
  serveStatic(req, res, url);
});

if (require.main === module) {
  if (!store.listAssets().length) seedDemo();
  server.listen(PORT, () => {
    console.log(`HomeOps MCP running at http://localhost:${PORT}`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  });
}

module.exports = { server, store, tools, seedDemo };
