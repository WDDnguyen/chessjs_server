const mongoose = require('mongoose')
const chessMatchSchema = new mongoose.Schema({
    _id: {
        type: Object,
        required: true
    },
    creationTime: {
        type: Date,
        required: true
    },
    history: [String]
})

module.exports = mongoose.model('ChessMatch', chessMatchSchema)