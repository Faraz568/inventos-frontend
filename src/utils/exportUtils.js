const esc = v => String(v === null || v === undefined ? '' : v)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href  = url; link.setAttribute('download', filename)
  document.body.appendChild(link); link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCSV(filename, headers, rows) {
  const q = v => { const s = v===null||v===undefined?'':String(v); return (s.includes(',')||s.includes('"')||s.includes('\n'))?`"${s.replace(/"/g,'""')}"`  :s }
  const lines = [headers.map(q).join(','), ...rows.map(r=>r.map(q).join(','))]
  downloadBlob(new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8;'}), filename+'.csv')
}

export function exportExcel(filename, sheetName, headers, rows) {
  const cell = (v, isHdr=false) => {
    const val=esc(v), num=!isHdr&&val!==''&&!isNaN(val)&&val.trim()!==''
    return num?`<Cell><Data ss:Type="Number">${val}</Data></Cell>`:`<Cell${isHdr?' ss:StyleID="h"':''}><Data ss:Type="String">${val}</Data></Cell>`
  }
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1d4ed8" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="${esc(sheetName)}"><Table>
<Row>${headers.map(h=>cell(h,true)).join('')}</Row>
${rows.map(r=>`<Row>${r.map(v=>cell(v)).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`
  downloadBlob(new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8;'}), filename+'.xls')
}

const stamp = () => new Date().toISOString().slice(0,10)

export function exportProducts(products, format) {
  const h=['ID','Name','Category','Qty','Price (₹)','Cost (₹)','SKU','Reorder Level','Status','Description']
  const r=products.map(p=>[p.id,p.name,p.categoryName,p.quantity,Number(p.price),Number(p.costPrice||0),p.sku||'',p.reorderLevel,p.stockStatus||'',p.description||''])
  if(format==='csv')   exportCSV(`products_${stamp()}`,h,r)
  if(format==='excel') exportExcel(`products_${stamp()}`,'Products',h,r)
}

export function exportPurchases(purchases, format) {
  const h=['ID','Product','Category','Supplier','Qty','Unit Cost (₹)','Total (₹)','Status','Date','Notes']
  const r=purchases.map(p=>[p.id,p.productName,p.categoryName,p.supplierName,p.quantity,Number(p.unitCost),Number(p.totalCost),p.status,new Date(p.purchasedAt).toLocaleDateString('en-IN'),p.note||''])
  if(format==='csv')   exportCSV(`purchases_${stamp()}`,h,r)
  if(format==='excel') exportExcel(`purchases_${stamp()}`,'Purchases',h,r)
}

export function exportSales(sales, format) {
  const h=['ID','Product','Category','Qty','Unit Price (₹)','Total (₹)','Sold By','Date','Notes']
  const r=sales.map(s=>[s.id,s.productName,s.categoryName,s.quantity,Number(s.unitPrice),Number(s.totalPrice),s.soldBy,new Date(s.soldAt).toLocaleDateString('en-IN'),s.note||''])
  if(format==='csv')   exportCSV(`sales_${stamp()}`,h,r)
  if(format==='excel') exportExcel(`sales_${stamp()}`,'Sales',h,r)
}

export function printPurchaseOrder(purchase) {
  const fmt = n => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const date = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const stamp = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const statusColor = s => s === 'received' ? '#0f6e56' : s === 'pending' ? '#854f0b' : '#a32d2d'
  const statusBg    = s => s === 'received' ? '#e1f5ee' : s === 'pending' ? '#faeeda' : '#fcebeb'

  const poNumber = `PO-${String(purchase.id).padStart(5, '0')}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${poNumber} — Purchase Order</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 52px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 2px solid #1d4ed8;
    }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: .1em; color: #1d4ed8; }
    .brand span { color: #0d9488; }
    .brand-sub { font-size: 11px; color: #6b7280; margin-top: 3px; letter-spacing: .04em; }
    .po-title { text-align: right; }
    .po-label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #6b7280; }
    .po-number { font-size: 22px; font-weight: 700; color: #1d4ed8; margin-top: 2px; font-family: 'Courier New', monospace; }

    /* ── Meta row ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0;
      margin-bottom: 32px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .meta-cell {
      padding: 14px 18px;
      border-right: 1px solid #e5e7eb;
    }
    .meta-cell:last-child { border-right: none; }
    .meta-key { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; margin-bottom: 5px; }
    .meta-val { font-size: 14px; font-weight: 600; color: #111827; }

    /* ── Parties ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    .party-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
    }
    .party-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: .1em;
      color: #6b7280; margin-bottom: 10px; font-weight: 600;
    }
    .party-name { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #6b7280; line-height: 1.6; }

    /* ── Items table ── */
    .items-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: .1em;
      color: #6b7280; margin-bottom: 10px; font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    thead th {
      background: #1d4ed8;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      padding: 10px 14px;
      text-align: left;
      text-transform: uppercase;
    }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr:last-child { border-bottom: none; }
    tbody td {
      padding: 12px 14px;
      font-size: 13px;
      color: #374151;
      vertical-align: top;
    }
    tbody td:last-child { text-align: right; font-weight: 600; }
    .category-tag {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 4px;
      font-size: 10px;
      padding: 1px 7px;
      margin-top: 3px;
    }

    /* ── Totals ── */
    .totals {
      margin-top: 0;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
    }
    .totals-inner { min-width: 260px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 13px;
      color: #6b7280;
      border-bottom: 1px solid #f3f4f6;
    }
    .total-row.grand {
      background: #1d4ed8;
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      border-radius: 0 0 0 8px;
    }

    /* ── Notes ── */
    .notes-box {
      margin-top: 28px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #1d4ed8;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
    }
    .notes-key { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; margin-bottom: 6px; font-weight: 600; }
    .notes-val { font-size: 13px; color: #374151; line-height: 1.6; }

    /* ── Status badge ── */
    .status-badge {
      display: inline-block;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      padding: 3px 12px;
      text-transform: uppercase;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-brand { font-size: 12px; color: #9ca3af; }
    .footer-brand strong { color: #1d4ed8; }
    .sig-block { text-align: right; }
    .sig-line { border-top: 1px solid #9ca3af; width: 180px; margin-bottom: 6px; }
    .sig-label { font-size: 11px; color: #9ca3af; }

    /* ── Print styles ── */
    @media print {
      body { padding: 0; }
      .page { padding: 24px 32px; max-width: 100%; }
      @page { margin: 12mm 14mm; size: A4; }
    }
    @media screen {
      body { background: #f3f4f6; }
      .page { background: #fff; box-shadow: 0 4px 32px rgba(0,0,0,.12); margin: 32px auto; border-radius: 4px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">INVENT<span>OS</span></div>
      <div class="brand-sub">Inventory Management System</div>
    </div>
    <div class="po-title">
      <div class="po-label">Purchase Order</div>
      <div class="po-number">${poNumber}</div>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta-grid">
    <div class="meta-cell">
      <div class="meta-key">Order Date</div>
      <div class="meta-val">${date(purchase.purchasedAt)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-key">Status</div>
      <div class="meta-val">
        <span class="status-badge" style="background:${statusBg(purchase.status)};color:${statusColor(purchase.status)}">
          ${purchase.status.toUpperCase()}
        </span>
      </div>
    </div>
    <div class="meta-cell">
      <div class="meta-key">Printed On</div>
      <div class="meta-val" style="font-size:12px;font-weight:500">${stamp}</div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party-box">
      <div class="party-title">Supplier / From</div>
      <div class="party-name">${purchase.supplierName}</div>
      <div class="party-detail">Supplier</div>
    </div>
    <div class="party-box">
      <div class="party-title">Delivered To</div>
      <div class="party-name">InventOS Warehouse</div>
      <div class="party-detail">Internal Inventory Store</div>
    </div>
  </div>

  <!-- Items -->
  <div class="items-title">Order Items</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Category</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Cost</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="color:#9ca3af;font-size:11px">01</td>
        <td>
          <div style="font-weight:600;color:#111827">${purchase.productName}</div>
        </td>
        <td><span class="category-tag">${purchase.categoryName || '—'}</span></td>
        <td style="text-align:right;font-weight:600">${purchase.quantity}</td>
        <td style="text-align:right">₹${fmt(purchase.unitCost)}</td>
        <td>₹${fmt(purchase.totalCost)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-inner">
      <div class="total-row">
        <span>Subtotal</span>
        <span>₹${fmt(purchase.totalCost)}</span>
      </div>
      <div class="total-row">
        <span>Tax / GST</span>
        <span style="color:#9ca3af">—</span>
      </div>
      <div class="total-row grand">
        <span>Grand Total</span>
        <span>₹${fmt(purchase.totalCost)}</span>
      </div>
    </div>
  </div>

  ${purchase.note ? `
  <!-- Notes -->
  <div class="notes-box">
    <div class="notes-key">Notes / Remarks</div>
    <div class="notes-val">${purchase.note}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">
      Generated by <strong>InventOS</strong> &nbsp;·&nbsp; ${poNumber}
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Authorised Signature</div>
    </div>
  </div>

</div>
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=820,height=900')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
