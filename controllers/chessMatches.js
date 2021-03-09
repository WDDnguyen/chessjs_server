const ChessMatch = require('../models/chessMatch')

const storeChessMatch = async (chessGame) => {
    
    try {
        const chessMatchExist = await ChessMatch.findById(chessGame.gameId)
        if (chessMatchExist === null) {
            const chessMatch = new ChessMatch ({
                _id: chessGame.gameId,
                creationTime: Date(),
                history: chessGame.chess.history()
            })
    
            await chessMatch.save()
        }
    } catch (error) {
        console.error(error)
    }
}

module.exports = storeChessMatch