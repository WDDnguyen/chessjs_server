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
        roomName,
        roomOwner,
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

const getChessStatus = (chess) => {
    const fen = chess.fen()
    const turn = chess.turn()
    const history = chess.history()
    const potentialMoves = chess.moves({verbose: true})

    return {
        fen,
        turn,
        history,
        potentialMoves
    }
}

// Socket handling
io.on('connection', (socket) => {
    socket.on('set_socket_nickname', nickname => {
        socket.nickname = nickname
    }) 
       
    console.log('A user is connected')
    socket.on('disconnect', () => {
        console.log('user Disconnect', socket)
        
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
        console.log('Create new room : ', newRoomId, socket.rooms, roomMap)
        socket.emit('create_room_accepted', {newRoomId})
        io.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('join_room', ({roomName, user}) => {
        const chessRoom = roomMap.get(roomName)
        
        if (chessRoom) {
            socket.join(roomName)
            socket.emit('join_room_accepted', {roomName})

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

    socket.on('chess_state', ({roomId}) => {
        console.log('CHESS STATE roomID', roomId)
        const chessRoom = roomMap.get(roomId)
        console.log(chessRoom)
        const chessStatus = getChessStatus(chessRoom.chessGame.chess)
        socket.emit('chess_state', chessStatus)
    })

    socket.on('move', ({roomId, from, to}) => {
        console.log("CHESS MOVE roomID", roomId)
        const chessRoom = roomMap.get(roomId)
        const validMove = chessRoom.chessGame.chess.move({from: from, to: to})

        if (validMove) {
            const chessStatus = getChessStatus(chessRoom.chessGame.chess)
            io.to(roomId).emit('chess_state', chessStatus)
        }
    })
})

const PORT = 3001
const server = http.listen(PORT, () => {
    console.log('Server is running on port', server.address().port)
})

