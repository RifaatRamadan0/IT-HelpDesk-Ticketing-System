import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTimeTracking, setTimer, SessionExpiredError } from '../api/tickets'

function fmtDur(sec, clock) {
  sec = Math.max(0, Math.round(sec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (clock) return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m) return `${m}m`
  return `${s}s`
}

function useNow(active) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

// TicketStatus.InProgress on the backend enum. The timer only makes sense while
// the ticket is actively being worked, so tracking is gated on this status.
const IN_PROGRESS_STATUS = 2

function TimeTracker({ ticket, role, userId, onActivity }) {
  const navigate = useNavigate()
  const canTrack = role === 'Agent' && ticket.assignedToUser?.id === userId
  const inProgress = ticket.statusId === IN_PROGRESS_STATUS

  const [data, setData] = useState(null)
  const [skewMs, setSkewMs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [noAccess, setNoAccess] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const time = await fetchTimeTracking(ticket.id)
    if (time == null) {
      setNoAccess(true)
      return
    }
    setSkewMs(Date.parse(time.serverTimeUtc) - Date.now())
    setData(time)
  }

  useEffect(() => {
    let cancelled = false
    fetchTimeTracking(ticket.id)
      .then((time) => {
        if (cancelled) return
        if (time == null) {
          setNoAccess(true)
          return
        }
        setSkewMs(Date.parse(time.serverTimeUtc) - Date.now())
        setData(time)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticket.id, navigate])

  const running = !!data?.timerStartedAt
  const now = useNow(running)

  if (noAccess) return null

  if (loading) {
    return (
      <div className="td-card">
        <div className="td-side-body">
          <h2 className="td-side-title">Time tracked</h2>
          <div className="tt-muted">Loading…</div>
        </div>
      </div>
    )
  }

  const committed = data?.timeSpentSeconds ?? 0
  const live = running
    ? Math.max(0, (now + skewMs - Date.parse(data.timerStartedAt)) / 1000)
    : 0
  const total = committed + live

  async function toggle() {
    setError('')
    setWorking(true)
    try {
      await setTimer(ticket.id, !running)
      await load()
      if (onActivity) await onActivity()
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="td-card">
      <div className="td-side-body">
        <div className="tt-head">
          <h2 className="td-side-title tt-title">Time tracked</h2>
          {running && (
            <span className="tt-run">
              <span className="tt-run-dot" />
              Running
            </span>
          )}
        </div>

        <div className={'tt-clock-box' + (running ? ' is-running' : '')}>
          <div
            className="tt-clock"
            style={{ color: running ? 'var(--green)' : 'var(--ink)' }}
          >
            {fmtDur(total, true)}
          </div>
          <div className="tt-clock-foot">
            <span className="tt-muted">
              {running ? 'Timer running' : 'Timer paused'}
            </span>
            {canTrack ? (
              <button
                className={running ? 'td-btn' : 'td-btn td-btn-primary'}
                onClick={toggle}
                // The timer can only be run while the ticket is In Progress.
                disabled={working || !inProgress}
                title={
                  inProgress
                    ? undefined
                    : 'The timer is only available while the ticket is In Progress.'
                }
              >
                {working ? '…' : running ? '⏸ Pause' : '▶ Start'}
              </button>
            ) : (
              <span className="td-badge b-gray">Read-only</span>
            )}
          </div>

          {canTrack && !inProgress && (
            <div className="tt-muted tt-hint">
              Move the ticket to In Progress to track time.
            </div>
          )}
        </div>

        {error && <div className="td-banner td-banner-sm">⚠ {error}</div>}
      </div>
    </div>
  )
}

export default TimeTracker
