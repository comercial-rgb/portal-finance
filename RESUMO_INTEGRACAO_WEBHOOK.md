# Resumo da Integração Webhook - Sistema de Frotas

## ✅ O que foi implementado

### 1. **Backend - Webhook Controller** 
📁 `backend/controllers/webhookFrotaController.js`
- Recebe OS do sistema de frotas via POST
- Busca ou cria automaticamente Cliente, Fornecedor, Tipos
- Calcula valores com desconto automaticamente
- Protege contra duplicação (por código da OS)
- Logs detalhados de toda operação

### 2. **Backend - Rotas Protegidas**
📁 `backend/routes/webhookFrotaRoutes.js`
- `GET /api/webhook/frota/teste` - Health check (público)
- `POST /api/webhook/frota/receber-os` - Receber OS (protegido por token)
- Middleware de validação de token secreto

### 3. **Integração no Servidor**
📁 `backend/server.js`
- Rota registrada: `/api/webhook/frota`
- Sem rate limiting agressivo (para não bloquear integrações)

### 4. **Script de Teste Automatizado**
📁 `backend/scripts/testeWebhookFrota.js`
- Testa 5 cenários:
  - ✅ Conexão com o webhook
  - ✅ Rejeição de token inválido
  - ✅ Criação de OS completa
  - ✅ Proteção contra duplicação
  - ✅ Validação de campos obrigatórios

### 5. **Documentação Completa**
📁 `INTEGRACAO_WEBHOOK_FROTA.md`
- Explicação detalhada do endpoint
- Mapeamento completo de campos
- Exemplos em Node.js e Python
- Guia de troubleshooting
- Checklist de implementação

### 6. **Configuração**
📁 `.env.example` e `README.md` atualizados
- Variável `WEBHOOK_FROTA_TOKEN` adicionada
- Documentação de como gerar token seguro
- Seção de integração no README

---

## 🔧 Como Usar

### 1️⃣ Configurar Token no Backend

No servidor do Portal Finance, adicione ao `.env`:

```bash
WEBHOOK_FROTA_TOKEN=WbHk_Fr0t4_2026_prt4l-f1n4nc3-xYz123
```

> 💡 **Dica**: Gere um token seguro com:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 2️⃣ Testar Localmente

```bash
# Certifique-se de que o backend está rodando
npm start

# Em outro terminal, execute o teste
node backend/scripts/testeWebhookFrota.js
```

Saída esperada:
```
═══════════════════════════════════════════════════════
    TESTE DE WEBHOOK - INTEGRAÇÃO SISTEMA DE FROTAS
═══════════════════════════════════════════════════════

✅ Conexão:                  PASSOU
✅ Token Inválido:           PASSOU
✅ Criação de OS:            PASSOU
✅ Proteção Duplicação:      PASSOU
✅ Validação Campos:         PASSOU

📊 Resultado: 5/5 testes passaram (100%)
🎉 Todos os testes passaram! Webhook funcionando corretamente.
```

### 3️⃣ Integrar no Sistema de Frotas

No sistema de frotas, quando uma OS for **Autorizada**, envie:

```javascript
// Exemplo Node.js
const axios = require('axios');

async function notificarPortalFinance(os) {
  await axios.post(
    'https://portal-finance-api.onrender.com/api/webhook/frota/receber-os',
    {
      codigo: os.id,
      dataReferencia: os.historic.find(h => h.status === 'Autorizada').data,
      clienteNomeFantasia: os.users_client.nomeFantasia,
      fornecedorNomeFantasia: os.users_provider.nomeFantasia,
      tipoServicoSolicitado: os.tipoServico,
      tipo: os.tipo,
      centroCusto: os.centroCusto,
      subunidade: os.subunidade || os.placa,
      valorPecasSemDesconto: os.totalPecas,
      valorServicoSemDesconto: os.totalServicos,
      descontoPercentual: os.desconto,
      notaFiscalPeca: os.nfPeca,
      notaFiscalServico: os.nfServico
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Token': 'WbHk_Fr0t4_2026_prt4l-f1n4nc3-xYz123'
      }
    }
  );
}
```

---

## 📊 Mapeamento de Campos

| Portal Finance              | Sistema Frotas                    |
|-----------------------------|-----------------------------------|
| `codigo`                    | Código/ID da OS                   |
| `dataReferencia`            | Data do `show_historic`           |
| `clienteNomeFantasia`       | `users_client -> Nome fantasia`   |
| `fornecedorNomeFantasia`    | `users_provider -> Nome fantasia` |
| `tipoServicoSolicitado`     | Tipo de serviço                   |
| `tipo`                      | Tipo                              |
| `centroCusto`               | Centro de Custo                   |
| `subunidade`                | Subunidade / Placa                |
| `valorPecasSemDesconto`     | Total de peças sem desconto       |
| `valorServicoSemDesconto`   | Total de serviço sem desconto     |
| `descontoPercentual`        | Percentual de desconto            |
| `valorPecasComDesconto`     | Total de peças com desconto       |
| `valorServicoComDesconto`   | Total de serviço com desconto     |
| `notaFiscalPeca`            | Nº da nota fiscal (peças)         |
| `notaFiscalServico`         | Nº da nota fiscal (serviços)      |
| **Status**                  | **Sempre "Autorizada"**           |

---

## 🔒 Segurança

✅ **Token Secreto**: Toda requisição precisa enviar o header `X-Webhook-Token`  
✅ **Validação**: Campos obrigatórios são verificados  
✅ **Duplicação**: Não cria OS duplicadas (verifica por código)  
✅ **Logs**: Todas as tentativas são registradas no backend  
✅ **Erro Handling**: Respostas claras para debugging  

---

## 🚨 Comportamento Automático

### ✨ Criação Automática de Entidades

Se Cliente, Fornecedor ou Tipos **não existirem**, o sistema **cria automaticamente**:

- **Cliente/Fornecedor**: Usa Nome Fantasia, gera CNPJ temporário
- **Tipos**: Cria com nome recebido

> ⚠️ **IMPORTANTE**: Após criação automática, é necessário **atualizar manualmente** os dados cadastrais completos (CNPJ real, endereço, etc) no Portal Finance.

### 🧮 Cálculo Automático

Se `valorPecasComDesconto` ou `valorServicoComDesconto` não forem enviados:

```
valorComDesconto = valorSemDesconto × (1 - descontoPercentual/100)
valorFinal = valorPecasComDesconto + valorServicoComDesconto
```

---

## 📝 Próximos Passos

### No Portal Finance ✅
- [x] Controller do webhook criado
- [x] Rotas configuradas
- [x] Autenticação por token
- [x] Busca/criação automática
- [x] Proteção contra duplicação
- [x] Script de teste
- [x] Documentação completa
- [x] Commit e push para produção

### No Sistema de Frotas 🔲
- [ ] Configurar token compartilhado
- [ ] Implementar chamada ao webhook
- [ ] Adicionar gatilho quando OS for Autorizada
- [ ] Implementar retry em caso de falha
- [ ] Adicionar logging
- [ ] Testar em homologação
- [ ] Deploy em produção

---

## 🎯 Endpoints em Produção

```
Teste:    GET  https://portal-finance-api.onrender.com/api/webhook/frota/teste
Webhook:  POST https://portal-finance-api.onrender.com/api/webhook/frota/receber-os
```

---

## 📞 Suporte

Problemas na integração? Verifique:

1. ✅ Token está correto no header `X-Webhook-Token`
2. ✅ URL do endpoint está correta
3. ✅ Campos obrigatórios estão sendo enviados (codigo, clienteNomeFantasia, fornecedorNomeFantasia, etc)
4. ✅ Formato JSON está correto
5. ✅ Backend do Portal Finance está online

**Logs**: Verifique o console do backend para detalhes de erros.

---

**Data de Criação**: 30/01/2026  
**Versão**: 1.0  
**Status**: ✅ Implementado e Testado
