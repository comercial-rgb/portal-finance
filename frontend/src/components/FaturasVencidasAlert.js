import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './FaturasVencidasAlert.css';

function FaturasVencidasAlert() {
  const [faturasVencidas, setFaturasVencidas] = useState([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    checkFaturasVencidas();
    
    // Verificar a cada 30 minutos
    const interval = setInterval(checkFaturasVencidas, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkFaturasVencidas = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Buscar faturas de cliente não pagas
      const response = await api.get('/faturas?tipo=Cliente');
      const faturas = response.data.faturas || response.data;
      
      if (!Array.isArray(faturas)) return;

      // Filtrar faturas vencidas
      const vencidas = faturas.filter(f => {
        if (!f.dataVencimento || f.statusFatura === 'Paga') return false;
        
        const dataVenc = new Date(f.dataVencimento);
        dataVenc.setHours(0, 0, 0, 0);
        
        return dataVenc < hoje;
      });

      if (vencidas.length > 0) {
        // Calcular dias de atraso
        const faturasComAtraso = vencidas.map(f => {
          const dataVenc = new Date(f.dataVencimento);
          const diasAtraso = Math.floor((hoje - dataVenc) / (1000 * 60 * 60 * 24));
          return { ...f, diasAtraso };
        });

        setFaturasVencidas(faturasComAtraso);
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Erro ao verificar faturas vencidas:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleClose = () => {
    setShowAlert(false);
    // Salvar que o usuário já viu o alerta hoje
    const hoje = new Date().toISOString().split('T')[0];
    localStorage.setItem('ultimoAlertaFaturasVencidas', hoje);
  };

  const handleDismissToday = () => {
    handleClose();
  };

  // Verificar se já mostrou alerta hoje
  const ultimoAlerta = localStorage.getItem('ultimoAlertaFaturasVencidas');
  const hoje = new Date().toISOString().split('T')[0];
  if (ultimoAlerta === hoje && showAlert) {
    setShowAlert(false);
  }

  if (!showAlert || faturasVencidas.length === 0) return null;

  return (
    <div className="faturas-vencidas-overlay">
      <div className="faturas-vencidas-alert">
        <div className="alert-header">
          <h2>⚠️ Atenção: Faturas Vencidas</h2>
          <button className="btn-close" onClick={handleClose}>×</button>
        </div>

        <div className="alert-body">
          <p className="alert-message">
            Existem {faturasVencidas.length} fatura(s) vencida(s) aguardando pagamento:
          </p>

          <div className="faturas-vencidas-list">
            {faturasVencidas.map((fatura) => (
              <div key={fatura._id} className="fatura-vencida-item">
                <div className="fatura-info">
                  <strong>{fatura.numeroFatura}</strong>
                  <span className="cliente-nome">
                    {fatura.cliente?.razaoSocial || fatura.cliente?.nomeFantasia || 'Cliente'}
                  </span>
                </div>
                <div className="fatura-valores">
                  <span className="valor-devido">{formatCurrency(fatura.valorRestante || fatura.valorDevido)}</span>
                  <span className="dias-atraso">
                    Vencida há <strong>{fatura.diasAtraso}</strong> dia(s)
                  </span>
                  <span className="data-vencimento">
                    Vencimento: {formatDate(fatura.dataVencimento)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="alert-footer">
          <button className="btn-dismiss" onClick={handleDismissToday}>
            Não mostrar hoje
          </button>
          <button className="btn-view" onClick={() => {
            window.location.href = '/faturados';
            handleClose();
          }}>
            Ver Faturas
          </button>
        </div>
      </div>
    </div>
  );
}

export default FaturasVencidasAlert;
