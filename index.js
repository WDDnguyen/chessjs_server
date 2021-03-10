const config = require('./utils/config')
const {Chess} = require('chess.js')
const express = require('express')
const cors = require('cors')
const app = express()
const http = require('http').createServer(app)
const {nanoid} = require('nanoid')
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})
const usersRouter = require('./controllers/users')
const storeChessMatch = require('./controllers/chessMatches')
const mongoose = require('mongoose')
const url = config.MONGODB_URI

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })

app.use(cors())
app.use(express.static('build'))
app.use(express.json())
app.use('/api/users', usersRouter)

let roomMap = new Map()
let userMap = new Map()

const createChessRoom = (roomName, side, roomOwner) => {
    let chessGame = createChessGame()

    if (side === 'white') {
        chessGame.whitePlayer = roomOwner.userName
    } else {
        chessGame.blackPlayer = roomOwner.userName
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
        gameId: nanoid(5),
        whitePlayer: '',
        blackPlayer: '',
        chess: new Chess()
    }
}

const removeUserRooms = (socket) => {
    const rooms = socket.rooms
    const userName = userMap.get(socket.id)
    rooms.forEach(room => {
        if (roomMap.has(room)){
            const roomOwner = roomMap.get(room).roomOwner
            if (roomOwner.userName === userName) {
                roomMap.delete(room)
                io.emit('available_rooms', Array.from(roomMap.values()))
            }
        }
    })
    
}

const getChessStatus = (chess, whitePlayer, blackPlayer) => {
    const fen = chess.fen()
    const currentPlayer = chess.turn() === 'w' ? whitePlayer : blackPlayer
    const winner = chess.in_checkmate() ? (chess.turn() === 'w' ? blackPlayer : whitePlayer) : '' 
    const history = chess.history()
    const potentialMoves = chess.moves({verbose: true})
    const isChecked = chess.in_check()
    const isGameOver = chess.game_over()

    return {
        fen,
        currentPlayer,
        winner,
        history,
        potentialMoves,
        isChecked,
        isGameOver
    }
}

// Socket handling
io.on('connection', (socket) => {
    
    console.log('A user is connected')
    socket.on("disconnecting", () => {
        removeUserRooms(socket)
    })
       
    socket.on('disconnect', () => {
        console.log('user Disconnect')
        
    })

    // Lobby Socket Handling
    socket.on('available_rooms', () => {
        socket.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('create_room', ({newRoomInfo, user}) => {
        userMap.set(socket.id, user.userName)
        const newRoomId = nanoid(Number(config.ROOM_ID_SIZE))
        // Generate another roomID if collision happened
        if (socket.rooms.has(newRoomId)) {
            newRoomId = nanoid(Number(config.ROOM_ID_SIZE))
        }

        removeUserRooms(socket)
        socket.join(newRoomId)
          
        let chessRoom = createChessRoom(newRoomId, newRoomInfo.side, user)

        roomMap.set(newRoomId, chessRoom)
        socket.emit('create_room_accepted', {newRoomId})
        io.emit('available_rooms', Array.from(roomMap.values()))
    })

    socket.on('join_room', ({roomName, user}) => {
        userMap.set(socket.id, user.userName)
        const chessRoom = roomMap.get(roomName)

        if (chessRoom) {
            socket.join(roomName)
            chessRoom.gameLog.push(`${user.userName} has joined`)
            socket.emit('join_room_accepted', {roomName})

            const room = io.sockets.adapter.rooms.get(roomName.toString())
            if (room.size === 2) {
                if (chessRoom.chessGame.whitePlayer === '') {
                    chessRoom.chessGame.whitePlayer = user.userName
                } else {
                    chessRoom.chessGame.blackPlayer = user.userName
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
        if (chessRoom) {
            const chessGame = chessRoom.chessGame
            const chessStatus = 
                getChessStatus(chessGame.chess, chessGame.whitePlayer, chessGame.blackPlayer)
            if (chessStatus.isGameOver) {
                storeChessMatch(chessRoom.chessGame)
            }

            socket.emit('chess_state', chessStatus)
        }
    })

    socket.on('move', ({roomId, from, to}) => {
        const chessRoom = roomMap.get(roomId)
        const chess = chessRoom.chessGame.chess
        const validMove = chess.move({from: from, to: to})

        if (validMove) {
            const chessGame = chessRoom.chessGame
            const chessStatus = 
                getChessStatus(chess, chessGame.whitePlayer, chessGame.blackPlayer)
            io.to(roomId).emit('chess_state', chessStatus)
        }
    })
})

const PORT = config.PORT || 3001
const server = http.listen(PORT, () => {
    console.log('Server is running on port', server.address().port)
})

