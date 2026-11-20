const CYCLE = 7;
const FINALE = 2;
const TOTAL = CYCLE * stories.length + FINALE;
const journey = document.querySelector('.journey');
journey.style.height = `${(TOTAL + 1) * 100}svh`;

function storyMarkup(story, index) {
  const number = pad(index + 1);
  return `<div class="depth-focus layer" data-story="${index}"><span class="focus-kicker">THOUGHT ${number} / ${escapeHtml(story.label)}</span><strong>${lines(story.question)}</strong></div>
    <article class="scene-card problem-card layer" data-story="${index}" aria-hidden="true"><span class="card-kicker"><i></i> ${number} / 실제 있을 법한 문제 상황</span><h2>${lines(story.problemTitle)}</h2><p>${escapeHtml(story.problemBody)}</p><div class="fragment-row" aria-hidden="true">${story.fragments.map(fragment => `<span>${escapeHtml(fragment)}</span>`).join('')}</div></article>
    <article class="scene-card solution-card layer" data-story="${index}" aria-hidden="true"><span class="card-kicker"><i></i> ${number} / 퍼스냅스가 돕는 방식</span><h2>${lines(story.solutionTitle)}</h2><p>${escapeHtml(story.solutionBody)}</p><div class="app-example" aria-label="가상 앱 화면 예시">${mockup(story.mock)}</div></article>
    <div class="return-copy layer" data-story="${index}"><span class="return-kicker">${number} / 04 · ONE THOUGHT CONNECTED</span><h2>${lines(story.returnTitle)}</h2><p>${escapeHtml(story.returnBody)}</p></div>`;
}
document.querySelector('#story-layers').innerHTML = stories.map(storyMarkup).join('');
const directions = [[-1,-1],[1,-.65],[1,.7],[-1,1]];
document.querySelector('#passing-thoughts').innerHTML = stories.flatMap((story, index) => story.passing.map((thought, n) => `<span class="passing-thought" data-story="${index}" data-order="${n}" data-side="${directions[n][0]}" data-vertical="${directions[n][1]}">${escapeHtml(thought)}</span>`)).join('');

const stage = document.querySelector('#stage');
const brain = document.querySelector('#brain-space');
const hero = document.querySelector('#hero-copy');
const topic = document.querySelector('#topic-label');
const focusOrbit = document.querySelector('#focus-orbit');
const grid = document.querySelector('.depth-grid');
const route = document.querySelector('#depth-route');
const depthPlanes = [...document.querySelectorAll('.depth-plane')];
const routeBase = document.querySelector('#route-base');
const routeGlow = document.querySelector('#route-glow');
const routeSignal = document.querySelector('#route-signal');
const routeSource = document.querySelector('#route-source');
const routeArrival = document.querySelector('#route-arrival');
const routeDestination = document.querySelector('#route-destination');
const routeHalo = document.querySelector('#route-halo');
const routeDot = document.querySelector('#route-dot');
const humanScene = document.querySelector('#human-scene');
const finalCopy = document.querySelector('#final-copy');
const finalSignal = document.querySelector('#final-signal');
const stageIndex = document.querySelector('#stage-index');
const progressFill = document.querySelector('#progress-fill');
const layers = stories.map((_, i) => {
  const items = [...document.querySelectorAll(`#story-layers [data-story="${i}"]`)];
  return {focus:items[0],problem:items[1],solution:items[2],returnCopy:items[3],passing:[...document.querySelectorAll(`#passing-thoughts [data-story="${i}"]`)]};
});
const clamp = (value, min=0, max=1) => Math.min(max,Math.max(min,value));
const smooth = (a,b,value) => {const t=clamp((value-a)/(b-a));return t*t*(3-2*t)};
const between = (a,b,c,d,value) => smooth(a,b,value)*(1-smooth(c,d,value));
let frame=0;
let visualPosition=null;
let lastFrameTime=0;

function setOpacity(element, opacity, interactive=false) {
  element.style.opacity=String(opacity);
  if (interactive) element.style.pointerEvents=opacity>.9?'auto':'none';
}
function setStoryOpacity(element, visible) {
  element.classList.toggle('is-visible',Boolean(visible));
  setOpacity(element,visible);
}
function render(timestamp=performance.now()) {
  frame=0;
  const position=clamp(-journey.getBoundingClientRect().top/innerHeight,0,TOTAL);
  const finale=position>=CYCLE*stories.length;
  const index=finale?stories.length-1:Math.min(stories.length-1,Math.floor(position/CYCLE));
  const local=position-index*CYCLE;
  const elapsed=Math.min(.05,Math.max(0,(timestamp-lastFrameTime)/1000));
  lastFrameTime=timestamp;
  const motionPhase=!finale&&local<3.35;
  if(visualPosition===null||!motionPhase||Math.floor(visualPosition/CYCLE)!==index) visualPosition=position;
  else {
    const difference=position-visualPosition;
    const step=Math.min(Math.abs(difference),1.45*elapsed);
    visualPosition+=Math.sign(difference)*step;
    visualPosition=clamp(visualPosition,position-.28,position+.28);
  }
  const motion=motionPhase?visualPosition-index*CYCLE:local;
  const story=stories[index];
  const w=stage.clientWidth,h=stage.clientHeight,bw=brain.clientWidth,bh=brain.clientHeight;
  const baseX=w*(w<=900?.5:.73),baseY=h*(w<=900?(w<=560?.64:.67):.46);
  const zoom=smooth(.55,.95,motion)*(1-smooth(6.10,6.95,motion));
  const scale=1+zoom*1.85;
  const desiredX=w*.5-(baseX+(bw*story.focus[0]-bw/2)*scale);
  const desiredY=h*.52-(baseY+(bh*story.focus[1]-bh/2)*scale);
  const centering=smooth(.55,.9,motion)*(1-smooth(6.10,6.95,motion));
  let brainOpacity=(1-smooth(.95,1.10,motion))*(1-smooth(6.10,6.95,motion))+smooth(6.10,6.95,motion);
  let brainTransform=`translate(-50%,-50%) translate3d(${desiredX*centering}px,${desiredY*centering}px,0) scale(${scale})`;
  if(finale){
    const t=clamp((position-CYCLE*stories.length)/FINALE);
    const moveX=w>900?-w*.08*t:0;
    const moveY=w<=560?-h*.15*t:-h*.09*t;
    brainOpacity=1-.9*smooth(.1,.62,t);
    brainTransform=`translate(-50%,-50%) translate3d(${moveX}px,${moveY}px,0) scale(${1-.28*t})`;
    setOpacity(humanScene,smooth(.15,.42,t));
    humanScene.style.transform=`translate(-50%,${22*(1-smooth(.15,.42,t))}px)`;
    finalSignal.style.strokeDashoffset=String(320*(1-smooth(.30,.65,t)));
    setOpacity(finalCopy,smooth(.48,.64,t),true);
    finalCopy.style.transform=`translate(-50%,${28*(1-smooth(.48,.64,t))}px)`;
  } else {
    setOpacity(humanScene,0);
    setOpacity(finalCopy,0,true);
  }
  brain.style.transform=brainTransform;
  setOpacity(brain,brainOpacity);
  setOpacity(hero,!finale&&index===0?1-smooth(.38,.66,motion):0);
  if(!finale&&index>0){
    if(topic.dataset.story!==String(index)){
      topic.innerHTML=`<span>THOUGHT ${pad(index+1)} / ${escapeHtml(story.label)}</span><h2>${lines(story.transitionTitle)}</h2><p>${escapeHtml(story.transitionBody)}</p>`;
      topic.dataset.story=String(index);
    }
    setOpacity(topic,between(0,.08,.43,.66,motion));
  }else setOpacity(topic,0);
  focusOrbit.style.left=`${(story.focus[0]-.14)*100}%`;
  focusOrbit.style.top=`${(story.focus[1]-.14)*100}%`;
  setOpacity(focusOrbit,finale?0:between(.58,.67,.95,1.1,motion));

  const travel=smooth(1.18,2.55,motion);
  const arrival=smooth(2.53,2.78,motion);
  const routeOpacity=finale?0:between(1.12,1.25,3.16,3.36,motion);
  setOpacity(route,routeOpacity);
  setOpacity(grid,0);
  grid.style.transform=`scale(${1+travel*2.3})`;
  const near={x:435-travel*60,y:970+travel*800};
  const destination={x:500,y:460};
  depthPlanes.forEach(plane=>{
    const phase=clamp(travel*1.45);
    const radius=30+phase*620;
    plane.setAttribute('rx',String(radius));
    plane.setAttribute('ry',String(radius));
    setOpacity(plane,finale?0:Math.sin(phase*Math.PI)*.48);
  });
  const along=t=>({x:near.x+(destination.x-near.x)*t,y:near.y+(destination.y-near.y)*t});
  const signalFraction=.25+.75*(1-(1-travel)**2);
  const lineLength=Math.hypot(destination.x-near.x,destination.y-near.y);
  const tail=along(Math.max(0,signalFraction-90/lineLength));
  const tip=along(signalFraction);
  const signalPath=`M ${tail.x} ${tail.y} L ${tip.x} ${tip.y}`;
  routeBase.setAttribute('d',`M ${near.x} ${near.y} L ${destination.x} ${destination.y}`);
  routeGlow.setAttribute('d',signalPath);routeSignal.setAttribute('d',signalPath);
  [routeDot,routeHalo].forEach(node=>{node.setAttribute('cx',tip.x);node.setAttribute('cy',tip.y)});
  const aspect=h/w;
  routeDot.setAttribute('rx',String(5*aspect));routeHalo.setAttribute('rx',String(16*aspect));
  routeSource.setAttribute('cx',near.x);routeSource.setAttribute('cy',near.y);routeSource.setAttribute('rx',String(12*aspect));
  setOpacity(routeSource,1-smooth(1.50,1.92,motion));
  routeDestination.setAttribute('rx',String((8+arrival*10)*aspect));routeDestination.setAttribute('ry',String(8+arrival*10));
  setOpacity(routeDestination,1-smooth(2.78,3.00,motion));
  routeArrival.setAttribute('rx',String((12+arrival*115)*aspect));routeArrival.setAttribute('ry',String(12+arrival*115));
  setOpacity(routeArrival,arrival*(1-smooth(2.76,2.98,motion))*.55);

  layers.forEach((layer,i)=>{
    const active=!finale&&i===index;
    const focus=Number(active&&local>=3.35&&local<3.85);
    const problem=Number(active&&local>=3.85&&local<4.95);
    const solution=Number(active&&local>=4.95&&local<6.08);
    const returned=Number(active&&i<stories.length-1&&local>=6.15);
    setStoryOpacity(layer.focus,focus);setStoryOpacity(layer.problem,problem);setStoryOpacity(layer.solution,solution);setStoryOpacity(layer.returnCopy,returned);
    layer.problem.setAttribute('aria-hidden',String(problem<.9));
    layer.solution.setAttribute('aria-hidden',String(solution<.9));
    layer.passing.forEach((element,n)=>{
      const t=clamp((motion-(1.18+n*.27))/1.38);
      const fadeIn=n===0?.34:.16;
      const opacity=active?smooth(0,fadeIn,t)*(1-smooth(.84,1,t))*.98:0;
      setOpacity(element,opacity);
      const side=Number(element.dataset.side),vertical=Number(element.dataset.vertical);
      const spread=n===0?(w<=560?.22:.29):(w<=560?.28:.38);
      const x=side*w*(.04+t*spread),y=vertical*h*(.05+t*.32);
      element.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,0) scale(${.58+t*1.35})`;
      const blur=(1-smooth(.06,.2,t))*.8+smooth(.88,1,t)*1.6;
      element.style.filter=`blur(${blur}px)`;
    });
  });
  stageIndex.innerHTML=finale?'':`<span>${pad(index+1)} / 04</span><i></i><span>${escapeHtml(story.label)}</span>`;
  setOpacity(stageIndex,finale?0:1);
  progressFill.style.width=`${position/TOTAL*100}%`;
  if(motionPhase&&Math.abs(position-visualPosition)>.001) queueRender();
}
function queueRender(){if(!frame)frame=requestAnimationFrame(render)}
addEventListener('scroll',queueRender,{passive:true});
addEventListener('resize',queueRender);
document.fonts?.ready.then(queueRender);
render();
