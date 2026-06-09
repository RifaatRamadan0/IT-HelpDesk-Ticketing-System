import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTickets, SessionExpiredError } from '../api/tickets'
import { getRole, getUserName } from '../lib/auth'
import './Dashboard.css'

const PRIORITY_META = {
  Low: 'b-green',
  Medium: 'b-amber',
  High: 'b-red',
  Critical: 'b-reddeep',
}
const STATUS_META = {
  Open: 'b-blue',
  'In Progress': 'b-amber',
  Pending: 'b-purple',
  Resolved: 'b-green',
  Closed: 'b-gray',
}
const CLOSED = ['Resolved', 'Closed']
const CAT_COLORS = ['#3d6fd1', '#6b4bc0', '#c97b1d', '#2f8a4e', '#c63a26', '#0d9488']
const PRIO_COLORS = { Low: '#2f8a4e', Medium: '#c97b1d', High: '#c63a26', Critical: '#bf2418' }

function firstName(name) {
  return (name || '').split(' ')[0]
}

function fullName(user) {
  return user ? `${user.firstName} ${user.lastName}`.trim() : ''
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function relativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="dash-stat" style={{ borderTopColor: accent }}>
      <div className="dash-stat-value" style={{ color: accent }}>
        {value}
      </div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  )
}

function QueueRow({ t, onOpen }) {
  return (
    <div className="dash-row" onClick={() => onOpen(t.id)}>
      <span className={'dash-badge ' + (PRIORITY_META[t.priorityName] || 'b-gray')}>
        {t.priorityName}
      </span>
      <div className="dash-row-main">
        <span className="dash-row-ref">#{t.id}</span>
        <span className="dash-row-title">{t.title}</span>
      </div>
      <span className={'dash-badge ' + (STATUS_META[t.statusName] || 'b-gray')}>
        {t.statusName}
      </span>
      <span className="dash-row-date">{formatShortDate(t.createdDate)}</span>
    </div>
  )
}

function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="dash-bars">
      {data.map((d) => (
        <div key={d.label} className="dash-bar-row">
          <span className="dash-bar-label">{d.label}</span>
          <div className="dash-bar-track">
            <div
              className="dash-bar-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
          <span className="dash-bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// SVG donut, ported from the design (charts.jsx Donut). Segments are drawn with
// stroke-dasharray on stacked circles, rotated so the first slice starts at top.
function Donut({ data, size = 170, thickness = 28 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  // Pure: each slice's length, and its start offset = sum of the slices before it.
  const lens = data.map((d) => (d.value / total) * circ)
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <div className="dash-donut">
      <div className="dash-donut-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          {data.map((d, i) => (
            <circle
              key={d.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${lens[i]} ${circ - lens[i]}`}
              strokeDashoffset={-offsets[i]}
            />
          ))}
        </svg>
        <div className="dash-donut-center">
          <div className="dash-donut-total">{total}</div>
          <div className="dash-donut-cap">tickets</div>
        </div>
      </div>
      <div className="dash-legend">
        {data.map((d) => (
          <div key={d.label} className="dash-legend-row">
            <span className="dash-legend-dot" style={{ background: d.color }} />
            <span className="dash-legend-label">{d.label}</span>
            <span className="dash-legend-val">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const role = getRole()
  const name = getUserName()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchTickets(role)
      .then((list) => {
        if (!cancelled) setTickets(list)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) {
          navigate('/login', { replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [role, navigate])

  const stats = useMemo(() => {
    const open = tickets.filter((t) => !CLOSED.includes(t.statusName))
    const resolved = tickets.filter((t) => CLOSED.includes(t.statusName))
    const resolvedWithTimes = resolved.filter((t) => t.resolvedDate && t.createdDate)
    const avgMs = resolvedWithTimes.length
      ? resolvedWithTimes.reduce(
          (sum, t) => sum + (new Date(t.resolvedDate) - new Date(t.createdDate)),
          0,
        ) / resolvedWithTimes.length
      : 0
    return {
      total: tickets.length,
      open: open.length,
      inProgress: tickets.filter((t) => t.statusName === 'In Progress').length,
      pending: tickets.filter((t) => t.statusName === 'Pending').length,
      resolved: resolved.length,
      critical: open.filter((t) => t.priorityName === 'Critical').length,
      avgResolution: avgMs ? (avgMs / 36e5).toFixed(1) + 'h' : '—',
      recent: [...tickets]
        .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
        .slice(0, 5),
    }
  }, [tickets])

  const open = (id) => navigate(`/tickets/${id}`)

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-state">Loading dashboard…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-banner">⚠ {error}</div>
      </div>
    )
  }

  const isEmployee = role === 'Employee'
  const isAgent = role === 'Agent'
  const isManagerOrAdmin = !isEmployee && !isAgent

  return (
    <div className="dash-page">
      {isEmployee && (
        <div className="dash-hero">
          <div>
            <h2 className="dash-hero-title">Hi {firstName(name)} 👋</h2>
            <div className="dash-hero-sub">
              You have <b>{stats.open}</b> open{' '}
              {stats.open === 1 ? 'request' : 'requests'}. Need a hand with
              something?
            </div>
          </div>
          <button className="dash-hero-btn" onClick={() => navigate('/tickets/new')}>
            ➕ Create a ticket
          </button>
        </div>
      )}

      {isAgent && stats.critical > 0 && (
        <div className="dash-alert">
          <span>⚡</span>
          <span className="dash-alert-text">
            {stats.critical} critical{' '}
            {stats.critical === 1 ? 'ticket needs' : 'tickets need'} immediate
            attention
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="dash-stats">
        {isEmployee ? (
          <>
            <StatCard label="Open requests" value={stats.open} accent="#2f6bed" />
            <StatCard label="In progress" value={stats.inProgress} accent="#b07910" />
            <StatCard label="Resolved" value={stats.resolved} accent="#15924f" />
          </>
        ) : (
          <>
            <StatCard label="Open" value={stats.open} accent="#2f6bed" />
            <StatCard label="Pending" value={stats.pending} accent="#b07910" />
            <StatCard label="Resolved" value={stats.resolved} accent="#15924f" />
            <StatCard label="Critical" value={stats.critical} accent="#d33f2d" />
            {isManagerOrAdmin && (
              <StatCard
                label="Avg resolution"
                value={stats.avgResolution}
                accent="#6b46d6"
              />
            )}
          </>
        )}
      </div>

      {isManagerOrAdmin ? (
        <>
          <Breakdowns tickets={tickets} />
          <div className="dash-grid-2">
            <div className="dash-card">
              <h3 className="dash-card-title">Agent Performance</h3>
              <AgentPerformance tickets={tickets} />
            </div>
            <div className="dash-card">
              <h3 className="dash-card-title">Recent Activity</h3>
              <RecentActivity tickets={tickets} onOpen={open} />
            </div>
          </div>
        </>
      ) : (
        <div className="dash-card">
          <div className="dash-card-head">
            <h3 className="dash-card-title">
              {isEmployee ? 'My recent tickets' : 'Active queue'}
            </h3>
            <button className="dash-link" onClick={() => navigate('/tickets')}>
              View all →
            </button>
          </div>
          {stats.recent.length === 0 ? (
            <div className="dash-empty">No tickets to show yet.</div>
          ) : (
            stats.recent.map((t) => <QueueRow key={t.id} t={t} onOpen={open} />)
          )}
        </div>
      )}
    </div>
  )
}

function Breakdowns({ tickets }) {
  const catData = useMemo(() => {
    const counts = {}
    tickets.forEach((t) => {
      counts[t.categoryName] = (counts[t.categoryName] || 0) + 1
    })
    return Object.entries(counts).map(([label, value], i) => ({
      label: label === 'Access Request' ? 'Access' : label,
      value,
      color: CAT_COLORS[i % CAT_COLORS.length],
    }))
  }, [tickets])

  const prioData = ['Low', 'Medium', 'High', 'Critical'].map((p) => ({
    label: p,
    value: tickets.filter((t) => t.priorityName === p).length,
    color: PRIO_COLORS[p],
  }))

  return (
    <div className="dash-grid-2">
      <div className="dash-card">
        <h3 className="dash-card-title">Tickets by category</h3>
        {catData.length ? <Bars data={catData} /> : <div className="dash-empty">No data.</div>}
      </div>
      <div className="dash-card">
        <h3 className="dash-card-title">By priority</h3>
        <Donut data={prioData} />
      </div>
    </div>
  )
}

// Agent performance, derived from the all-tickets list: resolved count per
// assignee. No dedicated endpoint needed.
function AgentPerformance({ tickets }) {
  const rows = useMemo(() => {
    const map = new Map()
    tickets.forEach((t) => {
      if (!t.assignedToUser) return
      const cur = map.get(t.assignedToUser.id) || { user: t.assignedToUser, resolved: 0 }
      if (CLOSED.includes(t.statusName)) cur.resolved += 1
      map.set(t.assignedToUser.id, cur)
    })
    return [...map.values()].sort((a, b) => b.resolved - a.resolved)
  }, [tickets])

  if (!rows.length) return <div className="dash-empty">No agents assigned yet.</div>
  const max = Math.max(1, ...rows.map((r) => r.resolved))

  return (
    <div>
      {rows.map((r) => (
        <div key={r.user.id} className="dash-perf-row">
          <span className="dash-avatar">{initials(fullName(r.user))}</span>
          <span className="dash-perf-name">{fullName(r.user)}</span>
          <div className="dash-bar-track">
            <div
              className="dash-bar-fill"
              style={{ width: `${(r.resolved / max) * 100}%`, background: '#2f6bed' }}
            />
          </div>
          <span className="dash-perf-val">{r.resolved} resolved</span>
        </div>
      ))}
    </div>
  )
}

// Recent activity, derived from the most recently updated tickets (no audit-log
// endpoint exists, so this reflects ticket updates rather than granular actions).
function RecentActivity({ tickets, onOpen }) {
  const items = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate))
        .slice(0, 6),
    [tickets],
  )

  if (!items.length) return <div className="dash-empty">No recent activity.</div>

  return items.map((t) => (
    <div key={t.id} className="dash-activity-row" onClick={() => onOpen(t.id)}>
      <span className="dash-row-ref">#{t.id}</span>
      <span className="dash-activity-action">
        {t.statusName} · {t.title}
      </span>
      <span className="dash-activity-time">{relativeTime(t.updatedDate)}</span>
    </div>
  ))
}

export default Dashboard
