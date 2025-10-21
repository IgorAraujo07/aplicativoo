// bridge-agendamento-admin.js
(function () {
  const PREFIX = 'wc.agendamentos.';     // mesmo padrão usado no cidadão
  const STATUS_PREFIX = 'wc.ag_status.'; // status por id (confirmado/cancelado/pendente)

  // --- util: parse data/hora em vários formatos e retorna timestamp ---
  function parseDataHora(dataStr, horaStr) {
    if (!dataStr) return 0;
    const h = horaStr || '00:00';

    // formatos aceitos: YYYY-MM-DD (nativo), DD/MM/AAAA
    let y, m, d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      [y, m, d] = dataStr.split('-').map(n => parseInt(n, 10));
      // JS: mês começa em 0
      return new Date(y, m - 1, d, ...h.split(':').map(n => parseInt(n, 10))).getTime();
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
      const [dd, mm, yyyy] = dataStr.split('/').map(n => parseInt(n, 10));
      return new Date(yyyy, mm - 1, dd, ...h.split(':').map(n => parseInt(n, 10))).getTime();
    }

    // fallback: deixar o Date tentar parsear
    const t = new Date(`${dataStr} ${h}`).getTime();
    return isNaN(t) ? 0 : t;
  }

  function lerTodosAgendamentos() {
    const rows = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;

      const usuario = key.slice(PREFIX.length);
      let lista = [];
      try { lista = JSON.parse(localStorage.getItem(key)) || []; } catch { lista = []; }

      lista.forEach((a, idx) => {
        const id = a.id || `${usuario}-${idx + 1}`;
        const stKey = `${STATUS_PREFIX}${id}`;
        const status = localStorage.getItem(stKey) || a.status || 'pendente';

        rows.push({
          id,
          usuario,
          servico: a.servico || '',
          data: a.data || '',
          hora: a.hora || '',
          observacoes: a.observacoes || '',
          status,
          ts: parseDataHora(a.data, a.hora)
        });
      });
    }

    // Ordena por timestamp (desc)
    rows.sort((x, y) => (y.ts - x.ts));
    return rows;
  }

  function salvarStatus(id, status) {
    localStorage.setItem(`${STATUS_PREFIX}${id}`, status);
    // opcional: sinaliza para outros tabs
    localStorage.setItem('wc.ag_ping', String(Date.now()));
  }

  function renderTabela() {
    const tbody = document.querySelector('#tb-agendamentos tbody');
    if (!tbody) return;

    const dados = lerTodosAgendamentos();

    if (!dados.length) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="muted">Nenhum agendamento registrado pelos cidadãos.</div>
        </td></tr>`;
    } else {
      tbody.innerHTML = dados.map((a, i) => `
        <tr data-id="${a.id}">
          <td>${i + 1}</td>
          <td>${a.usuario}</td>
          <td>${a.servico}</td>
          <td>${a.data}</td>
          <td>${a.hora}</td>
          <td>${a.observacoes}</td>
          <td class="actions">
            <span class="badge ${badgeClass(a.status)}" title="Status">${labelStatus(a.status)}</span>
            <button class="btn ghost" data-act="confirmar">Confirmar</button>
            <button class="btn ghost" data-act="cancelar">Cancelar</button>
            <button class="btn ghost" data-act="remover">Remover</button>
          </td>
        </tr>
      `).join('');
    }

    // KPI (se existir)
    const kpi = document.getElementById('kpi-ag-admin');
    if (kpi) kpi.textContent = String(dados.length);
  }

  function badgeClass(status) {
    switch (status) {
      case 'confirmado': return 'success';
      case 'cancelado':  return 'danger';
      default:           return 'warning'; // pendente
    }
  }
  function labelStatus(status) {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado':  return 'Cancelado';
      default:           return 'Pendente';
    }
  }

  // Botões de ação
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;

    const tr = btn.closest('tr[data-id]');
    if (!tr) return;

    const id = tr.getAttribute('data-id');
    const act = btn.getAttribute('data-act');

    if (act === 'confirmar') salvarStatus(id, 'confirmado');
    else if (act === 'cancelar') salvarStatus(id, 'cancelado');
    else if (act === 'remover')  removerAgendamento(id);

    renderTabela();
  });

  // Remove um agendamento de qualquer usuário
  function removerAgendamento(id) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;

      let lista = [];
      try { lista = JSON.parse(localStorage.getItem(key)) || []; } catch { lista = []; }

      const nova = lista.filter(a => (a.id || '') !== id);
      if (nova.length !== lista.length) {
        localStorage.setItem(key, JSON.stringify(nova));
        localStorage.removeItem(`${STATUS_PREFIX}${id}`); // apaga status vinculado
        // ping para outros tabs
        localStorage.setItem('wc.ag_ping', String(Date.now()));
        break;
      }
    }
  }

  // Atualização em tempo real quando o cidadão cria/edita (mesmo navegador)
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key.startsWith(PREFIX) || e.key.startsWith(STATUS_PREFIX) || e.key === 'wc.ag_ping') {
      renderTabela();
    }
  });

  document.addEventListener('DOMContentLoaded', renderTabela);
})();
