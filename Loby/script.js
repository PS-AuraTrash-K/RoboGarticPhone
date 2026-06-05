const PLAYER_NAME_STORAGE_KEY = 'gartic-player-name';
const PLAYER_LOBBY_STORAGE_KEY = 'gartic-player-lobby';
const PRESENCE_INTERVAL_MS = 10000;
const PLAYERS_REFRESH_INTERVAL_MS = 1000;

const urlParams = new URLSearchParams(window.location.search);
const queryLobby = urlParams.get('lobby')?.trim() || '';
const queryName = urlParams.get('name')?.trim() || '';
const pathParts = window.location.pathname.split('/').filter(Boolean);
const pathLobby = pathParts[0] === 'lobby' ? decodeURIComponent(pathParts[1] || '').trim() : '';

let lobby = pathLobby || queryLobby;
let name = localStorage.getItem(PLAYER_NAME_STORAGE_KEY)?.trim() || '';
let savedLobby = localStorage.getItem(PLAYER_LOBBY_STORAGE_KEY)?.trim() || '';
let leftLobby = false;

const playerList = document.querySelector('#player-list');
const serverLink = document.querySelector('.invite-section > input');
const copyLinkButton = document.querySelector('.invite-section > button');
const chat = document.querySelector('#chat');
const inputChat = document.querySelector('.chat-input > input')
const sendChat = document.querySelector('.chat-input > button')

if (queryName) {
  localStorage.setItem(PLAYER_NAME_STORAGE_KEY, queryName);
  name = queryName;
}

if (queryLobby) {
  localStorage.setItem(PLAYER_LOBBY_STORAGE_KEY, queryLobby);
  savedLobby = queryLobby;
}

if (queryLobby && window.location.pathname === '/Loby/loby.html') {
  window.location.replace(`/lobby/${encodeURIComponent(queryLobby)}`);
}

if (!lobby) {
  window.location.replace('/Profile/profile.html');
}

if (!name || savedLobby !== lobby) {
  window.location.replace(`/invite/${encodeURIComponent(lobby)}`);
}

serverLink.value = `${window.location.origin}/invite/${encodeURIComponent(lobby)}`;

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function sendBeaconJson(url, payload) {
  if (!navigator.sendBeacon) {
    return;
  }

  const blob = new Blob([JSON.stringify(payload)], {
    type: 'application/json',
  });

  navigator.sendBeacon(url, blob);
}

async function ensureLobbyMembership() {
  await postJson('/join', {
    lobby,
    user: name,
  });
}

async function sendHeartbeat() {
  if (leftLobby) {
    return;
  }

  try {
    await postJson('/heartbeat', {
      lobby,
      user: name,
    });
  } catch (error) {
    console.error(error);
  }
}

async function leaveLobby() {
  if (leftLobby) {
    return;
  }

  leftLobby = true;

  try {
    await postJson('/leave', {
      lobby,
      user: name,
    });
  } catch (error) {
    console.error(error);
  }
}

function leaveLobbyOnPageExit() {
  if (leftLobby) {
    return;
  }

  leftLobby = true;
  sendBeaconJson('/leave', {
    lobby,
    user: name,
  });
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    serverLink.removeAttribute('readonly');
    serverLink.focus();
    serverLink.select();
    serverLink.setSelectionRange(0, serverLink.value.length);

    const copied = document.execCommand('copy');

    serverLink.setAttribute('readonly', 'readonly');
    serverLink.blur();

    if (!copied) {
      throw new Error('Copy command failed');
    }

    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

copyLinkButton.addEventListener('click', async () => {
  const originalText = copyLinkButton.textContent;
  const copied = await copyToClipboard(serverLink.value);

  copyLinkButton.textContent = copied ? 'Скопійовано' : 'Помилка';

  setTimeout(() => {
    copyLinkButton.textContent = originalText;
  }, 1200);
});

window.addEventListener('pagehide', leaveLobbyOnPageExit);
window.addEventListener('beforeunload', leaveLobbyOnPageExit);

function createPlayerElement(isCurrentUser, username) {
  const playerItem = document.createElement('li');
  playerItem.className = `player ${isCurrentUser ? 'me' : ''}`.trim();

  const icon = document.createElement('span');
  icon.textContent = '🤡';
  playerItem.append(icon, username);

  return playerItem;
}

async function reloadMessages() {
  if (leftLobby) {
    return;
  }

  try {
    const messages = await postJson('/getAllMessages', {
      lobby,
    });

    chat.replaceChildren();

    let objs = Object.entries(messages);

    for (let i = 0; i < objs.length; i++) {
      let p = document.createElement('p')
      p.innerHTML = `<p>${objs[i][1]}</p>`
      chat.appendChild(p);
    }

  } catch (error) {
    console.error(error);
  }
}

async function reloadPlayers() {
  if (leftLobby) {
    return;
  }

  try {
    const players = await postJson('/getAll', {
      lobby,
    });

    playerList.replaceChildren();

    players.forEach((username) => {
      playerList.appendChild(createPlayerElement(username === name, username));
    });
  } catch (error) {
    console.error(error);
  }
}

async function initLobby() {
  try {
    await ensureLobbyMembership();
    await reloadPlayers();
    setInterval(reloadPlayers, PLAYERS_REFRESH_INTERVAL_MS);
    setInterval(sendHeartbeat, PRESENCE_INTERVAL_MS);
    setInterval(reloadMessages, PLAYERS_REFRESH_INTERVAL_MS);
  } catch (error) {
    console.error(error);
    alert(error.message || 'Не вдалося підключитися до лобі.');
    await leaveLobby();
    window.location.replace(`/invite/${encodeURIComponent(lobby)}`);
  }
}

initLobby();

sendChat.addEventListener('click', (ev) => {
  let mes = inputChat.value;

  if (mes == "") return;
   try {
    postJson('/sendMessage', {
      lobby,
      user: name,
      message: mes
    });

    inputChat.value = ""
  } catch (error) {
    console.error(error);
  }
})
