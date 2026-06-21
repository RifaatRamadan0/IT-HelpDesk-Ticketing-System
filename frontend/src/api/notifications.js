// Thin wrapper around the notification endpoints. Same pattern as api/tickets.js:
// keep fetch/HTTP details out of the component so the UI only deals with
// "data or error". SessionExpiredError is reused from tickets so a dead token
// bounces the user to /login the same way everywhere.

import { clearTokens } from '../lib/auth'
import { SessionExpiredError } from './tickets'

const API_ROOT = 'http://localhost:5175/api'
const NOTIFICATION_URL = `${API_ROOT}/Notification`

function authHeader() {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    throw new Error('You must be signed in to continue.')
  }
  return { Authorization: `Bearer ${token}` }
}

// Shared 401 handling: a rejected token is unrecoverable, so clear it and signal
// the caller to redirect rather than retrying.
function handleUnauthorized(response) {
  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
}

// The caller's 50 most recent notifications, newest first. The API scopes them to
// the JWT user, so there's nothing to pass. Shape:
// [{ id, message, ticketId, isRead, createdDate }].
export async function fetchNotifications() {
  const response = await fetch(NOTIFICATION_URL, { headers: authHeader() })
  handleUnauthorized(response)
  if (!response.ok) {
    throw new Error('Could not load notifications.')
  }
  return response.json()
}

// Just the unread tally for the bell badge — a cheap query meant to be polled.
export async function fetchUnreadCount() {
  const response = await fetch(`${NOTIFICATION_URL}/unread-count`, { headers: authHeader() })
  handleUnauthorized(response)
  if (!response.ok) {
    throw new Error('Could not load the unread count.')
  }
  return response.json()
}

// Mark a single notification read. The API returns 204; a 404 means it isn't the
// caller's (or doesn't exist), which we treat as a no-op rather than an error so a
// stale click can't surface a scary message.
export async function markRead(id) {
  const response = await fetch(`${NOTIFICATION_URL}/${id}/read`, {
    method: 'PUT',
    headers: authHeader(),
  })
  handleUnauthorized(response)
  if (response.status === 404) {
    return
  }
  if (!response.ok) {
    throw new Error('Could not update this notification.')
  }
}

// Mark every unread notification read in one call. Returns 204 with no body.
export async function markAllRead() {
  const response = await fetch(`${NOTIFICATION_URL}/read-all`, {
    method: 'PUT',
    headers: authHeader(),
  })
  handleUnauthorized(response)
  if (!response.ok) {
    throw new Error('Could not mark notifications as read.')
  }
}
