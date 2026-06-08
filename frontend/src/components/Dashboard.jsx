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

function firstName(name) {
  return (name || '').split(' ')[0]
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
            {!isAgent && (
              <StatCard
                label="Avg resolution"
                value={stats.avgResolution}
                accent="#6b46d6"
              />
            )}
          </>
        )}
      </div>

      {/* Manager / Admin breakdowns */}
      {!isEmployee && !isAgent && <Breakdowns tickets={tickets} />}

      {/* Recent / queue list */}
      <div className="dash-card">
        <div className="dash-card-head">
          <h3 className="dash-card-title">
            {isEmployee ? 'My recent tickets' : isAgent ? 'Active queue' : 'Recent tickets'}
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

  const prioColors = { Low: '#2f8a4e', Medium: '#c97b1d', High: '#c63a26', Critical: '#bf2418' }
  const prioData = ['Low', 'Medium', 'High', 'Critical'].map((p) => ({
    label: p,
    value: tickets.filter((t) => t.priorityName === p).length,
    color: prioColors[p],
  }))

  return (
    <div className="dash-grid-2">
      <div className="dash-card">
        <h3 className="dash-card-title">Tickets by category</h3>
        {catData.length ? <Bars data={catData} /> : <div className="dash-empty">No data.</div>}
      </div>
      <div className="dash-card">
        <h3 className="dash-card-title">By priority</h3>
        <Bars data={prioData} />
      </div>
    </div>
  )
}

export default Dashboard
