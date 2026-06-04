let start = document.querySelector(".start-btn")

start.addEventListener("click", function() {
    let inpit = document.querySelector(".shoot")
    console.log(inpit.value)

    let xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:5000/createLobby")

    let room_id = document.querySelector(".room_id")
    let data = {
        "room_id": room_id.value
    }

    xhr.responseType = 'json'
    xhr.send(JSON.stringify(data));

    xhr.onload = () => {
        let json_obj = xhr.response;

        // if (json_obj == null) {
        //     const xhrHash = new XMLHttpRequest();
        //     xhrHash.open("POST", "http://localhost:5000/getHash")
        //     xhrHash.responseType = 'json'
        //     xhrHash.send(JSON.stringify(data))
        //     xhrHash.onload = () => {
        //         json_obj = xhrHash.response
        //     }
        // }

        let xhrJoin = new XMLHttpRequest();
        xhrJoin.open("POST", "http://localhost:5000/join")
        data.user = inpit.value
        xhrJoin.responseType = 'json'
        xhrJoin.send(JSON.stringify(data));

        xhrJoin.onload = () => {
            window.location.href = `../Loby/loby.html?name=${inpit.value}&lobby=${json_obj}`
        }
    }
    //window.location.href = "../Loby/loby.html?name="+inpit.value
})