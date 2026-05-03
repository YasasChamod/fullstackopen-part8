import { useEffect, useState } from 'react'

const Authors = (props) => {
  const [authors, setAuthors] = useState([])
  const [name, setName] = useState('')
  const [born, setBorn] = useState('')

  useEffect(() => {
    if (!props.show) {
      return
    }

    const fetchAuthors = async () => {
      const response = await fetch('http://localhost:4000/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              allAuthors {
                id
                name
                born
                bookCount
              }
            }
          `,
        }),
      })

      const result = await response.json()
      setAuthors(result.data.allAuthors)
      setName((currentName) => {
        if (result.data.allAuthors.some((author) => author.name === currentName)) {
          return currentName
        }

        return result.data.allAuthors[0]?.name ?? ''
      })
    }

    fetchAuthors()
  }, [props.show, props.refreshKey])

  const submit = async (event) => {
    event.preventDefault()

    const response = await fetch('http://localhost:4000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${props.token}`,
      },
      body: JSON.stringify({
        query: `
          mutation EditAuthor($name: String!, $setBornTo: Int!) {
            editAuthor(name: $name, setBornTo: $setBornTo) {
              name
              born
            }
          }
        `,
        variables: {
          name,
          setBornTo: Number(born),
        },
      }),
    })

    const result = await response.json()
    if (result.errors || !result.data.editAuthor) {
      console.error(result.errors || 'author not found')
      return
    }

    props.onAuthorUpdated()
    setName('')
    setBorn('')
  }

  if (!props.show) {
    return null
  }

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {authors.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!props.token ? (
        <div>Log in to update author birth years.</div>
      ) : (
        <>
          <h3>Set birthyear</h3>
          <form onSubmit={submit}>
              <div>
                <label htmlFor="name">name</label>
                <select
                  id="name"
                  name="name"
                  value={name}
                  onChange={({ target }) => setName(target.value)}
                >
                  {authors.map((author) => (
                    <option key={author.id} value={author.name}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="born">born</label>
                <input
                  id="born"
                  name="born"
                  type="number"
                  value={born}
                  onChange={({ target }) => setBorn(target.value)}
                />
              </div>
            <button type="submit">update author</button>
          </form>
        </>
      )}
    </div>
  )
}

export default Authors
