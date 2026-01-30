# 🚀 Quick Start - Integração Webhook Sistema de Frotas

## Para o Time de TI - Portal Finance

### 1. Gerar Token Seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configurar no Servidor (Render/Backend)

Adicionar variável de ambiente:
```
WEBHOOK_FROTA_TOKEN=<token-gerado-acima>
```

### 3. Testar Webhook

```bash
# Endpoint de teste (público)
curl https://portal-finance-api.onrender.com/api/webhook/frota/teste

# Deve retornar:
# {"success":true,"message":"Webhook de integração com sistema de frotas está ativo","timestamp":"..."}
```

### 4. Compartilhar com Time do Sistema de Frotas

Enviar para o time:
- **URL do webhook**: `https://portal-finance-api.onrender.com/api/webhook/frota/receber-os`
- **Token**: `<token-gerado>`
- **Documentação**: [INTEGRACAO_WEBHOOK_FROTA.md](./INTEGRACAO_WEBHOOK_FROTA.md)

---

## Para o Time de TI - Sistema de Frotas

### 1. Guardar Token Recebido

Token fornecido pelo Portal Finance: `___________________________`

### 2. Implementar Chamada ao Webhook

**Gatilho**: Quando uma OS mudar para status "Autorizada"

**Request**:
```http
POST https://portal-finance-api.onrender.com/api/webhook/frota/receber-os
Content-Type: application/json
X-Webhook-Token: <token-recebido>

{
  "codigo": "12345",
  "dataReferencia": "2026-01-30T10:00:00Z",
  "clienteNomeFantasia": "Nome do Cliente",
  "fornecedorNomeFantasia": "Nome do Fornecedor",
  "tipoServicoSolicitado": "Manutenção",
  "tipo": "Serviços",
  "centroCusto": "Centro X",
  "subunidade": "ABC-1234",
  "valorPecasSemDesconto": 1500.00,
  "valorServicoSemDesconto": 800.00,
  "descontoPercentual": 10,
  "notaFiscalPeca": "NF-001",
  "notaFiscalServico": "NF-002"
}
```

**Mapeamento de Campos**:
```javascript
{
  codigo: os.id,                              // ✅ Obrigatório
  dataReferencia: os.historic.data,           // Data da mudança para "Autorizada"
  clienteNomeFantasia: os.users_client.nomeFantasia,     // ✅ Obrigatório
  fornecedorNomeFantasia: os.users_provider.nomeFantasia, // ✅ Obrigatório
  tipoServicoSolicitado: os.tipoServico,      // ✅ Obrigatório
  tipo: os.tipo,                              // ✅ Obrigatório
  centroCusto: os.centroCusto,                // ✅ Obrigatório
  subunidade: os.subunidade || os.placa,
  placa: os.placa,
  veiculo: os.veiculo,
  valorPecasSemDesconto: os.totalPecas,
  valorServicoSemDesconto: os.totalServicos,
  descontoPercentual: os.desconto,
  valorPecasComDesconto: os.totalPecasComDesconto,
  valorServicoComDesconto: os.totalServicosComDesconto,
  notaFiscalPeca: os.nfPeca,
  notaFiscalServico: os.nfServico
}
```

### 3. Testar em Homologação

```bash
# Teste simples com curl
curl -X POST https://portal-finance-api.onrender.com/api/webhook/frota/receber-os \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: <token-recebido>" \
  -d '{
    "codigo": "TEST-001",
    "clienteNomeFantasia": "Cliente Teste",
    "fornecedorNomeFantasia": "Fornecedor Teste",
    "tipoServicoSolicitado": "Manutenção",
    "tipo": "Serviços",
    "centroCusto": "Centro Teste",
    "valorPecasSemDesconto": 100,
    "valorServicoSemDesconto": 50
  }'

# Deve retornar 201 Created com a OS criada
```

### 4. Implementar Retry (Recomendado)

```javascript
async function enviarOSComRetry(os, maxTentativas = 3) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      const response = await axios.post(...);
      console.log('✅ OS enviada:', response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Tentativa ${i+1} falhou:`, error.message);
      if (i === maxTentativas - 1) throw error;
      await sleep(2000 * (i + 1)); // Backoff exponencial
    }
  }
}
```

### 5. Monitorar Logs

Adicionar logging para debug:
```javascript
console.log('📤 Enviando OS para Portal Finance:', os.id);
console.log('✅ Sucesso - Resposta:', response.data);
console.log('❌ Erro:', error.response?.data || error.message);
```

---

## 🔍 Troubleshooting

### Erro 401/403 (Token Inválido)
```
✅ Verifique se o token está correto
✅ Confirme que está usando o header "X-Webhook-Token"
✅ Token sem espaços ou caracteres especiais
```

### Erro 400 (Dados Inválidos)
```
✅ Campos obrigatórios: codigo, clienteNomeFantasia, fornecedorNomeFantasia, tipoServicoSolicitado, tipo, centroCusto
✅ Verifique formato JSON
✅ Confira resposta detalhada: response.data.message
```

### Erro 500 (Erro Interno)
```
✅ Verifique logs do backend Portal Finance
✅ Confirme que dados estão no formato correto
✅ Entre em contato com suporte Portal Finance
```

### OS Duplicada (200 OK com flag duplicada: true)
```
✅ Comportamento esperado - OS já foi cadastrada antes
✅ Sistema protege contra duplicação automática
```

---

## 📞 Contatos

**Portal Finance TI**: _____________  
**Sistema Frotas TI**: _____________

---

## ✅ Checklist de Go-Live

### Portal Finance
- [ ] Token gerado e configurado no `.env`
- [ ] Deploy realizado no Render
- [ ] Endpoint testado manualmente
- [ ] Token compartilhado com time de Frotas

### Sistema de Frotas
- [ ] Token recebido e guardado de forma segura
- [ ] Código implementado
- [ ] Mapeamento de campos validado
- [ ] Testado em homologação
- [ ] Retry implementado
- [ ] Logs adicionados
- [ ] Monitoramento configurado
- [ ] Equipe treinada
- [ ] Documentação interna atualizada

---

**Data**: ____/____/________  
**Responsáveis**: ______________________
