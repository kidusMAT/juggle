import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function ProtectedRoute({ children }) {
  const { authStatus } = useAuth();
  const location = useLocation();

  if (authStatus === 'loading') return <div className="page-loading">Loading workspace...</div>;
  if (authStatus !== 'authenticated') {
    return <Navigate to="/account" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function GuestRoute({ children }) {
  const { authStatus } = useAuth();
  if (authStatus === 'loading') return <div className="page-loading">Loading workspace...</div>;
  return authStatus === 'authenticated' ? <Navigate to="/shop" replace /> : children;
}
