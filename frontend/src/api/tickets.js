// Thin wrapper around the ticket + lookup endpoints. Same pattern as
// api/auth.js: keep fetch/HTTP details out of the component so the UI only
// deals with "data or error".

import { clearTokens } from '../lib/auth'

const API_ROOT = 'http://localhost:5175/api'
const TICKET_URL = `${API_ROOT}/Ticket`
const CATEGORY_URL = `${API_ROOT}/Category`
const PRIORITY_URL = `${API_ROOT}/Priority`
const USER_URL = `${API_ROOT}/User`

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
    clearTokens()
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

// The list a user is allowed to see depends on their role, and each role has its
// own endpoint (the API authorizes them separately). Employees see the tickets
// they created, Agents see ones assigned to them, Managers/Admins see all.
function ticketsUrlForRole(role) {
  switch (role) {
    case 'Employee':
      return `${TICKET_URL}/mine`
    case 'Agent':
      return `${TICKET_URL}/assigned`
    case 'Manager':
    case 'Admin':
      return TICKET_URL
    default:
      return null
  }
}

// Fetch a single ticket by id. Returns null on 404 so the UI can show a
// "not found" state instead of a generic error.
export async function fetchTicketById(id) {
  const response = await fetch(`${TICKET_URL}/${id}`, { headers: authHeader() })
  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error('Could not load this ticket.')
  }
  return response.json()
}

export async function fetchTickets(role) {
  const url = ticketsUrlForRole(role)
  if (!url) {
    throw new Error('Your account role cannot view tickets.')
  }

  const response = await fetch(url, { headers: authHeader() })
  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (!response.ok) {
    throw new Error('Could not load tickets.')
  }
  return response.json()
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
    clearTokens()
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

// Move a ticket to a new status. The API enforces a role-specific state machine
// (e.g. an Agent may only move In Progress -> Pending on a ticket assigned to
// them); an illegal transition comes back as 400, surfaced here as a friendly
// message. statusId is the TicketStatus enum value (Open=1 … Closed=5).
export async function updateTicketStatus(id, statusId) {
  const response = await fetch(`${TICKET_URL}/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ statusId }),
  })

  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (response.status === 403) {
    throw new Error('Your role cannot change this ticket’s status.')
  }
  if (!response.ok) {
    // 400 from the API: the transition isn't allowed from the current status.
    throw new Error('That status change isn’t allowed for this ticket.')
  }
}

// Active agents for the assignment picker. Manager/Admin only (the API
// authorizes GET /User/agents for those roles); returns
// [{ id, firstName, lastName }].
export async function fetchAgents() {
  const response = await fetch(`${USER_URL}/agents`, { headers: authHeader() })
  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (!response.ok) {
    throw new Error('Could not load the list of agents.')
  }
  return response.json()
}

// Assign (or reassign) a ticket to an agent. Manager/Admin only. The API maps
// each distinct failure to its own status (see AssignTicketResult), so we can
// give the user a precise reason rather than one generic error.
export async function assignTicket(id, agentUserId) {
  const response = await fetch(`${TICKET_URL}/${id}/assign`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ agentUserId }),
  })

  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (response.status === 403) {
    throw new Error('Only managers and admins can assign tickets.')
  }
  if (response.status === 404) {
    throw new Error('This ticket no longer exists.')
  }
  if (response.status === 409) {
    throw new Error('This ticket is resolved or closed and can’t be assigned.')
  }
  if (!response.ok) {
    // 400: the selected user isn't an active agent.
    throw new Error('Please choose an active agent to assign.')
  }
}

// Edit an existing ticket. The API only allows the creating employee to update
// it, and only while it's still Open (enforced in TicketService); a rejected
// edit comes back as 400, surfaced here as a friendly message.
export async function updateTicket(id, { title, description, categoryId, priorityId }) {
  const response = await fetch(`${TICKET_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ title, description, categoryId, priorityId }),
  })

  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (response.status === 403) {
    throw new Error('You can only edit tickets you created.')
  }
  if (!response.ok) {
    // 400 from the API: not the owner, or the ticket is no longer Open.
    throw new Error('This ticket can no longer be edited.')
  }
}
