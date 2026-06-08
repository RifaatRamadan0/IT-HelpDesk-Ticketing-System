import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import CreateTicket from './components/CreateTicket'
import ProtectedRoute from './components/ProtectedRoute'
import { isLoggedIn } from './lib/auth'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/tickets/new"
        element={
          <ProtectedRoute>
            <CreateTicket />
          </ProtectedRoute>
        }
      />

      {/* Land on the right place depending on auth state. */}
      <Route
        path="/"
        element={<Navigate to={isLoggedIn() ? '/tickets/new' : '/login'} replace />}
      />

      {/* Anything unknown falls back to the root redirect. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
