import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  deleteUser,
} from '../api/users'
import { SessionExpiredError } from '../api/tickets'
import { getUserId } from '../lib/auth'
import './Users.css'

const ROLE_CLS = {
  Admin: 'b-red',
  Agent: 'b-blue',
  Manager: 'b-purple',
  Employee: 'b-gray',
}

function initials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
}

// Add/Edit form. In edit mode email is shown read-only and there's no password
// field (matching the API, which doesn't update those here).
function UserModal({ mode, user, roles, onClose, onSaved }) {
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    password: '',
    roleId: user ? String(user.roleId) : '',
    isActive: user ? user.isActive : true,
  })
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.roleId &&
    (isEdit || (form.email.trim() && form.password.length >= 6))

  async function handleSave() {
    setTouched(true)
    setError('')
    if (!valid) return
    setSaving(true)
    try {
      if (isEdit) {
        await updateUser(user.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          roleId: Number(form.roleId),
          isActive: form.isActive,
        })
      } else {
        await createUser({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          roleId: Number(form.roleId),
        })
      }
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
    <div className="um-overlay" onClick={onClose}>
      <div className="um-modal" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-head">
          <h2 className="um-modal-title">{isEdit ? 'Edit user' : 'Add user'}</h2>
          <button className="um-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="um-modal-body">
          <div className="um-grid">
            <div className="um-field">
              <label className="um-label">First name</label>
              <input
                className="um-input"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
              {touched && !form.firstName.trim() && (
                <div className="um-ferror">⚠ Required.</div>
              )}
            </div>
            <div className="um-field">
              <label className="um-label">Last name</label>
              <input
                className="um-input"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
              {touched && !form.lastName.trim() && (
                <div className="um-ferror">⚠ Required.</div>
              )}
            </div>
          </div>

          <div className="um-field">
            <label className="um-label">Email</label>
            <input
              className="um-input"
              type="email"
              value={form.email}
              disabled={isEdit}
              onChange={(e) => set('email', e.target.value)}
            />
            {isEdit && <div className="um-hint">Email can’t be changed.</div>}
            {!isEdit && touched && !form.email.trim() && (
              <div className="um-ferror">⚠ Required.</div>
            )}
          </div>

          {!isEdit && (
            <div className="um-field">
              <label className="um-label">Temporary password</label>
              <input
                className="um-input"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="At least 6 characters"
              />
              {touched && form.password.length < 6 && (
                <div className="um-ferror">⚠ At least 6 characters.</div>
              )}
            </div>
          )}

          <div className="um-grid">
            <div className="um-field">
              <label className="um-label">Role</label>
              <select
                className="um-select"
                value={form.roleId}
                onChange={(e) => set('roleId', e.target.value)}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {touched && !form.roleId && (
                <div className="um-ferror">⚠ Required.</div>
              )}
            </div>
            {isEdit && (
              <div className="um-field">
                <label className="um-label">Status</label>
                <label className="um-check">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  Active
                </label>
              </div>
            )}
          </div>

          {error && <div className="um-banner">⚠ {error}</div>}

          <div className="um-actions">
            <button className="um-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="um-btn um-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Users() {
  const navigate = useNavigate()
  const currentUserId = getUserId()

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // { mode, user }

  function handleSessionError(err) {
    if (err instanceof SessionExpiredError) {
      navigate('/login', { replace: true })
      return true
    }
    return false
  }

  async function load() {
    // No synchronous setState before the first await, so this is safe to call
    // directly from the effect.
    try {
      const [u, r] = await Promise.all([fetchUsers(), fetchRoles()])
      setUsers(u)
      setRoles(r)
      setError('')
    } catch (err) {
      if (!handleSessionError(err)) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Initial load: inline promise chain so setState only happens in async
  // callbacks (not synchronously in the effect body). Event handlers reuse the
  // load() helper below.
  useEffect(() => {
    Promise.all([fetchUsers(), fetchRoles()])
      .then(([u, r]) => {
        setUsers(u)
        setRoles(r)
        setError('')
      })
      .catch((err) => {
        if (!handleSessionError(err)) setError(err.message)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}?`)) return
    try {
      await deleteUser(user.id)
      load()
    } catch (err) {
      if (!handleSessionError(err)) setError(err.message)
    }
  }

  function onSaved() {
    setModal(null)
    load()
  }

  return (
    <div className="um-page">
      <div className="um-shell">
        <div className="um-head">
          <button
            className="um-btn um-btn-primary"
            onClick={() => setModal({ mode: 'create' })}
          >
            ➕ Add user
          </button>
        </div>

        {error && <div className="um-banner">⚠ {error}</div>}

        <div className="um-card">
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="um-user">
                        <span className="um-avatar">
                          {initials(u.firstName, u.lastName)}
                        </span>
                        <b>
                          {u.firstName} {u.lastName}
                        </b>
                      </span>
                    </td>
                    <td className="um-muted">{u.email}</td>
                    <td>
                      <span className={'um-badge ' + (ROLE_CLS[u.roleName] || 'b-gray')}>
                        {u.roleName}
                      </span>
                    </td>
                    <td>
                      <span className={'um-badge ' + (u.isActive ? 'b-green' : 'b-gray')}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="um-row-actions">
                      <button
                        className="um-btn um-btn-ghost"
                        onClick={() => setModal({ mode: 'edit', user: u })}
                      >
                        Edit
                      </button>
                      <button
                        className="um-btn um-btn-ghost um-danger"
                        onClick={() => handleDelete(u)}
                        disabled={u.id === currentUserId}
                        title={
                          u.id === currentUserId
                            ? "You can't delete your own account"
                            : 'Delete user'
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && users.length === 0 && (
            <div className="um-empty">No users found.</div>
          )}
          {loading && <div className="um-empty">Loading users…</div>}
        </div>
      </div>

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          roles={roles}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

export default Users
