import api, { DEMO_MODE } from './axiosInstance'

let mockCategories = [
  { id:1, name:'Electronics',      description:'Electronic devices and accessories', createdAt:'2024-01-01T00:00:00', productCount:4 },
  { id:2, name:'Furniture',        description:'Office and home furniture',           createdAt:'2024-01-01T00:00:00', productCount:3 },
  { id:3, name:'Stationery',       description:'Paper, pens, and office supplies',   createdAt:'2024-01-01T00:00:00', productCount:3 },
  { id:4, name:'Clothing',         description:'Apparel and accessories',             createdAt:'2024-01-01T00:00:00', productCount:0 },
  { id:5, name:'Food & Beverages', description:'Consumable food and drink items',    createdAt:'2024-01-01T00:00:00', productCount:0 },
  { id:6, name:'Other',            description:'Miscellaneous products',              createdAt:'2024-01-01T00:00:00', productCount:0 },
]
let nextCatId = 7
const delay = () => new Promise(r => setTimeout(r, 280))

export const getCategories = async () => {
  if (DEMO_MODE) { await delay(); return [...mockCategories] }
  const { data } = await api.get('/categories'); return data.data
}

export const createCategory = async (payload) => {
  if (DEMO_MODE) {
    await delay()
    const cat = { ...payload, id: nextCatId++, createdAt: new Date().toISOString(), productCount: 0 }
    mockCategories.push(cat); return cat
  }
  const { data } = await api.post('/categories', payload); return data.data
}

export const updateCategory = async (id, payload) => {
  if (DEMO_MODE) {
    await delay()
    const idx = mockCategories.findIndex(c => c.id === id)
    if (idx !== -1) {
      mockCategories[idx] = { ...mockCategories[idx], ...payload }
      return mockCategories[idx]
    }
  }
  const { data } = await api.put(`/categories/${id}`, payload); return data.data
}

export const deleteCategory = async (id) => {
  if (DEMO_MODE) {
    await delay()
    const cat = mockCategories.find(c => c.id === id)
    if (cat && cat.productCount > 0)
      throw { response: { data: { message: `Cannot delete '${cat.name}' — it has ${cat.productCount} active product(s). Reassign or delete those products first.` } } }
    mockCategories = mockCategories.filter(c => c.id !== id)
    return { success: true }
  }
  const { data } = await api.delete(`/categories/${id}`); return data
}
