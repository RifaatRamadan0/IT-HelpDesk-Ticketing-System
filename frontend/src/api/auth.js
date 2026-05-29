// Thin wrapper around the login endpoint. Keeping fetch logic out of the
// component means the UI only deals with "data or error", not HTTP details.

// The ASP.NET Core API's HTTP address (see Properties/launchSettings.json).
// Run the API with the "http" launch profile so there is no HTTPS port and
// UseHttpsRedirection does not redirect this call. CORS is set in Program.cs.
const API_BASE = 'http://localhost:5175/api/Auth'

export async function login(email, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  // Shape: { accessToken, refreshToken }
  return response.json()
}
