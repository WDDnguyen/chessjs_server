require('dotenv').config()

const PORT = process.env.PORT
const MONGODB_URI = process.env.MONGODB_URI
const SECRET = process.env.SECRET
const ROOM_ID_SIZE = process.env.ROOM_ID_SIZE
const GAME_ID_SIZE = process.env.GAME_ID_SIZE

module.exports = {
    MONGODB_URI,
    PORT,
    SECRET,
    ROOM_ID_SIZE,
    GAME_ID_SIZE
}