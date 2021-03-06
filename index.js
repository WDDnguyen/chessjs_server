const {Chess} = require('chess.js')
const app = require('express')()
const http = require('http').createServer(app)
const {nanoid} = require('nanoid')
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

let roomMap = new Map()
let chess = new Chess()
const NANO_ID_SIZE = 5

io.on('connection', (socket) => {
    console.log('A user is connected')
    socket.on('disconnect', () => {
        console.log('user Disconnect')
    })

    socket.on('available_rooms', () => {
        socket.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('create_room', newRoomInfo => {
        const newRoom = {
            id: nanoid(NANO_ID_SIZE),
            roomOwner: newRoomInfo.roomOwner,
            roomName: newRoomInfo.roomName,
            ownerSide: newRoomInfo.side
        }

        roomMap.set(newRoom.id, newRoom)

        socket.emit('available_rooms', Array.from(roomMap.values()))
    })
})

const PORT = 3001
const server = http.listen(PORT, () => {
    console.log('Server is running on port', server.address().port)
})
