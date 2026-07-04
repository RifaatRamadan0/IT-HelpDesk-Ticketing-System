import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchTicketById,
  fetchCategories,
  fetchPriorities,
  fetchAgents,
  assignTicket,
  escalateTicket,
  fetchComments,
  postComment,
  fetchActivity,
  fetchAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  SessionExpiredError,
} from '../api/tickets'
import { getRole, getUserId } from '../lib/auth'
import TimeTracker from './TimeTracker'
import './TicketDetail.css'
import './TimeTracker.css'

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
// TicketStatus enum values (must match the backend / Status seed).
const STATUS_ID = { Open: 1, 'In Progress': 2, Pending: 3, Resolved: 4, Closed: 5 }

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

// Modal form to edit an Open ticket's title/description/category/priority.
function EditTicketModal({ ticket, onClose, onSaved }) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [priorities, setPriorities] = useState([])
  const [form, setForm] = useState({
    title: ticket.title,
    description: ticket.description,
    category: String(ticket.categoryId),
    priority: String(ticket.priorityId),
  })
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCategories(), fetchPriorities()])
      .then(([cats, pris]) => {
        if (cancelled) return
        setCategories(cats)
        setPriorities(pris)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  const valid =
    form.title.trim() && form.description.trim() && form.category && form.priority

  async function handleSave() {
    setTouched(true)
    setError('')
    if (!valid) return
    setSaving(true)
    try {
      await updateTicket(ticket.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: Number(form.category),
        priorityId: Number(form.priority),
      })
      onSaved()
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="td-modal-overlay" onClick={onClose}>
      <div className="td-modal" onClick={(e) => e.stopPropagation()}>
        <div className="td-modal-head">
          <h2 className="td-modal-title">Edit ticket #{ticket.id}</h2>
          <button className="td-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="td-modal-body">
          <div className="td-field">
            <label className="td-flabel">Title</label>
            <input
              className="td-input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            {touched && !form.title.trim() && (
              <div className="td-ferror">⚠ A title is required.</div>
            )}
          </div>

          <div className="td-field">
            <label className="td-flabel">Description</label>
            <textarea
              className="td-textarea"
              rows={5}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
            {touched && !form.description.trim() && (
              <div className="td-ferror">⚠ A description is required.</div>
            )}
          </div>

          <div className="td-field-grid">
            <div className="td-field">
              <label className="td-flabel">Category</label>
              <select
                className="td-select"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="td-field">
              <label className="td-flabel">Priority</label>
              <select
                className="td-select"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              >
                <option value="">Select priority</option>
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="td-banner">⚠ {error}</div>}

          <div className="td-modal-actions">
            <button className="td-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="td-btn td-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// One attachment row: icon, name, type · size, and a download button. Ported
// from the design's AttChip. Downloading streams via fetch (auth header), so the
// click goes through the parent's handler, not a bare link.
function AttachmentChip({ attachment, onDownload, canDelete, onDelete }) {
  const ext = attachment.fileName.split('.').pop()?.toUpperCase() || 'FILE'
  return (
    <div className="td-att">
      <span className="td-att-icon">📄</span>
      <div className="td-att-info">
        <div className="td-att-name" title={attachment.fileName}>
          {attachment.fileName}
        </div>
        <div className="td-att-meta">
          {ext} · {formatFileSize(attachment.fileSize)}
        </div>
      </div>
      <button
        className="td-att-download"
        onClick={() => onDownload(attachment)}
        title="Download"
        aria-label={`Download ${attachment.fileName}`}
      >
        ⬇
      </button>
      {canDelete && (
        <button
          className="td-att-delete"
          onClick={() => onDelete(attachment)}
          title="Delete"
          aria-label={`Delete ${attachment.fileName}`}
        >
          🗑
        </button>
      )}
    </div>
  )
}

// A single comment in the thread: avatar + author + time, then the message
// bubble. Ported from the design's CommentBubble.
function CommentBubble({ comment }) {
  const name = fullName(comment.createdByUser)
  const internal = comment.isInternal
  return (
    <div className="td-comment">
      <span className="td-avatar td-avatar-lg">{initials(name)}</span>
      <div className="td-comment-main">
        <div className="td-comment-head">
          <b className="td-comment-author">{name}</b>
          {internal && <span className="td-internal-badge">🔒 Internal</span>}
          <span className="td-comment-time">{formatDateTime(comment.createdDate)}</span>
        </div>
        <div
          className={
            internal
              ? 'td-comment-bubble td-comment-bubble--internal'
              : 'td-comment-bubble'
          }
        >
          {comment.body}
        </div>
      </div>
    </div>
  )
}

// Vertical activity timeline: a dot + connector per event, with the most recent
// (last, since oldest-first) highlighted. Ported from the design's Timeline.
function ActivityTimeline({ items }) {
  return (
    <div className="td-timeline">
      {items.map((it, i) => {
        const isLast = i === items.length - 1
        return (
          <div className="td-tl-item" key={it.id}>
            <div className="td-tl-marker">
              <span className={'td-tl-dot' + (isLast ? ' is-last' : '')} />
              {!isLast && <span className="td-tl-line" />}
            </div>
            <div className="td-tl-body">
              <div className="td-tl-text">
                <b>{fullName(it.user)}</b> {it.actionText}
              </div>
              <div className="td-tl-time">{formatDateTime(it.createdDate)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Assignment modal: pick an agent from a list of avatar rows. Clicking a row
// assigns immediately (matching the design), marking the current assignee with
// a "✓ current" tag.
function AssignTicketModal({ ticket, agents, assigning, error, onAssign, onClose }) {
  const currentId = ticket.assignedToUser?.id ?? null
  return (
    <div className="td-modal-overlay" onClick={onClose}>
      <div className="td-modal td-modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="td-modal-head">
          <h2 className="td-modal-title">Assign ticket #{ticket.id}</h2>
          <button className="td-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="td-modal-body">
          <p className="td-workflow-hint">Choose an agent to handle this ticket.</p>

          {agents.length === 0 ? (
            <div className="td-unassigned">No active agents are available.</div>
          ) : (
            agents.map((a) => {
              const name = fullName(a)
              const isCurrent = a.id === currentId
              return (
                <button
                  key={a.id}
                  className="td-agent-row"
                  onClick={() => onAssign(a.id)}
                  // The current assignee is a no-op reassignment — don't offer it.
                  disabled={assigning || isCurrent}
                >
                  <span className="td-avatar td-avatar-lg">{initials(name)}</span>
                  <span className="td-agent-info">
                    <span className="td-agent-name">{name}</span>
                    <span className="td-agent-title">IT Support Agent</span>
                  </span>
                  {isCurrent && <span className="td-agent-current">✓ current</span>}
                </button>
              )
            })
          )}

          {error && <div className="td-banner td-banner-sm">⚠ {error}</div>}
        </div>
      </div>
    </div>
  )
}

// Escalation modal: the agent must explain why they're stuck before escalating.
// The reason becomes a staff-only internal note, so the requester never sees it.
function EscalateTicketModal({ ticket, escalating, error, onEscalate, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <div className="td-modal-overlay" onClick={onClose}>
      <div className="td-modal td-modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="td-modal-head">
          <h2 className="td-modal-title">Escalate ticket #{ticket.id}</h2>
          <button className="td-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="td-modal-body">
          <p className="td-workflow-hint">
            Tell the manager why you couldn’t resolve this. Only staff see this
            note — the requester won’t.
          </p>
          <textarea
            className="td-textarea"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why does this need a manager?"
          />
          {error && <div className="td-banner td-banner-sm">⚠ {error}</div>}
          <div className="td-modal-actions">
            <button className="td-btn" onClick={onClose} disabled={escalating}>
              Cancel
            </button>
            <button
              className="td-btn td-btn-primary"
              onClick={() => onEscalate(reason.trim())}
              disabled={escalating || !reason.trim()}
            >
              {escalating ? 'Escalating…' : '⬆ Escalate to manager'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = getRole()
  const userId = getUserId()

  const isManager = role === 'Manager' || role === 'Admin'

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [working, setWorking] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Assignment (Manager/Admin only).
  const [agents, setAgents] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Escalation (assigned Agent only).
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [escalateError, setEscalateError] = useState('')

  // Comment thread.
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [commentError, setCommentError] = useState('')

  // Activity log (visible to anyone who can view the ticket).
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState('')

  // Attachments (visible to anyone who can view the ticket; upload is stricter).
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')
  const fileInputRef = useRef(null)

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

  // Managers/Admins need the agent list to populate the assignment picker. A
  // failed load here shouldn't break the page — the picker just stays empty.
  useEffect(() => {
    if (!isManager) return
    let cancelled = false
    fetchAgents()
      .then((data) => {
        if (!cancelled) setAgents(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [isManager, navigate])

  // Who may POST a comment. Mirrors the backend CanComment rule (Manager: any
  // ticket; Agent: assigned; Employee: own). Admin is excluded — it can read the
  // thread but is not part of the support conversation.
  const canComment =
    ticket != null &&
    (role === 'Manager' ||
      (role === 'Agent' && ticket.assignedToUser?.id === userId) ||
      (role === 'Employee' && ticket.createdByUser?.id === userId))

  // Who may READ the thread. Mirrors the backend CanRead rule: anyone who can
  // comment, plus Admin as a read-only oversight role.
  const canReadComments = ticket != null && (role === 'Admin' || canComment)

  // Who may post an INTERNAL note (staff-only, hidden from the employee). The
  // ticket creator must never see this toggle, so it's gated to staff roles that
  // can already comment. Admin is read-only, so it's excluded here too.
  const canWriteInternal = canComment && (role === 'Manager' || role === 'Agent')

  // Uploading an attachment is a write, same participant rule as commenting
  // (Manager/Agent-assigned/Employee-own); Admin can view but not upload.
  const canUploadAttachment = canComment

  // Load the thread once we know the ticket and the user may see it. Keyed on the
  // ticket so it also refreshes after actions that re-fetch the ticket.
  useEffect(() => {
    if (!canReadComments) return
    let cancelled = false
    fetchComments(id)
      .then((data) => {
        if (!cancelled) setComments(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setCommentError(err.message)
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canReadComments, id, navigate])

  // Load the activity log once the ticket is known. Any user who can open the
  // ticket can read it, so no extra access gate. Keyed on the ticket so it also
  // refreshes after status/assignment actions that re-fetch the ticket.
  useEffect(() => {
    if (!ticket) return
    let cancelled = false
    fetchActivity(id)
      .then((data) => {
        if (!cancelled) setActivity(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setActivityError(err.message)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticket, id, navigate])

  // Load attachments once the ticket is known (any viewer can list them).
  useEffect(() => {
    if (!ticket) return
    let cancelled = false
    fetchAttachments(id)
      .then((data) => {
        if (!cancelled) setAttachments(data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setAttachmentError(err.message)
      })
      .finally(() => {
        if (!cancelled) setAttachmentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticket, id, navigate])

  // Re-fetch the ticket so the page reflects new values, status and timestamps.
  async function refresh() {
    try {
      const data = await fetchTicketById(id)
      if (data) setTicket(data)
    } catch (err) {
      if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
    }
  }

  // Read the chosen file as a Base64 data URL, upload it, then refetch the list.
  // A client-side size check is just UX — the server enforces the real limit.
  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentError('')

    if (file.size > 5 * 1024 * 1024) {
      setAttachmentError('The file exceeds the 5 MB limit.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read the file.'))
        reader.readAsDataURL(file)
      })
      await uploadAttachment(id, file.name, dataUrl)
      setAttachments(await fetchAttachments(id))
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setAttachmentError(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownload(attachment) {
    setAttachmentError('')
    try {
      await downloadAttachment(id, attachment.id, attachment.fileName)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setAttachmentError(err.message)
    }
  }

  async function handleDeleteAttachment(attachment) {
    if (!window.confirm(`Delete "${attachment.fileName}"?`)) return
    setAttachmentError('')
    try {
      await deleteAttachment(id, attachment.id)
      setAttachments(await fetchAttachments(id))
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setAttachmentError(err.message)
    }
  }

  // Post the composed comment, then refetch the thread so it appears.
  async function handlePostComment() {
    const body = commentBody.trim()
    if (!body) return
    setCommentError('')
    setPosting(true)
    try {
      await postComment(id, body, isInternal)
      setCommentBody('')
      setIsInternal(false)
      const data = await fetchComments(id)
      setComments(data)
      // A comment also produces a CommentAdded activity entry; keep it in sync.
      setActivity(await fetchActivity(id))
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setCommentError(err.message)
    } finally {
      setPosting(false)
    }
  }

  async function handleSaved() {
    setEditing(false)
    await refresh()
  }

  // Delete the ticket (creator + Open only, mirrored from the server guard).
  // Deletion is irreversible, so confirm first; on success there's no ticket
  // left to show, so we leave the page for the list.
  async function handleDelete() {
    setActionError('')
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteTicket(id)
      navigate('/tickets', { replace: true })
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setActionError(err.message)
      setDeleting(false)
    }
  }

  // Drive a role-specific status transition. The API is the source of truth on
  // whether the move is legal; we just surface its rejection.
  async function changeStatus(targetName) {
    setActionError('')
    setWorking(true)
    try {
      await updateTicketStatus(id, STATUS_ID[targetName])
      await refresh()
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setActionError(err.message)
    } finally {
      setWorking(false)
    }
  }

  // Assign (or reassign) the ticket to the agent picked in the modal, then close
  // it and re-fetch so the "Assigned to" panel and any unlocked actions update.
  async function handleAssign(agentUserId) {
    setAssignError('')
    setAssigning(true)
    try {
      await assignTicket(id, agentUserId)
      setAssignOpen(false)
      await refresh()
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setAssignError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  async function handleEscalate(reason) {
    if (!reason) return
    setEscalateError('')
    setEscalating(true)
    try {
      await escalateTicket(id, reason)
      setEscalateOpen(false)
      // refresh() repaints the badge and the workflow panel, and the reason now
      // shows in the staff conversation as an internal note.
      await refresh()
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setEscalateError(err.message)
    } finally {
      setEscalating(false)
    }
  }

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
  // Edit is only offered for an Open ticket the signed-in employee created —
  // mirroring the server-side guard (ownership + isOpen) so the UI doesn't show
  // an action the API would reject.
  const canEdit =
    role === 'Employee' &&
    t.statusName === 'Open' &&
    t.createdByUser?.id === userId

  // Delete shares the same guard as edit: only the creating employee, and only
  // while the ticket is still Open — exactly what TicketService.DeleteAsync allows.
  const canDelete = canEdit

  // Workflow actions mirror the backend state machine so we never show an action
  // the API would reject. Agent hands finished work back for confirmation; the
  // requester confirms the fix or sends unresolved work back to the agent.
  const canAgentHandoff =
    role === 'Agent' &&
    t.statusName === 'In Progress' &&
    t.assignedToUser?.id === userId

  // The assigned agent can escalate an In-Progress ticket they're stuck on, but
  // only once — the flag (t.isEscalated) hides the action after escalating.
  const canEscalate = canAgentHandoff && !t.isEscalated

  const canConfirmFix =
    role === 'Employee' &&
    t.statusName === 'Pending' &&
    t.createdByUser?.id === userId

  const hasWorkflow = canAgentHandoff || canConfirmFix

  // Manager/Admin assignment mirrors the backend: a ticket can be (re)assigned
  // while it isn't in a terminal state. The "Start work" action is the payoff of
  // assignment — the status machine only allows Open -> In Progress once someone
  // is assigned, so we gate the button on that.
  const canAssign =
    isManager && t.statusName !== 'Resolved' && t.statusName !== 'Closed'
  const canStartWork =
    isManager && t.statusName === 'Open' && t.assignedToUser != null
  // A manager closes out a resolved ticket (Resolved -> Closed), mirroring the
  // backend state machine. This is the terminal step, so no assignment card shows.
  const canClose = isManager && t.statusName === 'Resolved'

  return (
    <div className="td-page">
      <div className="td-shell">
        {back}
        <div className="td-grid">
          {/* Main column */}
          <div className="td-main-col">
            <div className="td-card">
              <div className="td-main-body">
                <div className="td-badges">
                  <span className="td-ref">#{t.id}</span>
                  <Badge value={t.priorityName} cls={PRIORITY_META[t.priorityName]} />
                  <Badge value={t.statusName} cls={STATUS_META[t.statusName]} />
                  {t.isEscalated && <Badge value="⬆ Escalated" cls="b-amber" />}
                  <Badge value={t.categoryName} cls="b-gray" />
                </div>
                <div className="td-title-row">
                  <h1 className="td-title">{t.title}</h1>
                  {canEdit && (
                    <button
                      className="td-edit-btn"
                      onClick={() => setEditing(true)}
                      title="Edit ticket details"
                    >
                      ✏️ Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="td-delete-btn"
                      onClick={handleDelete}
                      disabled={deleting}
                      title="Delete this ticket"
                    >
                      {deleting ? 'Deleting…' : '🗑️ Delete'}
                    </button>
                  )}
                </div>
                {/* The shared actionError banners live in the workflow/manager
                    cards, which an employee viewing their own Open ticket won't
                    see — so surface a failed delete here next to the button. */}
                {canDelete && actionError && (
                  <div className="td-banner td-banner-sm">⚠ {actionError}</div>
                )}
                <p className="td-desc">{t.description}</p>
              </div>
            </div>

            {/* Conversation */}
            {canReadComments && (
              <div className="td-card">
                <div className="td-comments">
                  <h2 className="td-side-title">Conversation</h2>

                  {commentsLoading ? (
                    <div className="td-comment-empty">Loading conversation…</div>
                  ) : comments.length === 0 ? (
                    <div className="td-comment-empty">
                      <div className="td-comment-empty-title">No replies yet</div>
                      {canComment && <div>Start the conversation below.</div>}
                    </div>
                  ) : (
                    comments.map((c) => <CommentBubble key={c.id} comment={c} />)
                  )}

                  {/* Composer — only for participants, not read-only Admin. */}
                  {canComment && (
                    <>
                      <div className="td-rule" />

                      <textarea
                        className={
                          isInternal
                            ? 'td-textarea td-textarea--internal'
                            : 'td-textarea'
                        }
                        rows={3}
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder={
                          isInternal
                            ? 'Write an internal note (staff only)…'
                            : 'Write a reply…'
                        }
                      />
                      {commentError && (
                        <div className="td-banner td-banner-sm">⚠ {commentError}</div>
                      )}
                      <div className="td-comment-actions">
                        {/* Internal-note toggle: staff only. The employee never
                            sees this control or the notes it produces. */}
                        {canWriteInternal && (
                          <label className="td-internal-toggle">
                            <input
                              type="checkbox"
                              checked={isInternal}
                              onChange={(e) => setIsInternal(e.target.checked)}
                            />
                            <span>🔒 Internal note</span>
                          </label>
                        )}
                        <button
                          className={
                            isInternal
                              ? 'td-btn td-btn-internal'
                              : 'td-btn td-btn-primary'
                          }
                          onClick={handlePostComment}
                          disabled={posting || !commentBody.trim()}
                        >
                          {posting
                            ? 'Posting…'
                            : isInternal
                              ? 'Post internal note →'
                              : 'Post reply →'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Attachments (any viewer can list/download; upload is stricter) */}
            <div className="td-card">
              <div className="td-comments">
                <div className="td-att-head">
                  <h2 className="td-side-title">Attachments</h2>
                  {canUploadAttachment && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="td-att-input"
                        accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.log,.csv,.docx,.xlsx,.zip"
                        onChange={handleFileSelected}
                        disabled={uploading}
                      />
                      <button
                        className="td-btn td-btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading…' : '📎 Upload file'}
                      </button>
                    </>
                  )}
                </div>

                {attachmentsLoading ? (
                  <div className="td-comment-empty">Loading attachments…</div>
                ) : attachments.length === 0 ? (
                  <div className="td-comment-empty">
                    <div className="td-comment-empty-title">No attachments</div>
                  </div>
                ) : (
                  <div className="td-att-list">
                    {attachments.map((a) => (
                      <AttachmentChip
                        key={a.id}
                        attachment={a}
                        onDownload={handleDownload}
                        canDelete={a.uploadedByUser?.id === userId}
                        onDelete={handleDeleteAttachment}
                      />
                    ))}
                  </div>
                )}

                {attachmentError && (
                  <div className="td-banner td-banner-sm">⚠ {attachmentError}</div>
                )}
              </div>
            </div>

            {/* Activity / history (visible to anyone who can view the ticket) */}
            <div className="td-card">
              <div className="td-comments">
                <h2 className="td-side-title">Activity</h2>
                {activityLoading ? (
                  <div className="td-comment-empty">Loading activity…</div>
                ) : activityError ? (
                  <div className="td-banner td-banner-sm">⚠ {activityError}</div>
                ) : activity.length === 0 ? (
                  <div className="td-comment-empty">
                    <div className="td-comment-empty-title">No activity yet</div>
                  </div>
                ) : (
                  <ActivityTimeline items={activity} />
                )}
              </div>
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

            {role !== 'Employee' && (
              <TimeTracker
                ticket={t}
                role={role}
                userId={userId}
                onActivity={async () => setActivity(await fetchActivity(id))}
              />
            )}

            {canAssign && (
              <div className="td-card">
                <div className="td-side-body">
                  <h2 className="td-side-title">Assignment</h2>

                  {/* While escalated, the assigned agent is the escalator (any
                      reassignment clears the flag), so name them directly. The
                      reason lives in the internal note, so point there rather than
                      duplicating it. */}
                  {t.isEscalated && t.assignedToUser && (
                    <p className="td-workflow-note">
                      ⬆ {fullName(t.assignedToUser)} escalated this ticket. See their
                      internal note in the conversation for why, then reassign or step in.
                    </p>
                  )}

                  <p className="td-workflow-hint">
                    {t.assignedToUser
                      ? `Currently handled by ${fullName(t.assignedToUser)}.`
                      : 'No agent is handling this ticket yet.'}
                  </p>
                  <button
                    className="td-btn td-btn-block"
                    onClick={() => {
                      setAssignError('')
                      setAssignOpen(true)
                    }}
                  >
                    🤝 {t.assignedToUser ? 'Reassign' : 'Assign'} ticket
                  </button>

                  {canStartWork && (
                    <>
                      <div className="td-rule" />
                      <p className="td-workflow-hint">
                        An agent is assigned. Start work to move this ticket to In
                        Progress.
                      </p>
                      <button
                        className="td-btn td-btn-primary td-btn-block"
                        onClick={() => changeStatus('In Progress')}
                        disabled={working}
                      >
                        {working ? 'Working…' : '▶ Start work'}
                      </button>
                      {actionError && (
                        <div className="td-banner td-banner-sm">⚠ {actionError}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {canClose && (
              <div className="td-card">
                <div className="td-side-body">
                  <h2 className="td-side-title">Workflow</h2>
                  <p className="td-workflow-hint">
                    The requester confirmed the fix. Close this ticket to complete it.
                  </p>
                  <button
                    className="td-btn td-btn-primary td-btn-block"
                    onClick={() => changeStatus('Closed')}
                    disabled={working}
                  >
                    {working ? 'Working…' : '🔒 Close ticket'}
                  </button>
                  {actionError && (
                    <div className="td-banner td-banner-sm">⚠ {actionError}</div>
                  )}
                </div>
              </div>
            )}

            {hasWorkflow && (
              <div className="td-card">
                <div className="td-side-body">
                  <h2 className="td-side-title">Workflow</h2>

                  {canAgentHandoff && (
                    <>
                      <p className="td-workflow-hint">
                        Finished working on this ticket? Send it to the requester to
                        confirm the fix.
                      </p>
                      <button
                        className="td-btn td-btn-primary td-btn-block"
                        onClick={() => changeStatus('Pending')}
                        disabled={working}
                      >
                        {working ? 'Working…' : '✅ Mark as done — request confirmation'}
                      </button>

                      {canEscalate ? (
                        <button
                          className="td-btn td-btn-block"
                          onClick={() => {
                            setEscalateError('')
                            setEscalateOpen(true)
                          }}
                          disabled={working}
                        >
                          ⬆ Escalate to manager
                        </button>
                      ) : (
                        <p className="td-workflow-note">
                          ⬆ Escalated — awaiting a manager.
                        </p>
                      )}
                    </>
                  )}

                  {canConfirmFix && (
                    <>
                      <p className="td-workflow-hint">
                        Your agent marked this resolved. Confirm the issue is fixed to
                        close it out.
                      </p>
                      <button
                        className="td-btn td-btn-primary td-btn-block"
                        onClick={() => changeStatus('Resolved')}
                        disabled={working}
                      >
                        {working ? 'Working…' : '✅ Confirm the fix — mark resolved'}
                      </button>
                      <button
                        className="td-btn td-btn-block"
                        onClick={() => changeStatus('In Progress')}
                        disabled={working}
                      >
                        {working ? 'Working...' : 'Still not resolved'}
                      </button>
                    </>
                  )}

                  {actionError && (
                    <div className="td-banner td-banner-sm">⚠ {actionError}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <EditTicketModal
            ticket={t}
            onClose={() => setEditing(false)}
            onSaved={handleSaved}
          />
        )}

        {assignOpen && (
          <AssignTicketModal
            ticket={t}
            agents={agents}
            assigning={assigning}
            error={assignError}
            onAssign={handleAssign}
            onClose={() => setAssignOpen(false)}
          />
        )}

        {escalateOpen && (
          <EscalateTicketModal
            ticket={t}
            escalating={escalating}
            error={escalateError}
            onEscalate={handleEscalate}
            onClose={() => setEscalateOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default TicketDetail
