// utilidades simples de UI e tabelas
(function(){
  const page = document.body.dataset.page;
  document.querySelectorAll(".sidebar a").forEach(a=>{
    const href = a.getAttribute("href");
    if(href && page && href.includes(page)) a.classList.add("active");
  });

  // menu mobile
  const toggle = document.querySelector("[data-toggle=sidebar]");
  const aside = document.querySelector(".sidebar");
  if(toggle && aside){
    toggle.addEventListener("click", ()=> aside.classList.toggle("open"));
  }

  // filtros simples em tabelas
  document.querySelectorAll("[data-table-filter]").forEach((input)=>{
    input.addEventListener("input", ()=>{
      const q = input.value.toLowerCase();
      const table = document.querySelector(input.dataset.tableFilter);
      if(!table) return;
      table.querySelectorAll("tbody tr").forEach(tr=>{
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
      });
    });
  });
})();


// ===== Relatórios (admin) =====
(function(){
  if (document.body.dataset.page !== 'relatorios') return;

  // --- Utilidades ---
  const byId = (id)=> document.getElementById(id);
  const fmtDate = (isoOrNum)=>{
    if(!isoOrNum) return '';
    const d = typeof isoOrNum === 'number' ? new Date(isoOrNum) : new Date(isoOrNum);
    if (isNaN(d)) return '';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const sanitize = (s)=> (s ?? '').toString().replace(/\s+/g,' ').trim();

  // Lê TODAS as demandas do localStorage:
  // - suporta chaves por usuário: wc.demands.<usuario>
  // - e também uma eventual chave agregada: wc.demands
  function readAllDemandas(){
    const demandas = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (!k) continue;
      if (k === 'wc.demands' || k.startsWith('wc.demands.')){
        try {
          const arr = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(arr)) {
            for (const d of arr){
              if (d && typeof d === 'object') demandas.push(d);
            }
          }
        } catch(_) {}
      }
    }
    // normaliza campos esperados
    const norm = demandas.map((d,idx)=>({
      id: d.id ?? d.numero ?? (1000+idx),
      criadoEm: d.criadoEm ?? d.data ?? d.createdAt ?? Date.now(),
      titulo: sanitize(d.titulo ?? d.title),
      categoria: sanitize(d.categoria),
      prioridade: sanitize(d.prioridade ?? d.priority),
      status: sanitize(d.status) || 'Aberta',
      autor: sanitize(d.autor ?? d.usuario ?? d.user ?? d.solicitante),
      resumo: sanitize(d.resumo ?? d.descricao ?? d.description),
    }));
    // Ordena do mais novo para o mais antigo
    norm.sort((a,b)=> (new Date(b.criadoEm)) - (new Date(a.criadoEm)));
    return norm;
  }

  // Aplica filtros
  function filtrarDemandas(src){
    const de = byId('fDataDe').value ? new Date(byId('fDataDe').value+'T00:00:00') : null;
    const ate = byId('fDataAte').value ? new Date(byId('fDataAte').value+'T23:59:59') : null;
    const status = byId('fStatus').value;
    const cat = byId('fCategoria').value;
    const txt = byId('fTexto').value.toLowerCase().trim();

    return src.filter(d=>{
      const dt = new Date(d.criadoEm);
      if (de && dt < de) return false;
      if (ate && dt > ate) return false;
      if (status && d.status !== status) return false;
      if (cat && d.categoria !== cat) return false;
      if (txt){
        const blob = `${d.titulo} ${d.resumo} ${d.autor} ${d.categoria} ${d.prioridade} ${d.status}`.toLowerCase();
        if (!blob.includes(txt)) return false;
      }
      return true;
    });
  }

  // Render KPIs
  function renderKPIs(arr){
    const el = byId('kpis');
    const total = arr.length;
    const porStatus = arr.reduce((acc,d)=> (acc[d.status]=(acc[d.status]||0)+1, acc), {});
    const porCat = arr.reduce((acc,d)=> (acc[d.categoria]=(acc[d.categoria]||0)+1, acc), {});
    const concl = porStatus['Concluída'] || 0;
    const andamento = porStatus['Em andamento'] || 0;
    const abertas = porStatus['Aberta'] || 0;

    el.innerHTML = `
      <div class="kpi"><span class="muted small">Total</span><strong>${total}</strong></div>
      <div class="kpi"><span class="muted small">Concluídas</span><strong>${concl}</strong></div>
      <div class="kpi"><span class="muted small">Em andamento</span><strong>${andamento}</strong></div>
      <div class="kpi"><span class="muted small">Abertas</span><strong>${abertas}</strong></div>
    `;

    // subtítulo com top categoria
    let topCat = '';
    if (Object.keys(porCat).length){
      const [nome, qtd] = Object.entries(porCat).sort((a,b)=> b[1]-a[1])[0];
      topCat = ` • Categoria mais frequente: ${nome} (${qtd})`;
    }
    const periodo = (()=> {
      const de = byId('fDataDe').value ? fmtDate(new Date(byId('fDataDe').value)) : null;
      const ate = byId('fDataAte').value ? fmtDate(new Date(byId('fDataAte').value)) : null;
      if (de && ate) return `${de} a ${ate}`;
      if (de) return `a partir de ${de}`;
      if (ate) return `até ${ate}`;
      return 'todo o período';
    })();
    byId('subtituloRel').textContent = `Exibindo ${total} demanda(s) em ${periodo}${topCat}`;
  }

  // Render tabela
  function renderTabela(arr){
    const tbody = byId('tblRel').querySelector('tbody');
    tbody.innerHTML = '';
    if (!arr.length){
      byId('vazio').style.display = '';
      return;
    }
    byId('vazio').style.display = 'none';

    const frag = document.createDocumentFragment();
    arr.forEach((d, i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.id ?? (i+1)}</td>
        <td>${fmtDate(d.criadoEm)}</td>
        <td>${d.titulo}</td>
        <td>${d.categoria || '-'}</td>
        <td>${d.prioridade || '-'}</td>
        <td>${d.status}</td>
        <td>${d.autor || '-'}</td>
        <td style="min-width:240px">${d.resumo || '-'}</td>
      `;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  // Exportações
  function toCSV(arr){
    const head = ['#','Data','Título','Categoria','Prioridade','Status','Autor','Resumo'];
    const rows = arr.map((d)=>[
      (d.id ?? ''),
      fmtDate(d.criadoEm),
      d.titulo, d.categoria, d.prioridade, d.status, d.autor, d.resumo
    ]);
    const all = [head, ...rows].map(r=> r.map(v=>{
      const s = (v ?? '').toString();
      // escapa ; e " — usa ; como separador pt-BR
      const needQuotes = /[;"\n]/.test(s);
      const esc = s.replace(/"/g,'""');
      return needQuotes ? `"${esc}"` : esc;
    }).join(';')).join('\n');

    const blob = new Blob([all], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-demandas-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toXLS(arr){
    // Excel abre HTML-table com este MIME.
    const head = ['#','Data','Título','Categoria','Prioridade','Status','Autor','Resumo'];
    const th = head.map(h=>`<th style="border:1px solid #ccc;padding:6px">${h}</th>`).join('');
    const trs = arr.map(d=>`
      <tr>
        <td style="border:1px solid #ccc;padding:6px">${d.id ?? ''}</td>
        <td style="border:1px solid #ccc;padding:6px">${fmtDate(d.criadoEm)}</td>
        <td style="border:1px solid #ccc;padding:6px">${d.titulo ?? ''}</td>
        <td style="border:1px solid #ccc;padding:6px">${d.categoria ?? ''}</td>
        <td style="border:1px solid #ccc;padding:6px">${d.prioridade ?? ''}</td>
        <td style="border:1px solid #ccc;padding:6px">${d.status ?? ''}</td>
        <td style="border:1px solid #ccc;padding:6px">${d.autor ?? ''}</td>
        <td style="border:1px solid #ccc;padding:6px">${(d.resumo ?? '').replace(/</g,'&lt;')}</td>
      </tr>
    `).join('');
    const html = `
      <html><head><meta charset="UTF-8"></head><body>
      <table>
        <thead><tr>${th}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
      </body></html>
    `;
    const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-demandas-${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toPrintableHTML(arr){
    const rows = arr.map(d=>`
      <tr>
        <td>${d.id ?? ''}</td>
        <td>${fmtDate(d.criadoEm)}</td>
        <td>${d.titulo ?? ''}</td>
        <td>${d.categoria ?? ''}</td>
        <td>${d.prioridade ?? ''}</td>
        <td>${d.status ?? ''}</td>
        <td>${d.autor ?? ''}</td>
        <td>${(d.resumo ?? '').replace(/</g,'&lt;')}</td>
      </tr>
    `).join('');
    const periodo = byId('subtituloRel').textContent;
    return `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Relatório de Demandas</title>
          <style>
            body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;padding:24px}
            h1{margin:0 0 4px} .muted{color:#666;margin:0 0 16px}
            table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
            thead th{background:#f3f4f6}
            @media print { @page { size: A4; margin: 12mm } }
          </style>
        </head>
        <body>
          <h1>Relatório de Demandas</h1>
          <p class="muted">${periodo} • Gerado em ${fmtDate(new Date())}</p>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Data</th><th>Título</th><th>Categoria</th>
                <th>Prioridade</th><th>Status</th><th>Autor</th><th>Resumo</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
  }

  function toPDF(arr){
    // abre janela com HTML formatado e dispara print (usuário escolhe "Salvar como PDF")
    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(toPrintableHTML(arr));
    w.document.close();
    w.focus();
    // aguarda layout e imprime
    setTimeout(()=> w.print(), 250);
  }

  // Estado & eventos
  const src = readAllDemandas();

  function aplicar(){
    const filtradas = filtrarDemandas(src);
    renderKPIs(filtradas);
    renderTabela(filtradas);
    return filtradas;
  }

  byId('btnAplicar').addEventListener('click', aplicar);
  byId('btnLimpar').addEventListener('click', ()=>{
    byId('fDataDe').value = '';
    byId('fDataAte').value = '';
    byId('fStatus').value = '';
    byId('fCategoria').value = '';
    byId('fTexto').value = '';
    aplicar();
  });

  byId('btnCSV').addEventListener('click', ()=> toCSV(aplicar()));
  byId('btnPDF').addEventListener('click', ()=> toPDF(aplicar()));
  byId('btnXLS').addEventListener('click', ()=> toXLS(aplicar()));

  // Render inicial
  aplicar();
})();




