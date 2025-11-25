import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ user }) => {
  const location = useLocation();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente', 'funcionario', 'fornecedor']
    },
    {
      name: 'Dashboard Cliente',
      path: '/dashboard-cliente',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
      roles: ['cliente']
    },
    {
      name: 'Fornecedores',
      path: '/fornecedores',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente']
    },
    {
      name: 'Clientes',
      path: '/clientes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente']
    },
    {
      name: 'Tipo de Serviços',
      path: '/tipo-servicos',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente']
    },
    {
      name: 'Ordens de Serviço',
      path: '/ordens-servico',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente', 'funcionario', 'fornecedor', 'cliente']
    },
    {
      name: 'Faturas Fornecedores',
      path: '/faturas-fornecedores',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente', 'funcionario', 'fornecedor']
    },
    {
      name: 'Faturas Clientes',
      path: '/faturas-clientes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente', 'funcionario', 'cliente']
    },
    {
      name: 'Faturados',
      path: '/faturados',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente', 'funcionario', 'fornecedor', 'cliente']
    },
    {
      name: 'Impostos & Retenções',
      path: '/impostos-retencoes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Relatórios',
      path: '/relatorios',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      roles: ['super_admin', 'admin', 'gerente', 'cliente']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-section-title">Menu Principal</h3>
          <ul className="nav-list">
            {filteredMenuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.name}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {user?.role === 'fornecedor' && (
          <div className="nav-section">
            <h3 className="nav-section-title">Minha Conta</h3>
            <ul className="nav-list">
              <li>
                <Link
                  to="/perfil-fornecedor-usuario"
                  className={`nav-item ${location.pathname === '/perfil-fornecedor-usuario' ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <span className="nav-text">Meu Perfil</span>
                </Link>
              </li>
            </ul>
          </div>
        )}

        {user?.role === 'cliente' && (
          <div className="nav-section">
            <h3 className="nav-section-title">Minha Conta</h3>
            <ul className="nav-list">
              <li>
                <Link
                  to="/perfil-cliente-usuario"
                  className={`nav-item ${location.pathname === '/perfil-cliente-usuario' ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <span className="nav-text">Meu Perfil</span>
                </Link>
              </li>
            </ul>
          </div>
        )}

        {(user?.role === 'super_admin' || user?.role === 'admin') && (
          <div className="nav-section">
            <h3 className="nav-section-title">Administração</h3>
            <ul className="nav-list">
              <li>
                <Link
                  to="/usuarios"
                  className={`nav-item ${location.pathname === '/usuarios' ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </span>
                  <span className="nav-text">Usuários</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/configuracoes"
                  className={`nav-item ${location.pathname === '/configuracoes' ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6m-8-8h6m6 0h6"/>
                    </svg>
                  </span>
                  <span className="nav-text">Configurações</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span className="status-text">Sistema Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
