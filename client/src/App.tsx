// Page map. Everything except /login sits behind <RequireAuth>.
import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { InquiryDetailPage } from './pages/InquiryDetailPage'
import { InquiryListPage } from './pages/InquiryListPage'
import { LoginPage } from './pages/LoginPage'
import { NewInquiryPage } from './pages/NewInquiryPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/inquiries" replace />} />
          <Route path="inquiries" element={<InquiryListPage />} />
          <Route path="inquiries/new" element={<NewInquiryPage />} />
          <Route path="inquiries/:id" element={<InquiryDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
