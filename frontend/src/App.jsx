import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import CreateTicket from './components/CreateTicket'
import TicketList from './components/TicketList'
import TicketDetail from './components/TicketDetail'
import ProtectedRoute from './components/ProtectedRoute'
import { isLoggedIn } from './lib/auth'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <TicketList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tickets/new"
        element={
          <ProtectedRoute>
            <CreateTicket />
          </ProtectedRoute>
        }
      />

      {/* Dynamic :id is matched after the static /tickets/new by router
          specificity, so the create route is never shadowed. */}
      <Route
        path="/tickets/:id"
        element={
          <ProtectedRoute>
            <TicketDetail />
          </ProtectedRoute>
        }
      />

      {/* Land on the right place depending on auth state. */}
      <Route
        path="/"
        element={<Navigate to={isLoggedIn() ? '/tickets' : '/login'} replace />}
      />

      {/* Anything unknown falls back to the root redirect. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
