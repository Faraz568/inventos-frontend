import { DEMO_MODE } from './axiosInstance'
import api from './axiosInstance'
import { adjustMockProductQty } from './productApi'

export let mockPurchases = [
  { id:1, productId:2, productName:'USB-C Hub 7-in-1',  categoryName:'Electronics', supplierName:'TechMart India',     quantity:20, unitCost:850,  totalCost:17000, note:'Restocking order',       purchasedAt:'2024-03-01T10:00:00', status:'received' },
  { id:2, productId:4, productName:'Notebook A4 10pk',  categoryName:'Stationery',  supplierName:'Office Supplies Co', quantity:100,unitCost:72,   totalCost:7200,  note:'Low stock reorder',      purchasedAt:'2024-03-05T14:30:00', status:'received' },
  { id:3, productId:7, productName:'Gel Pens 12pk',     categoryName:'Stationery',  supplierName:'Office Supplies Co', quantity:50, unitCost:50,   totalCost:2500,  note:'',                       purchasedAt:'2024-03-10T09:15:00', status:'received' },
  { id:4, productId:6, productName:'Webcam 1080p',      categoryName:'Electronics', supplierName:'TechMart India',     quantity:15, unitCost:2100, totalCost:31500, note:'Bulk purchase discount',  purchasedAt:'2024-03-12T11:00:00', status:'received' },
  { id:5, productId:8, productName:'Monitor 24 Inch',   categoryName:'Electronics', supplierName:'Display World',      quantity:5,  unitCost:10500,totalCost:52500, note:'New stock arrival',       purchasedAt:'2024-03-14T16:45:00', status:'pending'  },
]
let nextPurchaseId = 6
const delay = () => new Promise(r => setTimeout(r, 300))

export const getPurchases = async () => {
  if (DEMO_MODE) { await delay(); return [...mockPurchases].sort((a,b)=>new Date(b.purchasedAt)-new Date(a.purchasedAt)) }
  const { data } = await api.get('/purchases'); return data.data
}

export const createPurchase = async (payload) => {
  if (DEMO_MODE) {
    await delay()
    const status = payload.status || 'received'
    const purchase = {
      ...payload,
      id: nextPurchaseId++,
      totalCost: payload.quantity * payload.unitCost,
      purchasedAt: new Date().toISOString(),
      status,
    }
    mockPurchases.unshift(purchase)
    window.dispatchEvent(new Event('inv_data_update'))
    
    if (status === 'received') {
      adjustMockProductQty(payload.productId, +payload.quantity)
    }
    return purchase
  }
  const { data } = await api.post('/purchases', payload); return data.data
}

export const updatePurchase = async (id, payload) => {
  if (DEMO_MODE) {
    await delay()
    const idx = mockPurchases.findIndex(p => p.id === id)
    if (idx !== -1) {
      const old = mockPurchases[idx]
      
      if (old.status === 'received') adjustMockProductQty(old.productId, -old.quantity)
      
      const newStatus = payload.status || old.status
      if (newStatus === 'received') adjustMockProductQty(payload.productId, +payload.quantity)
      mockPurchases[idx] = { ...old, ...payload, totalCost: payload.quantity * payload.unitCost }
    window.dispatchEvent(new Event('inv_data_update'))
      return mockPurchases[idx]
    }
  }
  const { data } = await api.put(`/purchases/${id}`, payload); return data.data
}

export const deletePurchase = async (id) => {
  if (DEMO_MODE) {
    await delay()
    const p = mockPurchases.find(p => p.id === id)
    if (p && p.status === 'received') adjustMockProductQty(p.productId, -p.quantity)
    mockPurchases = mockPurchases.filter(p => p.id !== id)
    window.dispatchEvent(new Event('inv_data_update'))
    return { success:true }
  }
  const { data } = await api.delete(`/purchases/${id}`); return data
}

export const getPurchaseStats = () => {
  const total      = mockPurchases.length
  const totalSpent = mockPurchases.reduce((s,p) => s + p.totalCost, 0)
  const received   = mockPurchases.filter(p => p.status === 'received').length
  const pending    = mockPurchases.filter(p => p.status === 'pending').length
  
  const byCat = {}
  mockPurchases.forEach(p => {
    if (!byCat[p.categoryName]) byCat[p.categoryName] = { count:0, total:0 }
    byCat[p.categoryName].count += 1
    byCat[p.categoryName].total += p.totalCost
  })
  
  const byMonth = {}
  mockPurchases.forEach(p => {
    const m = p.purchasedAt.slice(0,7)
    if (!byMonth[m]) byMonth[m] = 0
    byMonth[m] += p.totalCost
  })
  return { total, totalSpent, received, pending, byCat, byMonth }
}
