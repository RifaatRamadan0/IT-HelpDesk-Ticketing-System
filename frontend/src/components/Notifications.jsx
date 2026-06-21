import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SessionExpiredError } from '../api/tickets'
import {
  fetchNotifications,
  markAllRead,
  markRead,
} from '../api/notifications'
import './Notifications.css'

function relativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  if (s < 604800) return Math.floor(s / 86400) + 'd ago'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Notifications() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
    // A dead token won't recover by retrying; fail fast so the effect below can
    // redirect to /login.
    retry: (count, err) => !(err instanceof SessionExpiredError) && count < 1,
  })

  // Marking read changes both the list and the bell's unread count. Invalidating
  // the ['notifications'] prefix refreshes both queries at once (React Query
  // matches by prefix), so the badge and the page never drift apart.
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const readOne = useMutation({
    mutationFn: markRead,
    onSuccess: invalidate,
  })

  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: invalidate,
  })

  useEffect(() => {
    if (error instanceof SessionExpiredError) {
      navigate('/login', { replace: true })
    }
  }, [error, navigate])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  function open(notification) {
    if (!notification.isRead) {
      readOne.mutate(notification.id)
    }
    if (notification.ticketId) {
      navigate(`/tickets/${notification.ticketId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="notif-page">
        <div className="notif-state">Loading notifications…</div>
      </div>
    )
  }

  if (error && !(error instanceof SessionExpiredError)) {
    return (
      <div className="notif-page">
        <div className="notif-banner">⚠ {error.message}</div>
      </div>
    )
  }

  return (
    <div className="notif-page">
      <div className="notif-head">
        <div className="notif-head-title">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </div>
        <button
          className="notif-readall"
          onClick={() => readAll.mutate()}
          disabled={unreadCount === 0 || readAll.isPending}
        >
          Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="notif-empty">
          <div className="notif-empty-icon">🔔</div>
          <div>You have no notifications yet.</div>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <button
              key={n.id}
              className={'notif-row' + (n.isRead ? '' : ' unread')}
              onClick={() => open(n)}
            >
              {!n.isRead && <span className="notif-dot" aria-hidden="true" />}
              <span className="notif-msg">{n.message}</span>
              <span className="notif-time">{relativeTime(n.createdDate)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
