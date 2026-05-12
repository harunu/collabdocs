import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './components/auth/AuthPage';
import { AuthGuard } from './components/auth/AuthGuard';
import { WorkspacePage } from './pages/WorkspacePage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/workspace"
          element={
            <AuthGuard>
              <WorkspacePage />
            </AuthGuard>
          }
        />
        <Route
          path="/workspace/:documentId"
          element={
            <AuthGuard>
              <WorkspacePage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
