const story = document.querySelector('#story');
const thread = document.querySelector('#thread');
const threadTextMask = document.querySelector('#thread-text-mask');
const basePath = document.querySelector('#thread-base');
const haloPath = document.querySelector('#thread-halo');
const activePath = document.querySelector('#thread-active');
const pulseHalo = document.querySelector('#pulse-halo');
const pulseCore = document.querySelector('#pulse-core');
const branchGroup = document.querySelector('#thread-branches');
const branchPulse = document.querySelector('#branch-pulse');
const counter = document.querySelector('#counter-now');
const sceneCounter = document.querySelector('.scene-counter');
const landingEnding = document.querySelector('.landing-ending');
const sections = [...document.querySelectorAll('[data-scene]')];
const chapters = sections.slice(1, -1);
const anchors = sections.map((_, index) => document.querySelector(`#anchor-${index}`));
const smallScreen = window.matchMedia('(max-width: 760px)');
const svgNamespace = 'http://www.w3.org/2000/svg';

let pathLength = 0;
let pathSamples = [];
let viewportWidth = 0;
let storyTop = 0;
let storyHeight = 0;
let sceneTops = [];
let endingTop = 0;
let anchorPoints = [];
let cardPoints = [];
let revealedLength = 0;
let currentScene = -1;
let branchData = [];
let targetRevealY = 0;
let displayedRevealY = 0;
let signalFrame = 0;
let lastSignalTime = 0;
let signalInitialized = false;
let tailAlignment = 1;
let targetTailAlignment = 1;

function placeSignal(path, total, distance, tail, alignment) {
  const start = Math.max(0, distance - tail * alignment);
  const end = Math.min(total, distance + tail * (1 - alignment));
  const visible = end - start;
  path.style.strokeDasharray = `${visible} ${total + tail}`;
  path.style.strokeDashoffset = String(-start);
  path.style.opacity = visible > 0 ? '1' : '0';
}

function samplePath(path) {
  const count = Math.max(1, Math.ceil(pathLength / 6));
  return Array.from({ length: count + 1 }, (_, index) => {
    const distance = pathLength * index / count;
    const { x, y } = path.getPointAtLength(distance);
    return { distance, x, y };
  });
}

function pointAtY(targetY) {
  let low = 0;
  let high = pathSamples.length - 1;
  if (targetY <= pathSamples[low].y) return pathSamples[low];
  if (targetY >= pathSamples[high].y) return pathSamples[high];

  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (pathSamples[middle].y < targetY) low = middle;
    else high = middle;
  }

  const start = pathSamples[low];
  const end = pathSamples[high];
  const progress = (targetY - start.y) / (end.y - start.y);
  return {
    distance: start.distance + (end.distance - start.distance) * progress,
    x: start.x + (end.x - start.x) * progress,
    y: targetY
  };
}

function updateThreadTextMask(storyRect, width, height) {
  function rectangle(x, y, rectWidth, rectHeight, fill) {
    const rect = document.createElementNS(svgNamespace, 'rect');
    Object.entries({ x, y, width: rectWidth, height: rectHeight, fill }).forEach(([key, value]) => {
      rect.setAttribute(key, String(value));
    });
    return rect;
  }

  threadTextMask.setAttribute('width', String(width));
  threadTextMask.setAttribute('height', String(height));
  const cutouts = [rectangle(0, 0, width, height, 'white')];
  const textBlocks = story.querySelectorAll('.scroll-hint, .story-intro > *, .chapter-copy > *, .journey-art > :not(.art-port), .finale h2, .finale-content > p, .finale-connection span');
  const range = document.createRange();
  const padding = 10;
  textBlocks.forEach(element => {
    range.selectNodeContents(element);
    for (const rect of range.getClientRects()) {
      if (!rect.width || !rect.height) continue;
      cutouts.push(rectangle(rect.left - storyRect.left - padding, rect.top - storyRect.top - padding,
        rect.width + 2 * padding, rect.height + 2 * padding, 'black'));
    }
  });
  threadTextMask.replaceChildren(...cutouts);
}

function measureThread() {
  if (signalFrame) cancelAnimationFrame(signalFrame);
  signalFrame = 0;
  signalInitialized = false;
  tailAlignment = targetTailAlignment;
  const storyRect = story.getBoundingClientRect();
  const width = story.clientWidth;
  const height = story.clientHeight;
  viewportWidth = window.innerWidth;
  storyTop = storyRect.top + window.scrollY;
  storyHeight = height;
  sceneTops = sections.map(section => section.getBoundingClientRect().top - storyRect.top);
  endingTop = landingEnding.getBoundingClientRect().top - storyRect.top;
  if (smallScreen.matches) {
    chapters.forEach(section => {
      const card = section.querySelector('.chapter-art');
      section.style.setProperty('--card-point-top', `${card.offsetTop + 16}px`);
    });
  }
  const measurePoint = element => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - storyRect.left,
      y: rect.top + rect.height / 2 - storyRect.top
    };
  };
  const points = anchors.map(measurePoint);
  cardPoints = smallScreen.matches
    ? chapters.map(section => measurePoint(section.querySelector('.mobile-card-point')))
    : [];
  anchorPoints = points;
  thread.setAttribute('viewBox', `0 0 ${width} ${height}`);
  thread.style.height = `${height}px`;
  updateThreadTextMask(storyRect, width, height);

  const swing = 22;
  const routePoints = points.flatMap((point, index) => {
    const cardPoint = cardPoints[index - 1];
    return cardPoint ? [point, cardPoint] : [point];
  });
  if (smallScreen.matches) {
    const [start] = points;
    const intro = story.querySelector('.story-intro').getBoundingClientRect();
    const lastCardPoint = cardPoints.at(-1);
    const lastCard = sections[sections.length - 2].querySelector('.chapter-art');
    routePoints.splice(1, 0, {
      x: start.x,
      y: intro.bottom - storyRect.top - 22
    });
    routePoints.splice(-1, 0, {
      x: lastCardPoint.x,
      y: lastCard.getBoundingClientRect().bottom - storyRect.top + 18
    });
  }
  let route = `M ${routePoints[0].x} ${routePoints[0].y}`;
  for (let index = 1; index < routePoints.length; index += 1) {
    const previous = routePoints[index - 1];
    const next = routePoints[index];
    const distance = next.y - previous.y;
    if (smallScreen.matches) {
      route += Math.abs(previous.x - next.x) < .5
        ? ` L ${next.x} ${next.y}`
        : ` C ${previous.x} ${previous.y + distance * .4}, ${next.x} ${next.y - distance * .4}, ${next.x} ${next.y}`;
      continue;
    }
    const direction = index % 2 === 0 ? -1 : 1;
    route += ` C ${previous.x + swing * direction} ${previous.y + distance * .38}, ${next.x - swing * direction} ${next.y - distance * .38}, ${next.x} ${next.y}`;
  }

  [basePath, haloPath, activePath].forEach(path => path.setAttribute('d', route));
  pathLength = activePath.getTotalLength();
  pathSamples = samplePath(activePath);
  [haloPath, activePath].forEach(path => {
    path.style.strokeDasharray = `0 ${pathLength + 1}`;
  });

  branchGroup.replaceChildren();
  const branchSections = smallScreen.matches ? [] : chapters;
  branchData = branchSections.map((section, offset) => {
    const index = offset + 1;
    const port = section.querySelector('.art-port').getBoundingClientRect();
    const target = {
      x: port.left + port.width / 2 - storyRect.left,
      y: port.top + port.height / 2 - storyRect.top
    };
    const source = points[index];
    const dx = target.x - source.x;
    const branchRoute = `M ${source.x} ${source.y} C ${source.x + dx * .4} ${source.y}, ${target.x - dx * .3} ${target.y}, ${target.x} ${target.y}`;
    const base = document.createElementNS(svgNamespace, 'path');
    const active = document.createElementNS(svgNamespace, 'path');
    base.setAttribute('class', 'thread-branch-base');
    active.setAttribute('class', 'thread-branch-active');
    base.setAttribute('d', branchRoute);
    active.setAttribute('d', branchRoute);
    branchGroup.append(base, active);
    const length = active.getTotalLength();
    active.style.strokeDasharray = `0 ${length + 1}`;
    active.style.strokeDashoffset = '0';
    return { active, length, scene: index, progress: 0 };
  });
  updateScroll();
}

function updateScroll() {
  if (!pathLength) return;
  const viewportHeight = window.innerHeight;
  const scrollInStory = window.scrollY - storyTop;
  const revealOffset = viewportHeight * .92;
  const mobileStartOffset = smallScreen.matches
    ? Math.max(0, revealOffset - storyTop - anchorPoints[0].y)
    : 0;
  const firstY = pathSamples[0].y;
  const lastY = pathSamples.at(-1).y;
  targetRevealY = Math.min(lastY, Math.max(firstY, revealOffset + scrollInStory - mobileStartOffset));

  const nextScene = Math.max(0, sceneTops.findLastIndex(top => top < viewportHeight * .78 + scrollInStory));
  if (nextScene !== currentScene) {
    sections[currentScene]?.classList.remove('is-current');
    currentScene = nextScene;
    sections[currentScene].classList.add('is-current');
    counter.textContent = String(currentScene).padStart(2, '0');
  }
  const endingVisible = endingTop < viewportHeight + scrollInStory;
  if (sceneCounter.hidden !== endingVisible) sceneCounter.hidden = endingVisible;

  if (!signalInitialized) {
    displayedRevealY = targetRevealY;
    signalInitialized = true;
    renderSignal(displayedRevealY);
  } else if (!signalFrame && displayedRevealY !== targetRevealY) {
    lastSignalTime = 0;
    signalFrame = requestAnimationFrame(animateSignal);
  }
}

function animateSignal(now) {
  const dt = lastSignalTime ? Math.min((now - lastSignalTime) / 1000, .05) : 1 / 60;
  lastSignalTime = now;
  const delta = targetRevealY - displayedRevealY;
  const distance = Math.abs(delta);
  if (distance >= .6) targetTailAlignment = delta > 0 ? 1 : 0;

  // Pass the tail through the pulse when reversing, then resume normal tracking.
  const turn = targetTailAlignment - tailAlignment;
  tailAlignment = Math.abs(turn) < .02
    ? targetTailAlignment
    : tailAlignment + turn * (1 - Math.exp(-28 * dt));

  if (distance < .6) {
    displayedRevealY = targetRevealY;
  } else {
    const turnSpeed = 1 - .4 * Math.abs(targetTailAlignment - tailAlignment);
    const maxStep = 1900 * dt;
    const softStep = distance * (1 - Math.exp(-12 * dt));
    displayedRevealY += Math.sign(delta) * Math.min(distance, maxStep, softStep) * turnSpeed;
  }
  renderSignal(displayedRevealY);

  if (displayedRevealY === targetRevealY && tailAlignment === targetTailAlignment) {
    signalFrame = 0;
    lastSignalTime = 0;
  } else {
    signalFrame = requestAnimationFrame(animateSignal);
  }
}

function renderSignal(revealY) {
  const point = pointAtY(revealY);
  revealedLength = point.distance;
  const hasSignal = revealedLength > 1;
  const tail = hasSignal ? 48 : 0;
  [haloPath, activePath].forEach(path => placeSignal(path, pathLength, revealedLength, tail, tailAlignment));
  haloPath.style.opacity = hasSignal ? '' : '0';
  sections.slice(1).forEach((section, offset) => {
    const index = offset + 1;
    const reached = revealY >= anchorPoints[index].y;
    section.classList.toggle('is-reached', reached);
    const cardPoint = cardPoints[index - 1];
    if (index === sections.length - 1 || cardPoint) {
      section.classList.toggle('is-arrived', cardPoint ? revealY >= cardPoint.y : reached);
    }
  });

  const travel = 110;
  branchData.forEach(branch => {
    branch.progress = Math.max(0, Math.min(1, (revealY - anchorPoints[branch.scene].y) / travel));
    const moving = branch.progress > 0 && branch.progress < 1;
    branch.active.classList.toggle('is-active', moving);
    placeSignal(branch.active, branch.length, branch.length * branch.progress, Math.min(branch.length, 28), tailAlignment);
    if (!moving) branch.active.style.opacity = '0';
    sections[branch.scene].classList.toggle('is-arrived', branch.progress >= .98);
  });

  pulseHalo.setAttribute('cx', String(point.x));
  pulseHalo.setAttribute('cy', String(point.y));
  pulseCore.setAttribute('cx', String(point.x));
  pulseCore.setAttribute('cy', String(point.y));
  pulseHalo.style.opacity = hasSignal ? '' : '0';
  pulseCore.style.opacity = hasSignal ? '1' : '0';

  const travelling = branchData.find(branch => branch.progress > 0 && branch.progress < 1);
  if (travelling) {
    const branchPoint = travelling.active.getPointAtLength(travelling.length * travelling.progress);
    branchPulse.setAttribute('cx', String(branchPoint.x));
    branchPulse.setAttribute('cy', String(branchPoint.y));
    branchPulse.style.opacity = '1';
  } else {
    branchPulse.style.opacity = '0';
  }
}

document.body.classList.add('motion-ready');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -9% 0px', threshold: .07 });
  document.querySelectorAll('.hero .reveal').forEach(element => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
}

window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', () => {
  // Mobile browser controls can resize the viewport throughout a scroll.
  if (smallScreen.matches && window.innerWidth === viewportWidth) updateScroll();
  else measureThread();
});
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(() => {
    if (story.clientHeight !== storyHeight) measureThread();
  });
  observer.observe(story);
}
if (document.readyState !== 'complete') window.addEventListener('load', measureThread, { once: true });
document.fonts?.ready.then(measureThread);
measureThread();
