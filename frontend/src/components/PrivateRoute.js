import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se o usuário deve mudar a senha (exceto na própria página de alteração)
  if (currentUser?.mustChangePassword && location.pathname !== '/alterar-senha-obrigatoria') {
    return <Navigate to="/alterar-senha-obrigatoria" replace />;
  }

  // Se não há roles especificadas, permitir qualquer usuário autenticado
  if (allowedRoles.length === 0) {
    return children;
  }

  // Verificar se o usuário tem uma das roles permitidas
  const hasPermission = allowedRoles.includes(currentUser?.role);

  if (!hasPermission) {
    // Redirecionar para dashboard apropriado se não tiver permissão
    const dashboardRoute = currentUser?.role === 'fornecedor' 
      ? '/dashboard-fornecedor' 
      : '/dashboard';
    return <Navigate to={dashboardRoute} replace />;
  }

  return children;
};

export default PrivateRoute;
