import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchTickets,
  fetchCategories,
  SessionExpiredError,
} from '../api/tickets'
import { getRole } from '../lib/auth'
import './TicketList.css'

// Badge colour maps, ported from the design (data.js). Keyed by the name the
// API returns in priorityName / statusName.
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

const PRIORITY_ORDER = ['Low', 'Medium', 'High', 'Critical']
const STATUS_ORDER = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed']

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function Badge({ value, cls }) {
  return <span className={'tl-badge ' + (cls || 'b-gray')}>{value}</span>
}

function TicketList() {
  const navigate = useNavigate()
  const role = getRole()
  const isEmp = role === 'Employee'

  const [tickets, setTickets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [f, setF] = useState({ status: '', priority: '', category: '', agent: '', search: '' })

  const setK = (key, value) => setF((s) => ({ ...s, [key]: value }))

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTickets(role), fetchCategories()])
      .then(([list, cats]) => {
        if (cancelled) return
        setTickets(list)
        setCategories(cats)
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

  // Agent filter options are derived from the loaded rows (no agents endpoint
  // needed) — only the assignees that actually appear.
  const agentOptions = useMemo(() => {
    const names = tickets.map((t) => fullName(t.assignedToUser)).filter(Boolean)
    return [...new Set(names)].sort()
  }, [tickets])

  const rows = useMemo(() => {
    const q = f.search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (f.status && t.statusName !== f.status) return false
      if (f.priority && t.priorityName !== f.priority) return false
      if (f.category && t.categoryName !== f.category) return false
      if (f.agent && fullName(t.assignedToUser) !== f.agent) return false
      if (q) {
        const hay = `#${t.id} ${t.title} ${t.description}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [tickets, f])

  const active = f.status || f.priority || f.category || f.agent
  const clearFilters = () =>
    setF((s) => ({ ...s, status: '', priority: '', category: '', agent: '' }))

  return (
    <div className="tl-page">
      <div className="tl-shell">
        {isEmp && (
          <div className="tl-head">
            <button
              className="tl-btn tl-btn-primary"
              onClick={() => navigate('/tickets/new')}
            >
              ➕ New ticket
            </button>
          </div>
        )}

        {error && <div className="tl-banner">⚠ {error}</div>}

        {/* Filters */}
        <div className="tl-card tl-filters">
          <div className="tl-select-wrap">
            <select
              className={'tl-select' + (f.status ? '' : ' is-placeholder')}
              value={f.status}
              onChange={(e) => setK('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="tl-chevron">▼</span>
          </div>

          <div className="tl-select-wrap">
            <select
              className={'tl-select' + (f.priority ? '' : ' is-placeholder')}
              value={f.priority}
              onChange={(e) => setK('priority', e.target.value)}
            >
              <option value="">All priorities</option>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span className="tl-chevron">▼</span>
          </div>

          <div className="tl-select-wrap">
            <select
              className={'tl-select' + (f.category ? '' : ' is-placeholder')}
              value={f.category}
              onChange={(e) => setK('category', e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="tl-chevron">▼</span>
          </div>

          {!isEmp && (
            <div className="tl-select-wrap">
              <select
                className={'tl-select' + (f.agent ? '' : ' is-placeholder')}
                value={f.agent}
                onChange={(e) => setK('agent', e.target.value)}
              >
                <option value="">Any agent</option>
                {agentOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <span className="tl-chevron">▼</span>
            </div>
          )}

          {active && (
            <button className="tl-btn tl-btn-ghost" onClick={clearFilters}>
              ✕ Clear
            </button>
          )}

          <input
            className="tl-search"
            type="search"
            placeholder="🔍 Search…"
            value={f.search}
            onChange={(e) => setK('search', e.target.value)}
          />

          <div className="tl-spacer" />
          <span className="tl-count">
            {rows.length} of {tickets.length} tickets
          </span>
        </div>

        {/* Table */}
        <div className="tl-card">
          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Title</th>
                  <th className="tl-col-cat">Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>{isEmp ? 'Updated' : 'Agent'}</th>
                  <th className="tl-col-created">Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const agent = fullName(t.assignedToUser)
                  const category =
                    t.categoryName === 'Access Request' ? 'Access' : t.categoryName
                  return (
                    <tr
                      key={t.id}
                      className="tl-row"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td>
                        <span className="tl-ref">#{t.id}</span>
                      </td>
                      <td className="tl-cell-title">
                        <div className="tl-title-main">{t.title}</div>
                        <div className="tl-title-by">
                          by {t.createdByUser?.firstName}
                        </div>
                      </td>
                      <td className="tl-col-cat">
                        <Badge value={category} cls="b-gray" />
                      </td>
                      <td>
                        <Badge
                          value={t.priorityName}
                          cls={PRIORITY_META[t.priorityName]}
                        />
                      </td>
                      <td>
                        <Badge
                          value={t.statusName}
                          cls={STATUS_META[t.statusName]}
                        />
                      </td>
                      <td>
                        {isEmp ? (
                          <span className="tl-muted">{formatDate(t.updatedDate)}</span>
                        ) : agent ? (
                          <span className="tl-agent">
                            <span className="tl-avatar">{initials(agent)}</span>
                            {t.assignedToUser.firstName}
                          </span>
                        ) : (
                          <span className="tl-muted">Unassigned</span>
                        )}
                      </td>
                      <td className="tl-col-created">
                        <span className="tl-muted">{formatDate(t.createdDate)}</span>
                      </td>
                      <td>
                        <span className="tl-arrow">→</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!loading && rows.length === 0 && (
            <div className="tl-empty">
              <div className="tl-empty-icon">📭</div>
              <div className="tl-empty-title">
                {tickets.length === 0
                  ? 'No tickets yet'
                  : 'No tickets match your filters'}
              </div>
              <div className="tl-empty-sub">
                {tickets.length === 0
                  ? 'Tickets you can see will show up here.'
                  : 'Try clearing a filter or adjusting your search.'}
              </div>
            </div>
          )}

          {loading && (
            <div className="tl-empty">
              <div className="tl-empty-title">Loading tickets…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TicketList
