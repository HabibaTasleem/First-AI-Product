import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Footer from './components/Footer/Footer.tsx'
import Header from './components/Header.tsx'
import { useAuth } from './context/AuthContext.tsx'
import { AuthView } from './pages/Auth/AuthView.tsx'
import { FavouritesView } from './pages/Favourites/FavouritesView.tsx'
import { HomeView } from './pages/Home/HomeView.tsx'
import { useHomeViewModel } from './pages/Home/useHomeViewModel.ts'
import { HealthView } from './pages/Health/HealthView.tsx'
import { MovieDetailsView } from './pages/MovieDetails/MovieDetailsView.tsx'
import { MoviesView } from './pages/Movies/MoviesView.tsx'
import { SearchView } from './pages/Search/SearchView.tsx'
import MovieAssistant from './components/MovieAssistant/MovieAssistant.tsx'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authLoading, logout } = useAuth()
  const {
    query,
    setQuery,
    movies,
    loading,
    error,
    handleSearch,
    loadInitialMovies,
    handleFavourite,
  } = useHomeViewModel()

  function handleHome() {
    navigate('/')
    void loadInitialMovies()
  }

  function searchMovies() {
    navigate('/')
    void handleSearch()
  }

  return (
    <div className={`app-shell${location.pathname === '/movie-assistant' ? ' app-shell--assistant' : ''}`}>
      <Header
        query={query}
        onQueryChange={setQuery}
        onSearch={searchMovies}
        onHome={handleHome}
        onLogout={user ? logout : undefined}
      />
      <div className="app-content">
        {authLoading ? <p>Loading authentication...</p> : (
          <Routes>
            <Route
              path="/"
              element={
                <HomeView
                  movies={movies}
                  loading={loading}
                  error={error}
                  onFavourite={handleFavourite}
                />
              }
            />
            <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthView />} />
            <Route path="/favourites" element={user ? <FavouritesView /> : <Navigate to="/auth" replace />} />
            <Route path="/favorites" element={user ? <FavouritesView /> : <Navigate to="/auth" replace />} />
            <Route path="/movies" element={<MoviesView />} />
            <Route path="/movies/:id" element={<MovieDetailsView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="/movie-assistant" element={<MovieAssistant />} />
            <Route path="/health" element={<HealthView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default App
