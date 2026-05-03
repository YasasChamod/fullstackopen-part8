import { useEffect, useState } from 'react'

const Books = (props) => {
  const [books, setBooks] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('all genres')
  const [genres, setGenres] = useState([])

  useEffect(() => {
    if (!props.show) {
      return
    }
    // fetchBooks is defined outside the effect so it can be called from buttons
    fetchBooks(selectedGenre)
  }, [props.show, props.refreshKey, selectedGenre])

  // fetchBooks outside of useEffect so button handlers can call it to get fresh data
  async function fetchBooks(genre) {
    const isFiltered = genre && genre !== 'all genres'

    const body = isFiltered
      ? JSON.stringify({
          query: `query ($genre: String) {
            allBooks(genre: $genre) {
              id
              title
              author { name }
              published
              genres
            }
          }`,
          variables: { genre },
        })
      : JSON.stringify({
          query: `{
            allBooks {
              id
              title
              author { name }
              published
              genres
            }
          }`,
        })

    const response = await fetch('http://localhost:4000/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    const result = await response.json()
    const all = result.data.allBooks || []
    setBooks(all)

    // update genres from returned books
    const genreSet = new Set()
    all.forEach((b) => b.genres?.forEach((g) => genreSet.add(g)))
    setGenres(Array.from(genreSet))
  }

  if (!props.show) {
    return null
  }

  return (
    <div>
      <h2>books</h2>
      {selectedGenre !== 'all genres' && (
        <div>
          in genre <b>{selectedGenre}</b>
        </div>
      )}

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => {
            setSelectedGenre('all genres')
            fetchBooks('all genres')
          }}
        >
          all genres
        </button>
        {genres.map((g) => (
          <button
            key={g}
            style={{ marginLeft: 6 }}
            onClick={() => {
              setSelectedGenre(g)
              fetchBooks(g)
            }}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Books
