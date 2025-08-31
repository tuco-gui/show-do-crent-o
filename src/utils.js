export const ladder = [1000,2000,3000,4000,5000,10000,20000,30000,40000,60000,80000,100000,200000,300000,400000,500000,1000000];
export const checkpoints = new Set([4,9,14]); // indexes 5,10,15 visually

export const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));

export function shuffle(a){
  const arr=[...a]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
}

export function pickN(arr, n){
  const a=[...arr]; const out=[]; while(out.length<n && a.length) out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]);
  return out;
}

export function formatPrize(v){ return v.toLocaleString('pt-BR'); }