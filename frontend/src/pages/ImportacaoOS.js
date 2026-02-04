import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './ImportacaoOS.css';

function ImportacaoOS() {
  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);

  // Template CSV para download
  const downloadTemplate = () => {
    const template = [
      'N° Ordem de Serviço *,Data de Referência *,Cliente *,Fornecedor *,Tipo de Serviço Solicitado *,Tipo *,Centro de Custo *,Subunidade,Placa,Veículo,Valor Peças (R$),Valor Serviço (R$),N° Nota Fiscal Peça,N° Nota Fiscal Serviço',
      'OS/2024/001,2024-01-15,Cliente ABC Ltda,Fornecedor XYZ,Manutenção Preventiva,Peças e Serviços,Frota Leve,Região Sul,ABC-1234,Fiat Strada 2020,1000.00,500.00,NFe-12345,NFe-12346',
      'OS/2024/002,2024-01-20,Cliente ABC Ltda,Fornecedor XYZ,Manutenção Corretiva,Peças,Frota Pesada,,DEF-5678,Mercedes Actros 2019,2500.00,0,NFe-12347,'
    ].join('\n');

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_importacao_os.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.info('📥 Template baixado com sucesso!');
  };

  // Processar arquivo CSV
  const processarCSV = (texto) => {
    const linhas = texto.split('\n').filter(linha => linha.trim());
    const headers = linhas[0].split(',').map(h => h.trim());
    
    const ordensServico = [];
    
    for (let i = 1; i < linhas.length; i++) {
      const valores = linhas[i].split(',').map(v => v.trim());
      
      if (valores.length < 7) continue; // Pular linhas vazias ou incompletas
      
      const os = {
        numeroOrdemServico: valores[0],
        dataReferencia: valores[1],
        clienteNome: valores[2],
        fornecedorNome: valores[3],
        tipoServicoSolicitado: valores[4],
        tipo: valores[5],
        centroCusto: valores[6],
        subunidade: valores[7] || '',
        placa: valores[8] || '',
        veiculo: valores[9] || '',
        valorPecas: valores[10] || '0',
        valorServico: valores[11] || '0',
        notaFiscalPeca: valores[12] || '',
        notaFiscalServico: valores[13] || ''
      };
      
      ordensServico.push(os);
    }
    
    return ordensServico;
  };

  // Fazer upload e importar
  const handleImportar = async () => {
    if (!arquivo) {
      toast.error('Selecione um arquivo CSV para importar');
      return;
    }

    setLoading(true);
    setResultados(null);

    try {
      const texto = await arquivo.text();
      const ordensServico = processarCSV(texto);

      if (ordensServico.length === 0) {
        toast.error('Nenhuma OS válida encontrada no arquivo');
        setLoading(false);
        return;
      }

      console.log('📦 Enviando para importação:', ordensServico.length, 'OS');

      const response = await api.post('/api/importacao/ordens-servico', {
        ordensServico
      });

      setResultados(response.data.resultados);
      
      if (response.data.resultados.erros.length === 0) {
        toast.success(response.data.message);
      } else {
        toast.warning(response.data.message);
      }

    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error(error.response?.data?.message || 'Erro ao importar OS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="importacao-os-page">
      <Header />
      <div className="importacao-os-container">
        <Sidebar />
        <main className="importacao-os-content">
          <div className="importacao-os-header">
            <h1>📦 Importação em Lote de Ordens de Serviço</h1>
            <p>Importe múltiplas OS de uma vez usando um arquivo CSV</p>
          </div>

          <div className="importacao-card">
            <div className="importacao-instrucoes">
              <h3>📋 Instruções</h3>
              <ol>
                <li>Baixe o template CSV clicando no botão abaixo</li>
                <li>Preencha o arquivo com os dados das OS (não remova o cabeçalho)</li>
                <li>Os campos marcados com * são obrigatórios</li>
                <li>Use o formato de data YYYY-MM-DD (ex: 2024-01-15)</li>
                <li>Valores em reais use ponto como separador decimal (ex: 1000.00)</li>
                <li>O desconto será aplicado automaticamente conforme cadastro do cliente</li>
                <li>Salve o arquivo e faça upload aqui</li>
              </ol>
              
              <button 
                className="btn-download-template"
                onClick={downloadTemplate}
                type="button"
              >
                📥 Baixar Template CSV
              </button>
            </div>

            <div className="importacao-upload">
              <h3>📤 Upload do Arquivo</h3>
              
              <div className="upload-area">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setArquivo(e.target.files[0])}
                  id="arquivo-csv"
                />
                <label htmlFor="arquivo-csv" className="upload-label">
                  {arquivo ? (
                    <>
                      <span>📄 {arquivo.name}</span>
                      <small>{(arquivo.size / 1024).toFixed(2)} KB</small>
                    </>
                  ) : (
                    <>
                      <span>Clique ou arraste o arquivo CSV aqui</span>
                      <small>Apenas arquivos .csv são aceitos</small>
                    </>
                  )}
                </label>
              </div>

              <button
                className="btn-importar"
                onClick={handleImportar}
                disabled={!arquivo || loading}
              >
                {loading ? '⏳ Importando...' : '🚀 Importar OS'}
              </button>
            </div>
          </div>

          {resultados && (
            <div className="importacao-resultados">
              <h3>📊 Resultados da Importação</h3>
              
              <div className="resultados-resumo">
                <div className="resumo-card sucesso">
                  <h4>✅ Sucesso</h4>
                  <span className="numero">{resultados.sucesso.length}</span>
                </div>
                <div className="resumo-card erro">
                  <h4>❌ Erros</h4>
                  <span className="numero">{resultados.erros.length}</span>
                </div>
                <div className="resumo-card total">
                  <h4>📦 Total</h4>
                  <span className="numero">{resultados.total}</span>
                </div>
              </div>

              {resultados.sucesso.length > 0 && (
                <div className="resultados-secao">
                  <h4>✅ OS Importadas com Sucesso</h4>
                  <div className="table-responsive">
                    <table className="resultados-table">
                      <thead>
                        <tr>
                          <th>Linha</th>
                          <th>Código Gerado</th>
                          <th>N° OS</th>
                          <th>Cliente</th>
                          <th>Fornecedor</th>
                          <th>Valor Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.sucesso.map((item, index) => (
                          <tr key={index}>
                            <td>{item.linha}</td>
                            <td><strong>{item.codigo}</strong></td>
                            <td>{item.numeroOrdemServico}</td>
                            <td>{item.cliente}</td>
                            <td>{item.fornecedor}</td>
                            <td>R$ {item.valorFinal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {resultados.erros.length > 0 && (
                <div className="resultados-secao erros">
                  <h4>❌ Erros na Importação</h4>
                  <div className="table-responsive">
                    <table className="resultados-table">
                      <thead>
                        <tr>
                          <th>Linha</th>
                          <th>N° OS</th>
                          <th>Erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.erros.map((item, index) => (
                          <tr key={index}>
                            <td>{item.linha}</td>
                            <td>{item.numeroOrdemServico}</td>
                            <td className="erro-mensagem">{item.erro}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="importacao-avisos">
            <h3>⚠️ Observações Importantes</h3>
            <ul>
              <li>Cliente e Fornecedor devem estar previamente cadastrados no sistema</li>
              <li>Tipo de Serviço Solicitado e Tipo serão criados automaticamente se não existirem</li>
              <li>Centro de Custo e Subunidade serão criados automaticamente no cliente se não existirem</li>
              <li>O desconto aplicado é o cadastrado no cliente (Desconto Peças e Desconto Serviços)</li>
              <li>Todas as OS importadas terão status "Autorizada"</li>
              <li>Esta funcionalidade não afeta o webhook do sistema de frotas</li>
            </ul>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default ImportacaoOS;
