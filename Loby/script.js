const urlParams = new URLSearchParams(window.location.search);

const lobby = urlParams.get('lobby');
const name = urlParams.get('name');

const playerList = document.querySelector('#player-list');
const serverLink = document.querySelector('.invite-section > input');
const copyLinkButton = document.querySelector('.invite-section > button');

serverLink.value = `${window.location.origin}/joinLobby/${encodeURIComponent(lobby || '')}`;

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
