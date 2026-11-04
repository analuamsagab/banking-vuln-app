import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import Login from './Login.tsx'
import LandingPage from './LandingPage.tsx'
import Dashboard from './Dashboard.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import './index.css'

const App = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'dashboard'>('landing');
  const [userData, setUserData] = useState<any>(null);

  const handleLoginSuccess = (data: any) => {
    setUserData(data.user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUserData(null);
    setCurrentPage('landing');
  };

  return (
    <ErrorBoundary>
      {currentPage === 'landing' && <LandingPage onLoginClick={() => setCurrentPage('login')} />}
      {currentPage === 'login' && (
        <Login 
          onBackToHome={() => setCurrentPage('landing')} 
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {currentPage === 'dashboard' && userData && (
        <Dashboard 
          user={userData} 
          onLogout={handleLogout}
        />
      )}
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
