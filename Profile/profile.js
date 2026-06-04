const startButton = document.querySelector('.start-btn');
const nameInput = document.querySelector('.shoot');
const roomInput = document.querySelector('.room_id');
const urlParams = new URLSearchParams(window.location.search);
const invitedLobby = urlParams.get('lobby');
const PLAYER_NAME_STORAGE_KEY = 'gartic-player-name';
const PLAYER_LOBBY_STORAGE_KEY = 'gartic-player-lobby';

if (invitedLobby) {
  roomInput.value = invitedLobby;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

startButton.addEventListener('click', async () => {
  const username = nameInput.value.trim();
  const roomId = roomInput.value.trim();

  if (!username) {
    alert('Введіть нік.');
    nameInput.focus();
    return;
  }

  if (!invitedLobby && !roomId) {
    alert('Введіть код гри.');
    roomInput.focus();
    return;
  }

  try {
    let lobbyId = invitedLobby;

    if (!lobbyId) {
      const lobbyResponse = await postJson('/createLobby', { room_id: roomId });
      lobbyId = lobbyResponse.lobby;
    }

    await postJson('/join', {
      lobby: lobbyId,
      user: username,
    });

    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, username);
    localStorage.setItem(PLAYER_LOBBY_STORAGE_KEY, lobbyId);

    window.location.href = `/lobby/${encodeURIComponent(lobbyId)}`;
  } catch (error) {
    console.error(error);
    alert(error.message || 'Не вдалося підключитися до лобі.');
  }
});
