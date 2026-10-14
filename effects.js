/* Scroll-linked rope. Fixed-step particle integration + distance constraints.
 * Decorative only: wheel/touch scroll stay native; a native range supplies input.
 * No dependencies, no continuous animation at rest, no synthetic scroll events.
 * viora-allow: scroll-listener Physics needs signed scroll velocity, not a timeline; the listener is passive, simulation is rAF-bound and sleeps at rest.
 */
(() => {
  'use strict';
  const rail = document.querySelector('#bloodRail');
  const range = document.querySelector('#bloodRange');
  const current = document.querySelector('#railCurrent');
  const svg = document.querySelector('.rope-svg');
  const path = document.querySelector('#ropePath');
  const charm = document.querySelector('#ropeCharm');
  const stops = [...document.querySelectorAll('[data-rail-target]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px)');
  const N = 16, X = 40, STEP = 1 / 60;
  let maxScroll=1, height=600, positions=[], nodes=[], length=32, target=32;
  let lengthV=0, impulse=0, lastScroll=scrollY, frame=0, prevTime=0, accumulator=0, quiet=0;
  let measureFrame=0;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  function reset() {
    length=target; lengthV=0; impulse=0; quiet=0;
    nodes=Array.from({length:N+1},(_,i)=>({x:X,y:i/N*length,px:X,py:i/N*length}));
  }
  function paint(straight=false) {
    if (!nodes.length) return;
    if(straight) {
      path.setAttribute('d',`M${X} 0V${target.toFixed(2)}`);
      charm.setAttribute('transform',`translate(${X} ${target.toFixed(2)})`);
    } else {
      // Smooth the particle polyline without changing the physical endpoints.
      let d=`M${nodes[0].x.toFixed(2)} ${nodes[0].y.toFixed(2)}`;
      for(let i=1;i<N;i++) {
        const a=nodes[i], b=nodes[i+1];
        d+=` Q${a.x.toFixed(2)} ${a.y.toFixed(2)} ${((a.x+b.x)/2).toFixed(2)} ${((a.y+b.y)/2).toFixed(2)}`;
      }
      const end=nodes[N], before=nodes[N-1];
      d+=` L${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
      path.setAttribute('d',d);
      const angle=-Math.atan2(end.x-before.x,end.y-before.y)*180/Math.PI;
      charm.setAttribute('transform',`translate(${end.x.toFixed(2)} ${end.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
    }
    rail.style.setProperty('--tip-y',`${target}px`);
  }
  function step() {
    const acceleration=150*(target-length)-24*lengthV;
    lengthV+=acceleration*STEP;
    const previousLength=length;
    length=clamp(length+lengthV*STEP,28,height-18);
    // Pay out/retract the silk continuously; do not compress segments into coils.
    const ratio=length/previousLength;
    for(let i=1;i<=N;i++) {nodes[i].y*=ratio;nodes[i].py*=ratio;}
    let energy=0;
    for(let i=1;i<=N;i++) {
      const p=nodes[i], vx=(p.x-p.px)*.975, vy=(p.y-p.py)*.975;
      p.px=p.x;p.py=p.y;
      const bend=Math.min(14,length*.18);
      p.x=clamp(p.x+vx+impulse*.12*Math.pow(i/N,1.5)-(p.x-X)*.004,X-bend,X+bend);
      p.y+=vy+.22;
      energy=Math.max(energy,Math.abs(vx),Math.abs(vy));
    }
    impulse*=.5;
    // The first particle is pinned. Repeated constraints keep the silk taut.
    const segment=length/N;
    for(let k=0;k<20;k++) {
      nodes[0].x=X;nodes[0].y=0;
      for(let i=0;i<N;i++) {
        const a=nodes[i],b=nodes[i+1],dx=b.x-a.x,dy=b.y-a.y;
        const distance=Math.max(.001,Math.hypot(dx,dy));
        const correction=(distance-segment)/distance;
        if(i===0) {b.x-=dx*correction;b.y-=dy*correction;}
        else {a.x+=dx*correction*.5;a.y+=dy*correction*.5;b.x-=dx*correction*.5;b.y-=dy*correction*.5;}
        b.y=Math.max(a.y+.1,b.y);
      }
    }
    nodes[0].x=X;nodes[0].y=0;
    if(energy<.06 && Math.abs(target-length)<.15 && Math.abs(lengthV)<.2 && Math.abs(impulse)<.005) quiet++;
    else quiet=0;
  }
  function animate(time) {
    frame=0;
    if(rail.hidden || document.hidden) return;
    if(motion.matches) {reset();paint(true);return;}
    if(!prevTime) prevTime=time;
    accumulator+=Math.min((time-prevTime)/1000,.05);prevTime=time;
    while(accumulator>=STEP) {step();accumulator-=STEP;}
    paint();
    if(quiet<24) frame=requestAnimationFrame(animate);
    else {prevTime=0;accumulator=0;}
  }
  function wake() {
    if(rail.hidden || document.hidden) return;
    if(motion.matches) {reset();paint(true);return;}
    quiet=0;
    if(!frame) {prevTime=0;frame=requestAnimationFrame(animate);}
  }
  function update() {
    const p=clamp(scrollY/maxScroll,0,1);
    target=32+p*Math.max(0,height-56);
    range.value=String(Math.round(p*1000));
    const line=scrollY+Math.min(220,innerHeight*.25);
    let active=positions[0];
    for(const pos of positions) if(pos.y<=line) active=pos;
    if(p>.985) active=positions.at(-1);
    for(const pos of positions) pos.a.setAttribute('aria-current',pos===active?'location':'false');
    if(active) current.textContent=active.label;
    range.setAttribute('aria-valuetext',`${Math.round(p*100)}%, ${active?.label || 'Начало истории'}`);
    wake();
  }
  function measure() {
    measureFrame=0;
    rail.hidden=!desktop.matches;
    document.documentElement.classList.toggle('blood-scroll-ready',desktop.matches);
    maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    if(rail.hidden) {if(frame) cancelAnimationFrame(frame);frame=0;return;}
    height=Math.max(100,rail.clientHeight);
    svg.setAttribute('viewBox',`0 0 64 ${height}`);
    svg.querySelector('.rope-guide').setAttribute('d',`M${X} 0V${height}`);
    positions=stops.map(a=>({a,y:document.querySelector(a.hash).getBoundingClientRect().top+scrollY,label:a.querySelector('.rail-tooltip').textContent.trim()}));
    let ys=positions.map(pos=>clamp(pos.y/maxScroll*(height-40)+20,20,height-20));
    for(let i=ys.length-2;i>=0;i--) ys[i]=Math.min(ys[i],ys[i+1]-48);
    if(ys[0]<20) ys=ys.map((_,i)=>20+i/(ys.length-1)*(height-40));
    stops.forEach((a,i)=>a.style.setProperty('--stop-y',`${ys[i]}px`));
    target=32+clamp(scrollY/maxScroll,0,1)*(height-56);reset();paint(motion.matches);update();
  }
  function scheduleMeasure() {if(!measureFrame) measureFrame=requestAnimationFrame(measure);}
  /* viora-allow: scroll-listener Native passive velocity input is necessary for damped rope physics; CSS timelines cannot model momentum. */
  addEventListener('scroll',()=>{
    const delta=scrollY-lastScroll;lastScroll=scrollY;
    impulse=clamp(impulse+delta*.012,-1.6,1.6);
    update();
  },{passive:true});
  addEventListener('resize',scheduleMeasure,{passive:true});
  range.addEventListener('input',()=>scrollTo({top:maxScroll*Number(range.value)/1000,behavior:'instant'}));
  stops.forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelector(a.hash).scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});
  }));
  motion.addEventListener('change',()=>{if(frame) cancelAnimationFrame(frame);frame=0;reset();paint(motion.matches);wake();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) {if(frame) cancelAnimationFrame(frame);frame=0;prevTime=0;accumulator=0;}
    else scheduleMeasure();
  });
  new ResizeObserver(scheduleMeasure).observe(document.body);
  document.fonts.ready.then(scheduleMeasure);
  measure();
})();
