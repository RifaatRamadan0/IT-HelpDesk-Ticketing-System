import { useState } from 'react'
import { login } from '../api/auth'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    // Without this the browser does a full-page GET on the form action,
    // which throws away our React state and the fetch call.
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { accessToken, refreshToken } = await login(email, password)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      // No dashboard route yet — confirm success for now.
      alert('Signed in successfully!')
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

          <div className="login-password-row">
            <label className="login-label" htmlFor="password">
              Password
            </label>
            <a className="login-forgot" href="#">
              Forgot password?
            </a>
          </div>
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
        </form>
      </div>
    </div>
  )
}

export default Login
