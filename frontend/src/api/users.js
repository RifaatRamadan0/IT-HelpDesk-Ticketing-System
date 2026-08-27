// API wrapper for admin user management. Reuses SessionExpiredError from the
// tickets module so components can handle "logged out" uniformly.
import { clearTokens } from '../lib/auth'
import { SessionExpiredError } from './tickets'
import { API_ROOT } from './config'
import { authFetch } from '../lib/authFetch'

const USER_URL = `${API_ROOT}/User`
const ROLE_URL = `${API_ROOT}/Role`

// Shared 401/403 handling for the admin-only endpoints.
function guard(response) {
  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (response.status === 403) {
    throw new Error('Only admins can manage users.')
  }
}

export async function fetchUsers() {
  const response = await authFetch(USER_URL)
  guard(response)
  if (!response.ok) throw new Error('Could not load users.')
  return response.json()
}

export async function fetchRoles() {
  const response = await authFetch(ROLE_URL)
  guard(response)
  if (!response.ok) throw new Error('Could not load roles.')
  return response.json()
}

export async function createUser({ firstName, lastName, email, password, roleId }) {
  const response = await authFetch(USER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, password, roleId }),
  })
  guard(response)
  if (response.status === 409) {
    throw new Error('A user with that email already exists.')
  }
  if (!response.ok) throw new Error('Could not create the user.')
}

export async function updateUser(id, { firstName, lastName, roleId, isActive }) {
  const response = await authFetch(`${USER_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, roleId, isActive }),
  })
  guard(response)
  if (!response.ok) throw new Error('Could not update the user.')
}

export async function deleteUser(id) {
  const response = await authFetch(`${USER_URL}/${id}`, {
    method: 'DELETE',
  })
  guard(response)
  if (response.status === 400) {
    // The API rejects deleting your own account.
    throw new Error('You cannot delete your own account.')
  }
  if (response.status === 409) {
    // The user is referenced by tickets.
    throw new Error(
      "This user has related tickets and can't be deleted. Deactivate them instead.",
    )
  }
  if (!response.ok) throw new Error('Could not delete the user.')
}
