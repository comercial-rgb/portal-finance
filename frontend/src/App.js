import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Dashboard from './pages/Dashboard';
import DashboardFornecedor from './pages/DashboardFornecedor';
import DashboardCliente from './pages/DashboardCliente';
import Perfil from './pages/Perfil';
import PerfilAdmin from './pages/PerfilAdmin';
import PerfilFornecedor from './pages/PerfilFornecedor';
import PerfilFornecedorUsuario from './pages/PerfilFornecedorUsuario';
import PerfilClienteUsuario from './pages/PerfilClienteUsuario';
import Fornecedores from './pages/Fornecedores';
import Clientes from './pages/Clientes';
import ClienteForm from './pages/ClienteForm';
import TipoServicos from './pages/TipoServicos';
import OrdensServico from './pages/OrdensServico';
import OrdemServicoForm from './pages/OrdemServicoForm';
import FaturasFornecedores from './pages/FaturasFornecedores';
import FaturasClientes from './pages/FaturasClientes';
import Faturados from './pages/Faturados';
import FaturadoDetalhes from './pages/FaturadoDetalhes';
import Configuracoes from './pages/Configuracoes';
import Usuarios from './pages/Usuarios';
import ImpostosRetencoes from './pages/ImpostosRetencoes';
import Relatorios from './pages/Relatorios';
import RelatoriosCliente from './pages/RelatoriosCliente';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha/:token" element={<RedefinirSenha />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard-fornecedor"
          element={
            <PrivateRoute>
              <DashboardFornecedor />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard-cliente"
          element={
            <PrivateRoute>
              <DashboardCliente />
            </PrivateRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          }
        />
        <Route
          path="/perfil-fornecedor-usuario"
          element={
            <PrivateRoute>
              <PerfilFornecedorUsuario />
            </PrivateRoute>
          }
        />
        <Route
          path="/perfil-cliente-usuario"
          element={
            <PrivateRoute>
              <PerfilClienteUsuario />
            </PrivateRoute>
          }
        />
        <Route
          path="/perfil-admin"
          element={
            <PrivateRoute>
              <PerfilAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/perfil-fornecedor"
          element={
            <PrivateRoute>
              <PerfilFornecedor />
            </PrivateRoute>
          }
        />
        <Route
          path="/fornecedores"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin', 'gerente', 'funcionario']}>
              <Fornecedores />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin', 'gerente', 'funcionario']}>
              <Clientes />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes/novo"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin', 'gerente', 'funcionario']}>
              <ClienteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes/:id"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin', 'gerente', 'funcionario']}>
              <ClienteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/tipo-servicos"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin', 'gerente', 'funcionario']}>
              <TipoServicos />
            </PrivateRoute>
          }
        />
        <Route
          path="/ordens-servico"
          element={
            <PrivateRoute>
              <OrdensServico />
            </PrivateRoute>
          }
        />
        <Route
          path="/ordens-servico/novo"
          element={
            <PrivateRoute>
              <OrdemServicoForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/ordens-servico/editar/:id"
          element={
            <PrivateRoute>
              <OrdemServicoForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/ordens-servico/:id"
          element={
            <PrivateRoute>
              <OrdemServicoForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/faturas-fornecedores"
          element={
            <PrivateRoute>
              <FaturasFornecedores />
            </PrivateRoute>
          }
        />
        <Route
          path="/faturas-clientes"
          element={
            <PrivateRoute>
              <FaturasClientes />
            </PrivateRoute>
          }
        />
        <Route
          path="/faturados"
          element={
            <PrivateRoute>
              <Faturados />
            </PrivateRoute>
          }
        />
        <Route
          path="/faturados/editar/:id"
          element={
            <PrivateRoute>
              <FaturadoDetalhes />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin']}>
              <Configuracoes />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin']}>
              <Usuarios />
            </PrivateRoute>
          }
        />
        <Route
          path="/impostos-retencoes"
          element={
            <PrivateRoute>
              <ImpostosRetencoes />
            </PrivateRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <PrivateRoute allowedRoles={['super_admin', 'admin', 'gerente', 'cliente']}>
              <Relatorios />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
