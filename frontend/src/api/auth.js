// Thin wrapper around the login endpoint. Keeping fetch logic out of the
// component means the UI only deals with "data or error", not HTTP details.

// The API's address comes from api/config.js so it can differ per environment.
// CORS is set in Program.cs and must allow this app's origin.
import { API_ROOT } from './config'

const API_BASE = `${API_ROOT}/Auth`

export async function login(email, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    // Property names must match the C# LoginRequestDto (Email/Password).
    // ASP.NET's JSON binding is case-insensitive, so lowercase keys are fine.
    body: JSON.stringify({ email, password }),
  })

  if (response.status === 401) {
    throw new Error('Invalid email or password.')
  }

  if (!response.ok) {
    throw new Error('Something went wrong. Please try again.')
  }

  // Shape: { accessToken }
  return response.json()
}

// Best-effort server-side revocation of the user's refresh token. The caller
// clears local storage regardless of the outcome, so failures here (network
// down, token already expired) are intentionally swallowed by the caller.
export async function revokeSession() {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
