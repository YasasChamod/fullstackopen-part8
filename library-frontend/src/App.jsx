import { useEffect, useState } from 'react'
import { createClient } from 'graphql-ws'
import Authors from './components/Authors'
import Books from './components/Books'
import Login from './components/Login'
import NewBook from './components/NewBook'
import Recommend from './components/Recommend'

const App = () => {
  const [page, setPage] = useState('authors')
  const [refreshKey, setRefreshKey] = useState(0)
  const [token, setToken] = useState(() => localStorage.getItem('library-user-token'))
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (token) {
      localStorage.setItem('library-user-token', token)
    } else {
      localStorage.removeItem('library-user-token')
    }
  }, [token])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname || 'localhost'
    const url = `${protocol}://${host}:4000/graphql`

    const client = createClient({
      url,
      connectionParams: { authorization: token ? `Bearer ${token}` : '' },
    })

    const unsubscribe = client.subscribe(
      {
        query: `subscription { bookAdded { id title published genres author { name id born } } }`,
      },
      {
        next: (result) => {
          if (result.data && result.data.bookAdded) {
            const b = result.data.bookAdded
            setNotice(`New book added: ${b.title} by ${b.author?.name || 'unknown'}`)
            setRefreshKey((c) => c + 1)
            setPage('books')

            window.setTimeout(() => {
              setNotice('')
            }, 5000)
          }
        },
        error: (err) => console.error('Subscription error', err),
        complete: () => console.log('Subscription complete'),
      }
    )

    return () => {
      try {
        unsubscribe()
      } catch (e) {
        // ignore
      }
    }
  }, [token])

  const handleBookAdded = () => {
    setRefreshKey((current) => current + 1)
    setPage('books')
  }

  const handleAuthorUpdated = () => {
    setRefreshKey((current) => current + 1)
  }

  const handleLogin = (newToken) => {
    setToken(newToken)
    setPage('authors')
  }

  const handleLogout = () => {
    setToken(null)
    setPage('authors')
  }

  return (
    <div>
      {notice ? (
        <div style={{ marginBottom: 12, padding: 8, background: '#eef6ff', border: '1px solid #b8d8ff' }}>
          {notice}
        </div>
      ) : null}

      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        {token ? (
          <>
            <button onClick={() => setPage('add')}>add book</button>
            <button onClick={() => setPage('recommend')}>recommend</button>
            <button onClick={handleLogout}>logout</button>
          </>
        ) : (
          <button onClick={() => setPage('login')}>login</button>
        )}
      </div>

      {token && <div>logged in</div>}

      <Authors
        show={page === 'authors'}
        refreshKey={refreshKey}
        onAuthorUpdated={handleAuthorUpdated}
        token={token}
      />

      <Books show={page === 'books'} refreshKey={refreshKey} />

      <NewBook show={page === 'add'} onBookAdded={handleBookAdded} token={token} />

      <Login show={page === 'login'} onLogin={handleLogin} />
      <Recommend show={page === 'recommend'} token={token} />
    </div>
  )
}

export default App
