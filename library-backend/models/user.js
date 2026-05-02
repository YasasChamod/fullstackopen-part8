const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
  },
  favoriteGenre: {
    type: String,
  },
  passwordHash: {
    type: String,
  },
})

schema.pre('save', async function (next) {
  if (!this.passwordHash) {
    // default test password
    const hash = await bcrypt.hash('secret', 10)
    this.passwordHash = hash
  }
  next()
})

module.exports = mongoose.model('User', schema)
