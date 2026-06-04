const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 5000;
const ROOT_DIR = path.resolve(__dirname, '..');
const SALT = 'dmytro';
const USER_TTL_MS = 30000;

const lobbies = {};

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

    if (pathname === '/leave' && req.method === 'POST') {
      await leaveLobby(req, res);
      return;
    }

    if (pathname === '/heartbeat' && req.method === 'POST') {
      await heartbeat(req, res);
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
      redirectToInvite(pathname, res);
      return;
    }

    if (pathname.startsWith('/invite/')) {
      serveProfilePage(res);
      return;
    }

    if (pathname.startsWith('/lobby/')) {
      serveLobbyPage(res);
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

function getLobbyRecord(lobbyId) {
  return lobbies[lobbyId] || null;
}

function ensureLobbyRecord(lobbyId) {
  if (!Object.hasOwn(lobbies, lobbyId)) {
    lobbies[lobbyId] = {
      users: {},
    };
  }

  return lobbies[lobbyId];
}

function cleanupLobbyUsers(lobbyId) {
  const lobby = getLobbyRecord(lobbyId);

  if (!lobby) {
    return;
  }

  const now = Date.now();

  Object.entries(lobby.users).forEach(([username, lastSeenAt]) => {
    if (now - lastSeenAt > USER_TTL_MS) {
      delete lobby.users[username];
    }
  });
}

function addOrRefreshUser(lobbyId, username) {
  const lobby = ensureLobbyRecord(lobbyId);
  lobby.users[username] = Date.now();
}

function removeUser(lobbyId, username) {
  const lobby = getLobbyRecord(lobbyId);

  if (!lobby) {
    return false;
  }

  if (!Object.hasOwn(lobby.users, username)) {
    return false;
  }

  delete lobby.users[username];
  return true;
}

function getActiveUsers(lobbyId) {
  cleanupLobbyUsers(lobbyId);

  const lobby = getLobbyRecord(lobbyId);
  if (!lobby) {
    return null;
  }

  return Object.keys(lobby.users);
}

async function createLobby(req, res) {
  const payload = await readBody(req);

  if (typeof payload.room_id !== 'string' || !payload.room_id.trim()) {
    sendJson(res, 400, { code: 400, message: 'room_id is required' });
    return;
  }

  const hash = makeLobbyHash(payload.room_id.trim());
  ensureLobbyRecord(hash);

  sendJson(res, 200, { code: 200, lobby: hash });
}

async function joinToLobby(req, res) {
  const payload = await readBody(req);
  const lobbyId = resolveLobbyId(payload);

  if (!lobbyId || typeof payload.user !== 'string' || !payload.user.trim()) {
    sendJson(res, 400, { code: 400, message: 'lobby and user are required' });
    return;
  }

  if (!getLobbyRecord(lobbyId)) {
    sendJson(res, 404, { code: 404, message: 'Lobby not found' });
    return;
  }

  const username = payload.user.trim();
  addOrRefreshUser(lobbyId, username);

  sendJson(res, 200, { code: 200, lobby: lobbyId, user: username });
}

async function leaveLobby(req, res) {
  const payload = await readBody(req);
  const lobbyId = resolveLobbyId(payload);

  if (!lobbyId || typeof payload.user !== 'string' || !payload.user.trim()) {
    sendJson(res, 400, { code: 400, message: 'lobby and user are required' });
    return;
  }

  removeUser(lobbyId, payload.user.trim());
  sendJson(res, 200, { code: 200 });
}

async function heartbeat(req, res) {
  const payload = await readBody(req);
  const lobbyId = resolveLobbyId(payload);

  if (!lobbyId || typeof payload.user !== 'string' || !payload.user.trim()) {
    sendJson(res, 400, { code: 400, message: 'lobby and user are required' });
    return;
  }

  if (!getLobbyRecord(lobbyId)) {
    sendJson(res, 404, { code: 404, message: 'Lobby not found' });
    return;
  }

  addOrRefreshUser(lobbyId, payload.user.trim());
  sendJson(res, 200, { code: 200 });
}

async function getAllUsers(req, res) {
  const payload = await readBody(req);
  const lobbyId = resolveLobbyId(payload);

  if (!lobbyId) {
    sendJson(res, 400, { code: 400, message: 'lobby is required' });
    return;
  }

  if (!getLobbyRecord(lobbyId)) {
    sendJson(res, 404, { code: 404, message: 'Lobby not found' });
    return;
  }

  const activeUsers = getActiveUsers(lobbyId);
  sendJson(res, 200, activeUsers);
}

async function getHash(req, res) {
  const payload = await readBody(req);

  if (typeof payload.room_id !== 'string' || !payload.room_id.trim()) {
    sendJson(res, 400, { code: 400, message: 'room_id is required' });
    return;
  }

  sendJson(res, 200, { code: 200, lobby: makeLobbyHash(payload.room_id.trim()) });
}

function redirectToInvite(pathname, res) {
  const lobbyHash = decodeURIComponent(pathname.split('/').pop() || '').trim();

  if (!lobbyHash) {
    sendJson(res, 400, { code: 400, message: 'Lobby hash is required' });
    return;
  }

  res.writeHead(302, {
    Location: `/invite/${encodeURIComponent(lobbyHash)}`,
  });
  res.end();
}

function serveProfilePage(res) {
  const filePath = path.join(ROOT_DIR, 'Profile', 'profile.html');

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(res, 404, { code: 404, message: 'Profile page not found' });
      return;
    }

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function serveLobbyPage(res) {
  const filePath = path.join(ROOT_DIR, 'Loby', 'loby.html');

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(res, 404, { code: 404, message: 'Lobby page not found' });
      return;
    }

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function serveStatic(pathname, res) {
  if (pathname === '/') {
    res.writeHead(302, { Location: '/Profile/profile.html' });
    res.end();
    return;
  }

  const normalizedPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
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

setInterval(() => {
  Object.keys(lobbies).forEach(cleanupLobbyUsers);
}, 10000);

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
