import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import ProductFormModal from './ProductFormModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import ViewToggle from '../../components/ui/ViewToggle'
import ExportMenu from '../../components/ui/ExportMenu'
import ImportExcelModal from '../../components/ui/ImportExcelModal'
import { getProducts, deleteProduct, createProduct } from '../../api/productApi'
import { getCategories } from '../../api/categoryApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { exportProducts } from '../../utils/exportUtils'

const PAGE_SIZE = 20

function StockBadge({ qty, level }) {
  if (qty === 0)    return <span className="badge badge-out">Out</span>
  if (qty <= level) return <span className="badge badge-low">Low</span>
  return                   <span className="badge badge-ok">In Stock</span>
}

export default function ProductsPage() {
  const { isAdmin, canEdit } = useAuth()
  const toast       = useToast()

  const [products,     setProducts]     = useState([])
  const [pageInfo,     setPageInfo]     = useState({ page:0, totalPages:0, totalElements:0 })
  const [allProducts,  setAllProducts]  = useState([])   
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('')
  const [currentPage,  setCurrentPage]  = useState(0)
  const [sortBy,       setSortBy]       = useState('name')
  const [sortDir,      setSortDir]      = useState('asc')
  const [view,         setView]         = useState('table')
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [importing,    setImporting]    = useState(false)

  useEffect(() => { getCategories().then(c => setCategories(c ?? [])).catch(() => {}) }, [])

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setCurrentPage(0) }, 350)
    return () => clearTimeout(id)
  }, [searchInput])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const [paged, all] = await Promise.all([
        getProducts({ name:search||undefined, categoryId:catFilter||undefined, page:currentPage, size:PAGE_SIZE, sortBy, sortDir }),
        getProducts({ name:search||undefined, categoryId:catFilter||undefined, size:1000, sortBy, sortDir }),
      ])
      setProducts(paged?.content ?? [])
      setAllProducts(all?.content ?? [])
      setPageInfo({ page:paged?.pageable?.pageNumber??0, totalPages:paged?.totalPages??0, totalElements:paged?.totalElements??0 })
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }, [search, catFilter, currentPage, sortBy, sortDir])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSort = col => {
    if (sortBy === col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortBy(col); setSortDir('asc') }
    setCurrentPage(0)
  }
  const SA = ({ col }) => sortBy !== col
    ? <span style={{ opacity:.25, marginLeft:4 }}>↕</span>
    : <span style={{ color:'var(--blue)', marginLeft:4 }}>{sortDir==='asc'?'↑':'↓'}</span>

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" deleted.`)
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) { toast.error(err.response?.data?.message ?? 'Delete failed') }
    finally { setDeleting(false) }
  }

  const handleImport = async (payloads) => {
    setImporting(true)
    setShowImport(false)
    let ok = 0, fail = 0
    for (const p of payloads) {
      try { await createProduct(p); ok++ }
      catch { fail++ }
    }
    if (ok > 0)   toast.success(`${ok} product${ok !== 1 ? 's' : ''} imported successfully.`)
    if (fail > 0) toast.error(`${fail} product${fail !== 1 ? 's' : ''} failed to import.`)
    setImporting(false)
    fetchProducts()
  }

  const hasFilters = searchInput || catFilter

  return (
    <AppLayout title="Product Management">

      
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, alignItems:'flex-start' }}>
          <div>
            <div className="page-title">Products</div>
            <div className="page-sub">{pageInfo.totalElements} items in inventory</div>
          </div>
          
          <ExportMenu
            label="Export"
            disabled={allProducts.length === 0}
            onExport={fmt => { exportProducts(allProducts, fmt); toast.success(`Exported ${allProducts.length} products as ${fmt.toUpperCase()}`) }}
          />
        </div>
      </div>

      
      <div className="toolbar">
        <ViewToggle view={view} onChange={setView} />
        <div className="search-wrap">
          <span className="search-icon" style={{ fontSize:13 }}>⌕</span>
          <input className="search-input" placeholder="Search products or SKU…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>

        <select style={{ background:'rgba(8,11,20,.6)', border:'1px solid var(--border)', borderRadius:'var(--r)', color:catFilter?'var(--text)':'var(--muted)', fontSize:13, outline:'none', padding:'8px 12px', backdropFilter:'blur(8px)' }}
          value={catFilter} onChange={e => { setCatFilter(e.target.value); setCurrentPage(0) }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setCatFilter(''); setCurrentPage(0) }}>
            ✕ Clear
          </button>
        )}

        <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => setShowImport(true)}>
          ↑ Import Excel
        </button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add Product
        </button>
      </div>

      
      {loading ? (
        <div style={{ padding:52, textAlign:'center' }}>
          <span className="spinner" style={{ width:24, height:24, borderWidth:2.5 }} />
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⬡</span>
          <strong>{hasFilters ? 'No products match your filters.' : 'No products yet.'}</strong>
        </div>
      ) : view === 'table' ? (
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth:600 }}>
            <thead><tr>
              <th>Name</th><th>Category</th><th>Qty</th><th>Price</th><th>Cost</th><th>SKU</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><div style={{ fontWeight:500 }}>{p.name}</div>{p.description && <div style={{ color:'var(--muted)', fontSize:11 }}>{p.description}</div>}</td>
                  <td><span className="tag">{p.categoryName}</span></td>
                  <td className="mono" style={{ color:p.quantity===0?'var(--red)':p.quantity<=p.reorderLevel?'var(--amber)':'inherit' }}>{p.quantity}</td>
                  <td className="mono">₹{Number(p.price).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  <td className="mono muted">₹{Number(p.costPrice||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                  <td className="mono" style={{ fontSize:11 }}>{p.sku || '—'}</td>
                  <td><StockBadge qty={p.quantity} level={p.reorderLevel} /></td>
                  <td><div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn-icon" style={{ color:'var(--blue)' }} onClick={() => setEditTarget(p)}>✎</button>
                    {isAdmin && <button className="btn-icon danger" onClick={() => setDeleteTarget(p)}>✕</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{p.name}</div>
                  <span className="tag" style={{ marginTop:3, display:'inline-block' }}>{p.categoryName}</span>
                </div>
                <StockBadge qty={p.quantity} level={p.reorderLevel} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                {[
                  { label:'Qty', value:p.quantity, color:p.quantity===0?'var(--red)':p.quantity<=p.reorderLevel?'var(--amber)':'var(--text)' },
                  { label:'Price', value:`₹${Number(p.price).toLocaleString('en-IN')}` },
                  { label:'Cost', value:`₹${Number(p.costPrice||0).toLocaleString('en-IN')}` },
                  { label:'SKU', value:p.sku||'—' },
                ].map(r => (
                  <div key={r.label} style={{ background:'var(--raised)', borderRadius:6, padding:'6px 8px' }}>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>{r.label}</div>
                    <div style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:500, color:r.color||'var(--text)' }}>{r.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:6, justifyContent:'flex-end', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                <button className="btn-icon" style={{ color:'var(--blue)' }} onClick={() => setEditTarget(p)}>✎ Edit</button>
                {isAdmin && <button className="btn-icon danger" onClick={() => setDeleteTarget(p)}>✕</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      
      {!loading && products.length > 0 && (
        <>
          <div className="page-count">
            Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage+1)*PAGE_SIZE, pageInfo.totalElements)} of {pageInfo.totalElements}
          </div>
          <Pagination page={currentPage} totalPages={pageInfo.totalPages}
            onPageChange={p => { setCurrentPage(p); window.scrollTo(0,0) }} />
        </>
      )}

      
      {showAdd     && <ProductFormModal onClose={() => setShowAdd(false)}   onSaved={fetchProducts} />}
      {editTarget  && <ProductFormModal product={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchProducts} />}
      {showImport  && (
        <ImportExcelModal
          categories={categories}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Product"
          message={
            <span>
              Permanently delete{' '}
              <strong style={{ color:'var(--text)' }}>"{deleteTarget.name}"</strong>?
              <br />
              <span style={{ fontSize:12, color:'var(--muted)', display:'block', marginTop:6 }}>
                This is a soft-delete — historical sales data is preserved.
              </span>
            </span>
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </AppLayout>
  )
}
