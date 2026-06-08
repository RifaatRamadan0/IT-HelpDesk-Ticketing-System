import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../lib/auth'

// Wraps a route element. If there's no valid (unexpired) token, send the user
// to /login instead of rendering the protected screen. `replace` swaps the
// history entry so the back button doesn't bounce them back into the guard.
function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
