import { useState, useEffect } from 'react'
import Modal from '../../components/ui/Modal'
import { createProduct, updateProduct } from '../../api/productApi'
import { getCategories } from '../../api/categoryApi'
import { useToast } from '../../context/ToastContext'

const EMPTY = { name:'', categoryId:'', quantity:'', price:'', costPrice:'', sku:'', reorderLevel:'10', description:'' }

export default function ProductFormModal({ product, onClose, onSaved }) {
  const toast  = useToast()
  const isEdit = Boolean(product)
  const [form,  setForm]  = useState(product ? {
    name: product.name ?? '', categoryId: product.categoryId ?? '',
    quantity: String(product.quantity ?? ''), price: String(product.price ?? ''),
    costPrice: String(product.costPrice ?? ''), sku: product.sku ?? '',
    reorderLevel: String(product.reorderLevel ?? 10), description: product.description ?? '',
  } : EMPTY)
  const [cats,   setCats]   = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCategories().then(c => setCats(c ?? [])).catch(() => {})
  }, [])

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(ev => ({ ...ev, [k]: undefined })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())      e.name       = 'Required'
    if (!form.categoryId)       e.categoryId = 'Required'
    if (form.quantity === '')   e.quantity   = 'Required'
    if (Number(form.quantity) < 0) e.quantity = 'Cannot be negative'
    if (form.price === '')      e.price      = 'Required'
    if (Number(form.price) < 0) e.price     = 'Cannot be negative'
    return e
  }

  const handleSave = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), categoryId: Number(form.categoryId),
        quantity: Number(form.quantity), price: Number(form.price),
        costPrice: form.costPrice !== '' ? Number(form.costPrice) : 0,
        sku: form.sku.trim() || undefined,
        reorderLevel: Number(form.reorderLevel) || 10,
        description: form.description.trim() || undefined,
      }
      if (isEdit) { await updateProduct(product.id, payload); toast.success(`"${payload.name}" updated.`) }
      else        { await createProduct(payload);             toast.success(`"${payload.name}" added.`) }
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const ErrMsg = ({ field }) => errors[field] ? <div className="field-err">{errors[field]}</div> : null

  return (
    <Modal title={isEdit ? 'Edit Product' : 'Add New Product'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      </>}
    >
      <div className="field">
        <label>Product Name *</label>
        <input type="text" placeholder="e.g. Wireless Keyboard" value={form.name} onChange={set('name')}
          style={errors.name ? { borderColor:'var(--red)' } : {}} autoFocus />
        <ErrMsg field="name" />
      </div>

      <div className="field">
        <label>Category *</label>
        <select value={form.categoryId} onChange={set('categoryId')} style={errors.categoryId ? { borderColor:'var(--red)' } : {}}>
          <option value="">— Select category —</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ErrMsg field="categoryId" />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Quantity *</label>
          <input type="number" min="0" placeholder="0" value={form.quantity} onChange={set('quantity')}
            style={errors.quantity ? { borderColor:'var(--red)' } : {}} />
          <ErrMsg field="quantity" />
        </div>
        <div className="field">
          <label>Selling Price (₹) *</label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set('price')}
            style={errors.price ? { borderColor:'var(--red)' } : {}} />
          <ErrMsg field="price" />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Cost Price (₹)</label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice} onChange={set('costPrice')} />
        </div>
        <div className="field">
          <label>SKU</label>
          <input type="text" placeholder="e.g. WKB-001" value={form.sku} onChange={set('sku')} />
        </div>
      </div>

      <div className="field">
        <label>Reorder Level</label>
        <input type="number" min="0" placeholder="10" value={form.reorderLevel} onChange={set('reorderLevel')} />
        <div style={{ color:'var(--muted)', fontSize:11, marginTop:2 }}>Alert triggers when quantity ≤ this number</div>
      </div>

      <div className="field">
        <label>Description</label>
        <textarea placeholder="Optional description…" value={form.description} onChange={set('description')} rows={3} />
      </div>
    </Modal>
  )
}
