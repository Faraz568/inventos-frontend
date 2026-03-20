import AppLayout from '../components/layout/AppLayout'

function Placeholder({ title, sub, icon }) {
  return (
    <AppLayout title={title}>
      <div className="page-header"><div className="page-title">{title}</div><div className="page-sub">{sub}</div></div>
      <div className="card" style={{ padding:56, textAlign:'center' }}>
        <div className="empty-state"><span className="empty-icon">{icon}</span><strong>Coming soon</strong><span style={{ fontSize:12 }}>{sub}</span></div>
      </div>
    </AppLayout>
  )
}

export const SalesPage   = () => <Placeholder title="Sales"   sub="Connect to Spring Boot /sales API to record transactions."     icon="◈" />
export const ReportsPage = () => <Placeholder title="Reports" sub="Use vw_daily_sales and vw_top_products database views here."    icon="⊟" />

export function NotFoundPage() {
  return (
    <div style={{ alignItems:'center', background:'var(--bg)', color:'var(--muted)', display:'flex', flexDirection:'column', gap:16, justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ color:'var(--border-lit)', fontFamily:'var(--mono)', fontSize:80, lineHeight:1 }}>404</div>
      <div style={{ color:'var(--text)', fontSize:18 }}>Page not found</div>
      <a href="/dashboard" style={{ color:'var(--blue)', fontSize:13 }}>← Back to Dashboard</a>
    </div>
  )
}
