import { sb } from './supabase.js';

const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/ranking?select=nome,fone,tesouro,pontos,quando&order=tesouro.desc, pontos.desc, quando.asc`;
const headers = { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` };

async function fetchRanking(){
  const r = await fetch(url, { headers });
  if(!r.ok) throw new Error('Falha ao ler ranking');
  return r.json();
}

function render(list){
  const box = document.getElementById('list');
  box.innerHTML = list.map((r,i)=>{
    return `<div class="item">
      <div class="pos">${i+1}</div>
      <div><strong>${r.nome||'-'}</strong><div style="opacity:.7">${r.fone||''}</div></div>
      <div>${Number(r.tesouro||0).toLocaleString('pt-BR')} talento(s)</div>
      <div>${Number(r.pontos||0)} acerto(s)</div>
    </div>`;
  }).join('');
}

(async()=>{
  try{ render(await fetchRanking()); }
  catch(e){ document.getElementById('list').textContent = 'Erro: ' + e.message; }
})();