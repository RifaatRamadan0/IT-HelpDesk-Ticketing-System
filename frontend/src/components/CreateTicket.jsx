import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createTicket,
  fetchCategories,
  fetchPriorities,
  uploadAttachment,
  SessionExpiredError,
} from '../api/tickets'
import './CreateTicket.css'

// "Submit a Support Request" form, recreated from the design bundle
// (it-help-desk/project/screens-b.jsx -> CreateTicket). Title, description,
// category and priority are required; attachments are optional. On success
// the form swaps to a confirmation panel showing the new ticket's reference.

// 5 MB — matches the limit the server actually enforces (AttachmentValidator),
// so the client check and the backend reason string agree.
const MAX_FILE_BYTES = 5 * 1024 * 1024

function formatSize(bytes) {
  return bytes > 1e6
    ? (bytes / 1e6).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB'
}

// Read a File as a Base64 data URL, the shape uploadAttachment expects. Same
// pattern as TicketDetail's upload flow.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
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
      file: f, // keep the real File so its bytes can be uploaded at submit
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

    // Stop before creating the ticket if any file is over the limit — fix it first.
    if (files.some((f) => f.big)) {
      setSubmitError('Remove files larger than 5 MB before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const { id } = await createTicket({
        title: form.title.trim(),
        description: form.desc.trim(),
        categoryId: Number(form.category),
        priorityId: Number(form.priority),
      })

      // The ticket now exists, so we upload attachments as a follow-up step
      // against its id (there's no transactional create-with-files endpoint).
      // A failed upload must not discard the ticket: collect the failures and
      // still show success, reporting any files that didn't make it.
      const failed = []
      for (const item of files) {
        try {
          const dataUrl = await fileToDataUrl(item.file)
          await uploadAttachment(id, item.name, dataUrl)
        } catch (err) {
          if (err instanceof SessionExpiredError) {
            navigate('/login', { replace: true })
            return
          }
          // Keep the server's specific reason (type/size/content) so the user
          // knows *why* a file was rejected, not just that it failed.
          failed.push(`${item.name} — ${err.message}`)
        }
      }

      setDone(id)
      if (failed.length) {
        setSubmitError(
          `Ticket created, but these files didn't upload:\n${failed.join('\n')}`,
        )
      }
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
                <button
                  className="ct-btn ct-btn-primary"
                  onClick={() => navigate('/tickets')}
                >
                  View my tickets
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
                  Max 5 MB per file · JPG, PNG, GIF, PDF, DOCX, XLSX, ZIP, TXT, LOG, CSV
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
                        <span className="ct-file-over"> — exceeds 5 MB limit</span>
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
