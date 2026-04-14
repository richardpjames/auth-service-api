import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import './Index.css';
import NotFound from './NotFound.tsx';
import Register from './Register.tsx';
import LogInPage from './LogIn.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="flex h-screen flex-col">
        <div className="card shadow-xl p-12 rounded-2xl text-center m-auto bg-white sm:w-xl md:w-2xl lg:w-4xl">
          <Routes>
            <Route path="/login" element={<LogInPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  </StrictMode>,
);
