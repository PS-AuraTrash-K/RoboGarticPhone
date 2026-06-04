const urlParams = new URLSearchParams(window.location.search);

const lobby = urlParams.get('lobby');
const name = urlParams.get('name');

const player_list = document.querySelector("#player-list")
const server_link = document.querySelector(".invite-section > input")

server_link.value = `http://localhost:5000/joinLobby/${lobby}`

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

const copy_link = document.querySelector(".invite-section > button")
copy_link.addEventListener("click", function(ev) {
    copyToClipboard(server_link.value)
})

function reload_player() {
    let xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:5000/getAll")
    
    let data = {
        "room_id": lobby
    }

    xhr.responseType = 'json'
    xhr.send(JSON.stringify(data));

    xhr.onload = () => {
        const json_obj = xhr.response
        player_list.innerHTML = ""
        json_obj.forEach(user => {
            player_list.innerHTML += show_player(user == name, user)
        });
    }

}

function show_player(me, name) {
    return `<li class="player ${me ? "me" : ""}">
    <span>🤡</span>${name}
    </li>`
}

setInterval(reload_player, 1000)