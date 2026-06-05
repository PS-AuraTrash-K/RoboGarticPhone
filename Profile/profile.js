const startButton = document.querySelector('.start-btn');
const nameInput = document.querySelector('.shoot');
const roomInput = document.querySelector('.room_id');
const roomInputGroup = roomInput.closest('.input-group');
const profileSetup = document.querySelector('.profile-setup');
const urlParams = new URLSearchParams(window.location.search);
const pathParts = window.location.pathname.split('/').filter(Boolean);
const inviteLobbyFromPath = pathParts[0] === 'invite' ? decodeURIComponent(pathParts[1] || '').trim() : '';
const invitedLobby = inviteLobbyFromPath || urlParams.get('lobby');
const PLAYER_NAME_STORAGE_KEY = 'gartic-player-name';
const PLAYER_LOBBY_STORAGE_KEY = 'gartic-player-lobby';

const PLAYER_AVATAR_STORAGE_KEY = 'gartic-player-avatar';

const avatars = ['👻', '🤖', '🦊', '🐱', '🐼', '🐸', '🐵', '🐶', '🐺', '🦁', '🐯', '🐻', '🐹'];

const avatarElement = document.querySelector('.ghost-avatar');
const refreshButton = document.querySelector('.refresh-icon');

let currentAvatar =
  localStorage.getItem(PLAYER_AVATAR_STORAGE_KEY) || avatars[0];

avatarElement.textContent = currentAvatar;

refreshButton.addEventListener('click', () => {
  const randomAvatar =
    avatars[Math.floor(Math.random() * avatars.length)];

  currentAvatar = randomAvatar;
  avatarElement.textContent = randomAvatar;

  localStorage.setItem(
    PLAYER_AVATAR_STORAGE_KEY,
    randomAvatar
  );
});

if (invitedLobby) {
  roomInput.value = invitedLobby;
  roomInputGroup.style.display = 'none';
  startButton.textContent = 'ПРИЄДНАТИСЯ';

  const leaveInviteButton = document.createElement('button');
  leaveInviteButton.type = 'button';
  leaveInviteButton.textContent = 'ВИЙТИ З ІНВАЙТУ';
  leaveInviteButton.style.marginTop = '12px';
  leaveInviteButton.style.width = '100%';
  leaveInviteButton.style.padding = '12px';
  leaveInviteButton.style.cursor = 'pointer';

  leaveInviteButton.addEventListener('click', () => {
    localStorage.removeItem(PLAYER_LOBBY_STORAGE_KEY);
    window.location.href = '/Profile/profile.html';
  });

  profileSetup.appendChild(leaveInviteButton);
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

    localStorage.setItem(
  PLAYER_AVATAR_STORAGE_KEY,
  currentAvatar
);

    window.location.href = `/lobby/${encodeURIComponent(lobbyId)}`;
  } catch (error) {
    console.error(error);
    alert(error.message || 'Не вдалося підключитися до лобі.');
  }
});
