import { clearTokens } from '../lib/auth'
import { SessionExpiredError } from './tickets'

const API_ROOT = 'http://localhost:5175/api'
const CHAT_URL = `${API_ROOT}/Ticket/chat`

function authHeader() {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    throw new Error('You must be signed in to continue.')
  }
  return { Authorization: `Bearer ${token}` }
}

export async function sendChat(messages) {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ messages }),
  })

  if (response.status === 401) {
    clearTokens()
    throw new SessionExpiredError()
  }
  if (response.status === 503) {
    throw new Error('The assistant isn’t available right now.')
  }
  if (!response.ok) {
    throw new Error('The assistant had a problem. Please try again.')
  }
  return response.json()
}
