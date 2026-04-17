import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import './Index.css';
import AuthLayout from './layouts/AuthLayout.tsx';
import RequireAdmin from './routes/RequireAdmin.tsx';
import AdminLayout from './layouts/AdminLayout.tsx';
import Fallback from './components/Fallback.tsx';

const NotFound = lazy(() => import('./NotFound.tsx'));
const NotAuthorised = lazy(() => import('./NotAuthorised.tsx'));
const Register = lazy(() => import('./Register.tsx'));
const LogInPage = lazy(() => import('./LogIn.tsx'));
const LoggedIn = lazy(() => import('./LoggedIn.tsx'));
const Logout = lazy(() => import('./Logout.tsx'));
const AdminHome = lazy(() => import('./AdminHome.tsx'));
const AdminUsers = lazy(() => import('./AdminUsers.tsx'));
const AdminClientApps = lazy(() => import('./AdminClientApps.tsx'));
const ForgottenPassword = lazy(() => import('./ForgottenPassword.tsx'));
const ForgottenPasswordConfirm = lazy(
  () => import('./ForgottenPasswordConfirm.tsx'),
);
const ResetPassword = lazy(() => import('./ResetPassword.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LogInPage />} />
            <Route path="/loggedin" element={<LoggedIn />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgottenpassword" element={<ForgottenPassword />} />
            <Route
              path="/forgottenpasswordconfirm"
              element={<ForgottenPasswordConfirm />}
            />
            <Route path="/resetpassword" element={<ResetPassword />} />
            <Route path="/notauthorised" element={<NotAuthorised />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminHome />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/clientapps" element={<AdminClientApps />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
