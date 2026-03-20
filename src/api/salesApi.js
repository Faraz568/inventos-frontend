import { DEMO_MODE } from './axiosInstance'
import api from './axiosInstance'
import { adjustMockProductQty } from './productApi'

export let mockSales = [
  { id:1,  productId:1, productName:'Wireless Keyboard', categoryName:'Electronics', quantity:5,  unitPrice:2499,  totalPrice:12495, soldBy:'admin',   soldAt:'2024-03-01T11:00:00', invoiceNo:'INV-0001', customerName:'Raj Enterprises',  note:'' },
  { id:2,  productId:6, productName:'Webcam 1080p',       categoryName:'Electronics', quantity:3,  unitPrice:3499,  totalPrice:10497, soldBy:'admin',   soldAt:'2024-03-03T14:00:00', invoiceNo:'INV-0001', customerName:'Raj Enterprises',  note:'Bulk order' },
  { id:3,  productId:3, productName:'Ergonomic Chair',    categoryName:'Furniture',   quantity:2,  unitPrice:12999, totalPrice:25998, soldBy:'manager', soldAt:'2024-03-05T10:30:00', invoiceNo:'INV-0002', customerName:'Office Corp',      note:'' },
  { id:4,  productId:9, productName:'Office Desk Lamp',   categoryName:'Furniture',   quantity:10, unitPrice:799,   totalPrice:7990,  soldBy:'admin',   soldAt:'2024-03-07T16:00:00', invoiceNo:'INV-0003', customerName:'',                 note:'' },
  { id:5,  productId:1, productName:'Wireless Keyboard',  categoryName:'Electronics', quantity:8,  unitPrice:2499,  totalPrice:19992, soldBy:'john',    soldAt:'2024-03-10T09:00:00', invoiceNo:'INV-0004', customerName:'TechStart Pvt Ltd', note:'' },
  { id:6,  productId:8, productName:'Monitor 24 Inch',    categoryName:'Electronics', quantity:2,  unitPrice:15499, totalPrice:30998, soldBy:'admin',   soldAt:'2024-03-12T15:00:00', invoiceNo:'INV-0005', customerName:'Global Solutions',  note:'Corporate sale' },
  { id:7,  productId:10,productName:'Sticky Notes 10pk',  categoryName:'Stationery',  quantity:20, unitPrice:49,    totalPrice:980,   soldBy:'sarah',   soldAt:'2024-03-14T11:45:00', invoiceNo:'INV-0006', customerName:'',                 note:'' },
  { id:8,  productId:5, productName:'Standing Desk',      categoryName:'Furniture',   quantity:1,  unitPrice:24999, totalPrice:24999, soldBy:'admin',   soldAt:'2024-03-15T14:00:00', invoiceNo:'INV-0007', customerName:'Startup Hub',      note:'Special order' },
]
let nextSaleId  = 9
let nextInvNum  = 8   

const delay = () => new Promise(r => setTimeout(r, 300))

const localIso = () => {
  const d = new Date()
  const pad = n => String(n).padStart(2,'0')
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

export const getNextInvoiceNo = () => `INV-${String(nextInvNum).padStart(4,'0')}`
export const bumpInvoiceNo    = () => { nextInvNum++ }

export const getSales = async () => {
  if (DEMO_MODE) { await delay(); return [...mockSales].sort((a,b)=>new Date(b.soldAt)-new Date(a.soldAt)) }
  const { data } = await api.get('/sales'); return data.data
}

export const createSale = async (payload) => {
  if (DEMO_MODE) {
    await delay()
    const sale = {
      ...payload,
      id: nextSaleId++,
      totalPrice: payload.quantity * payload.unitPrice,
      soldAt: localIso(),
    }
    mockSales.unshift(sale)
    window.dispatchEvent(new Event('inv_data_update'))
    adjustMockProductQty(payload.productId, -payload.quantity)
    return sale
  }
  const { data } = await api.post('/sales', payload); return data.data
}

export const createInvoice = async (lines, meta) => {
  if (DEMO_MODE) {
    await delay()
    const invNo = meta.invoiceNo || getNextInvoiceNo()
    const results = []
    for (const line of lines) {
      const sale = {
        id: nextSaleId++,
        invoiceNo: invNo,
        customerName: meta.customerName || '',
        customerPhone: meta.customerPhone || '',
        productId: line.productId,
        productName: line.productName,
        categoryName: line.categoryName,
        quantity: line.qty,
        unitPrice: line.unitPrice,
        totalPrice: line.qty * line.unitPrice,
        soldBy: meta.soldBy || 'admin',
        note: meta.note || '',
        soldAt: localIso(),
      }
      mockSales.unshift(sale)
      adjustMockProductQty(line.productId, -line.qty)
      results.push(sale)
    }
    bumpInvoiceNo()
    window.dispatchEvent(new Event('inv_data_update'))
    return results
  }
  
  const now = localIso()
  const { data } = await api.post('/sales/bulk', {
    invoiceNo:       meta.invoiceNo       || '',
    customerName:    meta.customerName    || '',
    customerPhone:   meta.customerPhone   || '',
    customerAddress: meta.customerAddress || '',
    note:            meta.note            || '',
    lines: lines.map(l => ({
      productId:  Number(l.productId),    
      quantity:   Number(l.qty),
      unitPrice:  Number(l.unitPrice),
      soldAt:     now,
    })),
  })
  return data.data
}

export const deleteSale = async (id) => {
  if (DEMO_MODE) {
    await delay()
    const s = mockSales.find(s => s.id === id)
    if (s) adjustMockProductQty(s.productId, +s.quantity)
    mockSales = mockSales.filter(s => s.id !== id)
    window.dispatchEvent(new Event('inv_data_update'))
    return { success: true }
  }
  const { data } = await api.delete(`/sales/${id}`); return data
}

export const deleteInvoice = async (invoiceNo) => {
  if (DEMO_MODE) {
    await delay()
    const lines = mockSales.filter(s => s.invoiceNo === invoiceNo)
    lines.forEach(s => adjustMockProductQty(s.productId, +s.quantity))
    mockSales = mockSales.filter(s => s.invoiceNo !== invoiceNo)
    window.dispatchEvent(new Event('inv_data_update'))
    return { success: true }
  }
  
  const { data: found } = await api.get('/sales', { params: { invoiceNo } })
  const lines = found?.data || []
  await Promise.all(lines.map(s => api.delete(`/sales/${s.id}`)))
  return { success: true }
}

export const getSalesStats = () => {
  const total   = mockSales.length
  const totalRev= mockSales.reduce((s,x) => s + x.totalPrice, 0)
  const byCat={}, byMonth={}, byProduct={}
  mockSales.forEach(s => {
    if (!byCat[s.categoryName])     byCat[s.categoryName]    = { count:0, total:0 }
    byCat[s.categoryName].count    += s.quantity
    byCat[s.categoryName].total    += s.totalPrice
    const m = s.soldAt.slice(0,7)
    if (!byMonth[m]) byMonth[m]    = { revenue:0, count:0 }
    byMonth[m].revenue             += s.totalPrice
    byMonth[m].count               += 1
    if (!byProduct[s.productName])  byProduct[s.productName] = { units:0, revenue:0 }
    byProduct[s.productName].units += s.quantity
    byProduct[s.productName].revenue += s.totalPrice
  })
  return { total, totalRevenue: totalRev, byCat, byMonth, byProduct }
}
