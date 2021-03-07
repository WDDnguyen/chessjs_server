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

    const gameLog = [`${roomOwner.userName} has joined.`]

    return {
        roomName,
        roomOwner,
        gameLog,
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

    // Lobby Socket Handling
    socket.on('available_rooms', () => {
        socket.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('create_room', ({newRoomInfo, user}) => {
        const newRoomId = nanoid(ROOM_NANO_ID_SIZE)

        // Generate another roomID if collision happened
        if (socket.rooms.has(newRoomId)) {
            newRoomId = nanoid(ROOM_NANO_ID_SIZE)
        }

        socket.join(newRoomId)     

        let chessRoom = createChessRoom(newRoomId, newRoomInfo.side, user)

        roomMap.set(newRoomId, chessRoom)
        socket.emit('create_room_accepted', {newRoomId})
        io.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('join_room', ({roomName, user}) => {
        const chessRoom = roomMap.get(roomName)
        
        if (chessRoom) {
            socket.join(roomName)
            chessRoom.gameLog.push(`${user.userName} has joined`)
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

    // GameLog Socket Handling
    socket.on('request_game_log', ({roomId}) => {
        const chessRoom = roomMap.get(roomId)
        if (chessRoom) {
            socket.emit('game_log', {gameLog : chessRoom.gameLog})
        }
    })
    socket.on('message', ({roomId, user, message}) => {
        const chessRoom = roomMap.get(roomId)
        if (chessRoom) {
            if (message) {
                chessRoom.gameLog.push(`${user.userName}: ${message}`)
            }
            io.to(roomId).emit('game_log', {gameLog : chessRoom.gameLog})
        }
    })

    // Chess Game Socket Handling
    socket.on('chess_state', ({roomId}) => {
        const chessRoom = roomMap.get(roomId)
        const chessStatus = getChessStatus(chessRoom.chessGame.chess)
        socket.emit('chess_state', chessStatus)
    })

    socket.on('move', ({roomId, from, to}) => {
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

