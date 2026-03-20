import Modal from './Modal'
export default function ConfirmDialog({ title='Confirm', message, onConfirm, onCancel, loading=false, danger=true }) {
  return (
    <Modal title={title} onClose={onCancel} footer={<>
      <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
        {loading && <span className="spinner" />}{loading ? 'Processing…' : 'Confirm'}
      </button>
    </>}>
      <p style={{ color:'var(--text-2)', fontSize:13.5, lineHeight:1.6 }}>{message}</p>
    </Modal>
  )
}
