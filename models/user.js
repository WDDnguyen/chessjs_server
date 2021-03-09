const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    creationTime: {
        type: Date,
        required: true
    },
    passwordHash: {
        type: String,
        required: true
    }
})

userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.passwordHash
    }
})

module.exports = mongoose.model('User', userSchema)