import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './context/AuthContext'
import InstallPrompt from './components/InstallPrompt'

// Public pages
import Home       from './pages/Home'
import Login      from './pages/Login'
import Register   from './pages/Register'
import AdminLogin from './pages/AdminLogin'

// Customer pages
import CustomerDashboard  from './pages/customer/Dashboard'
import CustomerLoan       from './pages/customer/Loan'
import CustomerApply      from './pages/customer/Apply'
import CustomerPayments   from './pages/customer/Payments'
import CustomerPenalties  from './pages/customer/Penalties'
import CustomerNotifications from './pages/customer/Notifications'
import CustomerProfile    from './pages/customer/Profile'

// Admin pages
import AdminDashboard  from './pages/admin/Dashboard'
import AdminCustomers  from './pages/admin/Customers'
import AdminLoans      from './pages/admin/Loans'
import AdminPayments   from './pages/admin/Payments'
import AdminPenalties  from './pages/admin/Penalties'
import AdminDocuments  from './pages/admin/Documents'
import AdminUsers      from './pages/admin/Users'
import AdminNotifications from './pages/admin/Notifications'
import AdminAuditTrail from './pages/admin/AuditTrail'

// Route guards
function RequireCustomer({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner"/></div>
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'customer') return <Navigate to="/admin" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner"/></div>
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function RedirectIfLoggedIn({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user && profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (user && profile?.role === 'customer') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <InstallPrompt />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />
          <Route path="/register" element={<RedirectIfLoggedIn><Register /></RedirectIfLoggedIn>} />
          <Route path="/admin/login" element={<RedirectIfLoggedIn><AdminLogin /></RedirectIfLoggedIn>} />

          {/* Customer */}
          <Route path="/dashboard"       element={<RequireCustomer><CustomerDashboard /></RequireCustomer>} />
          <Route path="/my-loan"         element={<RequireCustomer><CustomerLoan /></RequireCustomer>} />
          <Route path="/apply"           element={<RequireCustomer><CustomerApply /></RequireCustomer>} />
          <Route path="/payments"        element={<RequireCustomer><CustomerPayments /></RequireCustomer>} />
          <Route path="/penalties"       element={<RequireCustomer><CustomerPenalties /></RequireCustomer>} />
          <Route path="/notifications"   element={<RequireCustomer><CustomerNotifications /></RequireCustomer>} />
          <Route path="/profile"         element={<RequireCustomer><CustomerProfile /></RequireCustomer>} />

          {/* Admin */}
          <Route path="/admin"                    element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/customers"          element={<RequireAdmin><AdminCustomers /></RequireAdmin>} />
          <Route path="/admin/loans"              element={<RequireAdmin><AdminLoans /></RequireAdmin>} />
          <Route path="/admin/payments"           element={<RequireAdmin><AdminPayments /></RequireAdmin>} />
          <Route path="/admin/penalties"          element={<RequireAdmin><AdminPenalties /></RequireAdmin>} />
          <Route path="/admin/documents"          element={<RequireAdmin><AdminDocuments /></RequireAdmin>} />
          <Route path="/admin/users"              element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
          <Route path="/admin/notifications"      element={<RequireAdmin><AdminNotifications /></RequireAdmin>} />
          <Route path="/admin/audit-trail"        element={<RequireAdmin><AdminAuditTrail /></RequireAdmin>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
