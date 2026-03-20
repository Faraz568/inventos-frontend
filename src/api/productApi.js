import api, { DEMO_MODE } from './axiosInstance'

const MOCK_PRODUCTS = [
  { id:1, name:'Wireless Keyboard', categoryId:1, categoryName:'Electronics', quantity:45, price:2499,  costPrice:1800, sku:'WKB-001', reorderLevel:10, description:'Mechanical wireless keyboard',     stockStatus:'IN_STOCK',     isActive:true },
  { id:2, name:'USB-C Hub 7-in-1',  categoryId:1, categoryName:'Electronics', quantity:12, price:1299,  costPrice:900,  sku:'UCH-002', reorderLevel:15, description:'7-port USB hub',                  stockStatus:'LOW_STOCK',    isActive:true },
  { id:3, name:'Ergonomic Chair',    categoryId:2, categoryName:'Furniture',   quantity:8,  price:12999, costPrice:9500, sku:'ECH-003', reorderLevel:5,  description:'Mesh lumbar support chair',       stockStatus:'IN_STOCK',     isActive:true },
  { id:4, name:'Notebook A4 10pk',   categoryId:3, categoryName:'Stationery',  quantity:0,  price:149,   costPrice:80,   sku:'NTA-004', reorderLevel:50, description:'Ruled A4 notebooks',             stockStatus:'OUT_OF_STOCK', isActive:true },
  { id:5, name:'Standing Desk',      categoryId:2, categoryName:'Furniture',   quantity:3,  price:24999, costPrice:18000,sku:'STD-005', reorderLevel:3,  description:'Height-adjustable desk',         stockStatus:'IN_STOCK',     isActive:true },
  { id:6, name:'Webcam 1080p',       categoryId:1, categoryName:'Electronics', quantity:21, price:3499,  costPrice:2200, sku:'WCM-006', reorderLevel:10, description:'Full HD autofocus webcam',       stockStatus:'IN_STOCK',     isActive:true },
  { id:7, name:'Gel Pens 12pk',      categoryId:3, categoryName:'Stationery',  quantity:9,  price:99,    costPrice:55,   sku:'GPP-007', reorderLevel:20, description:'Blue ink gel pens',              stockStatus:'LOW_STOCK',    isActive:true },
  { id:8, name:'Monitor 24 Inch',    categoryId:1, categoryName:'Electronics', quantity:5,  price:15499, costPrice:11000,sku:'MNT-008', reorderLevel:5,  description:'Full HD IPS display',           stockStatus:'IN_STOCK',     isActive:true },
  { id:9, name:'Office Desk Lamp',   categoryId:2, categoryName:'Furniture',   quantity:30, price:799,   costPrice:450,  sku:'ODL-009', reorderLevel:10, description:'LED adjustable desk lamp',       stockStatus:'IN_STOCK',     isActive:true },
  { id:10,name:'Sticky Notes 10pk',  categoryId:3, categoryName:'Stationery',  quantity:55, price:49,    costPrice:25,   sku:'SNP-010', reorderLevel:20, description:'Coloured sticky note pads',      stockStatus:'IN_STOCK',     isActive:true },
]
let mockProducts = [...MOCK_PRODUCTS]
let nextId = 11
const delay = () => new Promise(r => setTimeout(r, 280))

export const adjustMockProductQty = (productId, delta) => {
  const idx = mockProducts.findIndex(p => p.id === Number(productId))
  if (idx === -1) return
  const p = mockProducts[idx]
  const newQty = Math.max(0, (p.quantity || 0) + delta)
  mockProducts[idx] = {
    ...p,
    quantity: newQty,
    stockStatus: newQty === 0 ? 'OUT_OF_STOCK' : newQty <= p.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK',
  }
}

export const getProducts = async (params = {}) => {
  if (DEMO_MODE) {
    await delay()
    let list = mockProducts.filter(p => p.isActive)
    if (params.name)       list = list.filter(p => p.name.toLowerCase().includes(params.name.toLowerCase()) || (p.sku||'').toLowerCase().includes(params.name.toLowerCase()))
    if (params.categoryId) list = list.filter(p => p.categoryId === Number(params.categoryId))
    const sortBy = params.sortBy || 'name', sortDir = params.sortDir || 'asc'
    list.sort((a,b) => { const va=a[sortBy]??'', vb=b[sortBy]??''; return sortDir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0) })
    const page = params.page ?? 0, size = params.size ?? 20
    return { content: list.slice(page*size,(page+1)*size), totalElements:list.length, totalPages:Math.ceil(list.length/size), pageable:{pageNumber:page} }
  }
  const { data } = await api.get('/products', { params: { page:params.page??0, size:params.size??50, sortBy:params.sortBy??'name', sortDir:params.sortDir??'asc', ...(params.name?{name:params.name}:{}), ...(params.categoryId?{categoryId:params.categoryId}:{}) }})
  return data.data
}

export const getProduct = async (id) => {
  if (DEMO_MODE) { await delay(); return mockProducts.find(p=>p.id===id)||null }
  const { data } = await api.get(`/products/${id}`); return data.data
}

export const createProduct = async (payload) => {
  if (DEMO_MODE) {
    await delay()
    const catNames = {1:'Electronics',2:'Furniture',3:'Stationery',4:'Clothing',5:'Food & Beverages',6:'Other'}
    const p = { ...payload, id:nextId++, categoryName:catNames[payload.categoryId]||'Other', stockStatus:payload.quantity===0?'OUT_OF_STOCK':payload.quantity<=(payload.reorderLevel||10)?'LOW_STOCK':'IN_STOCK', isActive:true }
    mockProducts.push(p); return p
  }
  const { data } = await api.post('/products', payload); return data.data
}

export const updateProduct = async (id, payload) => {
  if (DEMO_MODE) {
    await delay()
    const catNames = {1:'Electronics',2:'Furniture',3:'Stationery',4:'Clothing',5:'Food & Beverages',6:'Other'}
    const idx = mockProducts.findIndex(p=>p.id===id)
    if (idx!==-1) { mockProducts[idx]={...mockProducts[idx],...payload,id,categoryName:catNames[payload.categoryId]||mockProducts[idx].categoryName,stockStatus:payload.quantity===0?'OUT_OF_STOCK':payload.quantity<=(payload.reorderLevel||10)?'LOW_STOCK':'IN_STOCK'}; return mockProducts[idx] }
  }
  const { data } = await api.put(`/products/${id}`, payload); return data.data
}

export const deleteProduct = async (id) => {
  if (DEMO_MODE) { await delay(); mockProducts=mockProducts.filter(p=>p.id!==id); return {success:true} }
  const { data } = await api.delete(`/products/${id}`); return data
}

export const getDashboardStats = async () => {
  if (DEMO_MODE) {
    await delay()
    const active=mockProducts.filter(p=>p.isActive)
    return { totalProducts:active.length, outOfStock:active.filter(p=>p.quantity===0).length, lowStock:active.filter(p=>p.quantity>0&&p.quantity<=p.reorderLevel).length, totalInventoryValue:active.reduce((s,p)=>s+p.price*p.quantity,0) }
  }
  const { data } = await api.get('/products/dashboard/stats'); return data.data
}

export const getLowStockProducts = async () => {
  if (DEMO_MODE) { await delay(); return mockProducts.filter(p=>p.isActive&&p.quantity<=p.reorderLevel) }
  const { data } = await api.get('/products/alerts/low-stock'); return data.data
}
