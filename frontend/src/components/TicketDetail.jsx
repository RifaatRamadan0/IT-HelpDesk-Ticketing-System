import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchTicketById,
  fetchCategories,
  fetchPriorities,
  fetchAgents,
  assignTicket,
  updateTicket,
  updateTicketStatus,
  SessionExpiredError,
} from '../api/tickets'
import { getRole, getUserId } from '../lib/auth'
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

  // Assignment (Manager/Admin only).
  const [agents, setAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchTicketById(id)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
          return
        }
        applyTicket(data)
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

  // Set the ticket and preselect its current assignee in the picker, so the
  // dropdown reflects reality and "Reassign" starts from who's assigned now.
  // Done where the data arrives (not in an effect) to avoid a cascading render.
  function applyTicket(data) {
    setTicket(data)
    setSelectedAgentId(data.assignedToUser ? String(data.assignedToUser.id) : '')
  }

  // Re-fetch the ticket so the page reflects new values, status and timestamps.
  async function refresh() {
    try {
      const data = await fetchTicketById(id)
      if (data) applyTicket(data)
    } catch (err) {
      if (err instanceof SessionExpiredError) navigate('/login', { replace: true })
    }
  }

  async function handleSaved() {
    setEditing(false)
    await refresh()
  }

  // Drive a role-specific status transition (Agent: In Progress -> Pending,
  // Employee: Pending -> Resolved). The API is the source of truth on whether
  // the move is legal; we just surface its rejection.
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

  // Assign (or reassign) the ticket to the chosen agent, then re-fetch so the
  // "Assigned to" panel and any unlocked status actions update.
  async function handleAssign() {
    if (!selectedAgentId) return
    setAssignError('')
    setAssigning(true)
    try {
      await assignTicket(id, Number(selectedAgentId))
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

  // Workflow actions mirror the backend state machine so we never show an action
  // the API would reject. Agent hands finished work back for confirmation; the
  // requester confirms the fix.
  const canAgentHandoff =
    role === 'Agent' &&
    t.statusName === 'In Progress' &&
    t.assignedToUser?.id === userId

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
  const currentAssigneeId = t.assignedToUser?.id ?? null
  const selectionChanged = selectedAgentId !== '' && Number(selectedAgentId) !== currentAssigneeId

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
              </div>
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

            {canAssign && (
              <div className="td-card">
                <div className="td-side-body">
                  <h2 className="td-side-title">Assignment</h2>

                  <div className="td-field">
                    <label className="td-flabel">
                      {t.assignedToUser ? 'Reassign to' : 'Assign to'}
                    </label>
                    <select
                      className="td-select"
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      disabled={assigning || agents.length === 0}
                    >
                      <option value="">
                        {agents.length === 0 ? 'No agents available' : 'Select an agent'}
                      </option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.firstName} {a.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="td-btn td-btn-primary td-btn-block"
                    onClick={handleAssign}
                    disabled={assigning || !selectionChanged}
                  >
                    {assigning
                      ? 'Assigning…'
                      : t.assignedToUser
                        ? 'Reassign ticket'
                        : 'Assign ticket'}
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

                  {assignError && (
                    <div className="td-banner td-banner-sm">⚠ {assignError}</div>
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
      </div>
    </div>
  )
}

export default TicketDetail
