import { clearTokens } from '../lib/auth'
import { SessionExpiredError } from './tickets'
import { API_ROOT } from './config'
import { authFetch } from '../lib/authFetch'

const CHAT_URL = `${API_ROOT}/Ticket/chat`

export async function sendChat(messages) {
  const response = await authFetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
