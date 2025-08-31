// Lógica do jogo. Usa window.SB (supabase.js) e window.U (utils.js).

(function () {
  const sb = window.SB.client;
  const { $, show, hide, canPlay, stopAll, playAndWait, showFx, shuffle, sampleSplice, takeN } = window.U;

  /* REFS */
  const hero = $("#hero");
  const secQuiz  = $("#section-quiz");
  const secFinal = $("#section-final");

  const btnStart = $("#btnStart");
  const btnJogarNovamente = $("#btnJogarNovamente");

  const elPerg  = $("#quizPergunta");
  const elSub   = $("#valorPergunta");
  const elOps   = $("#quizOpcoes");

  const confirmBox = $("#confirmBox");
  const btnResponder = $("#btnResponder");
  const btnConfirmar = $("#btnConfirmar");
  const posBox   = $("#posAcertoBox");
  const posTitulo= $("#posAcertoTitulo");
  const btnParar = $("#btnParar");
  const btnContinuar = $("#btnContinuar");
  const btnPararAgora = $("#btnPararAgora");
  const ajudaBox = $("#ajudaBox");

  const btnUni = $("#btnUni");
  const btnCartas = $("#btnCartas");
  const btnAssistente = $("#btnAssistente");
  const btnPular = $("#btnPular");

  const finalTitulo = $("#finalTitulo");
  const finalMsg = $("#finalMsg");

  const fxOverlay = $("#fxOverlay");
  const fxAbertura     = $("#fxAbertura");
  const fxCerteza      = $("#fxCerteza");
  const fxEntendeu     = $("#fxEntendeu");
  const fxEstaCerto    = $("#fxEstaCerto");
  const fxQualResposta = $("#fxQualResposta");
  const fxCerta        = $("#fxCertaResposta");
  const fxErro         = $("#fxErro");

  /* ESTADO */
  const ladder=[100,200,300,500,1000,2000,5000,10000,20000,50000,100000,200000,300000,500000,750000,1000000];
  const safeIdx=new Set([4,9,14]);
  const pool = { facil:[], medio:[], dificil:[] };
  const lifelines = { uni:true, cartas:true, assist:true, skip:true };

  let perguntas=[], idx=0, escolha=null, acertos=0;

  /* DADOS */
  const mapLetraToIndex = (ch)=>({A:0,B:1,C:2,D:3}[(ch||'').toUpperCase()]);
  function normaliza(r,i){
    return {
      id:r.id ?? ('local_'+i+'_'+Date.now()),
      enunciado:r.enunciado,
      opcoes:[r.a,r.b,r.c,r.d],
      certa: mapLetraToIndex(r.correta),
      dificuldade:(r.dificuldade||'dificil').toLowerCase()
    }
  }
  async function buscarPerguntas(){
    try{
      const { data, error } = await sb
        .from('perguntas')
        .select('id,enunciado,a,b,c,d,correta,dificuldade,ativo')
        .eq('ativo', true)
        .limit(400);
      if(error) throw error;
      const todas=(data||[]).map(normaliza).filter(q=> q.certa>=0 && q.opcoes.every(Boolean));
      return montarSequencia(todas);
    }catch{
      // fallback
      const fb = [
        {enunciado:'Quem construiu a arca?',a:'Moisés',b:'Noé',c:'Paulo',d:'Pedro',correta:'B',dificuldade:'facil'},
        {enunciado:'Quem é o Salvador?',a:'Davi',b:'Jesus',c:'Abraão',d:'João',correta:'B',dificuldade:'facil'},
        {enunciado:'Apóstolo que escreveu muitas cartas',a:'Tiago',b:'Paulo',c:'Pedro',d:'João',correta:'B',dificuldade:'medio'},
      ].map(normaliza);
      return montarSequencia(fb);
    }
  }
  function montarSequencia(todas){
    pool.facil=[]; pool.medio=[]; pool.dificil=[];
    todas.forEach(q=>pool[q.dificuldade==='facil'?'facil':(q.dificuldade==='medio'?'medio':'dificil')].push(q));
    pool.facil=shuffle(pool.facil); pool.medio=shuffle(pool.medio); pool.dificil=shuffle(pool.dificil);
    const seq=[...takeN(pool.facil,3), ...takeN(pool.medio,3), ...takeN(pool.dificil,10)];
    const rest=[...pool.facil,...pool.medio,...pool.dificil];
    while(seq.length<16 && rest.length) seq.push(sampleSplice(rest));
    return seq.slice(0,16);
  }

  /* LIFELINES */
  function setLifelineButtons(){
    const set=(el,on)=>{ el.disabled=!on; el.style.opacity=on?1:.45; };
    set(btnUni, lifelines.uni); set(btnCartas, lifelines.cartas);
    set(btnAssistente, lifelines.assist); set(btnPular, lifelines.skip);
  }

  btnUni.addEventListener('click', ()=>{
    if(!lifelines.uni) return;
    lifelines.uni=false; setLifelineButtons();
    const correta=perguntas[idx].certa;
    const votos=[0,0,0,0]; let certeza = 60 + Math.floor(Math.random()*21);
    if(Math.random()<0.25){ const alt=[0,1,2,3].filter(x=>x!==correta); votos[alt[Math.floor(Math.random()*alt.length)]]=certeza; }
    else votos[correta]=certeza;
    let resto=100-certeza; const idxs=[0,1,2,3].filter(x=>votos[x]===0);
    idxs.forEach((i,k)=>{ const part = k<idxs.length-1 ? Math.floor(Math.random()*(resto-(idxs.length-1-k))) : resto; votos[i]=part; resto-=part; });
    ajudaBox.innerHTML = `<strong>Universitários:</strong><br>` + votos.map((v,i)=>`(${String.fromCharCode(65+i)}) ${v}%`).join(' — ');
    show(ajudaBox);
  });

  const cartasPool = [
    {nome:'JESUS', remove:3},
    {nome:'NOÉ', remove:2}, {nome:'MOISÉS', remove:2},
    {nome:'DAVI', remove:1}, {nome:'PEDRO', remove:1}, {nome:'JOÃO BATISTA', remove:1}, {nome:'JÓ', remove:1}, {nome:'PAULO', remove:1},
    {nome:'JUDAS', remove:0}, {nome:'GOLIAS', remove:0}, {nome:'FARAÓ', remove:0}, {nome:'BALAÃO', remove:0}, {nome:'SERPENTE', remove:0},
  ];
  btnCartas.addEventListener('click', ()=>{
    if(!lifelines.cartas) return;
    lifelines.cartas=false; setLifelineButtons();
    const carta = cartasPool[Math.floor(Math.random()*cartasPool.length)];
    const correta = perguntas[idx].certa;
    const erradas=[0,1,2,3].filter(i=>i!==correta);
    const qtd = Math.min(carta.remove, erradas.length);
    const removidas=[];
    for(let i=0;i<qtd;i++){ const take=erradas.splice(Math.floor(Math.random()*erradas.length),1)[0]; removidas.push(take); }
    removidas.forEach(i=>{
      const op=elOps.querySelector(`.op[data-i="${i}"]`);
      if(op){ op.style.opacity=.35; op.style.pointerEvents='none'; }
    });
    ajudaBox.innerHTML = `<strong>Cartas:</strong> ${carta.nome} → removeu ${qtd} alternativa(s).`;
    show(ajudaBox);
  });

  btnAssistente.addEventListener('click', ()=>{
    if(!lifelines.assist) return;
    lifelines.assist=false; setLifelineButtons();
    const correta=perguntas[idx].certa;
    ajudaBox.innerHTML = `<strong>Assistente:</strong> a resposta correta é <b>${String.fromCharCode(65+correta)}</b>.`;
    show(ajudaBox);
  });

  btnPular.addEventListener('click', ()=>{
    if(!lifelines.skip) return;
    lifelines.skip=false; setLifelineButtons();
    const resto = perguntas.slice(idx+1);
    if(!resto.length){ alert('Não há pergunta para pular.'); return; }
    perguntas[idx] = resto[Math.floor(Math.random()*resto.length)];
    renderPergunta(); canPlay(fxEntendeu);
  });

  /* RENDER */
  function renderPergunta(){
    const p=perguntas[idx];
    elPerg.textContent=p.enunciado;
    elSub.textContent=`Vale ${ladder[idx].toLocaleString('pt-BR')} talento(s) de sabedoria`;
    elOps.innerHTML=''; ajudaBox.textContent=''; hide(ajudaBox);
    hide(confirmBox); hide(posBox);
    escolha=null;

    p.opcoes.forEach((txt,i)=>{
      const div=document.createElement('div');
      div.className='op'; div.dataset.i=i;
      div.innerHTML=`<span class="bullet">${String.fromCharCode(65+i)}</span><span>${txt}</span>`;
      div.addEventListener('click',()=>{
        escolha=i;
        elOps.querySelectorAll('.op').forEach(o=>o.classList.remove('selected'));
        div.classList.add('selected');
      });
      elOps.appendChild(div);
    });
  }

  /* RESPOSTA */
  btnResponder.addEventListener('click', ()=>{
    if(escolha===null){ canPlay(fxCerteza); return; }
    show(confirmBox); hide(posBox);
    canPlay([fxCerteza,fxEstaCerto,fxQualResposta][idx % 3]);
  });

  btnConfirmar.addEventListener('click', async ()=>{
    const ok=(escolha===perguntas[idx].certa);
    const escolhas = elOps.querySelectorAll('.op');
    escolhas.forEach((el,i)=>{
      el.classList.remove('selected');
      if(i===perguntas[idx].certa) el.classList.add('correct');
      if(i===escolha && !ok) el.classList.add('wrong');
    });

    if(ok){
      acertos++;
      await Promise.all([playAndWait(fxCerta), showFx('ok', fxOverlay)]);
      const ganhoAtual = ladder[idx].toLocaleString('pt-BR');
      posTitulo.textContent = `Acertou! Você já tem ${ganhoAtual} talento(s). Deseja PARAR agora ou CONTINUAR?`;
      hide(confirmBox); show(posBox);
      btnParar.onclick = ()=> finalizar({parouDepois:true});
      btnContinuar.onclick = ()=>{ idx++; (idx<perguntas.length) ? renderPergunta() : finalizar({}); canPlay(fxEntendeu); };
    } else {
      await Promise.all([playAndWait(fxErro), showFx('wrong', fxOverlay)]);
      finalizar({errou:true});
    }
  });

  btnPararAgora.addEventListener('click', ()=>{
    if(!confirm('Deseja encerrar agora e ficar com o valor acumulado até aqui?')) return;
    finalizar({parouAgora:true});
  });

  /* FINAL */
  function acumuladoAtual(){ return acertos>0 ? ladder[acertos-1] : 0; }
  function calculaCheckpoint(){
    if (acertos===0) return 0;
    if (acertos===perguntas.length) return ladder[ladder.length-1];
    let premio=0;
    for (let i=0;i<acertos;i++){ if(safeIdx.has(i)) premio=ladder[i]; }
    return premio;
  }
  async function finalizar({parouAgora=false, parouDepois=false, errou=false}){
    let tesouro=0;
    if (parouAgora) tesouro = acumuladoAtual();
    else if (parouDepois) tesouro = ladder[idx];
    else if (errou) tesouro = calculaCheckpoint();
    else tesouro = ladder[ladder.length-1];

    try{
      const payload = { nome: 'Convidado', fone: null, pontos: acertos, tesouro, quando: new Date().toISOString() };
      await sb.from('ranking').insert([payload]);
    }catch(e){ console.warn('Falha ao gravar ranking:', e?.message||e); }

    hide(secQuiz); show(secFinal);
    if(errou){
      finalTitulo.textContent = 'Não foi dessa vez 😅';
      finalMsg.textContent = `Você terminou com ${tesouro.toLocaleString('pt-BR')} talento(s).`;
    } else if(parouDepois || parouAgora){
      finalTitulo.textContent = 'Você decidiu parar 👏';
      finalMsg.textContent = `Parabéns! Você garantiu ${tesouro.toLocaleString('pt-BR')} talento(s).`;
    } else {
      finalTitulo.textContent = 'Você concluiu todas as perguntas! 🏆';
      finalMsg.textContent = `Pontuação máxima: ${tesouro.toLocaleString('pt-BR')} talento(s).`;
    }
  }

  /* ENTRADA */
  btnStart.addEventListener('click', async ()=>{
    canPlay(fxAbertura);
    hero.style.transition='transform .35s ease, opacity .35s ease';
    hero.style.transform='translateY(-8px)'; hero.style.opacity='0';
    setTimeout(async ()=>{
      hero.style.display='none';
      perguntas = await buscarPerguntas();
      idx=0; escolha=null; acertos=0;
      lifelines.uni=true; lifelines.cartas=true; lifelines.assist=true; lifelines.skip=true;
      setLifelineButtons();
      show(secQuiz); renderPergunta(); canPlay(fxEntendeu);
    }, 360);
  });

  btnJogarNovamente.addEventListener('click', ()=>{
    hero.style.display='block';
    hero.style.transition=''; hero.style.opacity='1'; hero.style.transform='none';
    stopAll([fxAbertura,fxCerteza,fxEntendeu,fxEstaCerto,fxQualResposta,fxCerta,fxErro]);
    hide(secQuiz); hide(secFinal);
  });
})();
