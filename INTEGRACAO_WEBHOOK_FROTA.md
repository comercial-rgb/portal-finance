# Integração Webhook - Sistema de Frotas → Portal Finance

## Visão Geral

Esta integração permite que o **sistema de frotas** envie automaticamente Ordens de Serviço (OS) para o **Portal Finance** quando uma OS for **Autorizada**.

## Endpoint do Webhook

```
POST https://seu-dominio-backend.com/api/webhook/frota/receber-os
```

## Autenticação

O webhook é protegido por um **token secreto** que deve ser enviado em todas as requisições.

### Opção 1: Header HTTP (Recomendado)
```
X-Webhook-Token: seu-token-secreto-aqui
```

### Opção 2: Query Parameter
```
POST /api/webhook/frota/receber-os?token=seu-token-secreto-aqui
```

### Configuração do Token

No servidor do Portal Finance, configure a variável de ambiente:
```bash
WEBHOOK_FROTA_TOKEN=seu-token-secreto-super-seguro-aqui
```

> ⚠️ **IMPORTANTE**: Use um token longo e complexo em produção. Exemplo: `WbHk_Fr0t4_2026_prt4l-f1n4nc3_s3cr3t0-xYz123`

---

## Formato dos Dados

### Request (JSON)

```json
{
  "codigo": "12345",
  "numeroOrdemServico": "OS-2026-001",
  "dataReferencia": "2026-01-30T10:00:00Z",
  "clienteNomeFantasia": "Prefeitura Municipal de São Paulo",
  "fornecedorNomeFantasia": "Auto Peças Silva LTDA",
  "tipoServicoSolicitado": "Manutenção Preventiva",
  "tipo": "Serviços",
  "centroCusto": "Secretaria de Transportes",
  "subunidade": "Frota ABC-1234",
  "placa": "ABC-1234",
  "veiculo": "Fiat Ducato 2020",
  "contrato": "CONTRATO-2025-001",
  "valorPecasSemDesconto": 1500.00,
  "valorServicoSemDesconto": 800.00,
  "descontoPercentual": 10,
  "valorPecasComDesconto": 1350.00,
  "valorServicoComDesconto": 720.00,
  "notaFiscalPeca": "NF-12345",
  "notaFiscalServico": "NF-12346"
}
```

### Mapeamento de Campos

| Campo Portal Finance           | Campo Sistema Frotas                          | Obrigatório | Observações                                    |
|--------------------------------|-----------------------------------------------|-------------|------------------------------------------------|
| `codigo`                       | `Código/ID`                                   | ✅ Sim      | Identificador único da OS                      |
| `numeroOrdemServico`           | `Código/ID` (pode ser o mesmo)                | Não         | Se omitido, usa o `codigo`                     |
| `dataReferencia`               | Data do `show_historic` (mudança de status)   | Não         | Se omitido, usa a data atual                   |
| `clienteNomeFantasia`          | `users_client -> Nome fantasia`               | ✅ Sim      | Busca cliente existente ou cria automaticamente|
| `fornecedorNomeFantasia`       | `users_provider -> Nome fantasia`             | ✅ Sim      | Busca fornecedor ou cria automaticamente       |
| `tipoServicoSolicitado`        | `Tipo de serviço`                             | ✅ Sim      | Busca ou cria o tipo                           |
| `tipo`                         | `Tipo`                                        | ✅ Sim      | Busca ou cria o tipo                           |
| `centroCusto`                  | `Centro de Custo`                             | ✅ Sim      | String livre                                   |
| `subunidade`                   | `Subunidade` / `Placa`                        | Não         | Vinculado ao centro de custo ou placa          |
| `placa`                        | Placa do veículo                              | Não         | -                                              |
| `veiculo`                      | Modelo/descrição do veículo                   | Não         | -                                              |
| `contrato`                     | Número do contrato                            | Não         | -                                              |
| `valorPecasSemDesconto`        | `Total de peças sem desconto`                 | Não         | Valor bruto das peças                          |
| `valorServicoSemDesconto`      | `Total de serviço sem desconto`               | Não         | Valor bruto dos serviços                       |
| `descontoPercentual`           | `Percentual de desconto`                      | Não         | Aplicado tanto em peças quanto em serviços     |
| `valorPecasComDesconto`        | `Total de peças com desconto`                 | Não         | Calculado automaticamente se omitido           |
| `valorServicoComDesconto`      | `Total de serviço com desconto`               | Não         | Calculado automaticamente se omitido           |
| `notaFiscalPeca`               | `Nº da nota fiscal` (peças)                   | Não         | -                                              |
| `notaFiscalServico`            | `Nº da nota fiscal` (serviços)                | Não         | -                                              |
| **Status**                     | -                                             | -           | **Sempre `Autorizada`** (definido automaticamente) |

---

## Comportamento do Sistema

### 1. Busca ou Criação Automática

O webhook tenta **buscar** clientes, fornecedores e tipos existentes pelo nome. Se não encontrar, **cria automaticamente** com dados mínimos.

#### Clientes e Fornecedores criados automaticamente:
- **Nome Fantasia**: conforme recebido
- **Razão Social**: mesmo valor do Nome Fantasia
- **CNPJ**: temporário (`TEMP-{timestamp}`) - **deve ser ajustado manualmente depois**
- **Status**: ativo

> ⚠️ **ATENÇÃO**: Após a criação automática, é necessário **atualizar os dados cadastrais** (CNPJ real, endereço, contatos, etc.) manualmente no Portal Finance.

### 2. Cálculo Automático de Valores

Se os valores com desconto não forem enviados, o sistema calcula automaticamente:

```javascript
valorPecasComDesconto = valorPecasSemDesconto * (1 - descontoPercentual/100)
valorServicoComDesconto = valorServicoSemDesconto * (1 - descontoPercentual/100)
valorFinal = valorPecasComDesconto + valorServicoComDesconto
```

### 3. Proteção contra Duplicação

Se uma OS com o mesmo `codigo` já existir no sistema, o webhook retorna **200 OK** sem criar duplicata:

```json
{
  "success": true,
  "message": "OS já cadastrada anteriormente",
  "ordemServico": { ... },
  "duplicada": true
}
```

---

## Respostas do Webhook

### ✅ Sucesso (201 Created)

```json
{
  "success": true,
  "message": "OS cadastrada com sucesso via webhook",
  "ordemServico": {
    "_id": "65abc...",
    "codigo": "12345",
    "numeroOrdemServico": "OS-2026-001",
    "cliente": {
      "nomeFantasia": "Prefeitura Municipal de São Paulo",
      "razaoSocial": "..."
    },
    "fornecedor": {
      "nomeFantasia": "Auto Peças Silva LTDA",
      "razaoSocial": "..."
    },
    "status": "Autorizada",
    "valorFinal": 2070.00,
    ...
  }
}
```

### ⚠️ Duplicata (200 OK)

```json
{
  "success": true,
  "message": "OS já cadastrada anteriormente",
  "ordemServico": { ... },
  "duplicada": true
}
```

### ❌ Erro de Validação (400 Bad Request)

```json
{
  "success": false,
  "message": "Código/ID da OS é obrigatório"
}
```

### 🔒 Erro de Autenticação (401/403)

```json
{
  "success": false,
  "message": "Token de autenticação inválido"
}
```

### ❌ Erro Interno (500)

```json
{
  "success": false,
  "message": "Erro ao processar OS do sistema de frotas",
  "error": "Detalhes do erro...",
  "details": { ... }
}
```

---

## Teste de Conexão

Para verificar se o webhook está ativo:

```bash
GET https://seu-dominio-backend.com/api/webhook/frota/teste
```

Resposta:
```json
{
  "success": true,
  "message": "Webhook de integração com sistema de frotas está ativo",
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

---

## Exemplo de Integração (Node.js)

```javascript
const axios = require('axios');

async function enviarOSParaPortalFinance(osData) {
  try {
    const response = await axios.post(
      'https://seu-backend.com/api/webhook/frota/receber-os',
      {
        codigo: osData.id,
        numeroOrdemServico: osData.numero,
        dataReferencia: osData.historic.find(h => h.status === 'Autorizada').data,
        clienteNomeFantasia: osData.users_client.nomeFantasia,
        fornecedorNomeFantasia: osData.users_provider.nomeFantasia,
        tipoServicoSolicitado: osData.tipoServico,
        tipo: osData.tipo,
        centroCusto: osData.centroCusto,
        subunidade: osData.subunidade || osData.placa,
        placa: osData.placa,
        veiculo: osData.veiculo,
        valorPecasSemDesconto: osData.totalPecas,
        valorServicoSemDesconto: osData.totalServicos,
        descontoPercentual: osData.desconto,
        valorPecasComDesconto: osData.totalPecasComDesconto,
        valorServicoComDesconto: osData.totalServicosComDesconto,
        notaFiscalPeca: osData.nfPeca,
        notaFiscalServico: osData.nfServico
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': 'seu-token-secreto-aqui'
        },
        timeout: 10000 // 10 segundos
      }
    );

    console.log('✅ OS enviada com sucesso:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao enviar OS:', error.response?.data || error.message);
    throw error;
  }
}

// Gatilho: quando OS for Autorizada no sistema de frotas
onStatusChange('Autorizada', async (os) => {
  await enviarOSParaPortalFinance(os);
});
```

---

## Exemplo de Integração (Python)

```python
import requests
from datetime import datetime

def enviar_os_para_portal_finance(os_data):
    url = "https://seu-backend.com/api/webhook/frota/receber-os"
    
    payload = {
        "codigo": os_data["id"],
        "numeroOrdemServico": os_data["numero"],
        "dataReferencia": next(h["data"] for h in os_data["historic"] if h["status"] == "Autorizada"),
        "clienteNomeFantasia": os_data["users_client"]["nomeFantasia"],
        "fornecedorNomeFantasia": os_data["users_provider"]["nomeFantasia"],
        "tipoServicoSolicitado": os_data["tipoServico"],
        "tipo": os_data["tipo"],
        "centroCusto": os_data["centroCusto"],
        "subunidade": os_data.get("subunidade") or os_data.get("placa"),
        "placa": os_data.get("placa"),
        "veiculo": os_data.get("veiculo"),
        "valorPecasSemDesconto": os_data["totalPecas"],
        "valorServicoSemDesconto": os_data["totalServicos"],
        "descontoPercentual": os_data["desconto"],
        "valorPecasComDesconto": os_data["totalPecasComDesconto"],
        "valorServicoComDesconto": os_data["totalServicosComDesconto"],
        "notaFiscalPeca": os_data.get("nfPeca"),
        "notaFiscalServico": os_data.get("nfServico")
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Token": "seu-token-secreto-aqui"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        print(f"✅ OS enviada com sucesso: {response.json()}")
        return response.json()
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao enviar OS: {e}")
        raise

# Gatilho: quando OS for Autorizada
def on_status_change_to_autorizada(os):
    enviar_os_para_portal_finance(os)
```

---

## Logs e Monitoramento

O webhook gera logs detalhados no backend do Portal Finance:

```
🚗 Webhook Frota - Dados recebidos: { ... }
⚠️  Cliente "Nome Cliente" não encontrado. Criando automaticamente...
✅ Cliente criado com ID: 65abc...
✅ OS criada com sucesso! Código: 12345, ID: 65def...
```

Em caso de erro:
```
❌ Erro no webhook de frota: <mensagem>
Stack: <stack trace>
```

---

## Checklist de Implementação

### No Portal Finance (Backend)

- [x] Controller do webhook criado
- [x] Rotas configuradas com autenticação
- [x] Integração com modelos existentes
- [x] Busca/criação automática de entidades
- [x] Proteção contra duplicação
- [x] Logs detalhados

### No Sistema de Frotas

- [ ] Configurar token secreto compartilhado
- [ ] Implementar chamada HTTP POST ao webhook
- [ ] Mapear campos corretamente
- [ ] Adicionar gatilho quando OS for Autorizada
- [ ] Implementar retry em caso de falha
- [ ] Adicionar logging de integrações
- [ ] Testar em ambiente de homologação

---

## Suporte e Contato

Para dúvidas ou problemas na integração, entre em contato com a equipe de TI do Portal Finance.

**Versão:** 1.0  
**Data:** 30/01/2026
