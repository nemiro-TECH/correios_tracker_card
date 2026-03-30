# Correios Tracker Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/nemiro-TECH/correios_tracker_card)](https://github.com/nemiro-TECH/correios_tracker_card/releases)

Um cartão Lovelace (Frontend) limpo e interativo para o Home Assistant, desenhado especificamente para acompanhar as suas encomendas através da integração [Correios Tracker](https://github.com/nemiro-TECH/correios_tracker_ha).

> ⚠️ **IMPORTANTE:** Este repositório contém apenas o cartão visual (Frontend). Para que ele funcione, é **obrigatório** instalar e configurar primeiro a integração base [Correios Tracker (Backend)](https://github.com/nemiro-TECH/correios_tracker_ha).

---

## ✨ Funcionalidades

- **Visão Geral:** Lista todas as encomendas rastreadas num formato compacto e moderno.
- **Identificação Visual:** Badges dinâmicos indicando se o pacote está **Entregue** ou **Em trânsito**.
- **Gestão Direta:** Botão **＋ Adicionar** para inserir um novo código de rastreio diretamente pelo painel, sem precisar de aceder às configurações.
- **Edição Rápida:** Botão **✏️** para renomear os pacotes on-the-fly.
- **Limpeza:** Botão **✕** para remover pacotes entregues com um clique.
- **Design Responsivo:** Totalmente adaptado para funcionar perfeitamente em ecrãs de computador e dispositivos móveis (touch).

---

## 🛠️ Instalação

### Opção 1: Via HACS (Recomendado)

A forma mais fácil de instalar e manter este cartão atualizado é utilizando o [HACS](https://hacs.xyz/).

**Método Automático:**
Clique no botão abaixo para adicionar este repositório diretamente ao seu HACS:

[![Adicionar ao HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=nemiro-TECH&repository=correios_tracker_card&category=plugin)

**Método Manual (HACS):**
1. Abra o **HACS** no seu Home Assistant.
2. Navegue até à secção **Frontend** (Interface).
3. Clique nos três pontos (`⋮`) no canto superior direito e selecione **Repositórios personalizados**.
4. Adicione o URL: `https://github.com/nemiro-TECH/correios_tracker_card` e escolha a categoria **Lovelace**.
5. Clique em **Adicionar** e, de seguida, clique no botão **Transferir** (Download) que aparecerá.
6. Atualize a página do seu navegador (Limpe o cache se necessário).

### Opção 2: Instalação Manual (Sem HACS)

1. Faça o download do ficheiro `correios-tracker-card.js` da última versão lançada.
2. Copie o ficheiro para a pasta `www/` do seu Home Assistant (geralmente `/config/www/`).
3. No Home Assistant, vá a **Configurações** > **Dashboards** > **Recursos** (no canto superior direito).
4. Clique em **Adicionar Recurso**.
5. URL: `/local/correios-tracker-card.js`
6. Tipo de recurso: **Módulo JavaScript** (`JavaScript Module`).
7. Guarde e recarregue a página do painel.

---

## 💻 Como Usar

Após a instalação, pode adicionar o cartão ao seu painel de duas formas:

**Pela Interface Gráfica (UI):**
1. Edite o seu painel (dashboard).
2. Clique em **Adicionar Cartão**.
3. Procure por `Custom: Correios Tracker Card` na lista (ou pesquise manualmente).

**Pelo Editor de Código (YAML):**
```yaml
type: custom:correios-tracker-card
