// Single source of truth for the API's address.
//
// Vite only exposes env vars prefixed with VITE_ to client code, and it inlines
// the value at BUILD time -- changing it on Vercel requires a redeploy, not a
// restart. The value ends up in the shipped bundle, so it must never hold a
// secret; a public API URL is fine.
//
// The fallback keeps `npm run dev` working with no .env file, pointing at the
// "http" launch profile from HelpDesk.API/Properties/launchSettings.json.
const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:5175'

export const API_ROOT = `${API_ORIGIN}/api`
export const HUB_URL = `${API_ORIGIN}/hubs/notifications`
