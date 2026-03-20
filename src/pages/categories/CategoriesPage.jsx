import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categoryApi'

function CategoryModal({ category, onClose, onSaved }) {
  const toast = useToast()
  const [form,   setForm]   = useState({ name: category?.name ?? '', description: category?.description ?? '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(ev => ({ ...ev, [k]: undefined })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())             e.name = 'Name is required'
    if (form.name.trim().length > 80)  e.name = 'Max 80 characters'
    if (form.description.length > 255) e.description = 'Max 255 characters'
    return e
  }

  const save = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || undefined }
      if (category) await updateCategory(category.id, payload)
      else          await createCategory(payload)
      toast.success(category ? `"${form.name.trim()}" renamed.` : `"${form.name.trim()}" created.`)
      onSaved(); onClose()
    } catch (err) { setErrors({ _: err.response?.data?.message ?? 'Save failed' }) }
    finally { setSaving(false) }
  }

  const Err = ({ k }) => errors[k] ? <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{errors[k]}</div> : null

  return (
    <Modal title={category ? 'Rename Category' : 'New Category'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving && <span className="spinner" />}
          {saving ? 'Saving…' : category ? 'Save Changes' : 'Create Category'}
        </button>
      </>}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="field">
          <label>Name *</label>
          <input type="text" autoFocus placeholder="e.g. Electronics"
            value={form.name} onChange={set('name')}
            style={errors.name ? { borderColor:'var(--red)' } : {}} />
          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <Err k="name" />
            <span style={{ color:'var(--muted)', fontSize:11, marginLeft:'auto' }}>{form.name.length}/80</span>
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={3} placeholder="Optional description…"
            value={form.description} onChange={set('description')}
            style={errors.description ? { borderColor:'var(--red)' } : {}} />
          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <Err k="description" />
            <span style={{ color:'var(--muted)', fontSize:11, marginLeft:'auto' }}>{form.description.length}/255</span>
          </div>
        </div>
        {errors._ && <div className="alert alert-error">{errors._}</div>}
      </div>
    </Modal>
  )
}

export default function CategoriesPage() {
  const toast           = useToast()
  const { isAdmin }     = useAuth()
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showAdd,    setShowAdd]    = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [delTarget,  setDelTarget]  = useState(null)
  const [deleting,   setDeleting]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setCategories((await getCategories()) ?? []) }
    catch { toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCategory(delTarget.id)
      toast.success(`"${delTarget.name}" deleted.`)
      setDelTarget(null); load()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Delete failed')
      setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const filtered = categories.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalProducts = categories.reduce((s, c) => s + (c.productCount ?? 0), 0)
  const emptyCount    = categories.filter(c => (c.productCount ?? 0) === 0).length

  return (
    <AppLayout title="Categories">
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div>
            <div className="page-title">Category Management</div>
            <div className="page-sub">Organise products into categories</div>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New Category</button>
          )}
        </div>
      </div>

      
      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Categories</div>
          <div className="stat-value">{categories.length}</div>
          <div className="stat-sub">All active</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">Products Covered</div>
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-sub">Across all categories</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Empty Categories</div>
          <div className="stat-value">{emptyCount}</div>
          <div className="stat-sub">No products assigned</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">Avg Products</div>
          <div className="stat-value">{categories.length > 0 ? (totalProducts / categories.length).toFixed(1) : '—'}</div>
          <div className="stat-sub">Per category</div>
        </div>
      </div>

      
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon" style={{ fontSize:13 }}>⌕</span>
          <input className="search-input" placeholder="Search categories…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>✕ Clear</button>}
      </div>

      
      {loading ? (
        <div style={{ padding:52, textAlign:'center' }}>
          <span className="spinner" style={{ width:24, height:24, borderWidth:2.5 }} />
          <div style={{ color:'var(--muted)', fontFamily:'var(--mono)', fontSize:11, marginTop:10 }}>Loading categories…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⬡</span>
          <strong>{search ? 'No categories match your search.' : 'No categories yet.'}</strong>
          <span style={{ fontSize:12 }}>{isAdmin ? 'Click "+ New Category" to get started.' : 'No categories have been created yet.'}</span>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
          {filtered.map(cat => (
            <div key={cat.id} style={{
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:'var(--rl)', padding:'18px 20px',
              display:'flex', flexDirection:'column', gap:10, transition:'border-color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-lit)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
            >
              
              <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'flex-start', flexWrap:'wrap', gap:8, gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <div style={{
                    width:10, height:10, borderRadius:'50%', flexShrink:0,
                    background: (cat.productCount ?? 0) > 0 ? 'var(--teal)' : 'var(--muted)',
                    boxShadow: (cat.productCount ?? 0) > 0 ? '0 0 6px rgba(20,184,166,.4)' : 'none',
                  }} />
                  <span style={{ fontWeight:500, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {cat.name}
                  </span>
                </div>
                {isAdmin && (
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button className="btn-icon" title="Rename" style={{ color:'var(--blue)' }} onClick={() => setEditTarget(cat)}>✎</button>
                    <button className="btn-icon danger" title="Delete" onClick={() => setDelTarget(cat)}>✕</button>
                  </div>
                )}
              </div>

              
              <div style={{
                color:'var(--muted)', fontSize:12, lineHeight:1.5, minHeight:18,
                overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
              }}>
                {cat.description || <span style={{ opacity:.4 }}>No description</span>}
              </div>

              
              <div style={{
                display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'center', flexWrap:'wrap', gap:8,
                borderTop:'1px solid var(--border)', paddingTop:10, marginTop:2,
              }}>
                <span style={{
                  background: (cat.productCount ?? 0) > 0 ? 'var(--teal-dim)' : 'rgba(107,127,163,.08)',
                  border: `1px solid ${(cat.productCount ?? 0) > 0 ? 'rgba(20,184,166,.2)' : 'var(--border)'}`,
                  borderRadius:4,
                  color: (cat.productCount ?? 0) > 0 ? 'var(--teal)' : 'var(--muted)',
                  fontFamily:'var(--mono)', fontSize:11, padding:'2px 8px',
                }}>
                  {cat.productCount ?? 0} {cat.productCount === 1 ? 'product' : 'products'}
                </span>
                <span style={{ color:'var(--muted)', fontFamily:'var(--mono)', fontSize:10 }}>#{cat.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="page-count">{filtered.length} of {categories.length} categories</div>
      )}

      {showAdd    && <CategoryModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {editTarget && <CategoryModal category={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
      {delTarget  && (
        <ConfirmDialog
          title="Delete Category"
          message={
            <span>
              Permanently delete <strong style={{ color:'var(--text)' }}>"{delTarget.name}"</strong>?
              {(delTarget.productCount ?? 0) > 0 && (
                <span style={{ display:'block', marginTop:8, color:'var(--red)', fontSize:12 }}>
                  ⚠ This category has {delTarget.productCount} active product(s). Reassign or delete those products first.
                </span>
              )}
            </span>
          }
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          loading={deleting}
        />
      )}
    </AppLayout>
  )
}
