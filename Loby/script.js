const PLAYER_NAME_STORAGE_KEY = 'gartic-player-name';
const PLAYER_LOBBY_STORAGE_KEY = 'gartic-player-lobby';
const lobby = decodeURIComponent(window.location.pathname.split('/').pop() || '').trim();
const name = localStorage.getItem(PLAYER_NAME_STORAGE_KEY)?.trim() || '';
const savedLobby = localStorage.getItem(PLAYER_LOBBY_STORAGE_KEY)?.trim() || '';

const playerList = document.querySelector('#player-list');
const serverLink = document.querySelector('.invite-section > input');
const copyLinkButton = document.querySelector('.invite-section > button');

serverLink.value = `${window.location.origin}/invite/${encodeURIComponent(lobby || '')}`;

if (!lobby) {
  window.location.replace('/Profile/profile.html');
}

if (!name || savedLobby !== lobby) {
  window.location.replace(`/invite/${encodeURIComponent(lobby)}`);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy text:', error);
  }
}

copyLinkButton.addEventListener('click', () => {
  copyToClipboard(serverLink.value);
});

function createPlayerElement(isCurrentUser, username) {
  const playerItem = document.createElement('li');
  playerItem.className = `player ${isCurrentUser ? 'me' : ''}`.trim();

  const icon = document.createElement('span');
  icon.textContent = '🤡';
  playerItem.append(icon, username);

  return playerItem;
}

async function reloadPlayers() {
  if (!lobby) {
    return;
  }

  try {
    const response = await fetch('/getAll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lobby,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to load players: ${response.status}`);
    }

    const players = await response.json();
    playerList.replaceChildren();

    players.forEach((username) => {
      playerList.appendChild(createPlayerElement(username === name, username));
    });
  } catch (error) {
    console.error(error);
  }
}

reloadPlayers();
setInterval(reloadPlayers, 1000);
