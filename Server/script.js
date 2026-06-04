const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 5000;
const ROOT_DIR = path.resolve(__dirname, '..');
const SALT = 'dmytro';

const users = {};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === '/createLobby' && req.method === 'POST') {
      await createLobby(req, res);
      return;
    }

    if (pathname === '/join' && req.method === 'POST') {
      await joinToLobby(req, res);
      return;
    }

    if (pathname === '/getAll' && req.method === 'POST') {
      await getAllUsers(req, res);
      return;
    }

    if (pathname === '/getHash' && req.method === 'POST') {
      await getHash(req, res);
      return;
    }

    if (pathname.startsWith('/joinLobby/')) {
      redirectToProfile(pathname, res);
      return;
    }

    serveStatic(pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { code: 500, message: 'Internal server error' });
  }
});

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function makeLobbyHash(roomId) {
  return crypto.createHash('sha256').update(`${roomId}${SALT}`).digest('hex');
}

function resolveLobbyId(payload) {
  if (typeof payload.lobby === 'string' && payload.lobby.trim()) {
    return payload.lobby.trim();
  }

  if (typeof payload.room_id === 'string' && payload.room_id.trim()) {
    return makeLobbyHash(payload.room_id.trim());
  }

  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

async function createLobby(req, res) {
  const payload = await readBody(req);

  if (typeof payload.room_id !== 'string' || !payload.room_id.trim()) {
    sendJson(res, 400, { code: 400, message: 'room_id is required' });
    return;
  }

  const hash = makeLobbyHash(payload.room_id.trim());

  if (!Object.hasOwn(users, hash)) {
    users[hash] = [];
  }

  sendJson(res, 200, { code: 200, lobby: hash });
}

async function joinToLobby(req, res) {
  const payload = await readBody(req);
  const lobbyId = resolveLobbyId(payload);

  if (!lobbyId || typeof payload.user !== 'string' || !payload.user.trim()) {
    sendJson(res, 400, { code: 400, message: 'lobby and user are required' });
    return;
  }

  if (!Object.hasOwn(users, lobbyId)) {
    sendJson(res, 404, { code: 404, message: 'Lobby not found' });
    return;
  }

  const username = payload.user.trim();

  if (!users[lobbyId].includes(username)) {
    users[lobbyId].push(username);
  }

  sendJson(res, 200, { code: 200, lobby: lobbyId, user: username });
}

async function getAllUsers(req, res) {
  const payload = await readBody(req);
  const lobbyId = resolveLobbyId(payload);

  if (!lobbyId) {
    sendJson(res, 400, { code: 400, message: 'lobby is required' });
    return;
  }

  if (!Object.hasOwn(users, lobbyId)) {
    sendJson(res, 404, { code: 404, message: 'Lobby not found' });
    return;
  }

  sendJson(res, 200, users[lobbyId]);
}

async function getHash(req, res) {
  const payload = await readBody(req);

  if (typeof payload.room_id !== 'string' || !payload.room_id.trim()) {
    sendJson(res, 400, { code: 400, message: 'room_id is required' });
    return;
  }

  sendJson(res, 200, { code: 200, lobby: makeLobbyHash(payload.room_id.trim()) });
}

function redirectToProfile(pathname, res) {
  const lobbyHash = decodeURIComponent(pathname.split('/').pop() || '').trim();

  if (!lobbyHash) {
    sendJson(res, 400, { code: 400, message: 'Lobby hash is required' });
    return;
  }

  res.writeHead(302, {
    Location: `/Profile/profile.html?lobby=${encodeURIComponent(lobbyHash)}`,
  });
  res.end();
}

function serveStatic(pathname, res) {
  const requestPath = pathname === '/' ? '/Profile/profile.html' : pathname;
  const normalizedPath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT_DIR, normalizedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { code: 403, message: 'Forbidden' });
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(res, 404, { code: 404, message: 'Not found' });
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    res.writeHead(200, { 'content-type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
