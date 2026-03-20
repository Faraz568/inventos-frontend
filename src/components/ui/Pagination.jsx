export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i} className={`btn btn-sm ${i === page ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onPageChange(i)} style={{ minWidth:34 }}>{i + 1}</button>
      ))}
      <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>Next →</button>
    </div>
  )
}
