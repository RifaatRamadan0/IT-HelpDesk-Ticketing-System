import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import CreateTicket from './components/CreateTicket'
import TicketList from './components/TicketList'
import TicketDetail from './components/TicketDetail'
import Placeholder from './components/Placeholder'
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

        {/* Nav destinations from the design that aren't built yet. */}
        <Route path="/notifications" element={<Placeholder title="Notifications" icon="🔔" />} />
        <Route path="/reports" element={<Placeholder title="Reports" icon="📊" />} />
        <Route path="/kb" element={<Placeholder title="Knowledge Base" icon="📚" />} />
        <Route path="/users" element={<Placeholder title="Users" icon="👥" />} />
        <Route path="/admin" element={<Placeholder title="Admin Settings" icon="⚙️" />} />
        <Route path="/profile" element={<Placeholder title="Profile" icon="👤" />} />
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
