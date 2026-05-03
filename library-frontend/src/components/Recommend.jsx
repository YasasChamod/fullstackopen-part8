import { useEffect, useState } from 'react'

const Recommend = (props) => {
  const [favorite, setFavorite] = useState(null)
  const [books, setBooks] = useState([])

  useEffect(() => {
    if (!props.show) return

    const fetchData = async () => {
      // fetch current user
      const meResp = await fetch('http://localhost:4000/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${props.token}`,
        },
        body: JSON.stringify({ query: '{ me { username favoriteGenre } }' }),
      })
      const meJson = await meResp.json()
      const fav = meJson.data?.me?.favoriteGenre || null
      setFavorite(fav)

      if (!fav) return

      // fetch books with that genre using server-side filter
      const booksResp = await fetch('http://localhost:4000/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query ($genre: String) {
            allBooks(genre: $genre) {
              id
              title
              published
              author { name }
            }
          }`,
          variables: { genre: fav },
        }),
      })
      const booksJson = await booksResp.json()
      setBooks(booksJson.data?.allBooks || [])
    }

    fetchData()
  }, [props.show, props.token])

  if (!props.show) return null

  if (!props.token) return <div>Please log in to see recommendations.</div>

  return (
    <div>
      <h2>recommendations</h2>
      {favorite ? (
        <>
          <div>
            books in your favorite genre <b>{favorite}</b>
          </div>
          <table>
            <tbody>
              <tr>
                <th></th>
                <th>author</th>
                <th>published</th>
              </tr>
              {books.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.author?.name}</td>
                  <td>{b.published}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div>You have no favorite genre set.</div>
      )}
    </div>
  )
}

export default Recommend
