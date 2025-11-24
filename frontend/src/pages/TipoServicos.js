import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './TipoServicos.css';

function TipoServicos() {
  const [user, setUser] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [tiposServico, setTiposServico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalTipo, setShowModalTipo] = useState(false);
  const [showModalTipoServico, setShowModalTipoServico] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [editingTipoServico, setEditingTipoServico] = useState(null);
  const [formTipo, setFormTipo] = useState({ nome: '' });
  const [formTipoServico, setFormTipoServico] = useState({ nome: '' });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tiposRes, tiposServicoRes] = await Promise.all([
        api.get('/tipo-servicos/tipos'),
        api.get('/tipo-servicos/tipos-servico-solicitado')
      ]);
      setTipos(tiposRes.data);
      setTiposServico(tiposServicoRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ====== TIPO ======
  const handleOpenModalTipo = (tipo = null) => {
    if (tipo) {
      setEditingTipo(tipo);
      setFormTipo({ nome: tipo.nome });
    } else {
      setEditingTipo(null);
      setFormTipo({ nome: '' });
    }
    setShowModalTipo(true);
  };

  const handleCloseModalTipo = () => {
    setShowModalTipo(false);
    setEditingTipo(null);
    setFormTipo({ nome: '' });
  };

  const handleSaveTipo = async (e) => {
    e.preventDefault();
    try {
      if (editingTipo) {
        await api.put(`/tipo-servicos/tipos/${editingTipo._id}`, formTipo);
        toast.success('Tipo atualizado com sucesso!');
      } else {
        await api.post('/tipo-servicos/tipos', formTipo);
        toast.success('Tipo criado com sucesso!');
      }
      handleCloseModalTipo();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar tipo');
    }
  };

  const handleDeleteTipo = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo?')) {
      try {
        await api.delete(`/tipo-servicos/tipos/${id}`);
        toast.success('Tipo excluído com sucesso!');
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir tipo');
      }
    }
  };

  // ====== TIPO SERVIÇO SOLICITADO ======
  const handleOpenModalTipoServico = (tipo = null) => {
    if (tipo) {
      setEditingTipoServico(tipo);
      setFormTipoServico({ nome: tipo.nome });
    } else {
      setEditingTipoServico(null);
      setFormTipoServico({ nome: '' });
    }
    setShowModalTipoServico(true);
  };

  const handleCloseModalTipoServico = () => {
    setShowModalTipoServico(false);
    setEditingTipoServico(null);
    setFormTipoServico({ nome: '' });
  };

  const handleSaveTipoServico = async (e) => {
    e.preventDefault();
    try {
      if (editingTipoServico) {
        await api.put(`/tipo-servicos/tipos-servico-solicitado/${editingTipoServico._id}`, formTipoServico);
        toast.success('Tipo de serviço solicitado atualizado com sucesso!');
      } else {
        await api.post('/tipo-servicos/tipos-servico-solicitado', formTipoServico);
        toast.success('Tipo de serviço solicitado criado com sucesso!');
      }
      handleCloseModalTipoServico();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar tipo de serviço solicitado');
    }
  };

  const handleDeleteTipoServico = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de serviço solicitado?')) {
      try {
        await api.delete(`/tipo-servicos/tipos-servico-solicitado/${id}`);
        toast.success('Tipo de serviço solicitado excluído com sucesso!');
        loadData();
      } catch (error) {
        toast.error('Erro ao excluir tipo de serviço solicitado');
      }
    }
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="tipo-servicos-container">
            <div className="page-header">
              <div>
                <h1>Tipo de Serviços</h1>
                <p>Gerencie os tipos de serviços e serviços solicitados</p>
              </div>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <div className="tipo-servicos-grid">
                {/* COLUNA 1: TIPO */}
                <div className="tipo-servicos-card">
                  <div className="card-header">
                    <h2>Tipo</h2>
                    <button className="btn-add" onClick={() => handleOpenModalTipo()}>
                      + Adicionar Tipo
                    </button>
                  </div>
                  <div className="lista-container">
                    {tipos.length === 0 ? (
                      <p className="empty-message">Nenhum tipo cadastrado</p>
                    ) : (
                      <ul className="lista-items">
                        {tipos.map(tipo => (
                          <li key={tipo._id} className="lista-item">
                            <span>{tipo.nome}</span>
                            <div className="item-actions">
                              <button 
                                className="btn-icon btn-edit"
                                onClick={() => handleOpenModalTipo(tipo)}
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteTipo(tipo._id)}
                                title="Excluir"
                              >
                                🗑️
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* COLUNA 2: TIPO SERVIÇO SOLICITADO */}
                <div className="tipo-servicos-card">
                  <div className="card-header">
                    <h2>Tipo de Serviço Solicitado</h2>
                    <button className="btn-add" onClick={() => handleOpenModalTipoServico()}>
                      + Adicionar Tipo de Serviço
                    </button>
                  </div>
                  <div className="lista-container">
                    {tiposServico.length === 0 ? (
                      <p className="empty-message">Nenhum tipo de serviço cadastrado</p>
                    ) : (
                      <ul className="lista-items">
                        {tiposServico.map(tipo => (
                          <li key={tipo._id} className="lista-item">
                            <span>{tipo.nome}</span>
                            <div className="item-actions">
                              <button 
                                className="btn-icon btn-edit"
                                onClick={() => handleOpenModalTipoServico(tipo)}
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteTipoServico(tipo._id)}
                                title="Excluir"
                              >
                                🗑️
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />

      {/* MODAL TIPO */}
      {showModalTipo && (
        <div className="modal-overlay" onClick={handleCloseModalTipo}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTipo ? 'Editar Tipo' : 'Novo Tipo'}</h2>
              <button className="btn-close" onClick={handleCloseModalTipo}>×</button>
            </div>
            <form onSubmit={handleSaveTipo}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formTipo.nome}
                  onChange={(e) => setFormTipo({ nome: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModalTipo}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingTipo ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TIPO SERVIÇO SOLICITADO */}
      {showModalTipoServico && (
        <div className="modal-overlay" onClick={handleCloseModalTipoServico}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTipoServico ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}</h2>
              <button className="btn-close" onClick={handleCloseModalTipoServico}>×</button>
            </div>
            <form onSubmit={handleSaveTipoServico}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formTipoServico.nome}
                  onChange={(e) => setFormTipoServico({ nome: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModalTipoServico}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingTipoServico ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TipoServicos;
