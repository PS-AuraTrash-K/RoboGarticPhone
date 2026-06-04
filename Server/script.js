const http = require('http')
const crypto = require('crypto')

let users = {};
/*
{
    "HJFfbhlSFGhjfbwlqebSFnf": [
        "Taras", "Sasha", "Dmytro"
    ]
}
*/


const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.url == "/createLobby" && req.method == "POST") {
        createLobby(req, res);
    } else if (req.url == "/join" && req.method == "POST") {
        joinToLobby(req, res);
    } else if (req.url == "/getAll" && req.method == "POST") {
        getAllUsers(req, res);
    } else if (req.url == "/getHash" && req.method == "POST") {
        getHash(req, res);
    } else if (req.url.startsWith("/joinLobby")) {
        redirect(req, res)
    } else {
        res.end(req.url);
    }
})

function createLobby(req, res) {
    let data = ''
    req.on("data", (chunk) => {
        data += chunk
    })

    req.on('end', () => {
        let json_obj = JSON.parse(data)
        if (!Object.hasOwn(json_obj, "room_id")) {
            res.writeHead(400, {'content-type': "application/json"})
            res.end("{'code':400}")
            return
        }

        let salt = "dmytro"
        const hash = crypto.createHash('sha256')
                    .update(json_obj.room_id + salt)
                    .digest('hex');

        if (Object.hasOwn(users, hash)) {
            res.end(JSON.stringify(hash))
            return
        }
        
        users[hash] = [];

        console.log(users);

        res.end(JSON.stringify(hash))
    })
}

function joinToLobby(req, res) {
    let data = ''
    req.on("data", (chunk) => {
        data += chunk
    })

    req.on("end", ()=>{
        let json_obj = JSON.parse(data);
        if (!Object.hasOwn(json_obj, "room_id") ||
            !Object.hasOwn(json_obj, "user")) {
            res.writeHead(400, {'content-type': "application/json"})
            res.end("{'code':400}")
            return
        }

        let salt = "dmytro"
        const hash = crypto.createHash('sha256')
                    .update(json_obj.room_id + salt)
                    .digest('hex');

        if (!Object.hasOwn(users, hash)) {
            res.writeHead(400, {'content-type': "application/json"})
            res.end("{'code':400}")
            return
        }

        users[hash].push(json_obj.user)

        let message = {
            "code": 200
        }

        res.writeHead(200, {"content-type": "application/json"})
        res.end(JSON.stringify(message));
    })
}

function getAllUsers(req, res) {
    let data = ''
    req.on("data", (chunk) => {
        data += chunk
    })

    req.on('end', () => {
        let json_obj = JSON.parse(data)
        if (!Object.hasOwn(json_obj, "room_id")) {
            res.writeHead(400, {'content-type': "application/json"})
            res.end("{'code':400}")
            return
        }


        if (!Object.hasOwn(users, json_obj.room_id)) {
            res.writeHead(400, {'content-type': "application/json"})
            res.end("{'code':400}")
            return
        }

        res.writeHead(200, {'content-type': "application/json"})
        res.end(JSON.stringify(users[json_obj.room_id]))
    })
}

function getHash(req, res) {
    let data = ''
    req.on("data", (chunk) => {
        data += chunk
    })

    req.on('end', () => {
        let json_obj = JSON.parse(data)
        if (!Object.hasOwn(json_obj, "room_id")) {
            res.writeHead(400, {'content-type': "application/json"})
            res.end("{'code':400}")
            return
        }

        let salt = "dmytro"
        const hash = crypto.createHash('sha256')
                    .update(json_obj.room_id + salt)
                    .digest('hex');
        
        return hash;
    })
}

function redirect(req, res) {
    let lobbyHash = req.url.split("/")
    lobbyHash = lobbyHash[lobbyHash.length - 1]

    res.writeHead(302, { 'Location': 
        `file:///C:/Users/Work/Desktop/GarticPhone-main/GarticPhone-main/Profile/profile.html?lobby=${lobbyHash}` });
    res.end()
}

server.listen(5000);