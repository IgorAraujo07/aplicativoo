(function () {
  const AUTH_KEY = 'wc.auth';
  function read(key, fallback=null){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch{ return fallback; }
  }
  function write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function nowISO(){ return new Date().toISOString(); }
  function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function pickFirstArray(keys){
    for(const k of keys){
      const v = read(k);
      if(Array.isArray(v)) return {key:k, arr:v};
    }
    return {key:null, arr:[]};
  }
  const DEM_ALL_KEYS = ['wc.demands.all','wc.demandas.all','wc.demandas','wc.demandas_admin'];
  const AGD_ALL_KEYS = ['wc.agendamentos.all','wc.agenda.all','wc.agendamentos','wc.agendamentos_admin'];
  const authRaw = localStorage.getItem(AUTH_KEY);
  if(!authRaw) return;
  let auth;
  try{ auth = JSON.parse(authRaw); }catch{ return; }
  if(!auth || auth.perfil !== 'cidadao') return;
  const USER = auth.usuario;
  const NOTIF_KEY = `wc.notifs.${USER}`;
  const CURSOR_KEY = `wc.cursor.${USER}.adminWatch`;
  const BADGE_ID = 'notif-badge-count';
  function ensureBadge(){
    const anchors = Array.from(document.querySelectorAll('a[href="#notificacoes"]'));
    anchors.forEach(a=>{
      if(!a.querySelector(`#${BADGE_ID}`)){
        const b = document.createElement('span');
        b.id = BADGE_ID;
        b.style.cssText = 'margin-left:8px; padding:0 6px; border-radius:999px; font-size:12px; background:#ef4444; color:white; display:none;';
        b.textContent = '0';
        a.appendChild(b);
      }
    });
  }
  function setBadgeCount(n){
    ensureBadge();
    const els = document.querySelectorAll(`#${BADGE_ID}`);
    els.forEach(el=>{
      el.textContent = String(n);
      el.style.display = n > 0 ? 'inline-block' : 'none';
    });
  }
  let toastTimer = null;
  function showToast(text){
    let toast = document.getElementById('wc-toast');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'wc-toast';
      toast.style.cssText = 'position:fixed; right:16px; bottom:16px; max-width:360px; background:#111827; color:#fff; padding:12px 14px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,.2); z-index:9999; display:none;';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.style.display='none', 4000);
  }
  function getNotifs(){ return read(NOTIF_KEY, []); }
  function setNotifs(arr){ write(NOTIF_KEY, arr); updateUI(); }
  function pushNotif({type, title, message, link, meta}){
    const arr = getNotifs();
    arr.unshift({id: uid(),type,title,message,link:link||'',meta:meta||{},read:false,createdAt:nowISO()});
    setNotifs(arr);
    showToast(title + (message ? ' — ' + message : ''));
  }
  function renderList(){
    const wrap = document.getElementById('lista-notificacoes');
    if(!wrap) return;
    const arr = getNotifs();
    if(!arr.length){
      wrap.innerHTML = `<div class="muted">Sem notificações por enquanto.</div>`;
      return;
    }
    wrap.innerHTML = arr.map(n=>`
      <div class="item" style="padding:10px 0; border-bottom:1px solid rgba(0,0,0,.06);">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <div style="width:10px; height:10px; border-radius:999px; margin-top:6px; background:${n.read ? 'transparent' : '#3b82f6'};"></div>
          <div style="flex:1;">
            <div style="font-weight:600">${escapeHTML(n.title)}</div>
            ${n.message ? `<div class="small" style="color:#6b7280">${escapeHTML(n.message)}</div>` : ''}
            <div class="small muted" style="margin-top:4px;">${formatWhen(n.createdAt)}</div>
            ${n.link ? `<div style="margin-top:6px;"><a class="btn small outline" href="${n.link}">Abrir</a></div>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }
  function escapeHTML(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c])); }
  function formatWhen(iso){
    try{ const d = new Date(iso); return d.toLocaleString(); }catch{ return iso || ''; }
  }
  function unreadCount(){ return getNotifs().filter(n=>!n.read).length; }
  function markAllRead(){ const arr = getNotifs().map(n=>({...n, read:true})); setNotifs(arr); }
  function updateUI(){ renderList(); setBadgeCount(unreadCount()); }
  function getCursor(){ return read(CURSOR_KEY, {dem:{}, agd:{}}); }
  function setCursor(cur){ write(CURSOR_KEY, cur); }
  function hashRelevant(obj){
    const slice = {
      id: obj.id ?? obj.codigo ?? obj.numero ?? null,
      status: obj.status ?? null,
      respostaAdmin: obj.respostaAdmin ?? obj.resposta ?? obj.feedback ?? null,
      admin: obj.admin ?? null,
      updatedAt: obj.updatedAt ?? obj.atualizadoEm ?? null,
      timelineLen: Array.isArray(obj.timeline) ? obj.timeline.length : null
    };
    return JSON.stringify(slice);
  }
  function isMine(obj){
    const owner = obj.usuario || obj.cidadao || obj.user || obj.owner || obj.solicitante || obj.email;
    return owner === USER;
  }
  function scanDemands(){
    const {key, arr} = pickFirstArray(DEM_ALL_KEYS);
    if(!key) return;
    const cur = getCursor();
    if(!cur.dem) cur.dem = {};
    arr.filter(isMine).forEach(d=>{
      const id = String(d.id ?? d.codigo ?? d.numero ?? d.titulo ?? JSON.stringify(d).length);
      const h = hashRelevant(d);
      if(cur.dem[id] !== h){
        if(typeof d.respostaAdmin === 'string' && d.respostaAdmin.trim()){
          pushNotif({
            type: 'demanda',
            title: 'Demanda respondida',
            message: `Sua demanda ${d.titulo ? `"${d.titulo}"` : `#${id}`} ${d.status ? `foi marcada como ${d.status}` : 'recebeu resposta do administrador.'}`,
            link: d.linkDetalhe || (d.hrefDetalhe) || (d.urlDetalhe) || `detalhe-demanda.html?id=${encodeURIComponent(id)}`,
            meta: { id, status: d.status || null }
          });
        } else if (d.status && /conclu|fech|resol|indefer|defer|andament|triagem/i.test(d.status)){
          pushNotif({
            type: 'demanda',
            title: 'Status da demanda atualizado',
            message: `Sua demanda ${d.titulo ? `"${d.titulo}"` : `#${id}`} agora está como ${d.status}.`,
            link: d.linkDetalhe || `detalhe-demanda.html?id=${encodeURIComponent(id)}`,
            meta: { id, status: d.status }
          });
        }
        cur.dem[id] = h;
      }
    });
    setCursor(cur);
  }
  function scanAppointments(){
    const {key, arr} = pickFirstArray(AGD_ALL_KEYS);
    if(!key) return;
    const cur = getCursor();
    if(!cur.agd) cur.agd = {};
    arr.filter(isMine).forEach(a=>{
      const id = String(a.id ?? a.codigo ?? a.numero ?? (a.data && a.hora ? a.data+'T'+a.hora : JSON.stringify(a).length));
      const h = hashRelevant(a);
      if(cur.agd[id] !== h){
        if(typeof a.respostaAdmin === 'string' && a.respostaAdmin.trim()){
          pushNotif({
            type: 'agendamento',
            title: 'Agendamento respondido',
            message: `Seu agendamento ${a.servico ? `"${a.servico}"` : `#${id}`} ${a.status ? `foi marcado como ${a.status}` : 'recebeu retorno do administrador.'}`,
            link: a.linkDetalhe || `detalhe-agendamento.html?id=${encodeURIComponent(id)}`,
            meta: { id, status: a.status || null }
          });
        } else if (a.status && /confirm|remarc|cancel|pendente|atendido/i.test(a.status)){
          pushNotif({
            type: 'agendamento',
            title: 'Status do agendamento atualizado',
            message: `Seu agendamento ${a.servico ? `"${a.servico}"` : `#${id}`} agora está como ${a.status}.`,
            link: a.linkDetalhe || `detalhe-agendamento.html?id=${encodeURIComponent(id)}`,
            meta: { id, status: a.status }
          });
        }
        cur.agd[id] = h;
      }
    });
    setCursor(cur);
  }
  function fullScan(){ scanDemands(); scanAppointments(); }
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureBadge();
    updateUI();
    function checkHash(){
      if(location.hash === '#notificacoes'){ markAllRead(); }
    }
    window.addEventListener('hashchange', checkHash);
    checkHash();
  });
  window.addEventListener('storage', ()=> fullScan());
  setInterval(fullScan, 4000);
  fullScan();
})();