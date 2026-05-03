const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@as-integrations/express4')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const express = require('express')
const http = require('http')
const cors = require('cors')
const bodyParser = require('body-parser')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const typeDefs = require('./schema')
const resolvers = require('./resolvers')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/library'

console.log('connecting to', MONGODB_URI)

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((err) => {
    console.error('error connection to MongoDB:', err.message)
  })

const schema = makeExecutableSchema({ typeDefs, resolvers })

async function start() {
  const app = express()
  const httpServer = http.createServer(app)

  const server = new ApolloServer({ schema })
  await server.start()

  app.use(cors())

  app.get('/', (_req, res) => {
    res.status(200).send('ok')
  })

  const graphqlMiddleware = expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = req.headers.authorization || ''
      if (auth && auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.substring(7)
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          const User = require('./models/user')
          const currentUser = await User.findById(decoded.id)
          return { currentUser }
        } catch (e) {
          return {}
        }
      }
      return {}
    },
  })

  app.post(
    '/',
    bodyParser.json(),
    graphqlMiddleware
  )

  app.post('/graphql', bodyParser.json(), graphqlMiddleware)

  // Set up WebSocket server for subscriptions
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' })
  useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        const connectionParams = ctx.connectionParams || {}
        const auth = connectionParams.authorization || connectionParams.Authorization || ''
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
          const token = auth.substring(7)
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const User = require('./models/user')
            const currentUser = await User.findById(decoded.id)
            return { currentUser }
          } catch (e) {
            return {}
          }
        }
        return {}
      },
    },
    wsServer
  )

  const PORT = process.env.PORT || 4000
  httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`)
  })
}

start()
