import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Absen from './pages/Absen'
import Pengajuan from './pages/Pengajuan'
import Approval from './pages/Approval'
import Lainnya from './pages/Lainnya'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/absen" replace />} />
            <Route path="/absen" element={<Absen />} />
            <Route path="/pengajuan" element={<Pengajuan />} />
            <Route path="/approval" element={<Approval />} />
            <Route path="/lainnya" element={<Lainnya />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
