# Tema InstaSolutions - Sistema de Design

## 📋 Visão Geral

Este documento descreve o sistema de design implementado no Portal Finance usando as cores oficiais da marca InstaSolutions.

## 🎨 Paleta de Cores

### Cores Principais

| Variável CSS | Cor | Hex | Uso |
|--------------|-----|-----|-----|
| `--primary` | Azul Tech | #005BED | Botões primários, links, destaques |
| `--primary-hover` | Azul Tech Hover | #0048B3 | Estado hover de elementos primários |
| `--primary-pressed` | Azul Tech Pressed | #003D99 | Estado pressionado de elementos primários |
| `--primary-soft` | Azul Tech Suave | #E6F0FF | Fundos de cards, badges primários |
| `--secondary` | Azul Corporativo | #251C59 | Header, Sidebar, elementos secundários |
| `--secondary-hover` | Azul Corporativo Hover | #1A1342 | Estado hover de elementos secundários |

### Cores de Estado

| Variável CSS | Cor | Hex | Uso |
|--------------|-----|-----|-----|
| `--success` | Verde | #198754 | Mensagens de sucesso, status positivo |
| `--success-hover` | Verde Hover | #146C43 | Hover de botões de sucesso |
| `--success-soft` | Verde Suave | #D1F4E8 | Fundos de alertas de sucesso |
| `--warning` | Amarelo | #EAB308 | Alertas, avisos |
| `--warning-hover` | Amarelo Hover | #CA8A04 | Hover de botões de aviso |
| `--warning-soft` | Amarelo Suave | #FEF9E7 | Fundos de alertas de aviso |
| `--danger` | Vermelho | #EF4444 | Erros, ações destrutivas |
| `--danger-hover` | Vermelho Hover | #DC2626 | Hover de botões de perigo |
| `--danger-soft` | Vermelho Suave | #FFE8E8 | Fundos de alertas de erro |
| `--info` | Azul Info | #3B82F6 | Informações gerais |
| `--info-soft` | Azul Info Suave | #EBF4FF | Fundos de alertas informativos |

### Cores de Texto

| Variável CSS | Cor | Hex | Uso |
|--------------|-----|-----|-----|
| `--text-primary` | Cinza Escuro | #0F172A | Títulos, textos principais |
| `--text-secondary` | Cinza Médio | #475569 | Subtítulos, descrições |
| `--text-muted` | Cinza Claro | #55657A | Textos auxiliares, placeholders |

### Cores de Superfície

| Variável CSS | Cor | Hex | Uso |
|--------------|-----|-----|-----|
| `--background` | Branco | #FFFFFF | Fundo principal da aplicação |
| `--surface` | Cinza Claríssimo | #F8FAFC | Cards, modais, painéis |
| `--surface-alt` | Cinza Alternativo | #F1F5F9 | Fundos alternativos, hover |
| `--border` | Cinza Borda | #E2E8F0 | Bordas de elementos |

## 🎭 Gradientes

```css
--gradient-primary: linear-gradient(135deg, #005BED 0%, #003D99 100%);
--gradient-secondary: linear-gradient(135deg, #251C59 0%, #1A1342 100%);
--gradient-success: linear-gradient(135deg, #198754 0%, #146C43 100%);
--gradient-warning: linear-gradient(135deg, #EAB308 0%, #CA8A04 100%);
--gradient-danger: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
```

## 🔘 Border Radius

```css
--radius-sm: 6px;    /* Pequeno - badges, tags */
--radius-md: 10px;   /* Médio - inputs, botões */
--radius-lg: 14px;   /* Grande - cards, modais */
--radius-xl: 20px;   /* Extra grande - containers */
--radius-full: 9999px; /* Circular - avatares, pills */
```

## 🌑 Sombras

```css
--shadow-sm: 0 2px 8px rgba(0, 91, 237, 0.08);
--shadow-md: 0 4px 16px rgba(0, 91, 237, 0.12);
--shadow-lg: 0 8px 24px rgba(0, 91, 237, 0.16);
--shadow-xl: 0 16px 48px rgba(0, 91, 237, 0.20);
```

## ⚡ Transições

```css
--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

## 🎯 Estados de Foco

```css
--focus-ring: rgba(0, 91, 237, 0.2); /* Ring azul translúcido */
```

## 📦 Classes Utilitárias

### Botões

```css
.btn-primary     /* Botão primário com gradiente azul */
.btn-secondary   /* Botão secundário com fundo cinza */
.btn-success     /* Botão verde para ações positivas */
.btn-danger      /* Botão vermelho para ações destrutivas */
```

### Badges

```css
.badge-primary   /* Badge azul */
.badge-success   /* Badge verde */
.badge-warning   /* Badge amarelo */
.badge-danger    /* Badge vermelho */
.badge-info      /* Badge azul informativo */
```

### Cards

```css
.card            /* Card básico com sombra e borda */
```

### Texto

```css
.text-primary    /* Cor #005BED */
.text-secondary  /* Cor #251C59 */
.text-success    /* Cor #198754 */
.text-danger     /* Cor #EF4444 */
.text-warning    /* Cor #EAB308 */
.text-muted      /* Cor #55657A */
```

### Backgrounds

```css
.bg-primary      /* Fundo #005BED */
.bg-secondary    /* Fundo #251C59 */
.bg-success      /* Fundo #198754 */
.bg-danger       /* Fundo #EF4444 */
.bg-surface      /* Fundo #F8FAFC */
```

## 📁 Arquivos Atualizados

### Tema Base
- `frontend/src/theme.css` - **NOVO** arquivo com todas as variáveis CSS
- `frontend/src/index.css` - Importa o tema e define estilos globais

### Componentes
- `frontend/src/components/Header.css` - Navegação superior
- `frontend/src/components/Sidebar.css` - Menu lateral
- `frontend/src/components/Footer.css` - Rodapé
- `frontend/src/components/FaturasVencidasAlert.css` - Alertas

### Páginas
- `frontend/src/pages/Login.css` - Página de login
- `frontend/src/pages/Dashboard.css` - Dashboard principal
- `frontend/src/pages/DashboardCliente.css` - Dashboard do cliente
- `frontend/src/pages/DashboardFornecedor.css` - Dashboard do fornecedor
- `frontend/src/pages/Relatorios.css` - **COMPLETO** Página de relatórios

## 🔧 Como Usar

### 1. Importar o Tema

O tema já está importado globalmente em `index.css`:

```css
@import './theme.css';
```

### 2. Usar Variáveis CSS

Em qualquer arquivo CSS do projeto:

```css
.meu-elemento {
  background: var(--primary);
  color: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.meu-elemento:hover {
  background: var(--primary-hover);
  box-shadow: var(--shadow-md);
}

.meu-elemento:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
```

### 3. Usar Classes Utilitárias

No JSX/HTML:

```jsx
<button className="btn-primary">
  Salvar
</button>

<span className="badge-success">
  Ativo
</span>

<div className="card">
  <h3 className="text-primary">Título</h3>
  <p className="text-muted">Descrição</p>
</div>
```

## ✅ Benefícios

1. **Consistência Visual**: Todas as cores seguem o manual da marca InstaSolutions
2. **Manutenção Fácil**: Alterar uma cor em um único lugar atualiza toda a aplicação
3. **Melhor DX**: Variáveis CSS semânticas facilitam o desenvolvimento
4. **Acessibilidade**: Contraste adequado entre cores
5. **Escalabilidade**: Fácil adicionar novos componentes seguindo o padrão

## 🎯 Próximos Passos

Para aplicar o tema em páginas ainda não atualizadas:

1. Abrir o arquivo CSS da página
2. Substituir cores hardcoded por variáveis:
   - `#667eea` → `var(--primary)`
   - `#2d3748` → `var(--text-primary)`
   - `white` → `var(--surface)` (quando aplicável)
   - `#e2e8f0` → `var(--border)`
3. Usar classes utilitárias quando possível
4. Testar visualmente a página

## 📸 Exemplos Visuais

### Antes
```css
.botao {
  background: #667eea;
  color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

### Depois
```css
.botao {
  background: var(--primary);
  color: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

## 🔗 Referências

- Manual de Identidade Visual InstaSolutions
- Cores da Marca: Azul Tech (#005BED) e Azul Corporativo (#251C59)
- Sistema de Design baseado em variáveis CSS (CSS Custom Properties)

---

**Última Atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Autor**: Portal Finance Dev Team
