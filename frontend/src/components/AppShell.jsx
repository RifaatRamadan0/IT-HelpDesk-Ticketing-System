import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getRole, getUserName, logout } from '../lib/auth'
import { NAV, ROLE_LABELS, titleFor } from '../lib/nav'
import './AppShell.css'

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Whether a nav item should render as the active route. /tickets stays active on
// a ticket detail page, but not on /tickets/new (which has its own nav item).
function isActive(to, pathname) {
  if (to === '/tickets/new') return pathname === '/tickets/new'
  if (to === '/tickets') {
    return pathname === '/tickets' || /^\/tickets\/\d+/.test(pathname)
  }
  return pathname === to || pathname.startsWith(to + '/')
}

function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const role = getRole()
  const name = getUserName()
  const roleLabel = ROLE_LABELS[role] ?? role
  const nav = NAV[role] ?? []
  const [eyebrow, title] = titleFor(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)

  const go = (to) => {
    setMobileOpen(false)
    navigate(to)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <div className={'shell-sidebar-wrap' + (mobileOpen ? ' open' : '')}>
        <aside className="shell-sidebar">
          <div className="shell-brand">
            <span className="shell-logo">IT</span>
            <span className="shell-brand-name">HelpDesk</span>
          </div>
          <div className="shell-role">{roleLabel}</div>
          <div className="shell-divider" />

          <nav className="shell-nav">
            {nav.map((item) => {
              const active = isActive(item.to, pathname)
              return (
                <button
                  key={item.label}
                  className={'shell-nav-item' + (active ? ' active' : '')}
                  onClick={() => go(item.to)}
                >
                  <span className="shell-nav-icon">{item.icon}</span>
                  <span className="shell-nav-label">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="shell-divider" />
          <div className="shell-user">
            <span className="shell-avatar">{initials(name)}</span>
            <div className="shell-user-meta">
              <div className="shell-user-name">{name}</div>
              <div className="shell-user-role">{roleLabel}</div>
            </div>
            <button
              className="shell-logout"
              onClick={handleLogout}
              title="Log out"
            >
              ⎋
            </button>
          </div>
        </aside>
      </div>

      {mobileOpen && (
        <div className="shell-scrim" onClick={() => setMobileOpen(false)} />
      )}

      <div className="shell-body">
        <header className="shell-topbar">
          <button
            className="shell-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="shell-titles">
            <div className="shell-eyebrow">{eyebrow}</div>
            <h1 className="shell-title">{title}</h1>
          </div>
          <div className="shell-spacer" />
          <button
            className="shell-icon-btn"
            onClick={() => go('/notifications')}
            title="Notifications"
          >
            🔔
          </button>
          <span className="shell-avatar shell-avatar-sm">{initials(name)}</span>
        </header>

        <main className="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell
