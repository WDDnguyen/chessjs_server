const usersRouter = require('express').Router()
const User = require('../models/user')
const bcrypt = require('bcrypt')

usersRouter.post('/', async (request, response) => {
    const body = request.body

    const userExist = await User.findOne({userName: body.userName})

    if (userExist) {
        response.status(500).json({message: 'User already exists'})
    } else {
        const saltRounds = 10
        try {
            const passwordHash = await bcrypt.hash(body.password, saltRounds)
            const user = new User({
                userName: body.userName,
                creationTime: new Date(),
                passwordHash
            })

            const savedUser = await user.save()
            response.status(200).json(savedUser)

        } catch (error) {
            console.log('User Router error', error)
        }
    }
})

module.exports = usersRouter