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
const ROOM_NANO_ID_SIZE = 5
const GAME_NANO_ID_SIZE = 5

const createChessRoom = (roomName, side, roomOwner) => {
    let chessGame = createChessGame()

    if (side === 'white') {
        chessGame.whitePlayer = roomOwner
    } else {
        chessGame.blackPlayer = roomOwner
    }

    return {
        roomName: roomName,
        roomOwner: roomOwner,
        chessGame
    }
}
const createChessGame = () => {
    return {
        whitePlayer: {},
        blackPlayer: {},
        gameId: nanoid(GAME_NANO_ID_SIZE),
        chess: new Chess()
    }
}

// Socket handling
io.on('connection', (socket) => {
    socket.on('set_socket_nickname', nickname => {
        socket.nickname = nickname
    }) 
       
    console.log('A user is connected')
    socket.on('disconnect', () => {
        console.log('user Disconnect')
    })

    socket.on('available_rooms', () => {
        socket.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('create_room', ({newRoomInfo, user}) => {
        const newRoomId = nanoid(ROOM_NANO_ID_SIZE)
        if (socket.rooms.has(newRoomId)) {
            newRoomId = nanoid(ROOM_NANO_ID_SIZE)
        }

        socket.join(newRoomId)     

        let chessRoom = createChessRoom(newRoomId, newRoomInfo.side, user)

        roomMap.set(newRoomId, chessRoom)
        //console.log('Create new room : ', newRoomId, socket.rooms, roomMap)
        io.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('join_room', ({room, user}) => {
        const roomName = room.roomName
        const chessRoom = roomMap.get(roomName)
        
        if (chessRoom) {
            socket.join(roomName)
            socket.emit('join_room_accepted')

            const room = io.sockets.adapter.rooms.get(roomName.toString())
            if (room.size === 2) {
                if (Object.keys(chessRoom.chessGame.whitePlayer).length === 0) {
                    chessRoom.chessGame.whitePlayer = user
                } else {
                    chessRoom.chessGame.blackPlayer = user
                }

                io.to(roomName).emit('play_chess_game', {roomName})
            }

        } else {
            console.log('ERROR room not found')
        }
    })
})

const PORT = 3001
const server = http.listen(PORT, () => {
    console.log('Server is running on port', server.address().port)
})
