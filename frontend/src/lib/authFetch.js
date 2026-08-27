import { API_ROOT } from '../api/config'

function withAuth(options) {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    throw new Error('You must be signed in to continue.')
  }
  return {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  }
}

async function tryRefresh() {
  try {
    const response = await fetch(`${API_ROOT}/Auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) return false

    const { accessToken } = await response.json()
    localStorage.setItem('accessToken', accessToken)
    return true
  } catch {
    return false
  }
}

export async function authFetch(url, options = {}) {
  const response = await fetch(url, withAuth(options))
  if (response.status !== 401) return response

  if (!(await tryRefresh())) return response

  return fetch(url, withAuth(options))
}
