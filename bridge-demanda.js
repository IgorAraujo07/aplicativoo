
// bridge-demanda.js
// Integra a fila global de demandas (LocalStorage) com as telas de Admin,
// sem remover nada do HTML existente.

(function(){
  const ALL_KEY = 'wc.demands.all';

  function readArr(key){
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function saveArr(key, arr){
    localStorage.setItem(key, JSON.stringify(arr));
  }
  function badge(status){
    const cls = status === 'Aberta' ? 'warning' :
                status === 'Em andamento' ? '' :
                status === 'Concluída' ? 'success' : 'muted';
    return `<span class="badge ${cls}">${status}</span>`;
  }

  function ensureTbody(table){
    if(!table) return null;
    let tb = table.querySelector('tbody');
    if(!tb){ tb = document.createElement('tbody'); table.appendChild(tb); }
    return tb;
  }

  function renderTbDemandas(){
    const table = document.querySelector('#tb-demandas');
    const arr = readArr(ALL_KEY);
    if(!table || !arr.length) return; // Se não houver dados, preserva conteúdo existente.
    const tb = ensureTbody(table);
    tb.innerHTML = arr
      .slice(0, 20)
      .map(d => {
        const id = d.id || '';
        const cat = d.categoria || '-';
        const st = badge(d.status || 'Aberta');
        const tit = (d.titulo || '').replace(/</g,'&lt;');
        return `<tr>
          <td>${id}</td>
          <td>${tit}</td>
          <td>${cat}</td>
          <td>${st}</td>
          <td class="actions"><a class="btn ghost" href="demanda-detalhe.html?id=${encodeURIComponent(id)}">Detalhar</a></td>
        </tr>`;
      }).join('');
  }

  function renderTbFila(){
    const table = document.querySelector('#tb-fila');
    const arr = readArr(ALL_KEY);
    if(!table || !arr.length) return;
    const tb = ensureTbody(table);
    tb.innerHTML = arr.map(d => {
      const id = d.id || '';
      const cat = d.categoria || '-';
      const tit = (d.titulo || '').replace(/</g,'&lt;');
      const prio = d.prioridade || 'Média';
      const st = badge(d.status || 'Aberta');
      return `<tr>
        <td>${id}</td>
        <td>${tit}</td>
        <td>${cat}</td>
        <td><span class="badge">${prio}</span></td>
        <td>${st}</td>
        <td class="actions"><a class="btn ghost" href="demanda-detalhe.html?id=${encodeURIComponent(id)}">Abrir</a></td>
      </tr>`;
    }).join('');
  }

  function render(){
    renderTbDemandas();
    renderTbFila();
  }

  window.addEventListener('storage', (e)=>{
    if(e && e.key === ALL_KEY) render();
  });

  document.addEventListener('DOMContentLoaded', render);
  // Render imediato em caso do script ser carregado após DOM pronto.
  if(document.readyState === 'interactive' || document.readyState === 'complete'){ render(); }
})();
