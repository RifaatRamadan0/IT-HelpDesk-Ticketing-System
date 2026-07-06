import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import CreateTicket from './components/CreateTicket'
import TicketList from './components/TicketList'
import TicketDetail from './components/TicketDetail'
import Users from './components/Users'
import Notifications from './components/Notifications'
import Reports from './components/Reports'
import ProtectedRoute from './components/ProtectedRoute'
import { isLoggedIn } from './lib/auth'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Authenticated app: everything below renders inside the sidebar/topbar
          shell via <Outlet />. The guard wraps the whole layout once. */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tickets" element={<TicketList />} />
        <Route path="/tickets/new" element={<CreateTicket />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />

        <Route path="/notifications" element={<Notifications />} />

        <Route path="/reports" element={<Reports />} />

        <Route path="/users" element={<Users />} />
      </Route>

      <Route
        path="/"
        element={<Navigate to={isLoggedIn() ? '/dashboard' : '/login'} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
