const usersRouter = require('express').Router()
const config = require('../utils/config')
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

usersRouter.post('/', async (request, response) => {
    const body = request.body
config.MONGODB_URI
    try {
        const userExist = await User.findOne({userName: body.userName})

        if (userExist) {
            response.status(400).json({message: 'User already exists'})
        } else {
            const saltRounds = 10
            const passwordHash = await bcrypt.hash(body.password, saltRounds)
            const user = new User({
                userName: body.userName,
                creationTime: new Date(),
                passwordHash
            })
    
            const savedUser = await user.save()
            
            const userForToken = {
                userName: savedUser.userName,
                id: user._id
            }
            const token = jwt.sign(userForToken, config.SECRET)
            response.status(200).json({token, userName: savedUser.userName})
        }
    } catch (error) {
        console.error(error)
        response.status(500).json({
            message: "Server Error"
        })
    }
})

usersRouter.get('/', async (request, response) => {
    const credentials = JSON.parse(request.query.credentials)
    try {
        const user = await User.findOne({userName: credentials.userName})
        if (user) {
            const isMatch = await bcrypt.compare(credentials.password, user.passwordHash)
            if (isMatch) {
                const token = jwt.sign(userForToken, config.SECRET)
                response.status(200).json({token, userName: savedUser.userName})
            } else {
                response.status(400).json({message: 'Incorrect password'})
            }
        } else {
            response.status(400).json({message: `User doesn't exist`})
        }
    } catch (error) {
        console.error(error)
        response.status(500).json({
            message: "Server Error"
        })
    }
})

module.exports = usersRouter