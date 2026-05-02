import { useState } from 'react'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'

const App = () => {
  const [page, setPage] = useState('authors')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleBookAdded = () => {
    setRefreshKey((current) => current + 1)
    setPage('books')
  }

  const handleAuthorUpdated = () => {
    setRefreshKey((current) => current + 1)
  }

  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button onClick={() => setPage('add')}>add book</button>
      </div>

      <Authors
        show={page === 'authors'}
        refreshKey={refreshKey}
        onAuthorUpdated={handleAuthorUpdated}
      />

      <Books show={page === 'books'} refreshKey={refreshKey} />

      <NewBook show={page === 'add'} onBookAdded={handleBookAdded} />
    </div>
  )
}

export default App
