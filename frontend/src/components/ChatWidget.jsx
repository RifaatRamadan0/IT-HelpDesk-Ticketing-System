import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendChat } from '../api/chat'
import { createTicket, SessionExpiredError } from '../api/tickets'
import './ChatWidget.css'

const GREETING =
  "Hi! Tell me what's going wrong and I'll open a support ticket for you. " +
  'What seems to be the problem?'

function ChatWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [created, setCreated] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, draft, created])

  function handleSessionError(err) {
    if (err instanceof SessionExpiredError) {
      navigate('/login', { replace: true })
      return true
    }
    return false
  }

  async function handleSend(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setDraft(null)
    setError('')
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await sendChat(next)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }])
      if (res.status === 'ready' && res.draft) {
        setDraft(res.draft)
      }
    } catch (err) {
      if (!handleSessionError(err)) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!draft || loading) return
    setError('')
    setLoading(true)
    try {
      const { id } = await createTicket({
        title: draft.title,
        description: draft.description,
        categoryId: draft.categoryId,
        priorityId: draft.priorityId,
      })
      setDraft(null)
      setCreated({ id })
    } catch (err) {
      if (!handleSessionError(err)) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeepEditing() {
    setDraft(null)
  }

  function resetConversation() {
    setMessages([])
    setInput('')
    setDraft(null)
    setCreated(null)
    setError('')
  }

  function handleClose() {
    setOpen(false)
  }

  return (
    <>
      {open && (
        <div className="cw-panel" role="dialog" aria-label="Ticket assistant">
          <header className="cw-header">
            <div className="cw-header-title">
              <span className="cw-dot" />
              Ticket Assistant
            </div>
            <button className="cw-icon-btn" onClick={handleClose} aria-label="Close">
              ✕
            </button>
          </header>

          <div className="cw-body" ref={scrollRef}>
            <Bubble role="assistant" text={GREETING} />

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}

            {loading && (
              <div className="cw-typing">
                <span /><span /><span />
              </div>
            )}

            {draft && (
              <DraftCard
                draft={draft}
                onConfirm={handleConfirm}
                onKeepEditing={handleKeepEditing}
                disabled={loading}
              />
            )}

            {created && (
              <div className="cw-success">
                <div className="cw-success-title">✓ Ticket created</div>
                <button
                  className="cw-link-btn"
                  onClick={() => {
                    handleClose()
                    navigate(`/tickets/${created.id}`)
                  }}
                >
                  View ticket #{created.id}
                </button>
                <button className="cw-ghost-btn" onClick={resetConversation}>
                  Start another
                </button>
              </div>
            )}

            {error && <div className="cw-error">{error}</div>}
          </div>

          {!created && (
            <form className="cw-composer" onSubmit={handleSend}>
              <textarea
                className="cw-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) handleSend(e)
                }}
                placeholder="Describe your issue…"
                rows={1}
                disabled={loading}
              />
              <button
                className="cw-send-btn"
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                ➤
              </button>
            </form>
          )}
        </div>
      )}

      <button
        className={'cw-launcher' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open ticket assistant'}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  )
}

function Bubble({ role, text }) {
  return (
    <div className={'cw-msg cw-msg--' + role}>
      <div className="cw-bubble">{text}</div>
    </div>
  )
}

function DraftCard({ draft, onConfirm, onKeepEditing, disabled }) {
  return (
    <div className="cw-draft">
      <div className="cw-draft-title">Ready to file</div>
      <dl className="cw-draft-grid">
        <dt>Title</dt><dd>{draft.title}</dd>
        <dt>Description</dt><dd>{draft.description}</dd>
        <dt>Category</dt><dd>{draft.categoryName}</dd>
        <dt>Priority</dt><dd>{draft.priorityName}</dd>
      </dl>
      <div className="cw-draft-actions">
        <button className="cw-primary-btn" onClick={onConfirm} disabled={disabled}>
          Create ticket
        </button>
        <button className="cw-ghost-btn" onClick={onKeepEditing} disabled={disabled}>
          Keep editing
        </button>
      </div>
    </div>
  )
}

export default ChatWidget
