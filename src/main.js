import { sb } from './supabase.js';
import { ladder, checkpoints, shuffle, pickN, formatPrize, sleep } from './utils.js';

const $ = (id)=>document.getElementById(id);
const home=$('home'), form=$('form'), play=$('play'), finalS=$('final');
const enun=$('enunciado'), valor=$('valor'), ops=$('ops');
const uni=$('uni'), fifty=$('fifty'), skip=$('skip'), ajuda=$('ajuda');
const confirmBox=$('confirm'), lock=$('lock'), postwin=$('postwin'), postwinTitle=$('postwinTitle');
const send=$('send'), clearBtn=$('clear'), stopBtn=$('stop'), contBtn=$('cont');

$('start').onclick=()=>{ home.classList.add('hidden'); form.classList.remove('hidden'); };
$('cancel').onclick=()=>{ form.classList.add('hidden'); home.classList.remove('hidden'); };

let participante=null, gameId=null;
$('go').onclick=async()=>{
  const nome=$('nome').value.trim(); const fone=$('fone').value.trim();
  if(!nome){ alert('Informe seu nome'); return; }
  participante={nome, fone, user_key:`${nome}|${fone||'anon'}|${Date.now()}`};
  const { data, error } = await sb.from('game').insert([{ nome, fone, jogador_id: undefined }]).select('id').single();
  if(error){ console.warn(error); }
  gameId = data?.id || null;
  form.classList.add('hidden'); play.classList.remove('hidden');
  startGame();
};

let perguntas=[], pool={facil:[],medio:[],dificil:[]}, idx=0, escolha=null, acertos=0;
let usedHelps=0, usedAnyHelp=false, totalTime=0;
let qStart=0;

function radio(name,val,label){
  const id = `${name}_${val}`;
  const wrap = document.createElement('label');
  wrap.innerHTML = `<input type="radio" name="${name}" value="${val}" id="${id}"> <span>${label}</span>`;
  wrap.querySelector('input').onchange=()=>{ escolha=parseInt(val); };
  return wrap;
}

async function fetchPerguntas(){
  const { data, error } = await sb.from('perguntas').select('id,enunciado,a,b,c,d,correta,dificuldade,ativo').eq('ativo', true).limit(500);
  if(error) throw error;
  const norm = (r)=>({ id:r.id, enunciado:r.enunciado, opcoes:[r.a,r.b,r.c,r.d], certa:'ABCD'.indexOf((r.correta||'').toUpperCase()), dificuldade:(r.dificuldade||'dificil').toLowerCase() });
  const all = data.map(norm).filter(q=> q.certa>=0 && q.opcoes.every(Boolean));
  pool={facil:[],medio:[],dificil:[]};
  all.forEach(q=>{ const d=(q.dificuldade==='facil'?'facil':q.dificuldade==='medio'?'medio':'dificil'); pool[d].push(q); });
  pool.facil=shuffle(pool.facil); pool.medio=shuffle(pool.medio); pool.dificil=shuffle(pool.dificil);
  const seq=[...pickN(pool.facil,5), ...pickN(pool.medio,6), ...pickN(pool.dificil,5)];
  // fill if missing
  const rest = shuffle([...pool.facil, ...pool.medio, ...pool.dificil].filter(q=> !seq.find(s=>s.id===q.id)));
  while(seq.length<17 && rest.length) seq.push(rest.pop());
  return seq.slice(0,17);
}

function setLifelineButtons(state){
  const {uni:f1,fifty:f2,skip:f3}=state;
  uni.disabled=!f1; uni.style.opacity=f1?1:.5;
  fifty.disabled=!f2; fifty.style.opacity=f2?1:.5;
  skip.disabled=!f3; skip.style.opacity=f3?1:.5;
}

const lifelines={uni:true,fifty:true,skip:true};

async function startGame(){
  perguntas = await fetchPerguntas();
  idx=0; escolha=null; acertos=0; usedHelps=0; usedAnyHelp=false; totalTime=0;
  lifelines.uni=true; lifelines.fifty=true; lifelines.skip=true;
  setLifelineButtons(lifelines);
  render();
}

function render(){
  const p = perguntas[idx];
  enun.textContent = p.enunciado;
  valor.textContent = `Vale ${formatPrize(ladder[idx])} talento(s)`;
  ajuda.classList.add('hidden'); ajuda.innerHTML='';
  confirmBox.classList.add('hidden'); postwin.classList.add('hidden');
  ops.innerHTML='';
  p.opcoes.forEach((txt,i)=> ops.appendChild(radio('op', i, txt)));
  escolha=null;
  qStart = performance.now();
}

function showConfirm(){ confirmBox.classList.remove('hidden'); }
function showPostWin(msg){ postwinTitle.textContent = msg; postwin.classList.remove('hidden'); }

// Lifelines
uni.onclick=()=>{
  if(!lifelines.uni || idx===16) return;
  lifelines.uni=false; usedHelps++; usedAnyHelp=true; setLifelineButtons(lifelines);
  const correta = perguntas[idx].certa;
  const votos=[0,0,0,0];
  let base=60+Math.floor(Math.random()*16);
  votos[correta]=base; let resto=100-base;
  const others=[0,1,2,3].filter(i=>i!==correta);
  others.forEach((i,k)=>{ const part = k<others.length-1 ? Math.floor(Math.random()*(resto-(others.length-1-k))) : resto; votos[i]=part; resto-=part; });
  ajuda.innerHTML = 'Universitários:<br>' + votos.map((v,i)=>`(${String.fromCharCode(65+i)}) ${v}%`).join(' — ');
  ajuda.classList.remove('hidden');
};

fifty.onclick=()=>{
  if(!lifelines.fifty || idx===16) return;
  lifelines.fifty=false; usedHelps++; usedAnyHelp=true; setLifelineButtons(lifelines);
  const correta=perguntas[idx].certa;
  const erradas=[0,1,2,3].filter(i=>i!==correta);
  while(erradas.length>1){
    const r = erradas.splice(Math.floor(Math.random()*erradas.length),1)[0];
    const input = ops.querySelector(`input[value="${r}"]`);
    if(input){ input.disabled=true; input.parentElement.style.opacity=.35; }
  }
};

skip.onclick=()=>{
  if(!lifelines.skip || idx===16) return;
  const atual = perguntas[idx];
  const repo = (atual.dificuldade==='facil'?pool.facil:atual.dificuldade==='medio'?pool.medio:pool.dificil).filter(q=> q.id!==atual.id && !perguntas.find(s=>s.id===q.id));
  if(!repo.length){ alert('Sem alternativa desse nível para pular.'); return; }
  lifelines.skip=false; usedHelps++; usedAnyHelp=true; setLifelineButtons(lifelines);
  const nova = repo[Math.floor(Math.random()*repo.length)];
  perguntas[idx]=nova;
  render();
};

send.onclick=()=>{
  if(escolha===null){ alert('Selecione uma opção'); return; }
  showConfirm();
};

lock.onclick=async()=>{
  const elapsed = Math.round(performance.now()-qStart);
  totalTime += elapsed;
  const ok = (escolha===perguntas[idx].certa);
  if(ok){
    acertos++;
    const ganho = ladder[idx];
    showPostWin(`Acertou! Você já tem ${formatPrize(ganho)}. Parar ou continuar?`);
    stopBtn.onclick = ()=> finish({parouDepois:true});
    contBtn.onclick = ()=>{
      idx++;
      if(idx<perguntas.length) render();
      else finish({});
    };
  } else {
    finish({errou:true});
  }
};

clearBtn.onclick=()=>{
  ops.querySelectorAll('input[type=radio]').forEach(r=> r.checked=false);
  escolha=null;
};

function acumulado(){ return acertos>0 ? ladder[acertos-1] : 0; }
function checkpoint(){
  if (acertos===0) return 0;
  if (acertos===perguntas.length) return ladder[ladder.length-1];
  let premio=0; for(let i=0;i<acertos;i++){ if(checkpoints.has(i)) premio=ladder[i]; }
  return premio;
}

async function finish({parouDepois=false, errou=false}={}){
  let tesouro=0;
  if(parouDepois) tesouro = ladder[idx];
  else if(errou) tesouro = checkpoint();
  else tesouro = ladder[ladder.length-1];

  // Persist (compat)
  try{
    await sb.from('game').insert([{ nome: participante.nome, fone: participante.fone, pontos: acertos, tesouro, tempo_resposta: totalTime }]);
  }catch(e){ console.warn(e); }

  try{
    await sb.from('ranking').insert([{ nome: participante.nome, fone: participante.fone, pontos: acertos, tesouro, quando: new Date().toISOString() }]);
  }catch(e){ /* table may not exist in this simplified scaffold; ignore */ }

  // UI
  play.classList.add('hidden'); finalS.classList.remove('hidden');
  if(errou){ $('finalTitle').textContent='Não foi dessa vez 😅'; }
  else if(parouDepois){ $('finalTitle').textContent='Você decidiu parar 👏'; }
  else { $('finalTitle').textContent='Você concluiu todas as perguntas! 🏆'; }
  $('finalMsg').textContent = `Você garantiu ${formatPrize(tesouro)} talento(s) e acertou ${acertos} de ${perguntas.length}.`;
}