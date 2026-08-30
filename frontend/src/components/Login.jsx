import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { WAKE_URL } from '../api/config'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiAwake, setApiAwake] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch(WAKE_URL, { signal: controller.signal })
      .then(() => setApiAwake(true))
      .catch(() => {})

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!loading) return

    const timer = setTimeout(() => setSlow(true), 3000)
    return () => clearTimeout(timer)
  }, [loading])

  async function handleSubmit(event) {
    // Without this the browser does a full-page GET on the form action,
    // which throws away our React state and the fetch call.
    event.preventDefault()
    setError('')
    setSlow(false)
    setLoading(true)

    try {
      const { accessToken } = await login(email, password)
      localStorage.setItem('accessToken', accessToken)
      // Go to the dashboard; replace so Back doesn't return to login.
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">IT</span>
          <h1 className="login-title">HelpDesk</h1>
        </div>
        <p className="login-subtitle">IT Help Desk &amp; Ticketing</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="login-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="login-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {slow && (
            <p className="login-notice">
              {apiAwake
                ? 'Server is up, starting the database. Almost there.'
                : 'Waking the server — this demo runs on free hosting, so the first sign-in can take up to a minute.'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default Login
