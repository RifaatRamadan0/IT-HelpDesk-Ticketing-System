// Small client-side helpers around the stored JWT. With stateless JWT auth the
// server keeps no session, so "am I logged in?" is answered by reading the
// token's own `exp` claim — not just by checking the token string exists.

import { revokeSession } from '../api/auth'

export function getToken() {
  return localStorage.getItem('accessToken')
}

// Decode a JWT payload (the middle segment). It's base64url-encoded JSON, which
// is NOT the same alphabet as standard base64, so swap -/_ back to +/ before
// atob. Returns null if the token is malformed.
function decodePayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function isLoggedIn() {
  const token = getToken()
  if (!token) return false

  const payload = decodePayload(token)
  if (!payload) return false

  // `exp` is in seconds since epoch; Date.now() is in milliseconds.
  // No exp means we can't prove it's valid, so treat it as logged in.
  if (!payload.exp) return true
  return payload.exp * 1000 > Date.now()
}

// Local-only: drop the tokens from this browser. Used on the auto-logout path
// (a 401), where the token is already dead so there's nothing to revoke server-
// side.
export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

// User-initiated logout: revoke the refresh tokens server-side first (best
// effort), then clear local storage no matter what. Always clearing means a
// failed network call can never trap the user in a logged-in UI.
export async function logout() {
  const token = getToken()
  if (token) {
    try {
      await revokeSession(token)
    } catch {
      // Swallow — local sign-out below must still happen.
    }
  }
  clearTokens()
}

// The backend builds claims with ClaimTypes.* (TokenService.cs), which serialize
// into the JWT under these long WS-* URIs rather than short names like "role".
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'

// Returns the user's role ("Employee" | "Agent" | "Manager" | "Admin") or '' if
// it can't be read. Used to decide which tickets endpoint to call.
export function getRole() {
  const token = getToken()
  if (!token) return ''
  const payload = decodePayload(token)
  return payload?.[ROLE_CLAIM] ?? ''
}

export function getUserName() {
  const token = getToken()
  if (!token) return ''
  const payload = decodePayload(token)
  return payload?.[NAME_CLAIM] ?? ''
}
