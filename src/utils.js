// Utilitários usados pelo main.js. Disponíveis em window.U.

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const show = (el) => el.classList.remove("hidden");
  const hide = (el) => el.classList.add("hidden");
  const stop = (a) => { try { a.pause(); a.currentTime = 0; } catch {} };
  const canPlay = (a) => { try { a.currentTime = 0; a.play().catch(()=>{}); } catch {} };
  const stopAll = (arr) => arr.forEach(stop);

  function playAndWait(audio){
    return new Promise(resolve=>{
      try{
        audio.currentTime=0;
        const onEnd=()=>{ audio.removeEventListener('ended', onEnd); resolve(); };
        audio.addEventListener('ended', onEnd);
        audio.play().catch(()=>resolve());
      }catch{ resolve(); }
    });
  }

  function showFx(type, overlay){
    return new Promise(resolve=>{
      const cls = type === 'ok' ? 'fx-ok' : 'fx-wrong';
      overlay.classList.add(cls);
      setTimeout(()=>{ overlay.classList.remove(cls); resolve(); }, type === 'ok' ? 950 : 800);
    });
  }

  function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
  function sampleSplice(arr){ return arr.splice(Math.floor(Math.random()*arr.length),1)[0]; }
  function takeN(arr, n){ const out=[]; for(let i=0;i<n && arr.length;i++) out.push(sampleSplice(arr)); return out; }

  window.U = { $, $$, show, hide, stop, canPlay, stopAll, playAndWait, showFx, shuffle, sampleSplice, takeN };
})();
