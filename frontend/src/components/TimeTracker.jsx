import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTimeTracking, setTimer, SessionExpiredError } from '../api/tickets'

const EFFORT_TARGET = {
  Low: 3600,
  Medium: 7200,
  High: 14400,
  Critical: 21600,
}

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

function EffortBar({ total, target, accent }) {
  if (!target) return null
  const pct = Math.min(total / target, 1) * 100
  const over = total > target
  const barColor = over ? 'var(--amber)' : accent
  return (
    <div className="tt-effort">
      <div className="tt-effort-head">
        <span className="tt-muted">Effort vs target</span>
        <span className={over ? 'tt-effort-over' : 'tt-effort-left'}>
          {over
            ? `+${fmtDur(total - target)} over`
            : `${fmtDur(target - total)} left`}
        </span>
      </div>
      <div className="tt-bar">
        <div
          className="tt-bar-fill"
          style={{ width: `${Math.max(pct, 3)}%`, background: barColor }}
        />
      </div>
      <div className="tt-effort-target">
        Target {fmtDur(target)} · guideline for this priority
      </div>
    </div>
  )
}

function TimeTracker({ ticket, role, userId, onActivity }) {
  const navigate = useNavigate()
  const canTrack = role === 'Agent' && ticket.assignedToUser?.id === userId

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
  const target = EFFORT_TARGET[ticket.priorityName] || 0
  const accent = running ? 'var(--green)' : 'var(--primary)'

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
                disabled={working}
              >
                {working ? '…' : running ? '⏸ Pause' : '▶ Start'}
              </button>
            ) : (
              <span className="td-badge b-gray">Read-only</span>
            )}
          </div>
        </div>

        <EffortBar total={total} target={target} accent={accent} />

        {error && <div className="td-banner td-banner-sm">⚠ {error}</div>}
      </div>
    </div>
  )
}

export default TimeTracker
