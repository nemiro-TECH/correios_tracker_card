/**
 * Correios Tracker Card — Lovelace custom card
 * Mostra todos os pacotes rastreados e permite adicionar/remover direto no dashboard.
 *
 * Instalação:
 *  1. Copie este arquivo para /config/www/correios-tracker-card.js
 *  2. Em Configurações → Painel → Recursos → Adicionar recurso:
 *     URL: /local/correios-tracker-card.js   Tipo: JavaScript module
 *  3. Adicione o card no Lovelace: type: custom:correios-tracker-card
 */

class CorreiosTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._showForm = false;
    this._formError = "";
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = config;
  }

  getCardSize() {
    return 3;
  }

  // ── Coleta entidades do domínio correios_tracker ──────────────────────────
  _getPackages() {
    if (!this._hass) return [];
    const sensors = Object.values(this._hass.states).filter(
      (s) =>
        s.entity_id.startsWith("sensor.") &&
        (s.attributes.codigo_objeto !== undefined)
    );
    return sensors.map((s) => {
      const code = s.attributes.codigo_objeto;
      const bsId = Object.keys(this._hass.states).find(
        (id) =>
          id.startsWith("binary_sensor.") &&
          this._hass.states[id].attributes.codigo_objeto === code
      );
      const delivered = bsId
        ? this._hass.states[bsId].state === "on"
        : false;
      return {
        code,
        name: s.attributes.descricao || code,
        status: s.state,
        location: s.attributes.localizacao || "",
        lastUpdate: s.attributes.ultima_atualizacao || "",
        delivered,
        entity_id: s.entity_id,
      };
    });
  }

  // ── Chama o serviço add_package ──────────────────────────────────────────
  async _addPackage() {
    const shadow = this.shadowRoot;
    const code = shadow.getElementById("input-code").value.trim().toUpperCase();
    const desc = shadow.getElementById("input-desc").value.trim();
    const interval = parseInt(shadow.getElementById("input-interval").value) || 60;

    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
      this._formError = "⚠️ Código inválido. Formato esperado: AA123456789BR";
      this._render();
      return;
    }
    this._formError = "";
    try {
      await this._hass.callService("correios_tracker", "add_package", {
        tracking_code: code,
        description: desc || code,
        scan_interval: interval,
      });
      this._showForm = false;
      this._render();
    } catch (e) {
      this._formError = "Erro ao adicionar: " + (e.message || e);
      this._render();
    }
  }

  // ── Chama o serviço remove_package ──────────────────────────────────────
  async _removePackage(code) {
    if (!confirm(`Remover pacote ${code}?`)) return;
    await this._hass.callService("correios_tracker", "remove_package", {
      tracking_code: code,
    });
  }

  // ── Render principal ─────────────────────────────────────────────────────
  _render() {
    const packages = this._getPackages();
    const formOpen = this._showForm;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          padding: 16px;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .title ha-icon { color: var(--primary-color); }
        .btn-add {
          background: var(--primary-color);
          color: #fff;
          border: none;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-add:hover { opacity: 0.85; }
        .pkg-list { display: flex; flex-direction: column; gap: 10px; }
        .pkg-card {
          border-radius: 12px;
          padding: 12px 14px;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, #eee);
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
        }
        .pkg-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .pkg-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .pkg-code {
          font-size: 11px;
          color: var(--secondary-text-color);
          font-family: monospace;
        }
        .badge {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .badge-delivered { background: #d4edda; color: #155724; }
        .badge-transit   { background: #fff3cd; color: #856404; }
        .pkg-status {
          font-size: 13px;
          color: var(--primary-text-color);
          margin-top: 2px;
        }
        .pkg-meta {
          font-size: 11px;
          color: var(--secondary-text-color);
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--error-color, #c00);
          font-size: 16px;
          padding: 2px 4px;
          border-radius: 4px;
          line-height: 1;
        }
        .btn-remove:hover { background: var(--error-color, #c00); color: #fff; }
        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          padding: 20px 0;
          font-size: 14px;
        }
        /* Formulário */
        .form-box {
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 12px;
          padding: 14px;
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .form-box label {
          font-size: 12px;
          color: var(--secondary-text-color);
          display: block;
          margin-bottom: 2px;
        }
        .form-box input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 8px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
        }
        .form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .btn-confirm {
          background: var(--primary-color);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-cancel {
          background: none;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          font-size: 13px;
          color: var(--primary-text-color);
        }
        .error-msg {
          color: var(--error-color, #c00);
          font-size: 12px;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title">
            📦 Correios Tracker
          </div>
          <button class="btn-add" id="btn-toggle-form">
            ${formOpen ? "✕ Cancelar" : "＋ Adicionar"}
          </button>
        </div>

        ${
          formOpen
            ? `<div class="form-box">
                <div>
                  <label>Código de Rastreamento *</label>
                  <input id="input-code" placeholder="AA123456789BR" maxlength="13" />
                </div>
                <div>
                  <label>Apelido (opcional)</label>
                  <input id="input-desc" placeholder="ex: Celular AliExpress" />
                </div>
                <div>
                  <label>Intervalo de atualização (minutos)</label>
                  <input id="input-interval" type="number" value="60" min="15" max="1440" />
                </div>
                ${this._formError ? `<div class="error-msg">${this._formError}</div>` : ""}
                <div class="form-actions">
                  <button class="btn-cancel" id="btn-cancel">Cancelar</button>
                  <button class="btn-confirm" id="btn-confirm">Adicionar</button>
                </div>
              </div>`
            : ""
        }

        <div class="pkg-list">
          ${
            packages.length === 0 && !formOpen
              ? `<div class="empty">Nenhum pacote monitorado.<br>Clique em <b>+ Adicionar</b> para começar.</div>`
              : packages
                  .map(
                    (pkg) => `
                  <div class="pkg-card">
                    <div class="pkg-top">
                      <div>
                        <div class="pkg-name">${pkg.name}</div>
                        <div class="pkg-code">${pkg.code}</div>
                      </div>
                      <div style="display:flex;align-items:center;gap:6px">
                        <span class="badge ${pkg.delivered ? "badge-delivered" : "badge-transit"}">
                          ${pkg.delivered ? "✅ Entregue" : "🚚 Em trânsito"}
                        </span>
                        <button class="btn-remove" data-code="${pkg.code}" title="Remover">✕</button>
                      </div>
                    </div>
                    <div class="pkg-status">${pkg.status || "—"}</div>
                    <div class="pkg-meta">
                      ${pkg.location ? `<span>📍 ${pkg.location}</span>` : ""}
                      ${pkg.lastUpdate ? `<span>🕐 ${pkg.lastUpdate}</span>` : ""}
                    </div>
                  </div>`
                  )
                  .join("")
          }
        </div>
      </ha-card>
    `;

    // Eventos
    this.shadowRoot
      .getElementById("btn-toggle-form")
      ?.addEventListener("click", () => {
        this._showForm = !this._showForm;
        this._formError = "";
        this._render();
      });

    this.shadowRoot
      .getElementById("btn-cancel")
      ?.addEventListener("click", () => {
        this._showForm = false;
        this._formError = "";
        this._render();
      });

    this.shadowRoot
      .getElementById("btn-confirm")
      ?.addEventListener("click", () => this._addPackage());

    this.shadowRoot.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this._removePackage(e.currentTarget.dataset.code);
      });
    });

    // Enter no campo código confirma
    this.shadowRoot
      .getElementById("input-code")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._addPackage();
      });
  }
}

customElements.define("correios-tracker-card", CorreiosTrackerCard);
