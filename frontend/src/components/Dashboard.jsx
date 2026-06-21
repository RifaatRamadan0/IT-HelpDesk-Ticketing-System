import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchTickets, fetchTicketStats, SessionExpiredError } from '../api/tickets'
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
const TREND_DAYS = 14
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

// Horizontal bar chart (category breakdown). Recharts handles the geometry,
// axis, and hover tooltip; per-bar colour comes from the data via <Cell>.
function Bars({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 13, fill: 'var(--muted)' }}
        />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} formatter={(v) => [v, 'Tickets']} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18} label={{ position: 'right', fontSize: 12 }}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Donut (priority breakdown). A Recharts <Pie> with an inner radius; the running
// total is overlaid in the centre. Empty slices (value 0) are filtered so the
// ring isn't padded with invisible segments.
function Donut({ data }) {
  const slices = data.filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="dash-donut">
      <div className="dash-donut-ring">
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={57}
              outerRadius={85}
              startAngle={90}
              endAngle={-270}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
            >
              {slices.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v, name) => [v, name]} />
          </PieChart>
        </ResponsiveContainer>
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
            {recent.length === 0 ? (
              <div className="dash-empty">No tickets to show yet.</div>
            ) : (
              recent.map((t) => <QueueRow key={t.id} t={t} onOpen={open} />)
            )}
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
  // The server returns each breakdown as a { name: count } map. Categories are
  // taken as-is; priorities keep a fixed order so the legend/colours are stable
  // even when a priority has no tickets.
  const catData = Object.entries(byCategory ?? {}).map(([label, value], i) => ({
    label: label === 'Access Request' ? 'Access' : label,
    value,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }))

  const prioData = ['Low', 'Medium', 'High', 'Critical'].map((p) => ({
    label: p,
    value: byPriority?.[p] ?? 0,
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

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tick={{ fontSize: 12, fill: 'var(--muted)' }}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted)' }}
        />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="created"
          name="Created"
          stroke="#2f6bed"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke="#15924f"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default Dashboard
