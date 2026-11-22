import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './Login.tsx';
import LandingPage from './LandingPage.tsx';
import Dashboard from './Dashboard.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import { AuthProvider } from './AuthContext.tsx';
import LabBanner from './components/LabBanner.tsx';
import Register from './pages/Register.tsx';
import Forgot from './pages/Forgot.tsx';
import Reset from './pages/Reset.tsx';
import MFA from './pages/MFA.tsx';
import Profile from './pages/Profile.tsx';
import Support from './pages/Support.tsx';
import Statements from './pages/Statements.tsx';
import Files from './pages/Files.tsx';
import Admin from './pages/Admin.tsx';
import NotFound from './pages/NotFound.tsx';
import './index.css';

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <LabBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/mfa" element={<MFA />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/support" element={<Support />} />
        <Route path="/statements" element={<Statements />} />
        <Route path="/files" element={<Files />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </ErrorBoundary>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
