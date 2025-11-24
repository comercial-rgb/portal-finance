import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import notificacaoService from '../services/notificacaoService';
import './Header.css';

const Header = ({ user, onSearch, showBackButton = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Verificar se usuário é admin para mostrar notificações
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Carregar notificações
  useEffect(() => {
    if (isAdmin) {
      carregarNotificacoes();
      // Atualizar a cada 30 segundos
      const interval = setInterval(carregarNotificacoes, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const carregarNotificacoes = async () => {
    try {
      const count = await notificacaoService.contarNaoLidas();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar contador de notificações:', error);
    }
  };

  const carregarListaNotificacoes = async () => {
    if (loadingNotifications) return;
    
    setLoadingNotifications(true);
    try {
      const data = await notificacaoService.listar();
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao carregar lista de notificações:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async (notificacao) => {
    try {
      if (!notificacao.lida) {
        await notificacaoService.marcarComoLida(notificacao._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n._id === notificacao._id ? { ...n, lida: true } : n)
        );
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await notificacaoService.marcarTodasComoLidas();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      carregarListaNotificacoes();
    }
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const formatarDataNotificacao = (data) => {
    const agora = new Date();
    const dataNotif = new Date(data);
    const diffMs = agora - dataNotif;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    
    const diffHoras = Math.floor(diffMins / 60);
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    
    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias atrás`;
    
    return dataNotif.toLocaleDateString('pt-BR');
  };

  // Detectar se deve mostrar botão voltar automaticamente
  const shouldShowBack = showBackButton || (
    location.pathname !== '/dashboard' && 
    location.pathname !== '/login'
  );

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {shouldShowBack && (
            <button className="btn-back" onClick={handleBack} title="Voltar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div className="logo-header">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="#667eea" />
              <text x="50" y="65" fontSize="48" fontWeight="bold" fill="white" textAnchor="middle">IS</text>
            </svg>
            <div className="logo-text">
              <h1>InstaSolutions</h1>
              <span>Sistema Financeiro</span>
            </div>
          </div>
        </div>

        <div className="header-center">
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </form>
        </div>

        <div className="header-right">
          {isAdmin && (
            <div className="notifications-menu">
              <button 
                className="notifications-button"
                onClick={toggleNotifications}
                title="Notificações"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notificações</h3>
                    {unreadCount > 0 && (
                      <button 
                        className="mark-all-read"
                        onClick={handleMarcarTodasLidas}
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="notifications-list">
                    {loadingNotifications ? (
                      <div className="notification-loading">Carregando...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <p>Nenhuma notificação</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif._id}
                          className={`notification-item ${!notif.lida ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="notification-icon">
                            {notif.tipo === 'perfil_fornecedor_atualizado' || notif.tipo === 'perfil_cliente_atualizado' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            ) : notif.tipo === 'fatura_vencida' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                              </svg>
                            )}
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notif.titulo}</div>
                            <div className="notification-message">{notif.mensagem}</div>
                            
                            {/* Mostrar detalhes das alterações se existirem */}
                            {notif.alteracoes && Object.keys(notif.alteracoes).length > 0 && (
                              <div className="notification-changes">
                                {Object.entries(notif.alteracoes).slice(0, 3).map(([campo, valor]) => {
                                  // Fatura vencida tem formato diferente
                                  if (notif.tipo === 'fatura_vencida') {
                                    return null;
                                  }
                                  
                                  return (
                                    <div key={campo} className="change-item">
                                      <strong>{campo}:</strong> {valor.anterior || '(vazio)'} → {valor.novo}
                                    </div>
                                  );
                                })}
                                {Object.keys(notif.alteracoes).length > 3 && (
                                  <div className="change-more">+{Object.keys(notif.alteracoes).length - 3} mais</div>
                                )}
                              </div>
                            )}
                            
                            <div className="notification-time">
                              {formatarDataNotificacao(notif.createdAt)}
                            </div>
                          </div>
                          {!notif.lida && <span className="notification-dot"></span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="user-info">
            <span className="welcome-text">Bem-vindo(a),</span>
            <span className="user-name">{user?.nome?.split(' ')[0]}</span>
          </div>
          <div className="profile-menu">
            <button 
              className="profile-button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
            >
              <div className="avatar">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <p className="dropdown-name">{user?.nome}</p>
                  <p className="dropdown-email">{user?.email}</p>
                  <p className="dropdown-role">{user?.role === 'super_admin' ? 'Super Administrador' : user?.role === 'admin' ? 'Administrador' : user?.role}</p>
                </div>
                <div className="dropdown-divider"></div>
                <button onClick={() => { navigate('/perfil'); setShowProfileMenu(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Meu Perfil
                </button>
                <button onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
