import { sb } from './supabase.js';

const tbody = document.getElementById('tbody');
const msg = document.getElementById('msg');

function setMsg(t, ok=false){ msg.style.color = ok ? '#9FE870' : '#ffd76a'; msg.textContent = t; }

async function load(){
  const { data, error } = await sb.from('ranking').select('id,nome,fone,pontos,tesouro,quando').order('tesouro',{ascending:false}).order('pontos',{ascending:false}).order('quando',{ascending:true}).limit(200);
  if(error){ tbody.innerHTML = `<tr><td colspan="6">Erro: ${error.message}</td></tr>`; return; }
  if(!data.length){ tbody.innerHTML = `<tr><td colspan="6" style="opacity:.8">Sem registros.</td></tr>`; return; }
  tbody.innerHTML = data.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${r.nome||''}</td>
      <td>${r.fone||''}</td>
      <td>${Number(r.tesouro||0).toLocaleString('pt-BR')}</td>
      <td>${r.pontos||0}</td>
      <td>${new Date(r.quando).toLocaleString('pt-BR')}</td>
    </tr>`).join('');
}

document.getElementById('csv').onclick = async ()=>{
  setMsg('Gerando CSV…');
  const { data, error } = await sb.from('ranking').select('nome,fone,pontos,tesouro,quando').order('tesouro',{ascending:false}).order('pontos',{ascending:false}).order('quando',{ascending:true});
  if(error){ setMsg('Erro ao exportar: '+error.message); return; }
  const rows = [['nome','fone','pontos','tesouro','quando'], ...data.map(r=>[r.nome,r.fone,r.pontos,r.tesouro,r.quando])];
  const csv = rows.map(r=> r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ranking-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setMsg('CSV exportado.', true);
};

document.getElementById('wipe').onclick = async ()=>{
  if(!confirm('Tem certeza que deseja apagar TODO o ranking?')) return;
  setMsg('Apagando…');
  const { error } = await sb.from('ranking').delete().gt('id', -1);
  if(error){ setMsg('Erro: ' + error.message); return; }
  setMsg('Ranking zerado.', true);
  load();
};

load();