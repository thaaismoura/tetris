(() => {
  const COLS = 10, ROWS = 20, BLOCK = 30;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nctx = nextCanvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();

  const elScore = document.getElementById('score');
  const elLevel = document.getElementById('level');
  const elSpeed = document.getElementById('speed');
  const elLinesToNext = document.getElementById('linesToNext');
  const btnMusic = document.getElementById('btnMusic');
  const btnPause = document.getElementById('btnPause');
  const bgm = document.getElementById('bgm');

  // Mantém sua lógica de reduzir levemente a área (se quiser, pode remover)
  function resizeCanvas(){
    const width = canvas.clientWidth * 0.9;
    const height = width * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }
  addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const SHAPES = {
    I: [[1,1,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0]],
    T: [[0,1,0],[1,1,1]],
    Z: [[1,1,0],[0,1,1]],
  };
  const COLORS = {
    I:'#60a5fa',J:'#c084fc',L:'#f59e0b',O:'#fde047',S:'#34d399',T:'#f472b6',Z:'#ef4444'
  };

  const board = Array.from({length: ROWS},()=>Array(COLS).fill(null));
  let bag=[]; function refillBag(){ bag=Object.keys(SHAPES).sort(()=>Math.random()-0.5);} function nextType(){ if(!bag.length) refillBag(); return bag.pop(); }

  function newPiece(type){ const s=SHAPES[type].map(r=>r.slice()); return {type,shape:s,x:Math.floor((COLS-s[0].length)/2),y:-2}; }
  let cur=null,next=newPiece(nextType());

  let running=false,paused=false,lastTime=0, dropCounter=0;
  let level=1,score=0,linesClearedThisLevel=0;
  const SPEEDS=[1000,850,700,600,520,450,390,340,300,260,230,200];
  const currentSpeed=()=>SPEEDS[Math.min(level-1,SPEEDS.length-1)];
  function updateSidebar(){ if(elScore) elScore.textContent=score; if(elLevel) elLevel.textContent=level; if(elSpeed) elSpeed.textContent=currentSpeed()>=850?'Lenta':currentSpeed()>=520?'Média':'Rápida'; if(elLinesToNext) elLinesToNext.textContent=Math.max(0,5-linesClearedThisLevel); }

  function rotate(m){return m.map((r,i)=>r.map((_,j)=>m[m.length-1-j][i]));}
  function collide(b,p){for(let y=0;y<p.shape.length;y++){for(let x=0;x<p.shape[y].length;x++){if(!p.shape[y][x])continue;const nx=p.x+x,ny=p.y+y;if(ny<0)continue;if(nx<0||nx>=COLS||ny>=ROWS)return true;if(b[ny][nx])return true;}}return false;}
  function merge(b,p){for(let y=0;y<p.shape.length;y++)for(let x=0;x<p.shape[y].length;x++)if(p.shape[y][x]){const ny=p.y+y,nx=p.x+x;if(ny>=0)b[ny][nx]=p.type;}}

  function clearLines(){let lines=0;for(let y=ROWS-1;y>=0;y--){if(board[y].every(c=>c)){board.splice(y,1);board.unshift(Array(COLS).fill(null));lines++;y++;}}if(lines){const add=lines===1?100:lines===2?250:lines===3?450:700;score+=add*level;linesClearedThisLevel+=lines;while(linesClearedThisLevel>=5){level++;linesClearedThisLevel-=5;}updateSidebar();}}

  function drawCell(x,y,t){if(!t)return;const c=COLORS[t],px=x*BLOCK,py=y*BLOCK;ctx.fillStyle=c;ctx.fillRect(px,py,BLOCK,BLOCK);ctx.strokeStyle='rgba(0,0,0,.25)';ctx.strokeRect(px+.5,py+.5,BLOCK-1,BLOCK-1);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(px+2,py+2,BLOCK-4,Math.floor(BLOCK/3));}
  function drawBoard(){ctx.clearRect(0,0,canvas.width,canvas.height);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)drawCell(x,y,board[y][x]);if(cur){for(let y=0;y<cur.shape.length;y++)for(let x=0;x<cur.shape[y].length;x++)if(cur.shape[y][x]&&cur.y+y>=0)drawCell(cur.x+x,cur.y+y,cur.type);}}
  function drawNext(){nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);const s=next.shape,w=s[0].length,h=s.length;const cell=Math.floor(nextCanvas.width/4);const ox=Math.floor((nextCanvas.width-w*cell)/2),oy=Math.floor((nextCanvas.height-h*cell)/2);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(s[y][x]){nctx.fillStyle=COLORS[next.type];nctx.fillRect(ox+x*cell,oy+y*cell,cell,cell);nctx.strokeStyle='rgba(0,0,0,.25)';nctx.strokeRect(ox+x*cell+.5,oy+y*cell+.5,cell-1,cell-1);}}

  function reset(){for(let y=0;y<ROWS;y++)board[y].fill(null);level=1;score=0;linesClearedThisLevel=0;updateSidebar();refillBag();next=newPiece(nextType());spawn();drawBoard();drawNext();}
  function spawn(){cur=newPiece(next.type);next=newPiece(nextType());if(collide(board,cur)){running=false;showOverlay('Game Over','Reiniciar');}drawNext();}
  function showOverlay(title,btn){overlay.innerHTML=`<div class="overlay-content"><h2>${title}</h2><button id="btnOverlay" class="primary">${btn}</button></div>`;overlay.style.display='grid';document.getElementById('btnOverlay').onclick=()=>{overlay.style.display='none';startGame();};}

  function hardDrop(){let m=0;while(!collide(board,{...cur,y:cur.y+1})){cur.y++;m++;}score+=2*m;lock();}
  function softDrop(){if(!collide(board,{...cur,y:cur.y+1})){cur.y++;score+=1;}else lock();}
  function move(dx){if(!collide(board,{...cur,x:cur.x+dx}))cur.x+=dx;}
  function rotateCur(){const r=rotate(cur.shape);const trial={...cur,shape:r};if(!collide(board,trial))cur.shape=r;else if(!collide(board,{...trial,x:cur.x-1}))cur.x-=1,cur.shape=r;else if(!collide(board,{...trial,x:cur.x+1}))cur.x+=1,cur.shape=r;}
  function lock(){merge(board,cur);clearLines();spawn();}

  function animate(t){if(!running)return;const d=t-lastTime;lastTime=t;if(!paused){dropCounter+=d;if(dropCounter>currentSpeed()){dropCounter=0;if(!collide(board,{...cur,y:cur.y+1}))cur.y++;else lock();}drawBoard();}requestAnimationFrame(animate);}

  function togglePause(){if(!running){startGame();return;}paused=!paused;btnPause.setAttribute('aria-pressed',String(paused));if(paused)bgm.pause();else if(btnMusic.getAttribute('aria-pressed')==='true')bgm.play().catch(()=>{});}
  function toggleMusic(){const on=btnMusic.getAttribute('aria-pressed')==='true';if(on){btnMusic.setAttribute('aria-pressed','false');bgm.pause();}else{btnMusic.setAttribute('aria-pressed','true');bgm.volume=0.4;bgm.play().catch(()=>{});}}

  function startGame(){overlay.style.display='none';reset();running=true;paused=false;lastTime=performance.now();animate(lastTime);}

  document.addEventListener('click',(e)=>{if(e.target&&e.target.id==='btnStart'){startGame();}});

  // === CONTROLES (atualizados) =============================================

  // Helper para garantir toque no iOS/Android e clique no desktop
  function bindControl(btn, handler) {
    btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); handler(); });
    btn.addEventListener('click',       (ev) => { ev.preventDefault(); ev.stopPropagation(); handler(); });
    // fallback extra para alguns WebViews de iOS
    btn.addEventListener('touchstart',  (ev) => { ev.preventDefault(); ev.stopPropagation(); handler(); }, { passive: false });
  }

  // Liga todos os botões .ctrl
  document.querySelectorAll('.ctrl').forEach((btn) => {
    const action = btn.dataset.action;
    bindControl(btn, () => handleControlAction(action));
  });

  // Ações dos controles
  function handleControlAction(action) {
    // se o jogo ainda não começou, começa no primeiro comando (exceto música/pausa)
    if (!running && action !== 'music' && action !== 'pause') {
      startGame();
    }

    if (action === 'left')       move(-1);
    else if (action === 'right') move(1);
    else if (action === 'rotate') rotateCur();   // ✅ GIRAR funcionando
    else if (action === 'soft')  softDrop();
    else if (action === 'hard')  hardDrop();
    else if (action === 'pause') togglePause();
    else if (action === 'music') toggleMusic();  // usa o mesmo toggle de música
  }
    function rotateCur(){
    const r=rotate(cur.shape);
    const trial={...cur,shape:r};
    if(!collide(board,trial)){
    cur.shape=r;
  } else {
  // ==========================================================================

  // Garantir funcionamento dos botões do topo (Pausa e Música) no iOS/Android e desktop
  if (btnPause) {
    btnPause.addEventListener('pointerdown', (e)=>{ e.preventDefault(); togglePause(); });
    btnPause.addEventListener('click', (e)=>{ e.preventDefault(); togglePause(); });
  }
  if (btnMusic) {
    btnMusic.addEventListener('pointerdown', (e)=>{ e.preventDefault(); toggleMusic(); });
    btnMusic.addEventListener('click', (e)=>{ e.preventDefault(); toggleMusic(); });
  }

  overlay.style.display='grid';
})();
