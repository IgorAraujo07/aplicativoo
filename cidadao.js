// cidadao.js
(function () {
  const AUTH_KEY = 'wc.auth';

  // Protege rota: exige login de 'cidadao'
  const authRaw = localStorage.getItem(AUTH_KEY);
  if (!authRaw) {
    location.href = 'login.html';
    return;
  }
  let auth;
  try {
    auth = JSON.parse(authRaw);
  } catch {
    localStorage.removeItem(AUTH_KEY);
    location.href = 'login.html';
    return;
  }
  if (!auth || auth.perfil !== 'cidadao') {
    location.href = 'login.html';
    return;
  }

  // Chaves por usuário
  const DEM_KEY = `wc.demands.${auth.usuario}`;
  const NOTIF_KEY = `wc.notifs.${auth.usuario}`;

  // Elementos
  const nomeEl = document.getElementById('cidadao-nome');
  if (nomeEl) nomeEl.textContent = auth.nome || auth.usuario;

  const sections = Array.from(document.querySelectorAll('[data-section]'));
  const links = Array.from(document.querySelectorAll('.sidebar a, header .nav a')).filter(a => a.hash && a.hash.startsWith('#'));

  // Navegação
  function showSection(id) {
    sections.forEach(sec => sec.hidden = sec.id !== id);
    links.forEach(a => {
      if (!a.hash) return;
      a.classList.toggle('active', a.hash === '#' + id);
    });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    const main = document.getElementById('conteudo');
    if (main) main.focus({ preventScroll: true });
  }

  const initial = (location.hash || '#painel').replace('#', '');
  showSection(initial);

  links.forEach(a => {
    a.addEventListener('click', e => {
      const id = a.hash.slice(1);
      if (!document.getElementById(id)) return;
      e.preventDefault();
      showSection(id);
    });
  });

  // Logout
  document.querySelectorAll('a[href="login.html"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem(AUTH_KEY);
      location.href = 'login.html';
    });
  });

  // Funções de storage
  function readArr(key, fallback = []) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v : fallback;
    } catch { return fallback; }
  }
  function writeArr(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  // ==== Demandas ====
  const listaDemandasEl = document.getElementById('lista-demandas');
  const formDemanda = document.getElementById('form-demanda');

  function renderDemandas() {
    const demandas = readArr(DEM_KEY);
    if (!listaDemandasEl) return;
    if (!demandas.length) {
      listaDemandasEl.innerHTML = `<div class="muted">Você ainda não abriu nenhuma demanda.</div>`;
      return;
    }
    listaDemandasEl.innerHTML = demandas.map(d => `
      <div class="card" data-id="${d.id}">
        <div class="card-body" style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;">
          <div style="flex:1">
            <div class="small muted">${new Date(d.data).toLocaleDateString()}</div>
            <strong>${d.titulo}</strong><br>
            <span class="small muted">${d.categoria}</span>
            <p style="margin:.5rem 0 0">${d.descricao || ''}</p>
            ${d.imagem ? `<img src="${d.imagem}" alt="Imagem da demanda" style="max-width:150px;margin-top:8px;border-radius:8px;">` : ''}
          </div>
          <div style="text-align:right">
            <span class="badge" data-status="${d.status}" style="display:inline-block;padding:.25rem .5rem;border-radius:999px;border:1px solid #00000010;">${d.status}</span><br>
            ${d.status === 'Aberta' ? `
              <button class="btn small" data-action="resolver" style="margin-top:.5rem">Marcar como resolvida</button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Converte imagem em Base64
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function addDemanda(payload) {
    const demandas = readArr(DEM_KEY);
    const id = String(Date.now());
    demandas.unshift({
      id,
      titulo: payload.titulo.trim(),
      categoria: payload.categoria,
      descricao: (payload.descricao || '').trim(),
      imagem: payload.imagem || null,
      status: 'Aberta',
      data: new Date().toISOString()
    });
    writeArr(DEM_KEY, demandas);
    // ==== INTEGRAÇÃO COM ADMIN (NÃO REMOVE NADA, APENAS ADICIONA) ====
    try {
      const ALL_KEY = 'wc.demands.all';
      const authNowRaw = localStorage.getItem(AUTH_KEY);
      let authNow = {};
      try { authNow = JSON.parse(authNowRaw || '{}'); } catch {}
      const allRaw = localStorage.getItem(ALL_KEY);
      let all = [];
      try { all = JSON.parse(allRaw || '[]'); } catch {}
      // Copia o registro recém-criado (primeiro da lista local) e enriquece com usuário
      const novo = Object.assign({}, demandas[0], {
        usuario: authNow.usuario || null,
        nome: authNow.nome || authNow.usuario || null
      });
      all.unshift(novo);
      localStorage.setItem(ALL_KEY, JSON.stringify(all));
    } catch (e) {
      console && console.warn && console.warn('Falha ao espelhar demanda para admin:', e);
    }

    renderDemandas();
  }

  if (formDemanda) {
    formDemanda.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(formDemanda);
      const titulo = fd.get('titulo') || '';
      const categoria = fd.get('categoria') || '';
      if (!titulo.trim() || !categoria) {
        alert('Preencha Título e Categoria.');
        return;
      }

      let imagemBase64 = null;
      const file = fd.get('imagem');
      if (file && file.size > 0) {
        imagemBase64 = await toBase64(file);
      }

      await addDemanda({
        titulo,
        categoria,
        descricao: fd.get('descricao') || '',
        imagem: imagemBase64
      });

      formDemanda.reset();
      showSection('minhas-demandas');
    });
  }

  // Resolver demanda
  if (listaDemandasEl) {
    listaDemandasEl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action="resolver"]');
      if (!btn) return;
      const card = e.target.closest('.card[data-id]');
      const id = card?.dataset?.id;
      if (!id) return;
      const demandas = readArr(DEM_KEY);
      const idx = demandas.findIndex(d => d.id === id);
      if (idx >= 0) {
        demandas[idx].status = 'Atendida';
        writeArr(DEM_KEY, demandas);
    // ==== INTEGRAÇÃO COM ADMIN (NÃO REMOVE NADA, APENAS ADICIONA) ====
    try {
      const ALL_KEY = 'wc.demands.all';
      const authNowRaw = localStorage.getItem(AUTH_KEY);
      let authNow = {};
      try { authNow = JSON.parse(authNowRaw || '{}'); } catch {}
      const allRaw = localStorage.getItem(ALL_KEY);
      let all = [];
      try { all = JSON.parse(allRaw || '[]'); } catch {}
      // Copia o registro recém-criado (primeiro da lista local) e enriquece com usuário
      const novo = Object.assign({}, demandas[0], {
        usuario: authNow.usuario || null,
        nome: authNow.nome || authNow.usuario || null
      });
      all.unshift(novo);
      localStorage.setItem(ALL_KEY, JSON.stringify(all));
    } catch (e) {
      console && console.warn && console.warn('Falha ao espelhar demanda para admin:', e);
    }

        renderDemandas();
      }
    });
  }

  // ==== Notificações ====
  const listaNotifsEl = document.getElementById('lista-notificacoes');
  function seedNotifs() {
    const seededKey = `wc.seeded.${auth.usuario}`;
    if (localStorage.getItem(seededKey)) return;
    const notifs = [
      { id: 'n1', msg: 'Sua demanda foi atualizada para "Em análise".', data: new Date().toISOString() }
    ];
    writeArr(NOTIF_KEY, notifs);
    localStorage.setItem(seededKey, '1');
  }

  function renderNotificacoes() {
    const notifs = readArr(NOTIF_KEY);
    if (!listaNotifsEl) return;
    if (!notifs.length) {
      listaNotifsEl.innerHTML = `<div class="muted">Sem notificações.</div>`;
      return;
    }
    listaNotifsEl.innerHTML = notifs.map(n => `
      <div class="notif-item small">
        <div>${n.msg}</div>
        <div class="muted">${new Date(n.data).toLocaleString()}</div>
      </div>
    `).join('');
  }

  // Inicialização
  seedNotifs();
  renderDemandas();
  renderNotificacoes();

})();
