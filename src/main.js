// Jogo Show do Crentão - versão de estabilização
// - Botão INICIAR funcionando
// - Fallback de perguntas se o Supabase falhar
// - Sem depender de import.meta
// - Tolerante a fxErro/fxErrou

(function(){
  // ===== util =====
  const $ = (s)=>document.querySelector(s);
  const show = (el)=>el && el.classList.remove('hidden');
  const hide = (el)=>el && el.classList.add('hidden');
  const canPlay = (a)=>{ try{ a.currentTime=0; a.play().catch(()=>{});}catch{} };
  const stop = (a)=>{ try{ a.pause(); a.currentTime=0; }catch{} };
  const playAndWait = (a)=>new Promise(res=>{
    if(!a){ res(); return; }
    try{
      a.currentTime=0;
      const onEnd=()=>{ a.removeEventListener('ended', onEnd); res(); };
      a.addEventListener('ended', onEnd);
      a.play().catch(res);
    }catch{ res(); }
  });
  const shuffle = (arr)=>{ arr=[...arr]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; };

  // ===== refs mínimos =====
  const hero = $('#hero');
  const btnStart = $('#btnStart');
  const btnRanking = $('#btnRanking');

  const secQuiz  = $('#section-quiz');
  const secFinal = $('#section-final');

  const elPerg   = $('#quizPergunta');
  const elSub    = $('#valorPergunta');
  const elOps    = $('#quizOpcoes');

  const btnResponder  = $('#btnResponder');
  const confirmBox    = $('#confirmBox');
  const btnConfirmar  = $('#btnConfirmar');

  const posBox        = $('#posAcertoBox');
  const posTitulo     = $('#posAcertoTitulo');
  const btnParar      = $('#btnParar');
  const btnContinuar  = $('#btnContinuar');
  const btnPararAgora = $('#btnPararAgora');

  const btnUni       = $('#btnUni');
  const btnCartas    = $('#btnCartas');
  const btnAssist    = $('#btnAssistente');
  const btnPular     = $('#btnPular');
  const ajudaBox     = $('#ajudaBox');

  const finalTitulo  = $('#finalTitulo');
  const finalMsg     = $('#finalMsg');
  const btnAgain     = $('#btnJogarNovamente');

  const fxAbertura     = $('#fxAbertura');
  const fxCerteza      = $('#fxCerteza');
  const fxEntendeu     = $('#fxEntendeu');
  const fxEstaCerto    = $('#fxEstaCerto');
  const fxQualResposta = $('#fxQualResposta');
  const fxCerta        = $('#fxCertaResposta');
  const fxErro         = $('#fxErro') || $('#fxErrou'); // tolera os dois

  // ===== estado =====
  const ladder=[100,200,300,500,1000,2000,5000,10000,20000,50000,100000,200000,300000,500000,750000,1000000];
  const safeIdx = new Set([4,9,14]);
  let perguntas=[], idx=0, escolha=null, acertos=0;
  const lifelines = { uni:true, cartas:true, assist:true, skip:true };

  // ===== perguntas (Supabase com fallback) =====
  const sb = (window.SB && window.SB.client) || null;

  function letraToIdx(ch){ return ({A:0,B:1,C:2,D:3}[(ch||'').toUpperCase()]); }
  function normaliza(r,i){
    return {
      id:r.id ?? ('local_'+i+'_'+Date.now()),
      enunciado:r.enunciado,
      opcoes:[r.a,r.b,r.c,r.d],
      certa: letraToIdx(r.correta),
      dificuldade:(r.dificuldade||'dificil').toLowerCase()
    };
  }
  async function carregarPerguntas(){
    try{
      if(!sb) throw new Error('Supabase indisponível');
      const { data, error } = await sb
        .from('perguntas')
        .select('id,enunciado,a,b,c,d,correta,dificuldade,ativo')
        .eq('ativo', true)
        .limit(400);
      if(error) throw error;
      const ok = (data||[]).map(normaliza).filter(q=>q.certa>=0 && q.opcoes.every(Boolean));
      return montarSequencia(ok);
    }catch(e){
      // fallback simples
      const fb = [
        {enunciado:'Quem construiu a arca?', a:'Moisés', b:'Noé', c:'Paulo', d:'Pedro', correta:'B', dificuldade:'facil'},
        {enunciado:'Quem é o Salvador?', a:'Davi', b:'Jesus', c:'Abraão', d:'João', correta:'B', dificuldade:'facil'},
        {enunciado:'Apóstolo que escreveu muitas cartas', a:'Tiago', b:'Paulo', c:'Pedro', d:'João', correta:'B', dificuldade:'medio'},
      ].map(normaliza);
      return montarSequencia(fb);
    }
  }
  function montarSequencia(todas){
    // 3 fáceis, 3 médias, resto difíceis (ou o que tiver)
    const fac = shuffle(todas.filter(q=>q.dificuldade==='facil'));
    const med = shuffle(todas.filter(q=>q.dificuldade==='medio'));
    const dif = shuffle(todas.filter(q=>q.dificuldade!=='facil' && q.dificuldade!=='medio'));
    const seq=[...fac.slice(0,3), ...med.slice(0,3), ...dif];
    return seq.slice(0,16);
  }

  // ===== UI =====
  function setLifelines(){
    const set=(el,on)=>{ if(!el) return; el.disabled=!on; el.style.opacity=on?1:.45; };
    set(btnUni, lifelines.uni); set(btnCartas, lifelines.cartas);
    set(btnAssist, lifelines.assist); set(btnPular, lifelines.skip);
  }

  function renderPergunta(){
    const p=perguntas[idx];
    elPerg.textContent = p.enunciado;
    elSub.textContent  = `Vale ${ladder[idx].toLocaleString('pt-BR')} talento(s) de sabedoria`;
    elOps.innerHTML=''; hide(ajudaBox); ajudaBox.innerHTML='';
    hide(confirmBox); hide(posBox); escolha=null;

    p.opcoes.forEach((txt,i)=>{
      const div=document.createElement('div');
      div.className='op'; div.dataset.i=i;
      div.innerHTML=`<span class="bullet">${String.fromCharCode(65+i)}</span><span>${txt}</span>`;
      div.addEventListener('click', ()=>{
        escolha=i;
        elOps.querySelectorAll('.op').forEach(o=>o.classList.remove('selected'));
        div.classList.add('selected');
      });
      elOps.appendChild(div);
    });
  }

  // ===== fluxo =====
  async function startGame(){
    // esconde capa e mostra quiz imediatamente
    if(hero){ hero.style.display='none'; }
    show(secQuiz);
    setLifelines();

    // carrega perguntas (com fallback) e renderiza
    perguntas = await carregarPerguntas();
    idx=0; acertos=0; escolha=null;
    renderPergunta();
    canPlay(fxEntendeu);
  }

  // ===== eventos =====
  if(btnStart){
    btnStart.addEventListener('click', ()=>{
      // (efeito de som é opcional; não bloqueia)
      canPlay(fxAbertura);
      startGame();
    });
  }
  if(btnRanking){
    btnRanking.addEventListener('click', ()=> location.href='ranking.html');
  }
  if(btnAgain){
    btnAgain.addEventListener('click', ()=>{
      if(hero){ hero.style.display='block'; }
      hide(secQuiz); hide(secFinal);
    });
  }

  if(btnResponder){
    btnResponder.addEventListener('click', ()=>{
      if(escolha===null){ canPlay(fxCerteza); return; }
      show(confirmBox);
      canPlay([fxCerteza,fxEstaCerto,fxQualResposta][idx % 3]);
    });
  }

  if(btnConfirmar){
    btnConfirmar.addEventListener('click', async ()=>{
      const certa = perguntas[idx].certa;
      const ok = escolha===certa;

      elOps.querySelectorAll('.op').forEach((el,i)=>{
        el.classList.remove('selected');
        if(i===certa) el.classList.add('correct');
        if(i===escolha && !ok) el.classList.add('wrong');
      });

      if(ok){
        acertos++;
        await playAndWait(fxCerta);
        const ganho = ladder[idx].toLocaleString('pt-BR');
        posTitulo.textContent = `Acertou! Você já tem ${ganho} talento(s). Deseja PARAR agora ou CONTINUAR?`;
        hide(confirmBox); show(posBox);
        btnParar.onclick = ()=> finalizar({parouDepois:true});
        btnContinuar.onclick = ()=>{ idx++; (idx<perguntas.length) ? renderPergunta() : finalizar({}); canPlay(fxEntendeu); };
      }else{
        await playAndWait(fxErro);
        finalizar({errou:true});
      }
    });
  }

  if(btnPararAgora){
    btnPararAgora.addEventListener('click', ()=>{
      if(confirm('Deseja encerrar agora e ficar com o valor acumulado?')){
        finalizar({parouAgora:true});
      }
    });
  }

  // Ajudas (versões simples só pra não travar nada)
  if(btnUni){
    btnUni.addEventListener('click', ()=>{
      if(!lifelines.uni) return; lifelines.uni=false; setLifelines();
      const correta=perguntas[idx].certa;
      const votos=[0,0,0,0]; let certeza=60+Math.floor(Math.random()*21);
      if(Math.random()<0.25){ // às vezes erram
        const alts=[0,1,2,3].filter(i=>i!==correta);
        votos[alts[Math.floor(Math.random()*alts.length)]]=certeza;
      }else votos[correta]=certeza;
      let resto=100-certeza, zeros=[0,1,2,3].filter(i=>votos[i]===0);
      zeros.forEach((i,k)=>{ const part = k<zeros.length-1 ? Math.floor(Math.random()*(resto-(zeros.length-1-k))) : resto; votos[i]=part; resto-=part; });
      ajudaBox.innerHTML = `<strong>Universitários:</strong><br>` + votos.map((v,i)=>`(${String.fromCharCode(65+i)}) ${v}%`).join(' — ');
      show(ajudaBox);
    });
  }
  if(btnAssist){
    btnAssist.addEventListener('click', ()=>{
      if(!lifelines.assist) return; lifelines.assist=false; setLifelines();
      const correta=perguntas[idx].certa;
      ajudaBox.innerHTML = `<strong>Assistente:</strong> a resposta correta é <b>${String.fromCharCode(65+correta)}</b>.`;
      show(ajudaBox);
    });
  }
  if(btnCartas){
    btnCartas.addEventListener('click', ()=>{
      if(!lifelines.cartas) return; lifelines.cartas=false; setLifelines();
      const correta=perguntas[idx].certa;
      const erradas=[0,1,2,3].filter(i=>i!==correta);
      // remove entre 0 e 3, aleatório (Jesus=3, etc. depois a gente personaliza)
      const qtd = Math.floor(Math.random()*4);
      shuffle(erradas).slice(0,qtd).forEach(i=>{
        const el=elOps.querySelector(`.op[data-i="${i}"]`);
        if(el){ el.style.opacity=.35; el.style.pointerEvents='none'; }
      });
      ajudaBox.innerHTML = `<strong>Cartas:</strong> removeu ${Math.min(qtd,3)} alternativa(s).`;
      show(ajudaBox);
    });
  }
  if(btnPular){
    btnPular.addEventListener('click', ()=>{
      if(!lifelines.skip) return; lifelines.skip=false; setLifelines();
      // troca por outra pergunta da própria lista (se houver)
      const resto = perguntas.filter((_,i)=>i!==idx);
      if(resto.length){
        perguntas[idx]=resto[Math.floor(Math.random()*resto.length)];
        renderPergunta(); canPlay(fxEntendeu);
      }else{
        alert('Sem pergunta para pular.');
      }
    });
  }

  // ===== finalizar =====
  function acumuladoAtual(){ return acertos>0 ? ladder[acertos-1] : 0; }
  function checkpoint(){
    if(acertos===0) return 0;
    if(acertos>=ladder.length) return ladder.at(-1);
    let prem=0; for(let i=0;i<acertos;i++){ if(safeIdx.has(i)) prem=ladder[i]; } return prem;
  }
  async function finalizar({parouAgora=false, parouDepois=false, errou=false}){
    let tesouro=0;
    if(parouAgora) tesouro=acumuladoAtual();
    else if(parouDepois) tesouro=ladder[idx];
    else if(errou) tesouro=checkpoint();
    else tesouro=ladder.at(-1);

    // grava simples no ranking (se existir Supabase)
    try{
      if(sb){
        await sb.from('ranking').insert([{ nome:'Convidado', fone:null, pontos:acertos, tesouro, quando:new Date().toISOString() }]);
      }
    }catch(e){ /* silencioso */ }

    hide(secQuiz); show(secFinal);
    if(errou){ finalTitulo.textContent='Não foi dessa vez 😅'; finalMsg.textContent=`Você terminou com ${tesouro.toLocaleString('pt-BR')} talento(s).`; }
    else if(parouDepois||parouAgora){ finalTitulo.textContent='Você decidiu parar 👏'; finalMsg.textContent=`Parabéns! Você garantiu ${tesouro.toLocaleString('pt-BR')} talento(s).`; }
    else{ finalTitulo.textContent='Você concluiu todas as perguntas! 🏆'; finalMsg.textContent=`Pontuação máxima: ${tesouro.toLocaleString('pt-BR')} talento(s).`; }
  }
})();
