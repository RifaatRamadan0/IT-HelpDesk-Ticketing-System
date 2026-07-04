import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchTickets, fetchTicketStats, SessionExpiredError } from '../api/tickets'
import { getRole, getUserName } from '../lib/auth'
import { StatCard, Bars, Donut, TrendChart } from './DashboardWidgets'
import { categoryChartData, priorityChartData } from './chartData'
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
const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 }
const TREND_DAYS = 14

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

// Bucket key for a date: local YYYY-MM-DD. Bucketing on the local calendar day
// (not the raw UTC instant) keeps a ticket created at 11pm in the user's day,
// not pushed into tomorrow by the timezone offset.
function dayKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
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

function Dashboard() {
  const navigate = useNavigate()
  const role = getRole()
  const name = getUserName()

  // Row-level widgets (recent list, queue, trend, activity, agent performance)
  // need the actual tickets, so the list query stays.
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useQuery({
    queryKey: ['tickets', role],
    queryFn: () => fetchTickets(role),
    // A dead token (401 -> SessionExpiredError) won't recover by retrying, so
    // fail fast and let the effect below bounce the user to /login.
    retry: (count, err) => !(err instanceof SessionExpiredError) && count < 1,
  })

  // KPI numbers and the category/priority breakdowns come pre-aggregated from the
  // server (scoped to the caller's role by the API), so the client no longer
  // re-derives them — the "what counts as open/resolved/critical" rule lives once,
  // on the backend.
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['ticket-stats', role],
    queryFn: fetchTicketStats,
    retry: (count, err) => !(err instanceof SessionExpiredError) && count < 1,
  })

  const isLoading = ticketsLoading || statsLoading
  const error = ticketsError || statsError

  // A 401 on either query means the token is gone, so redirect to login rather
  // than showing a dead-end error banner.
  useEffect(() => {
    if (error instanceof SessionExpiredError) {
      navigate('/login', { replace: true })
    }
  }, [error, navigate])

  const recent = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
        .slice(0, 5),
    [tickets],
  )

  const activeQueue = useMemo(
    () =>
      [...tickets]
        .filter((t) => !CLOSED.includes(t.statusName))
        .sort((a, b) => {
          const byPriority =
            (PRIORITY_RANK[b.priorityName] ?? 0) - (PRIORITY_RANK[a.priorityName] ?? 0)
          if (byPriority !== 0) return byPriority
          return new Date(a.createdDate) - new Date(b.createdDate)
        })
        .slice(0, 5),
    [tickets],
  )

  const avgResolution =
    stats?.avgResolutionHours != null ? stats.avgResolutionHours.toFixed(1) + 'h' : '—'

  const open = (id) => navigate(`/tickets/${id}`)

  if (isLoading) {
    return (
      <div className="dash-page">
        <div className="dash-state">Loading dashboard…</div>
      </div>
    )
  }
  // Suppress the banner for an expired session — the effect above is already
  // redirecting to /login, so showing an error would just flash.
  if (error && !(error instanceof SessionExpiredError)) {
    return (
      <div className="dash-page">
        <div className="dash-banner">⚠ {error.message}</div>
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
              You have <b>{stats.open}</b> active{' '}
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
            <StatCard label="Open requests" value={stats.new} accent="#2f6bed" />
            <StatCard label="In progress" value={stats.inProgress} accent="#b07910" />
            <StatCard label="Needs your input" value={stats.pending} accent="#6b46d6" />
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
                value={avgResolution}
                accent="#6b46d6"
              />
            )}
          </>
        )}
      </div>

      {isManagerOrAdmin ? (
        <>
          <Breakdowns byCategory={stats.byCategory} byPriority={stats.byPriority} />
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
        <>
          <div className="dash-card">
            <div className="dash-card-head">
              <h3 className="dash-card-title">
                {isEmployee ? 'My recent tickets' : 'Active queue'}
              </h3>
              <button className="dash-link" onClick={() => navigate('/tickets')}>
                View all →
              </button>
            </div>
            {(() => {
              const list = isAgent ? activeQueue : recent
              if (list.length === 0) {
                return (
                  <div className="dash-empty">
                    {isAgent ? 'Nothing in your queue — you’re all caught up. 🎉' : 'No tickets to show yet.'}
                  </div>
                )
              }
              return list.map((t) => <QueueRow key={t.id} t={t} onOpen={open} />)
            })()}
          </div>

          {/* Agents get a personal workload trend below the queue: are they
              keeping pace with what's coming in? Created uses the ticket's
              creation date (there's no per-agent assignment date), which is the
              best available proxy for "incoming". */}
          {isAgent && (
            <div className="dash-card">
              <h3 className="dash-card-title">Created vs resolved · last {TREND_DAYS} days</h3>
              <TicketTrend tickets={tickets} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Breakdowns({ byCategory, byPriority }) {
  const catData = categoryChartData(byCategory)
  const prioData = priorityChartData(byPriority)

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

// Daily created-vs-resolved trend over the last TREND_DAYS. The window is
// pre-seeded with zero-filled buckets so quiet days stay on the x-axis instead
// of collapsing the line; tickets outside the window are simply ignored.
function TicketTrend({ tickets }) {
  const data = useMemo(() => {
    const buckets = new Map()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      buckets.set(dayKey(d), {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: 0,
        resolved: 0,
      })
    }

    const bump = (iso, field) => {
      if (!iso) return
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return
      const bucket = buckets.get(dayKey(d))
      if (bucket) bucket[field] += 1
    }

    tickets.forEach((t) => {
      bump(t.createdDate, 'created')
      if (CLOSED.includes(t.statusName)) bump(t.resolvedDate, 'resolved')
    })

    return [...buckets.values()]
  }, [tickets])

  const hasData = data.some((d) => d.created || d.resolved)
  if (!hasData) {
    return <div className="dash-empty">No activity in the last {TREND_DAYS} days.</div>
  }

  return <TrendChart data={data} />
}

export default Dashboard
