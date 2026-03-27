/**
 * Correios Tracker Card v2.2
 * Instale em: /config/www/community/correios_tracker/correios-tracker-card.js
 * Recurso: /local/community/correios_tracker/correios-tracker-card.js
 */
class CorreiosTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._mode = null;      // null | "add" | "edit"
    this._editCode = null;  // código sendo editado
    this._formError = "";
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) { this._config = config; }
  getCardSize() { return 3; }

  // ── Coleta pacotes das entidades sensor.correios_*_status ─────────────────
  _getPackages() {
    if (!this._hass) return [];
    return Object.values(this._hass.states)
      .filter(s => s.entity_id.match(/^sensor\.correios_.+_status$/))
      .map(s => {
        const code = (s.attributes.codigo_objeto || "").toUpperCase();
        const bsId = `binary_sensor.correios_${code.toLowerCase()}_entregue`;
        const delivered = this._hass.states[bsId]?.state === "on";
        const locRaw = s.attributes.localizacao_detalhada;
        // Preferência: string já formatada > objeto raw > fallback
        let location = s.attributes.localizacao;
        if (!location && locRaw && typeof locRaw === "object") {
          const cidade = locRaw.cidade || "";
          const uf     = locRaw.uf || "";
          const nome   = locRaw.nome || "";
          if (nome && cidade) location = `${nome} — ${cidade}/${uf}`;
          else if (cidade)    location = uf ? `${cidade}/${uf}` : cidade;
          else if (nome)      location = nome;
        }
        return {
          code,
          name: s.attributes.descricao || code,
          status: s.state,
          location: location || "",
          lastUpdate: s.attributes.ultima_atualizacao || "",
          delivered,
          entity_id: s.entity_id,
        };
      });
  }

  // ── Serviço add_package (novo ou atualização) ─────────────────────────────
  async _submitForm() {
    const s   = this.shadowRoot;
    const code = s.getElementById("input-code")?.value.trim().toUpperCase() || this._editCode?.toUpperCase() || "";
    const desc = s.getElementById("input-desc")?.value.trim() || "";
    const interval = parseInt(s.getElementById("input-interval")?.value) || 60;

    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
      this._formError = "⚠️ Código inválido. Formato: AA123456789BR";
      this._render(); return;
    }
    this._formError = "";
    try {
      await this._hass.callService("correios_tracker", "add_package", {
        tracking_code: code,
        description: desc || code,
        scan_interval: interval,
      });
      this._mode = null;
      this._editCode = null;
      this._render();
    } catch (e) {
      this._formError = "Erro: " + (e.message || e);
      this._render();
    }
  }

  async _removePackage(code) {
    if (!confirm(`Remover o pacote ${code}?`)) return;
    await this._hass.callService("correios_tracker", "remove_package", { tracking_code: code });
  }

  _startEdit(pkg) {
    this._mode = "edit";
    this._editCode = pkg.code;
    this._formError = "";
    this._render();
    // Pré-preenche após render
    requestAnimationFrame(() => {
      const s = this.shadowRoot;
      if (s.getElementById("input-desc"))     s.getElementById("input-desc").value = pkg.name;
      if (s.getElementById("input-interval")) s.getElementById("input-interval").value = 60;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    const packages   = this._getPackages();
    const isAdd      = this._mode === "add";
    const isEdit     = this._mode === "edit";
    const editPkg    = isEdit ? packages.find(p => p.code === this._editCode) : null;
    const formOpen   = isAdd || isEdit;

    this.shadowRoot.innerHTML = `
<style>
  :host { display: block; }
  ha-card { padding: 16px; font-family: var(--paper-font-body1_-_font-family, sans-serif); }

  /* header */
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .title  { font-size:17px; font-weight:600; display:flex; align-items:center; gap:8px; }
  .btn-add {
    background: var(--primary-color); color:#fff; border:none;
    border-radius:20px; padding:6px 14px; font-size:13px; cursor:pointer;
    display:flex; align-items:center; gap:4px; white-space:nowrap;
  }
  .btn-add:hover { opacity:.85; }

  /* lista de pacotes */
  .pkg-list { display:flex; flex-direction:column; gap:10px; }
  .pkg-card {
    border-radius:12px; padding:12px 14px;
    background: var(--card-background-color, #fff);
    border:1px solid var(--divider-color, #eee);
    display:flex; flex-direction:column; gap:4px;
  }
  .pkg-top  { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
  .pkg-name { font-weight:600; font-size:14px; color:var(--primary-text-color); }
  .pkg-code { font-size:11px; color:var(--secondary-text-color); font-family:monospace; }
  .pkg-status { font-size:13px; color:var(--primary-text-color); margin-top:2px; }
  .pkg-meta   {
    font-size:11px; color:var(--secondary-text-color);
    display:flex; gap:10px; flex-wrap:wrap; margin-top:2px;
  }

  /* badge */
  .badge { padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600; flex-shrink:0; }
  .badge-delivered { background:#d4edda; color:#155724; }
  .badge-transit   { background:#fff3cd; color:#856404; }

  /* botões de ação no card */
  .actions { display:flex; gap:4px; align-items:center; flex-shrink:0; }
  .btn-icon {
    background:none; border:none; cursor:pointer;
    border-radius:6px; padding:3px 6px; font-size:15px; line-height:1;
    color: var(--secondary-text-color);
  }
  .btn-icon:hover { background:var(--divider-color, #eee); }
  .btn-icon.danger:hover { background:var(--error-color,#c00); color:#fff; }

  /* empty state */
  .empty { text-align:center; color:var(--secondary-text-color); padding:20px 0; font-size:14px; }

  /* formulário */
  .form-box {
    background:var(--secondary-background-color, #f5f5f5);
    border-radius:12px; padding:14px; margin-top:12px;
    display:flex; flex-direction:column; gap:10px;
  }
  .form-title { font-weight:600; font-size:14px; margin-bottom:2px; }
  .form-box label { font-size:12px; color:var(--secondary-text-color); display:block; margin-bottom:3px; }
  .form-box input {
    width:100%; box-sizing:border-box; padding:8px 10px;
    border:1px solid var(--divider-color,#ccc); border-radius:8px;
    font-size:14px; background:var(--card-background-color,#fff);
    color:var(--primary-text-color);
  }
  .form-actions { display:flex; gap:8px; justify-content:flex-end; }
  .btn-confirm {
    background:var(--primary-color); color:#fff; border:none;
    border-radius:8px; padding:8px 18px; cursor:pointer; font-size:13px;
  }
  .btn-cancel {
    background:none; border:1px solid var(--divider-color,#ccc);
    border-radius:8px; padding:8px 14px; cursor:pointer;
    font-size:13px; color:var(--primary-text-color);
  }
  .error-msg { color:var(--error-color,#c00); font-size:12px; }
  .edit-hint { font-size:11px; color:var(--secondary-text-color); font-style:italic; }
</style>

<ha-card>
  <div class="header">
    <div class="title">📦 Correios Tracker</div>
    <button class="btn-add" id="btn-toggle-add">
      ${formOpen ? "✕ Cancelar" : "＋ Adicionar"}
    </button>
  </div>

  ${formOpen ? `
  <div class="form-box">
    <div class="form-title">${isEdit ? `✏️ Editar — ${this._editCode}` : "➕ Novo pacote"}</div>

    ${isAdd ? `
    <div>
      <label>Código de Rastreamento *</label>
      <input id="input-code" placeholder="AA123456789BR" maxlength="13" />
    </div>` : `
    <div class="edit-hint">Código: <b>${this._editCode}</b> — editando apenas apelido e intervalo</div>
    `}

    <div>
      <label>${isEdit ? "Novo apelido" : "Apelido (opcional)"}</label>
      <input id="input-desc" placeholder="ex: Celular AliExpress" />
    </div>
    <div>
      <label>Intervalo de atualização (minutos)</label>
      <input id="input-interval" type="number" value="60" min="15" max="1440" />
    </div>

    ${this._formError ? `<div class="error-msg">${this._formError}</div>` : ""}

    <div class="form-actions">
      <button class="btn-cancel" id="btn-cancel">Cancelar</button>
      <button class="btn-confirm" id="btn-confirm">${isEdit ? "Salvar" : "Adicionar"}</button>
    </div>
  </div>` : ""}

  <div class="pkg-list">
    ${packages.length === 0 && !formOpen
      ? `<div class="empty">Nenhum pacote monitorado.<br>Clique em <b>＋ Adicionar</b> para começar.</div>`
      : packages.map(pkg => `
        <div class="pkg-card">
          <div class="pkg-top">
            <div>
              <div class="pkg-name">${pkg.name}</div>
              <div class="pkg-code">${pkg.code}</div>
            </div>
            <div class="actions">
              <span class="badge ${pkg.delivered ? "badge-delivered" : "badge-transit"}">
                ${pkg.delivered ? "✅ Entregue" : "🚚 Em trânsito"}
              </span>
              <button class="btn-icon edit-btn" data-code="${pkg.code}" title="Editar apelido">✏️</button>
              <button class="btn-icon danger remove-btn" data-code="${pkg.code}" title="Remover">✕</button>
            </div>
          </div>
          <div class="pkg-status">${pkg.status || "—"}</div>
          <div class="pkg-meta">
            ${pkg.location ? `<span>📍 ${pkg.location}</span>` : ""}
            ${pkg.lastUpdate ? `<span>🕐 ${pkg.lastUpdate}</span>` : ""}
          </div>
        </div>`
      ).join("")}
  </div>
</ha-card>`;

    // ── Eventos ──────────────────────────────────────────────────────────────
    this.shadowRoot.getElementById("btn-toggle-add")?.addEventListener("click", () => {
      this._mode = this._mode ? null : "add";
      this._editCode = null;
      this._formError = "";
      this._render();
    });

    this.shadowRoot.getElementById("btn-cancel")?.addEventListener("click", () => {
      this._mode = null; this._editCode = null; this._formError = "";
      this._render();
    });

    this.shadowRoot.getElementById("btn-confirm")?.addEventListener("click", () => this._submitForm());

    this.shadowRoot.getElementById("input-code")?.addEventListener("keydown", e => {
      if (e.key === "Enter") this._submitForm();
    });

    this.shadowRoot.querySelectorAll(".edit-btn").forEach(btn =>
      btn.addEventListener("click", e => {
        const code = e.currentTarget.dataset.code;
        const pkg  = this._getPackages().find(p => p.code === code);
        if (pkg) this._startEdit(pkg);
      })
    );

    this.shadowRoot.querySelectorAll(".remove-btn").forEach(btn =>
      btn.addEventListener("click", e => this._removePackage(e.currentTarget.dataset.code))
    );
  }
}

customElements.define("correios-tracker-card", CorreiosTrackerCard);
