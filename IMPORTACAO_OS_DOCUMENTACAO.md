# Documentação - Importação em Lote de Ordens de Serviço

## 📦 Funcionalidade de Importação em Lote

Esta funcionalidade permite importar múltiplas Ordens de Serviço (OS) de uma vez através de um arquivo CSV. É ideal para inserir OS históricas ou realizar importações em massa.

---

## 🎯 Objetivo

Facilitar a importação de OS anteriores à integração com o sistema de frotas, permitindo que os administradores insiram múltiplos registros de uma única vez sem afetar o webhook existente.

---

## 👥 Permissões

- **Acesso:** Apenas usuários com perfil **Super Admin** ou **Admin**
- **Rota:** `/importacao-os`
- **Menu:** "Importar OS em Lote" na sidebar

---

## 📋 Campos do Template CSV

### Campos Obrigatórios (marcados com *)

1. **N° Ordem de Serviço*** - Número único da ordem de serviço
2. **Data de Referência*** - Data no formato YYYY-MM-DD (ex: 2024-01-15)
3. **Cliente*** - Nome da Razão Social ou Nome Fantasia do cliente
4. **Fornecedor*** - Nome da Razão Social ou Nome Fantasia do fornecedor
5. **Tipo de Serviço Solicitado*** - Ex: "Manutenção Preventiva", "Corretiva"
6. **Tipo*** - Ex: "Peças", "Serviços", "Peças e Serviços"
7. **Centro de Custo*** - Nome do centro de custo

### Campos Opcionais

8. **Subunidade** - Subunidade do centro de custo
9. **Placa** - Placa do veículo
10. **Veículo** - Descrição/modelo do veículo
11. **Valor Peças (R$)** - Valor bruto de peças (use ponto decimal: 1000.00)
12. **Valor Serviço (R$)** - Valor bruto de serviços (use ponto decimal: 500.00)
13. **N° Nota Fiscal Peça** - Número da nota fiscal de peças
14. **N° Nota Fiscal Serviço** - Número da nota fiscal de serviços

---

## 🔄 Como Funciona

### 1. Download do Template
- Clique em "📥 Baixar Template CSV"
- Um arquivo de exemplo será baixado com o formato correto

### 2. Preenchimento do Arquivo
- Abra o arquivo no Excel, Google Sheets ou editor de texto
- **NÃO REMOVA O CABEÇALHO** (primeira linha)
- Preencha uma linha para cada OS
- Use vírgula como separador de campos
- Use ponto como separador decimal para valores

### 3. Upload e Importação
- Clique em "Escolher arquivo" ou arraste o CSV
- Clique em "🚀 Importar OS"
- Aguarde o processamento

### 4. Visualização dos Resultados
- **Resumo:** Total, Sucessos e Erros
- **Tabela de Sucesso:** Lista todas as OS criadas
- **Tabela de Erros:** Mostra linha e mensagem de erro para correção

---

## ⚙️ Processamento Automático

O sistema realiza as seguintes operações automaticamente:

### ✅ Validações
- Verifica se Cliente existe no sistema
- Verifica se Fornecedor existe no sistema
- Valida campos obrigatórios
- Verifica duplicação de N° Ordem de Serviço

### 🔧 Criações Automáticas
- **Tipo de Serviço Solicitado:** Criado se não existir
- **Tipo:** Criado se não existir
- **Centro de Custo:** Criado no cliente se não existir
- **Subunidade:** Criada no centro de custo se não existir

### 💰 Cálculos de Valores
- **Desconto:** Aplica o desconto cadastrado no cliente
  - `descontoPecas` do cliente → aplicado em Valor Peças
  - `descontoServicos` do cliente → aplicado em Valor Serviços
- **Valores com Desconto:**
  - `Valor Peças com Desconto = Valor Peças - (Valor Peças × Desconto Peças %)`
  - `Valor Serviço com Desconto = Valor Serviço - (Valor Serviço × Desconto Serviços %)`
- **Valor Final:**
  - `Valor Final = Valor Peças com Desconto + Valor Serviço com Desconto`

### 📝 Outros Campos
- **Código:** Gerado automaticamente igual ao N° Ordem de Serviço
- **Status:** Sempre definido como "Autorizada"
- **Observações:** Marcado como "[IMPORTAÇÃO] OS importada em lote"

---

## 📄 Exemplo de Arquivo CSV

```csv
N° Ordem de Serviço *,Data de Referência *,Cliente *,Fornecedor *,Tipo de Serviço Solicitado *,Tipo *,Centro de Custo *,Subunidade,Placa,Veículo,Valor Peças (R$),Valor Serviço (R$),N° Nota Fiscal Peça,N° Nota Fiscal Serviço
OS/2024/001,2024-01-15,Cliente ABC Ltda,Fornecedor XYZ,Manutenção Preventiva,Peças e Serviços,Frota Leve,Região Sul,ABC-1234,Fiat Strada 2020,1000.00,500.00,NFe-12345,NFe-12346
OS/2024/002,2024-01-20,Cliente ABC Ltda,Fornecedor XYZ,Manutenção Corretiva,Peças,Frota Pesada,,DEF-5678,Mercedes Actros 2019,2500.00,0,NFe-12347,
OS/2024/003,2024-02-01,Cliente DEF Ltda,Oficina ABC,Revisão,Serviços,Frota Leve,Região Norte,GHI-9012,VW Gol 2021,0,800.00,,NFe-12348
```

---

## ❌ Mensagens de Erro Comuns

### Cliente não encontrado
```
Cliente "Nome Cliente" não encontrado
```
**Solução:** Verifique se o cliente está cadastrado no sistema. Use o nome exato da Razão Social ou Nome Fantasia.

### Fornecedor não encontrado
```
Fornecedor "Nome Fornecedor" não encontrado
```
**Solução:** Verifique se o fornecedor está cadastrado no sistema. Use o nome exato da Razão Social ou Nome Fantasia.

### OS já cadastrada
```
OS já cadastrada: OS/2024/001
```
**Solução:** Esta OS já existe no sistema. Verifique o número ou remova a linha duplicada.

### Campo obrigatório faltando
```
Número da Ordem de Serviço é obrigatório
Data de Referência é obrigatória
Cliente é obrigatório
```
**Solução:** Preencha todos os campos marcados com * (obrigatórios).

---

## ⚠️ Observações Importantes

1. **Não Afeta o Webhook**
   - Esta funcionalidade é independente do webhook do sistema de frotas
   - As OS importadas manualmente não interferem com as OS recebidas via webhook

2. **Pré-requisitos**
   - Cliente e Fornecedor devem estar cadastrados previamente
   - Use os nomes exatos conforme cadastro (Razão Social ou Nome Fantasia)

3. **Formato de Dados**
   - Datas: `YYYY-MM-DD` (ex: 2024-01-15)
   - Valores: Use ponto decimal (ex: 1000.00, não 1.000,00)
   - CSV: Use vírgula como separador de campos

4. **Desempenho**
   - Recomendado importar até 100 OS por vez
   - Para volumes maiores, divida em múltiplos arquivos

5. **Código Automático**
   - O campo `codigo` será igual ao `numeroOrdemServico`
   - Garante consistência e facilita rastreamento

6. **Status Fixo**
   - Todas as OS importadas terão status "Autorizada"
   - Para alterar o status, edite a OS individualmente após importação

---

## 🔍 Verificando o Resultado

Após a importação:

1. **Acesse:** "Ordens de Serviço" no menu
2. **Busque:** Pelo número da OS importada
3. **Verifique:**
   - Código gerado
   - Valores calculados com desconto
   - Centro de custo e subunidade criados
   - Status = "Autorizada"
   - Observação = "[IMPORTAÇÃO] OS importada em lote"

---

## 🛠️ Endpoints API

### POST `/api/importacao/ordens-servico`

**Autenticação:** Bearer Token (Admin ou Super Admin)

**Body:**
```json
{
  "ordensServico": [
    {
      "numeroOrdemServico": "OS/2024/001",
      "dataReferencia": "2024-01-15",
      "clienteNome": "Cliente ABC Ltda",
      "fornecedorNome": "Fornecedor XYZ",
      "tipoServicoSolicitado": "Manutenção Preventiva",
      "tipo": "Peças e Serviços",
      "centroCusto": "Frota Leve",
      "subunidade": "Região Sul",
      "placa": "ABC-1234",
      "veiculo": "Fiat Strada 2020",
      "valorPecas": "1000.00",
      "valorServico": "500.00",
      "notaFiscalPeca": "NFe-12345",
      "notaFiscalServico": "NFe-12346"
    }
  ]
}
```

**Resposta de Sucesso (201 ou 207):**
```json
{
  "success": true,
  "message": "✅ Todas as 10 OS foram importadas com sucesso!",
  "resultados": {
    "sucesso": [
      {
        "linha": 2,
        "numeroOrdemServico": "OS/2024/001",
        "codigo": "OS/2024/001",
        "cliente": "Cliente ABC Ltda",
        "fornecedor": "Fornecedor XYZ",
        "valorFinal": "1350.00"
      }
    ],
    "erros": [],
    "total": 10
  }
}
```

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique se todos os campos obrigatórios estão preenchidos
2. Confirme que Cliente e Fornecedor estão cadastrados
3. Valide o formato de data e valores
4. Revise o template de exemplo
5. Entre em contato com o suporte técnico

---

**Última atualização:** 04/02/2026
