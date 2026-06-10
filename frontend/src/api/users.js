// API wrapper for admin user management. Reuses SessionExpiredError from the
// tickets module so components can handle "logged out" uniformly.
import { clearTokens } from '../lib/auth'
import { SessionExpiredError } from './tickets'

const API_ROOT = 'http://localhost:5175/api'
const USER_URL = `${API_ROOT}/User`
const ROLE_URL = `${API_ROOT}/Role`

function authHeader() {
  const token = localStorage.getItem('accessToken')
  if (!token) throw new Error('You must be signed in to continue.')
  return { Authorization: `Bearer ${token}` }
}

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
  const response = await fetch(USER_URL, { headers: authHeader() })
  guard(response)
  if (!response.ok) throw new Error('Could not load users.')
  return response.json()
}

export async function fetchRoles() {
  const response = await fetch(ROLE_URL, { headers: authHeader() })
  guard(response)
  if (!response.ok) throw new Error('Could not load roles.')
  return response.json()
}

export async function createUser({ firstName, lastName, email, password, roleId }) {
  const response = await fetch(USER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ firstName, lastName, email, password, roleId }),
  })
  guard(response)
  if (response.status === 409) {
    throw new Error('A user with that email already exists.')
  }
  if (!response.ok) throw new Error('Could not create the user.')
}

export async function updateUser(id, { firstName, lastName, roleId, isActive }) {
  const response = await fetch(`${USER_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ firstName, lastName, roleId, isActive }),
  })
  guard(response)
  if (!response.ok) throw new Error('Could not update the user.')
}

export async function deleteUser(id) {
  const response = await fetch(`${USER_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
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
