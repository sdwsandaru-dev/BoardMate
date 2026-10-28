import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { Headline, Layout, RequireAuth } from './components'
import { Login, Register } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Listings from './pages/Listings'
import Notifications from './pages/Notifications'
import AdminReview from './pages/AdminReview'
import PropertyDetail from './pages/PropertyDetail'
import PropertyEditor from './pages/PropertyEditor'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="listings" element={<Listings />} />
            <Route path="properties/:id" element={<PropertyDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route element={<RequireAuth />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
            <Route element={<RequireAuth roles={['OWNER']} />}>
              <Route path="dashboard/properties/new" element={<PropertyEditor />} />
              <Route path="dashboard/properties/:id" element={<PropertyEditor />} />
            </Route>
            <Route element={<RequireAuth roles={['ADMIN']} />}>
              <Route path="dashboard/review/:id" element={<AdminReview />} />
            </Route>
            <Route
              path="*"
              element={
                <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                  <Headline lead="Page" accent="Not Found" />
                  <Link to="/" className="btn-sun mt-8">Go home</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
