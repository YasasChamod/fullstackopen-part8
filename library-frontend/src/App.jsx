import { useEffect, useState } from 'react'
import Authors from './components/Authors'
import Books from './components/Books'
import Login from './components/Login'
import NewBook from './components/NewBook'
import Recommend from './components/Recommend'

const App = () => {
  const [page, setPage] = useState('authors')
  const [refreshKey, setRefreshKey] = useState(0)
  const [token, setToken] = useState(() => localStorage.getItem('library-user-token'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('library-user-token', token)
    } else {
      localStorage.removeItem('library-user-token')
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
