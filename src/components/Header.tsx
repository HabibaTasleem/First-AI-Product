import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

interface HeaderProps {
  query: string
  onQueryChange: (query: string) => void
  onSearch: () => void
  onHome: () => void
  onLogout?: () => Promise<void>
}

function Header({ query, onQueryChange, onSearch, onHome, onLogout }: HeaderProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch()
  }

  return (
    <header className="header">
      <nav className="header__nav" aria-label="Main navigation">
        <Link to="/" onClick={onHome}>
          Home
        </Link>
        <Link to="/favourites">Favourites</Link>
        <Link to="/movie-assistant">Movie Assistant</Link>
        {!onLogout && <Link to="/auth">Login</Link>}
        {onLogout && (
          <button type="button" onClick={() => void onLogout()}>
            Logout
          </button>
        )}
      </nav>
      <form className="header__search" onSubmit={handleSubmit}>
        <label className="header__search-label" htmlFor="search">
          Search
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
    </header>
  )
}

export default Header
