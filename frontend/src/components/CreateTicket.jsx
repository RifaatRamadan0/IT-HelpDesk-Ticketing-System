import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createTicket,
  fetchCategories,
  fetchPriorities,
  SessionExpiredError,
} from '../api/tickets'
import './CreateTicket.css'

// "Submit a Support Request" form, recreated from the design bundle
// (it-help-desk/project/screens-b.jsx -> CreateTicket). Title, description,
// category and priority are required; attachments are optional. On success
// the form swaps to a confirmation panel showing the new ticket's reference.

const MAX_FILE_BYTES = 10 * 1e6 // 10 MB, per the design's stated limit

function formatSize(bytes) {
  return bytes > 1e6
    ? (bytes / 1e6).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB'
}

function CreateTicket() {
  // category / priority now hold the row id (as a string, from the <select>),
  // not the display name.
  const [form, setForm] = useState({ title: '', desc: '', category: '', priority: '' })
  const [categories, setCategories] = useState([])
  const [priorities, setPriorities] = useState([])
  const [lookupError, setLookupError] = useState('')
  const [files, setFiles] = useState([])
  const [touched, setTouched] = useState(false)
  const [drag, setDrag] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(null) // holds the created ticket ref once submitted
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Load the lookup tables once on mount so the dropdowns reflect whatever the
  // backend actually has, rather than ids hardcoded in the frontend.
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
        if (err instanceof SessionExpiredError) {
          navigate('/login', { replace: true })
          return
        }
        setLookupError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  const valid =
    form.title.trim() && form.desc.trim() && form.category && form.priority

  function addFiles(list) {
    const arr = Array.from(list).map((f) => ({
      name: f.name,
      type: (f.name.split('.').pop() || 'FILE').toUpperCase(),
      size: formatSize(f.size),
      big: f.size > MAX_FILE_BYTES,
    }))
    setFiles((prev) => [...prev, ...arr])
  }

  async function handleSubmit() {
    setTouched(true)
    setSubmitError('')
    if (!valid) return

    setSubmitting(true)
    try {
      // Attachments are shown for parity with the design but the current
      // CreateTicketRequestDto has no file field, so they are not uploaded yet.
      const { id } = await createTicket({
        title: form.title.trim(),
        description: form.desc.trim(),
        categoryId: Number(form.category),
        priorityId: Number(form.priority),
      })
      setDone(id)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setDone(null)
    setForm({ title: '', desc: '', category: '', priority: '' })
    setFiles([])
    setTouched(false)
    setSubmitError('')
  }

  if (done) {
    return (
      <div className="ct-page">
        <div className="ct-shell ct-success">
          <div className="ct-card">
            <div className="ct-success-body">
              <div className="ct-success-emoji">🎉</div>
              <h2 className="ct-success-title">Ticket submitted!</h2>
              <div className="ct-success-sub">
                Your request is in the queue. We'll email you on every update.
              </div>
              <div className="ct-ref">
                <div className="ct-ref-label">Your reference number</div>
                <div className="ct-ref-value">#{done}</div>
              </div>
              <div className="ct-success-actions">
                <button className="ct-btn" onClick={reset}>
                  Submit another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ct-page">
      <div className="ct-shell">
        <div className="ct-card">
          <div className="ct-card-body">
            <h2 className="ct-title">Submit a Support Request</h2>
            <div className="ct-subtitle">
              Describe your issue and our team will respond shortly.
            </div>
            <div className="ct-rule" />

            {lookupError && <div className="ct-banner">⚠ {lookupError}</div>}

            {/* Issue title */}
            <div className="ct-field">
              <label className="ct-label" htmlFor="ct-title">
                Issue Title<span className="ct-req"> *</span>
              </label>
              <input
                id="ct-title"
                className="ct-input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder='e.g. "Outlook not opening since update"'
              />
              {touched && !form.title.trim() && (
                <div className="ct-error">⚠ A short title is required.</div>
              )}
            </div>

            {/* Description */}
            <div className="ct-field">
              <label className="ct-label" htmlFor="ct-desc">
                Description<span className="ct-req"> *</span>
              </label>
              <textarea
                id="ct-desc"
                className="ct-textarea"
                rows={5}
                value={form.desc}
                onChange={(e) => set('desc', e.target.value)}
                placeholder="Describe the problem in detail — what happened, when it started, any error messages…"
              />
              {touched && !form.desc.trim() && (
                <div className="ct-error">⚠ Please describe the problem.</div>
              )}
            </div>

            {/* Category + priority */}
            <div className="ct-grid-2">
              <div className="ct-field">
                <label className="ct-label" htmlFor="ct-category">
                  Category<span className="ct-req"> *</span>
                </label>
                <div className="ct-select-wrap">
                  <select
                    id="ct-category"
                    className={'ct-select' + (form.category ? '' : ' is-placeholder')}
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
                  <span className="ct-chevron">▼</span>
                </div>
                {touched && !form.category ? (
                  <div className="ct-error">⚠ Choose a category.</div>
                ) : (
                  <div className="ct-hint">
                    Hardware / Software / Network / Email / Access / Other
                  </div>
                )}
              </div>

              <div className="ct-field">
                <label className="ct-label" htmlFor="ct-priority">
                  Priority<span className="ct-req"> *</span>
                </label>
                <div className="ct-select-wrap">
                  <select
                    id="ct-priority"
                    className={'ct-select' + (form.priority ? '' : ' is-placeholder')}
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
                  <span className="ct-chevron">▼</span>
                </div>
                {touched && !form.priority && (
                  <div className="ct-error">⚠ Choose a priority.</div>
                )}
              </div>
            </div>

            {/* Attachments */}
            <div className="ct-field">
              <label className="ct-label">Attachments</label>
              <div
                className={'ct-dropzone' + (drag ? ' is-drag' : '')}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDrag(true)
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDrag(false)
                  addFiles(e.dataTransfer.files)
                }}
              >
                <div className="ct-dropzone-title">
                  📎 Drag &amp; drop files here, or click to browse
                </div>
                <div className="ct-dropzone-sub">
                  Max 10 MB per file · JPG, PNG, PDF, LOG, ZIP supported
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => addFiles(e.target.files)}
              />
              {files.map((f, i) => (
                <div
                  key={i}
                  className={'ct-file-row' + (f.big ? ' is-big' : '')}
                >
                  <span style={{ fontSize: 18 }}>{f.big ? '⚠️' : '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ct-file-name">{f.name}</div>
                    <div className="ct-file-meta">
                      {f.type} · {f.size}
                      {f.big && (
                        <span className="ct-file-over"> — exceeds 10 MB limit</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="ct-btn ct-btn-ghost"
                    onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {touched && !valid && (
              <div className="ct-banner">
                ⚠ Please fill in all required fields before submitting.
              </div>
            )}

            {submitError && <div className="ct-banner">⚠ {submitError}</div>}

            <div className="ct-actions">
              <button className="ct-btn" onClick={reset} disabled={submitting}>
                Cancel
              </button>
              <button
                className="ct-btn ct-btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateTicket
