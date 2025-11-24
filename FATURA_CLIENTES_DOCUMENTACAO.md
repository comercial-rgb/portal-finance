# Documentação - Página Fatura Clientes

## Visão Geral
A página "Fatura Clientes" foi criada para gerenciar e gerar faturas para clientes com base nas ordens de serviço cadastradas no sistema.

## Funcionalidades Implementadas

### 1. Listagem de Ordens de Serviço
- Exibe todas as ordens de serviço cadastradas no sistema
- Cada ordem é apresentada em formato de card clicável
- Informações exibidas por ordem:
  - Código da ordem
  - Número da OS
  - Cliente
  - Fornecedor
  - Placa
  - Centro de Custo
  - Valor Final

### 2. Sistema de Filtros
Filtros disponíveis para refinar a busca:
- **Código OS**: Busca por código específico (ex: OS-000001)
- **Cliente**: Filtra por cliente específico
- **Fornecedor**: Filtra por fornecedor específico
- **Tipo**: Filtra por tipo de serviço
- **Tipo de Solicitação**: Filtra por tipo de serviço solicitado
- **Período**: Filtra por data de início e data fim (ex: 01/11/2025 a 18/11/2025)

Ações dos filtros:
- **Filtrar**: Aplica os filtros selecionados
- **Limpar**: Remove todos os filtros e recarrega todas as ordens

### 3. Exportação para Excel
- Botão "Exportar Excel" disponível no cabeçalho
- Exporta TODOS os campos da ordem de serviço:
  - Código
  - Nº OS
  - Cliente (Razão Social/Nome Fantasia)
  - Fornecedor (Razão Social/Nome Fantasia)
  - Tipo
  - Tipo Serviço
  - Centro de Custo
  - Subunidade
  - Placa
  - Veículo
  - Contrato
  - Empenho
  - Valor Peças
  - Desconto Peças %
  - Valor Peças c/ Desconto
  - Valor Serviços
  - Desconto Serviços %
  - Valor Serviços c/ Desconto
  - Valor Final
  - NF Peça
  - NF Serviço
  - Status
  - Data Criação
- Exporta apenas as ordens de serviço selecionadas
- Arquivo gerado: `ordens_servico_[timestamp].xlsx`

### 4. Geração de Fatura (PDF)

#### 4.1. Validações
- Verifica se há ordens selecionadas
- Valida se todas as ordens pertencem ao mesmo cliente
- Exibe mensagem de erro caso as validações falhem

#### 4.2. Modal de Prévia da Fatura
Antes de gerar o PDF, exibe um modal com a prévia contendo:

**Cabeçalho:**
- Título: "FATURA DE SERVIÇOS"
- Número da Fatura: FAT-CLI-[timestamp]
- Data de emissão

**Dados do Cliente:**
- Razão Social
- CNPJ
- Endereço completo (Logradouro, Número, Bairro, Cidade/UF, CEP)
- **Nota**: Campo para logo do cliente está preparado (será implementado posteriormente)
- **Sem dados bancários** (conforme solicitado)

**Dados dos Centros de Custo:**
- Lista todos os centros de custo das ordens selecionadas
- Máximo de 4 centros por linha
- Separados por " | "

**Tabela de Ordens:**
Colunas da tabela:
1. Nº OS
2. Fornecedor
3. Placa
4. Valor Peças
5. Desconto % (Peças)
6. Valor com Desconto (Peças)
7. Valor Serviços
8. Desconto % (Serviços)
9. Valor com Desconto (Serviços)
10. Total

**Resumo Financeiro:**
1. **Valor Peças Total**: Soma de todas as peças
2. **Valor Serviços Total**: Soma de todos os serviços
3. **Desconto Contrato**: Desconto total aplicado (diferença entre valor bruto e valor com desconto)
4. **Valor com Desconto**: Subtotal após descontos
5. **Impostos & Retenções**: 
   - Detalhamento por tipo de imposto cadastrado no cliente
   - Cálculo baseado na configuração de "Impostos & Retenções"
   - Suporta impostos municipais, estaduais, federais e retenções
6. **Valor Devido**: Valor final = Valor com Desconto - Impostos

#### 4.3. Fluxo de Cálculos

```
1. Valor Peças Total = Σ(valorPecas de todas as ordens)
2. Valor Serviços Total = Σ(valorServico de todas as ordens)
3. Valor com Desconto = Σ(valorPecasComDesconto) + Σ(valorServicoComDesconto)
4. Desconto Contrato = (Valor Peças Total + Valor Serviços Total) - Valor com Desconto
5. Impostos & Retenções = Calculado baseado no tipoImposto do cliente
6. Valor Devido = Valor com Desconto - Impostos & Retenções
```

#### 4.4. Cálculo de Impostos & Retenções
O sistema verifica o campo `tipoImposto` do cliente e aplica os impostos configurados:

**Impostos Municipais (`municipais`):**
- IR sobre Peças: `valorPecas * percentualIR / 100`
- IR sobre Serviços: `valorServico * percentualIR / 100`

**Impostos Estaduais (`estaduais`):**
- IR + PIS + COFINS + CSLL sobre Peças
- IR + PIS + COFINS + CSLL sobre Serviços

**Impostos Federais (`federais`):**
- IR + PIS + COFINS + CSLL sobre Peças
- IR + PIS + COFINS + CSLL sobre Serviços

**Retenções (`retencoes`):**
- Percentual sobre (Valor Peças + Valor Serviços)

**Exemplo de aplicação:**
Se o cliente tiver marcado "Impostos Fora do Simples - Órgãos Municipais":
- Desconto de 1,20% sobre valor de peças
- Desconto de 4,80% sobre valor de serviços

### 5. Seleção de Ordens
- Checkbox em cada card de ordem
- Clique no card inteiro seleciona/desseleciona a ordem
- Cards selecionados ficam destacados visualmente (borda azul + fundo azul claro)
- Contador de ordens selecionadas
- Botões de exportação só habilitados com ordens selecionadas

## Arquivos Criados/Modificados

### Criados:
1. `/frontend/src/pages/FaturasClientes.js` - Componente principal
2. `/frontend/src/pages/FaturasClientes.css` - Estilos da página

### Já Existentes:
1. `/frontend/src/App.js` - Rota já configurada (`/faturas-clientes`)
2. `/frontend/src/components/Sidebar.js` - Menu já configurado

## Dependências Utilizadas
- `react-toastify`: Notificações
- `xlsx`: Exportação para Excel
- `jspdf`: Geração de PDF
- `jspdf-autotable`: Tabelas no PDF

## Endpoints da API Consumidos
- `GET /api/ordens-servico` - Lista ordens de serviço (com filtros opcionais)
- `GET /api/clientes` - Lista clientes
- `GET /api/fornecedores` - Lista fornecedores
- `GET /api/tipo-servicos/tipos` - Lista tipos de serviço
- `GET /api/tipo-servicos/tipos-servico-solicitado` - Lista tipos de solicitação
- `GET /api/impostos-retencoes` - Configuração de impostos

## Validações Implementadas
1. Array validation em todas as responses da API (proteção contra erros de paginação)
2. Validação de cliente único nas ordens selecionadas
3. Validação de ordens selecionadas antes de exportar/gerar fatura
4. Tratamento de erros com try-catch em cálculos de impostos
5. Fallback para valores nulos/undefined em todos os cálculos

## Melhorias Futuras Sugeridas
1. Upload e exibição de logo do cliente na fatura
2. Opção de enviar fatura por email
3. Histórico de faturas geradas
4. Numeração sequencial de faturas com persistência no banco
5. Opção de personalizar campos exibidos na fatura
6. Suporte a múltiplas moedas
7. Assinatura digital na fatura

## Como Usar

1. **Acessar a página**: Menu lateral > "Fatura Clientes"
2. **Filtrar ordens** (opcional): Use os filtros e clique em "Filtrar"
3. **Selecionar ordens**: Clique nos cards das ordens desejadas
4. **Exportar Excel**: Clique no botão "📊 Exportar Excel"
5. **Gerar Fatura PDF**:
   - Clique no botão "📄 Gerar Fatura"
   - Revise a prévia no modal
   - Clique em "📄 Gerar PDF"
   - O arquivo será baixado automaticamente

## Notas Importantes
- Certifique-se de que o cliente possui tipo de imposto configurado para cálculo correto
- Todas as ordens selecionadas devem ser do mesmo cliente
- Os descontos já devem estar aplicados nas ordens de serviço
- A configuração de "Impostos & Retenções" deve estar cadastrada no sistema

