import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ViewToggle from '../../components/ui/ViewToggle'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categoryApi'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/productApi'
import { useAuth } from '../../context/AuthContext'

const TABS = [
  { key:'categories', label:'Categories' },
  { key:'products',   label:'Products'   },
]

function CategoryModal({ cat, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: cat?.name || '', description: cat?.description || '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async e => {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSaving(true); setErr('')
    try {
      if (cat) await updateCategory(cat.id, form)
      else     await createCategory(form)
      toast.success(cat ? 'Category updated.' : 'Category created.')
      onSaved(); onClose()
    } catch (err) { setErr(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={cat ? 'Edit Category' : 'Add Category'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          {saving ? 'Saving…' : cat ? 'Save Changes' : 'Create Category'}
        </button>
      </>}>
      <div className="field" style={{ marginBottom:14 }}>
        <label>Category Name *</label>
        <input type="text" placeholder="e.g. Electronics" value={form.name} onChange={set('name')} autoFocus
          style={err ? { borderColor:'var(--red)' } : {}} />
        {err && <div className="field-err">{err}</div>}
      </div>
      <div className="field">
        <label>Description</label>
        <textarea placeholder="Optional description…" value={form.description} onChange={set('description')} rows={3} />
      </div>
    </Modal>
  )
}

function ProductModal({ product, categories, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name:         product?.name         || '',
    categoryId:   product?.categoryId   || '',
    quantity:     product?.quantity     ?? '',
    price:        product?.price        ?? '',
    costPrice:    product?.costPrice    ?? '',
    sku:          product?.sku          || '',
    reorderLevel: product?.reorderLevel ?? 10,
    description:  product?.description  || '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(ev => ({ ...ev, [k]: undefined })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())     e.name       = 'Required'
    if (!form.categoryId)      e.categoryId = 'Required'
    if (form.quantity === '')  e.quantity   = 'Required'
    if (form.price === '')     e.price      = 'Required'
    return e
  }

  const save = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { ...form, categoryId: Number(form.categoryId), quantity: Number(form.quantity), price: Number(form.price), costPrice: Number(form.costPrice) || 0, reorderLevel: Number(form.reorderLevel) || 10 }
      if (product) await updateProduct(product.id, payload)
      else         await createProduct(payload)
      toast.success(product ? 'Product updated.' : 'Product created.')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const E = ({ f }) => errors[f] ? <div className="field-err">{errors[f]}</div> : null

  return (
    <Modal title={product ? 'Edit Product' : 'Add Product'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          {saving ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
        </button>
      </>}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div className="field">
          <label>Product Name *</label>
          <input type="text" value={form.name} onChange={set('name')} autoFocus style={errors.name ? { borderColor:'var(--red)' } : {}} />
          <E f="name" />
        </div>
        <div className="field">
          <label>Category *</label>
          <select value={form.categoryId} onChange={set('categoryId')} style={errors.categoryId ? { borderColor:'var(--red)' } : {}}>
            <option value="">— Select —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <E f="categoryId" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Quantity *</label>
            <input type="number" min="0" value={form.quantity} onChange={set('quantity')} style={errors.quantity ? { borderColor:'var(--red)' } : {}} />
            <E f="quantity" />
          </div>
          <div className="field">
            <label>Selling Price ₹ *</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} style={errors.price ? { borderColor:'var(--red)' } : {}} />
            <E f="price" />
          </div>
        </div>
        <div className="field-row">
          <div className="field"><label>Cost Price ₹</label><input type="number" min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} /></div>
          <div className="field"><label>SKU</label><input type="text" value={form.sku} onChange={set('sku')} /></div>
        </div>
        <div className="field"><label>Reorder Level</label><input type="number" min="0" value={form.reorderLevel} onChange={set('reorderLevel')} /></div>
        <div className="field"><label>Description</label><textarea rows={2} value={form.description} onChange={set('description')} /></div>
      </div>
    </Modal>
  )
}

export default function DatabasePage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('categories')

  
  const [categories,  setCategories]  = useState([])
  const [catLoading,  setCatLoading]  = useState(true)
  const [catModal,    setCatModal]    = useState(null) 
  const [catDelete,   setCatDelete]   = useState(null)
  const [catDeleting, setCatDeleting] = useState(false)

  
  const [products,    setProducts]    = useState([])
  const [prodLoading, setProdLoading] = useState(true)
  const [prodModal,   setProdModal]   = useState(null)
  const [prodDelete,  setProdDelete]  = useState(null)
  const [prodDeleting,setProdDeleting]= useState(false)
  const [prodSearch,  setProdSearch]  = useState('')

  const loadCategories = useCallback(async () => {
    setCatLoading(true)
    try { setCategories(await getCategories()) } catch { toast.error('Failed to load categories') }
    finally { setCatLoading(false) }
  }, [])

  const loadProducts = useCallback(async () => {
    setProdLoading(true)
    try {
      const res = await getProducts({ size: 100 })
      setProducts(res?.content ?? [])
    } catch { toast.error('Failed to load products') }
    finally { setProdLoading(false) }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { if (tab === 'products') loadProducts() }, [tab, loadProducts])

  const handleCatDelete = async () => {
    setCatDeleting(true)
    try { await deleteCategory(catDelete.id); toast.success(`"${catDelete.name}" deleted.`); setCatDelete(null); loadCategories() }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
    finally { setCatDeleting(false) }
  }

  const handleProdDelete = async () => {
    setProdDeleting(true)
    try { await deleteProduct(prodDelete.id); toast.success(`"${prodDelete.name}" deleted.`); setProdDelete(null); loadProducts() }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
    finally { setProdDeleting(false) }
  }

  const filteredProducts = products.filter(p =>
    !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase()) || (p.sku||'').toLowerCase().includes(prodSearch.toLowerCase())
  )

  const stockBadge = (qty, lvl) => {
    if (qty === 0)    return <span className="badge badge-out">Out</span>
    if (qty <= lvl)   return <span className="badge badge-low">Low</span>
    return                   <span className="badge badge-ok">OK</span>
  }

  return (
    <AppLayout title="Database Manager">
      <div className="page-header">
        <div className="page-title">Database Manager</div>
        <div className="page-sub">View and edit all database tables directly</div>
      </div>

      
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'categories' && <span style={{ marginLeft:6, background:'var(--blue-dim)', color:'var(--blue)', borderRadius:10, fontSize:10, padding:'1px 6px', fontFamily:'var(--mono)' }}>{categories.length}</span>}
            {t.key === 'products'   && <span style={{ marginLeft:6, background:'var(--blue-dim)', color:'var(--blue)', borderRadius:10, fontSize:10, padding:'1px 6px', fontFamily:'var(--mono)' }}>{products.length}</span>}
          </button>
        ))}
      </div>

      
      {tab === 'categories' && (
        <>
          <div className="toolbar">
            <div style={{ color:'var(--muted)', fontSize:13 }}>{categories.length} categories in database</div>
            {isAdmin && (
              <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={() => setCatModal('add')}>
                + Add Category
              </button>
            )}
          </div>

          {catLoading ? (
            <div style={{ padding:40, textAlign:'center' }}><span className="spinner" style={{ width:22, height:22 }} /></div>
          ) : view === 'table' ? (
            <div className="table-wrap">
              <table className="data-table" style={{ minWidth:500 }}>
                <thead><tr>
                  <th>Name</th><th>Description</th><th>Created</th><th>Products</th>
                  {isAdmin && <th style={{ textAlign:'right' }}>Actions</th>}
                </tr></thead>
                <tbody>{categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td style={{ color:'var(--muted)', fontSize:12 }}>{c.description || '—'}</td>
                    <td className="mono muted" style={{ fontSize:11 }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td><span style={{ background:'var(--blue-dim)', color:'var(--blue)', borderRadius:4, fontSize:11, fontFamily:'var(--mono)', padding:'2px 8px' }}>{products.filter(p => p.categoryId === c.id || p.categoryName === c.name).length} items</span></td>
                    {isAdmin && <td><div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button className="btn-icon" style={{ color:'var(--blue)' }} onClick={() => setCatModal(c)}>✎</button>
                      <button className="btn-icon danger" onClick={() => setCatDelete(c)}>✕</button>
                    </div></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
              {categories.map(c => {
                const prodCount = products.filter(p => p.categoryId === c.id || p.categoryName === c.name).length
                return (
                  <div key={c.id} className="card" style={{ padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                      <span style={{ background:'var(--accent-dim)', color:'var(--accent)', borderRadius:4, fontSize:11, fontFamily:'var(--mono)', padding:'2px 8px' }}>{prodCount} items</span>
                    </div>
                    {c.description && <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>{c.description}</div>}
                    {c.createdAt && <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)', marginBottom:8 }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</div>}
                    {isAdmin && <div style={{ display:'flex', gap:6, justifyContent:'flex-end', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                      <button className="btn-icon" style={{ color:'var(--blue)' }} onClick={() => setCatModal(c)}>✎ Edit</button>
                      <button className="btn-icon danger" onClick={() => setCatDelete(c)}>✕</button>
                    </div>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      
      {tab === 'products' && (
        <>
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon" style={{ fontSize:13 }}>⌕</span>
              <input className="search-input" placeholder="Search products or SKU…" value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            </div>
            <ViewToggle view={view} onChange={setView} />
            {isAdmin && (
              <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={() => { loadCategories(); setProdModal('add') }}>
                + Add Product
              </button>
            )}
          </div>

          {prodLoading ? (
            <div style={{ padding:40, textAlign:'center' }}><span className="spinner" style={{ width:22, height:22 }} /></div>
          ) : view === 'table' ? (
            <>
              <div className="table-wrap">
                <table className="data-table" style={{ minWidth:620 }}>
                  <thead><tr>
                    <th>Name</th><th>Category</th><th>Qty</th>
                    <th>Price ₹</th><th>Cost ₹</th><th>SKU</th><th>Status</th>
                    {isAdmin && <th style={{ textAlign:'right' }}>Actions</th>}
                  </tr></thead>
                  <tbody>
                    {filteredProducts.length === 0
                      ? <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>No products found.</td></tr>
                      : filteredProducts.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight:500 }}>{p.name}{p.description && <div style={{ color:'var(--muted)', fontSize:11, marginTop:1, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>}</td>
                          <td><span className="tag">{p.categoryName}</span></td>
                          <td className="mono" style={{ color: p.quantity===0?'var(--red)':p.quantity<=p.reorderLevel?'var(--amber)':'inherit' }}>{p.quantity}</td>
                          <td className="mono">₹{Number(p.price).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                          <td className="mono muted">₹{Number(p.costPrice||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                          <td className="mono" style={{ fontSize:11, color:'var(--muted)' }}>{p.sku || '—'}</td>
                          <td>{stockBadge(p.quantity, p.reorderLevel)}</td>
                          {isAdmin && <td><div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            <button className="btn-icon" style={{ color:'var(--blue)' }} onClick={() => { loadCategories(); setProdModal(p) }}>✎</button>
                            <button className="btn-icon danger" onClick={() => setProdDelete(p)}>✕</button>
                          </div></td>}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
              <div className="page-count">{filteredProducts.length} of {products.length} products</div>
            </>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
                {filteredProducts.length === 0
                  ? <div className="empty-state" style={{ gridColumn:'1/-1' }}><span>No products found.</span></div>
                  : filteredProducts.map(p => (
                    <div key={p.id} className="card" style={{ padding:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div><div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>{p.description && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{p.description}</div>}</div>
                        <span className="tag">{p.categoryName}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:isAdmin ? 10 : 0 }}>
                        {[
                          { label:'Qty', value:p.quantity, color:p.quantity===0?'var(--red)':p.quantity<=p.reorderLevel?'var(--amber)':'var(--text)' },
                          { label:'Price', value:`₹${Number(p.price).toLocaleString('en-IN')}` },
                          { label:'Cost', value:`₹${Number(p.costPrice||0).toLocaleString('en-IN')}` },
                          { label:'SKU', value:p.sku||'—' },
                        ].map(r => (
                          <div key={r.label} style={{ background:'var(--raised)', borderRadius:6, padding:'5px 8px' }}>
                            <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:1 }}>{r.label}</div>
                            <div style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:500, color:r.color||'var(--text)' }}>{r.value}</div>
                          </div>
                        ))}
                      </div>
                      {isAdmin && <div style={{ display:'flex', gap:6, justifyContent:'flex-end', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                        <button className="btn-icon" style={{ color:'var(--blue)' }} onClick={() => { loadCategories(); setProdModal(p) }}>✎ Edit</button>
                        <button className="btn-icon danger" onClick={() => setProdDelete(p)}>✕</button>
                      </div>}
                    </div>
                  ))
                }
              </div>
              <div className="page-count">{filteredProducts.length} of {products.length} products</div>
            </>
          )}
        </>
      )}

      
      {catModal && (
        <CategoryModal cat={catModal === 'add' ? null : catModal}
          onClose={() => setCatModal(null)} onSaved={loadCategories} />
      )}
      {catDelete && (
        <ConfirmDialog title="Delete Category"
          message={<>Delete category <strong style={{ color:'var(--text)' }}>"{catDelete.name}"</strong>? Products in this category will need to be reassigned.</>}
          onConfirm={handleCatDelete} onCancel={() => setCatDelete(null)} loading={catDeleting} />
      )}

      
      {prodModal && (
        <ProductModal product={prodModal === 'add' ? null : prodModal}
          categories={categories} onClose={() => setProdModal(null)} onSaved={loadProducts} />
      )}
      {prodDelete && (
        <ConfirmDialog title="Delete Product"
          message={<>Delete <strong style={{ color:'var(--text)' }}>"{prodDelete.name}"</strong>? This performs a soft-delete.</>}
          onConfirm={handleProdDelete} onCancel={() => setProdDelete(null)} loading={prodDeleting} />
      )}
    </AppLayout>
  )
}
