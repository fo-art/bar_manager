'use client'
import { useState } from 'react'

function closeKeyboard() {
  if (typeof document !== 'undefined' && document.activeElement && document.activeElement.blur) {
    document.activeElement.blur()
  }
}

export default function AskBox({ label, submitText, cancelText, onSubmit, onCancel, busy, type = 'text' }) {
  const [value, setValue] = useState('')

  function submit(e) {
    e.preventDefault()
    const v = type === 'text' ? value.trim() : value
    if (!v) return
    closeKeyboard()
    onSubmit(v)
  }

  function cancel() {
    closeKeyboard()
    onCancel()
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 8, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--hover)' }}>
      <div className="field">
        <label>{label}</label>
        <input type={type} value={value} onChange={(e) => setValue(e.target.value)} autoFocus required />
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>{submitText}</button>
      <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={cancel}>{cancelText}</button>
    </form>
  )
}
