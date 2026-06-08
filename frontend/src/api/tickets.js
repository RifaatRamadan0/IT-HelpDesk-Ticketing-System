// Thin wrapper around the ticket + lookup endpoints. Same pattern as
// api/auth.js: keep fetch/HTTP details out of the component so the UI only
// deals with "data or error".

import { logout } from '../lib/auth'

const API_ROOT = 'http://localhost:5175/api'
const TICKET_URL = `${API_ROOT}/Ticket`
const CATEGORY_URL = `${API_ROOT}/Category`
const PRIORITY_URL = `${API_ROOT}/Priority`

// Thrown when the server rejects our token. The UI uses this to bounce the
// user back to /login instead of showing a dead-end error.
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.')
    this.name = 'SessionExpiredError'
  }
}

function authHeader() {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    throw new Error('You must be signed in to continue.')
  }
  return { Authorization: `Bearer ${token}` }
}

// Shared GET for the two lookup tables. Both endpoints return [{ id, name }],
// fetched at runtime so the UI never assumes seeded ids.
async function getLookup(url, label) {
  const response = await fetch(url, { headers: authHeader() })
  if (response.status === 401) {
    logout()
    throw new SessionExpiredError()
  }
  if (!response.ok) {
    throw new Error(`Could not load ${label}.`)
  }
  return response.json()
}

export function fetchCategories() {
  return getLookup(CATEGORY_URL, 'categories')
}

export function fetchPriorities() {
  return getLookup(PRIORITY_URL, 'priorities')
}

export async function createTicket({ title, description, categoryId, priorityId }) {
  const response = await fetch(TICKET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The endpoint is [Authorize(Roles = "Employee")]; the JWT carries the role.
      ...authHeader(),
    },
    body: JSON.stringify({ title, description, categoryId, priorityId }),
  })

  if (response.status === 401) {
    logout()
    throw new SessionExpiredError()
  }
  if (response.status === 403) {
    throw new Error('Only employees can submit tickets.')
  }
  if (!response.ok) {
    throw new Error('Could not submit your ticket. Please try again.')
  }

  // The controller returns 201 Created with an empty body and a Location
  // header of the form /api/Ticket/{id}. Pull the id out so the success
  // screen can show a reference number.
  const location = response.headers.get('Location') || ''
  const id = location.split('/').filter(Boolean).pop()
  return { id }
}
