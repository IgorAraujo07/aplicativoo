// bridge-agendamento-cidadao.js
(function () {
  const AUTH_KEY = 'wc.auth';
  const PREFIX = 'wc.agendamentos.'; // *** igual ao ADMIN ***

  // util storage
  const LS = {
    read(k, def = []) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : def; } catch { return def; } },
    write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  const genId = () => `A${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const normDate = (v) => {
    if (!v) return '';
    // se vier YYYY-MM-DD (input type=date), converte para DD/MM/AAAA
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y,m,d] = v.split('-');
      return `${d}/${m}/${y}`;
    }
    return v;
  };

  // usuário logado
  let auth = null;
  try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch {}
  const usuario = auth?.usuario || 'anon';
  const nome = auth?.nome || auth?.usuario || 'Cidadão';

  // elementos do formulário (ajuste os IDs no HTML se precisar)
  const form        = document.getElementById('form-agendamento');
  const selServico  = document.getElementById('ag-servico');
  const inpData     = document.getElementById('ag-data');
  const selHora     = document.getElementById('ag-hora');
  const txtObs      = document.getElementById('ag-obs');          // textarea
  const btnLimpar   = document.getElementById('btn-limpar-ag');   // opcional

  if (!form || !selServico || !inpData || !selHora) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const servico = (selServico.value || '').trim();
    const dataStr = normDate((inpData.value || '').trim());
    const hora    = (selHora.value || '').trim();
    const observacoes = (txtObs?.value || '').trim();

    if (!servico) { alert('Escolha um serviço.'); selServico.focus(); return; }
    if (!dataStr) { alert('Informe a data.');     inpData.focus();   return; }
    if (!hora)    { alert('Escolha o horário.');  selHora.focus();   return; }

    const registro = {
      id: genId(),
      usuario, nome,
      servico,
      data: dataStr,   // DD/MM/AAAA
      hora,
      observacoes,     // *** nome que o seu ADMIN usa ***
      status: 'pendente',  // o ADMIN também mantém status separado; aqui fica default
      createdAt: new Date().toISOString()
    };

    // salva na lista do usuário que o ADMIN lê: "wc.agendamentos.<usuario>"
    const KEY = `${PREFIX}${usuario}`;
    const lista = LS.read(KEY);
    lista.push(registro);
    LS.write(KEY, lista);

    // ping p/ atualizar outras abas (ADMIN com listener de 'storage')
    localStorage.setItem('wc.ag_ping', String(Date.now()));

    form.reset();
    alert('Agendamento enviado com sucesso!');
  });

  if (btnLimpar) btnLimpar.addEventListener('click', () => form.reset());
})();
