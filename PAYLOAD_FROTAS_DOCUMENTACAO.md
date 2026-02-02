# Documentação - Payload do Sistema de Frotas

## 📋 O que o Sistema de Frotas precisa enviar para o Portal Finance

Quando uma OS é **Autorizada** no sistema de frotas, deve fazer uma requisição POST para:

**URL:** `https://portal-finance.onrender.com/api/webhook/frota/receber-os`

**Headers:**
```
X-Webhook-Token: 30bfff7ce392036b19d87dd6336c6e326d5312b943e01e3e8926c7aa22136b14
Content-Type: application/json
```

---

## 📝 Estrutura do Payload (JSON)

### ✅ Campos Obrigatórios

```json
{
  "codigo": "string",                    // ID único da OS no sistema de frotas
  "clienteNomeFantasia": "string",       // Nome fantasia do cliente (deve existir no Portal)
  "fornecedorNomeFantasia": "string",    // Nome fantasia do fornecedor (deve existir no Portal)
  "tipoServicoSolicitado": "string",     // Ex: "Manutenção Preventiva", "Corretiva"
  "tipo": "string",                      // Ex: "Peças", "Serviços", "Peças e Serviços"
  "centroCusto": "string"                // Centro de custo do cliente
}
```

### 🔧 Campos Opcionais - Informações Básicas

```json
{
  "numeroOrdemServico": "string",        // Número da OS (se diferente do código)
  "dataReferencia": "2026-02-02",        // Data de AUTORIZAÇÃO da OS (YYYY-MM-DD)
  "subunidade": "string",                // Subunidade do centro de custo
  "placa": "string",                     // Placa do veículo
  "veiculo": "string",                   // Descrição do veículo
  "observacoes": "string"                // Observações gerais
}
```

### 💰 Campos de Valores - **OPÇÃO 1: Simplificada (Recomendado)**

```json
{
  "valorTotalSemDesconto": 1000.00,      // Valor total sem desconto (R$)
  "descontoPercentual": 10,              // Desconto percentual geral (%)
  "valorFinal": 900.00                   // Valor total com desconto (R$)
}
```

### 💰 Campos de Valores - **OPÇÃO 2: Detalhada**

```json
{
  "valorPecasSemDesconto": 600.00,       // Valor de peças sem desconto (R$)
  "valorServicoSemDesconto": 400.00,     // Valor de serviços sem desconto (R$)
  "descontoPecasPerc": 8,                // Desconto em peças (%)
  "descontoServicoPerc": 12,             // Desconto em serviços (%)
  "valorPecasComDesconto": 552.00,       // Valor de peças com desconto (R$)
  "valorServicoComDesconto": 352.00,     // Valor de serviços com desconto (R$)
  "valorFinal": 904.00                   // Valor total final (R$)
}
```

> **Nota:** Se enviar ambas as opções, a simplificada terá prioridade para exibição.

### 📄 Notas Fiscais - **OPÇÃO 1: Campos Simples**

```json
{
  "notaFiscalPeca": "123456",            // Número da nota fiscal de peças
  "notaFiscalServico": "789012"          // Número da nota fiscal de serviços
}
```

### 📄 Notas Fiscais - **OPÇÃO 2: Array (Recomendado)**

```json
{
  "notasFiscais": [
    {
      "numero": "123456",
      "tipo": "Peças"                    // "Peças" ou "Serviços"
    },
    {
      "numero": "123457",
      "tipo": "Peças"
    },
    {
      "numero": "789012",
      "tipo": "Serviços"
    }
  ]
}
```

> **Nota:** Se enviar array, o sistema separará automaticamente por tipo. Múltiplas notas do mesmo tipo serão unidas com vírgula.

### 💼 Informações de Contratos e Empenhos

```json
{
  "contrato": "string",                  // Número do contrato geral (se houver)
  
  // Para Peças
  "contratoEmpenhoPecas": "string",      // Número do contrato específico para peças
  "empenhoPecas": "string",              // Número do empenho para peças
  
  // Para Serviços  
  "contratoEmpenhoServicos": "string",   // Número do contrato específico para serviços
  "empenhoServicos": "string"            // Número do empenho para serviços
}
```

---

## 📦 Exemplo Completo de Payload

```json
{
  "codigo": "OS-2024-001234",
  "numeroOrdemServico": "OS/2024/001234",
  "dataReferencia": "2026-02-02",
  "clienteNomeFantasia": "Cliente XYZ Ltda",
  "fornecedorNomeFantasia": "Oficina ABC",
  "tipoServicoSolicitado": "Manutenção Corretiva",
  "tipo": "Peças e Serviços",
  "centroCusto": "Frota Leve",
  "subunidade": "Região Sul",
  "placa": "ABC-1234",
  "veiculo": "Fiat Strada 2020",
  "contrato": "CT-2024-001",
  
  "contratoEmpenhoPecas": "CT-2024-001-A",
  "empenhoPecas": "EMP-2024-0001",
  
  "contratoEmpenhoServicos": "CT-2024-001-B",
  "empenhoServicos": "EMP-2024-0002",
  
  "valorTotalSemDesconto": 1500.00,
  "descontoPercentual": 10,
  "valorFinal": 1350.00,
  
  "notasFiscais": [
    { "numero": "NFe-12345", "tipo": "Peças" },
    { "numero": "NFe-12346", "tipo": "Serviços" }
  ],
  
  "observacoes": "OS autorizada pelo gestor em 02/02/2026"
}
```

---

## 🔄 Comportamento do Portal Finance ao Receber

### 1. **Validações Automáticas**
- ✅ Verifica se cliente existe no cadastro
- ✅ Verifica se fornecedor existe no cadastro
- ✅ Cria automaticamente Tipo de Serviço Solicitado se não existir
- ✅ Cria automaticamente Tipo se não existir
- ✅ **Cria automaticamente Centro de Custo** se não existir
- ✅ **Cria automaticamente Subunidade** se não existir

### 2. **Validação de Empenhos**
- Se `empenhoPecas` for informado:
  - Busca o empenho no cliente
  - Verifica saldo disponível
  - **Consome o saldo** automaticamente
  - Se saldo insuficiente: **APENAS AVISA** nas observações (não bloqueia)

- Se `empenhoServicos` for informado:
  - Busca o empenho no cliente
  - Verifica saldo disponível
  - **Consome o saldo** automaticamente
  - Se saldo insuficiente: **APENAS AVISA** nas observações (não bloqueia)

### 3. **Processamento de Notas Fiscais**
- Se enviar array `notasFiscais`:
  - Separa automaticamente por tipo ("Peças" ou "Serviços")
  - Múltiplas notas do mesmo tipo são unidas com vírgula
  
- Se enviar `notaFiscalPeca` e `notaFiscalServico`:
  - Usa os valores diretos

### 4. **Divergências e Avisos**
Todas as divergências são registradas no campo `observacoes` da OS criada:
- `[AUTO-CRIADO]` - Quando centro de custo ou subunidade são criados
- `[AVISO]` - Quando empenho não existe ou tem saldo insuficiente
- `[EMPENHO]` - Confirmação de consumo de saldo
- `⚠️ Divergência` - Quando nome no frotas difere do Portal

---

## ❌ Respostas de Erro

### Cliente não encontrado (404)
```json
{
  "success": false,
  "message": "Cliente \"Nome Cliente\" não encontrado no Portal Finance. Verifique o cadastro ou nome fantasia.",
  "campo": "clienteNomeFantasia"
}
```

### Fornecedor não encontrado (404)
```json
{
  "success": false,
  "message": "Fornecedor \"Nome Fornecedor\" não encontrado no Portal Finance. Verifique o cadastro ou nome fantasia.",
  "campo": "fornecedorNomeFantasia"
}
```

### Código obrigatório (400)
```json
{
  "success": false,
  "message": "Código/ID da OS é obrigatório"
}
```

### OS duplicada (200)
```json
{
  "success": true,
  "message": "OS já cadastrada anteriormente",
  "ordemServico": { ... },
  "duplicada": true
}
```

---

## ✅ Resposta de Sucesso (201)

```json
{
  "success": true,
  "message": "OS cadastrada com sucesso via webhook",
  "ordemServico": {
    "_id": "65a1234567890abcdef12345",
    "codigo": "OS-2024-001234",
    "numeroOrdemServico": "OS/2024/001234",
    "dataReferencia": "2026-02-02T00:00:00.000Z",
    "cliente": {
      "_id": "65a...",
      "razaoSocial": "Cliente XYZ Ltda",
      "nomeFantasia": "Cliente XYZ Ltda"
    },
    "fornecedor": {
      "_id": "65a...",
      "razaoSocial": "Oficina ABC Ltda",
      "nomeFantasia": "Oficina ABC"
    },
    "valorTotalSemDesconto": 1500.00,
    "descontoPercentual": 10,
    "valorFinal": 1350.00,
    "status": "Autorizada",
    "observacoes": "[EMPENHO] Peças: EMP-2024-0001 - Consumido: R$ 800.00\n[EMPENHO] Serviços: EMP-2024-0002 - Consumido: R$ 550.00",
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  },
  "divergencias": [
    "[EMPENHO] Peças: EMP-2024-0001 - Consumido: R$ 800.00",
    "[EMPENHO] Serviços: EMP-2024-0002 - Consumido: R$ 550.00"
  ]
}
```

---

## 🔍 Campo Importante: `dataReferencia`

⚠️ **ATENÇÃO:** O campo `dataReferencia` deve ser a **data de AUTORIZAÇÃO da OS**, NÃO a data de criação!

**Correto:**
```json
{
  "dataReferencia": "2026-02-02"  // Data em que a OS foi AUTORIZADA
}
```

**Incorreto:**
```json
{
  "dataReferencia": "2026-01-15"  // Data de criação da OS no sistema
}
```

---

## 📞 Contato

Em caso de dúvidas ou problemas na integração, verifique:
1. Token está correto no header `X-Webhook-Token`
2. Cliente e Fornecedor existem no Portal Finance (nomes exatos)
3. URL do webhook está correta
4. Payload está no formato JSON correto
5. Campo `codigo` é obrigatório e único

---

**Última atualização:** 02/02/2026
