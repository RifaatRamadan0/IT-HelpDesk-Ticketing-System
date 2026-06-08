import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchTicketById, SessionExpiredError } from '../api/tickets'
import './TicketDetail.css'

// Badge colour maps, ported from the design (data.js), keyed by the API's
// priorityName / statusName.
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

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  return <span className={'td-badge ' + (cls || 'b-gray')}>{value}</span>
}

function Meta({ label, children }) {
  return (
    <div className="td-meta">
      <span className="td-meta-label">{label}</span>
      <span className="td-meta-value">{children}</span>
    </div>
  )
}

function Person({ user }) {
  const name = fullName(user)
  return (
    <span className="td-person">
      <span className="td-avatar">{initials(name)}</span>
      {name}
    </span>
  )
}

function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchTicketById(id)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
          return
        }
        setTicket(data)
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
  }, [id, navigate])

  const back = (
    <button className="td-back" onClick={() => navigate('/tickets')}>
      ← Back to tickets
    </button>
  )

  if (loading) {
    return (
      <div className="td-page">
        <div className="td-shell">
          {back}
          <div className="td-state">
            <div className="td-state-title">Loading ticket…</div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="td-page">
        <div className="td-shell">
          {back}
          <div className="td-state">
            <div className="td-state-icon">🔍</div>
            <div className="td-state-title">Ticket not found</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="td-page">
        <div className="td-shell">
          {back}
          <div className="td-banner">⚠ {error}</div>
        </div>
      </div>
    )
  }

  const t = ticket
  return (
    <div className="td-page">
      <div className="td-shell">
        {back}
        <div className="td-grid">
          {/* Main */}
          <div className="td-card">
            <div className="td-main-body">
              <div className="td-badges">
                <span className="td-ref">#{t.id}</span>
                <Badge value={t.priorityName} cls={PRIORITY_META[t.priorityName]} />
                <Badge value={t.statusName} cls={STATUS_META[t.statusName]} />
                <Badge value={t.categoryName} cls="b-gray" />
              </div>
              <h1 className="td-title">{t.title}</h1>
              <p className="td-desc">{t.description}</p>
            </div>
          </div>

          {/* Side panel */}
          <div className="td-side">
            <div className="td-card">
              <div className="td-side-body">
                <h2 className="td-side-title">Details</h2>
                <Meta label="Status">
                  <Badge value={t.statusName} cls={STATUS_META[t.statusName]} />
                </Meta>
                <Meta label="Priority">
                  <Badge value={t.priorityName} cls={PRIORITY_META[t.priorityName]} />
                </Meta>
                <Meta label="Category">
                  <Badge value={t.categoryName} cls="b-gray" />
                </Meta>
                <div className="td-rule" />
                <Meta label="Assigned to">
                  {t.assignedToUser ? (
                    <Person user={t.assignedToUser} />
                  ) : (
                    <span className="td-unassigned">Unassigned</span>
                  )}
                </Meta>
                <Meta label="Created by">
                  <Person user={t.createdByUser} />
                </Meta>
                <Meta label="Created">{formatDateTime(t.createdDate)}</Meta>
                <Meta label="Last updated">{formatDateTime(t.updatedDate)}</Meta>
                {t.resolvedDate && (
                  <Meta label="Resolved">{formatDateTime(t.resolvedDate)}</Meta>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketDetail
