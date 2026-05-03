const Author = require('./models/author')
const Book = require('./models/book')
const User = require('./models/user')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { GraphQLError } = require('graphql')
const { PubSub } = require('graphql-subscriptions')

const pubsub = new PubSub()

const resolvers = {
  Query: {
    bookCount: async () => Book.countDocuments(),
    authorCount: async () => Author.countDocuments(),
    allBooks: async (root, args) => {
      const { author: authorName, genre } = args || {}

      const query = {}

      if (authorName) {
        const authorDoc = await Author.findOne({ name: authorName })
        if (!authorDoc) {
          // no author -> no books
          return []
        }
        query.author = authorDoc._id
      }

      if (genre) {
        // match any book that has the genre in its genres array
        query.genres = { $in: [genre] }
      }

      return Book.find(query).populate('author')
    },
    allAuthors: async () => {
      // fetch authors and book counts in two queries to avoid N+1
      const authors = await Author.find({})
      const counts = await Book.aggregate([
        { $group: { _id: '$author', count: { $sum: 1 } } },
      ])
      const countMap = {}
      counts.forEach((c) => {
        countMap[c._id?.toString()] = c.count
      })

      // return plain objects with a precomputed `bookCount` field to avoid per-author DB calls
      return authors.map((a) => {
        const obj = a.toObject ? a.toObject() : a
        obj.id = a._id.toString()
        obj.bookCount = countMap[a._id.toString()] || 0
        return obj
      })
    },
    me: (root, args, context) => context.currentUser || null,
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      try {
        let author = await Author.findOne({ name: args.author })
        if (!author) {
          author = new Author({ name: args.author })
          await author.save()
        }

        const book = new Book({
          title: args.title,
          published: args.published,
          author: author._id,
          genres: args.genres,
        })

        await book.save()
        // populate before return
        const saved = await Book.findById(book._id).populate('author')
        pubsub.publish('BOOK_ADDED', { bookAdded: saved })
        return saved
      } catch (error) {
        if (error.name === 'ValidationError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT', invalidArgs: Object.keys(error.errors) },
          })
        }
        if (error.code === 11000) {
          // duplicate key
          const field = Object.keys(error.keyValue || {})[0]
          throw new GraphQLError(`duplicate value for field ${field}`, {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }
        throw error
      }
    },

    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const author = await Author.findOne({ name: args.name })
      if (!author) return null
      author.born = args.setBornTo
      try {
        await author.save()
        return author
      } catch (error) {
        if (error.name === 'ValidationError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT', invalidArgs: Object.keys(error.errors) },
          })
        }
        throw error
      }
    },

    createUser: async (root, args) => {
      try {
        const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })
        await user.save()
        return user
      } catch (error) {
        if (error.name === 'ValidationError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT', invalidArgs: Object.keys(error.errors) },
          })
        }
        if (error.code === 11000) {
          const field = Object.keys(error.keyValue || {})[0]
          throw new GraphQLError(`duplicate value for field ${field}`, {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }
        throw error
      }
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
      if (!user) {
        throw new Error('invalid username or password')
      }
      const passwordCorrect = await bcrypt.compare(args.password, user.passwordHash || '')
      if (!passwordCorrect) {
        throw new Error('invalid username or password')
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },

    _resetDatabase: async () => {
      if (process.env.NODE_ENV !== 'test') {
        throw new GraphQLError('_resetDatabase is only available in test mode')
      }
      await Author.deleteMany({})
      await Book.deleteMany({})
      await User.deleteMany({})
      return true
    },
  },
  Book: {
    author: async (root) => {
      if (!root.author) return null
      if (root.author.name) return root.author
      return Author.findById(root.author)
    },
  },
  Author: {
    bookCount: async (root) => {
      // if `allAuthors` attached a precomputed bookCount, use it
      if (root.bookCount !== undefined && root.bookCount !== null) {
        return root.bookCount
      }
      return Book.countDocuments({ author: root._id })
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
    },
  },
}

module.exports = resolvers
