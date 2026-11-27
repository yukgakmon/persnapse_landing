const story = document.querySelector('#story');
const thread = document.querySelector('#thread');
const threadTextMask = document.querySelector('#thread-text-mask');
const basePath = document.querySelector('#thread-base');
const haloPath = document.querySelector('#thread-halo');
const activePath = document.querySelector('#thread-active');
const activeGradient = document.querySelector('#active-gradient');
const pulseHalo = document.querySelector('#pulse-halo');
const pulseCore = document.querySelector('#pulse-core');
const mobileSignal = document.querySelector('.mobile-signal');
const mobileTail = mobileSignal.querySelector('.mobile-signal-tail');
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
let mobileTextBounds = [];
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
let visibleTop = 0;
let visibleBottom = 0;
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

function drawSignalTail(distance, tail) {
  const start = Math.max(0, distance - tail * tailAlignment);
  const end = Math.min(pathLength, distance + tail * (1 - tailAlignment));
  if (start === end) {
    activePath.style.opacity = '0';
    haloPath.style.opacity = '0';
    return;
  }

  const spacing = pathLength / (pathSamples.length - 1);
  const firstIndex = Math.floor(start / spacing);
  const lastIndex = Math.min(pathSamples.length - 1, Math.ceil(end / spacing));
  const startSample = pathSamples[firstIndex];
  const startNext = pathSamples[firstIndex + 1];
  const endSample = pathSamples[lastIndex];
  const endPrevious = pathSamples[lastIndex - 1];

  function interpolate(first, second, length) {
    const ratio = (length - first.distance) / (second.distance - first.distance);
    return `${first.x + (second.x - first.x) * ratio} ${first.y + (second.y - first.y) * ratio}`;
  }

  let segment = `M ${interpolate(startSample, startNext, start)}`;
  for (let index = firstIndex + 1; index < lastIndex; index += 1) {
    const { x, y } = pathSamples[index];
    segment += ` L ${x} ${y}`;
  }
  segment += ` L ${interpolate(endPrevious, endSample, end)}`;
  activePath.setAttribute('d', segment);
  haloPath.setAttribute('d', segment);
  activePath.style.opacity = '1';
  haloPath.style.opacity = '';
}

function pointAtDistance(distance) {
  const index = Math.min(pathSamples.length - 2, Math.floor(distance / pathLength * (pathSamples.length - 1)));
  const first = pathSamples[index];
  const next = pathSamples[index + 1];
  const progress = (distance - first.distance) / (next.distance - first.distance);
  return {
    x: first.x + (next.x - first.x) * progress,
    y: first.y + (next.y - first.y) * progress
  };
}

function moveMobileSignal(point, tail) {
  if (!tail) {
    mobileSignal.style.opacity = '0';
    return;
  }

  const start = pointAtDistance(Math.max(0, point.distance - tail * tailAlignment));
  const end = pointAtDistance(Math.min(pathLength, point.distance + tail * (1 - tailAlignment)));
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const pointCovered = mobileTextBounds.some(rect =>
    point.x - 7 < rect.right && point.x + 7 > rect.left && point.y - 7 < rect.bottom && point.y + 7 > rect.top);
  const tailCovered = mobileTextBounds.some(rect =>
    Math.min(start.x, end.x) - 3 < rect.right && Math.max(start.x, end.x) + 3 > rect.left
    && Math.min(start.y, end.y) - 3 < rect.bottom && Math.max(start.y, end.y) + 3 > rect.top);

  mobileSignal.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
  mobileTail.style.transform = `translate(${start.x - point.x}px, ${start.y - point.y}px) rotate(${Math.atan2(dy, dx)}rad) scaleX(${Math.hypot(dx, dy) / tail})`;
  mobileSignal.style.opacity = pointCovered ? '0' : '1';
  const atDestination = pathLength - point.distance <= 1;
  mobileTail.style.opacity = atDestination || tailCovered ? '0' : '1';
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
  mobileTextBounds = [];
  textBlocks.forEach(element => {
    range.selectNodeContents(element);
    for (const rect of range.getClientRects()) {
      if (!rect.width || !rect.height) continue;
      const left = rect.left - storyRect.left - padding;
      const top = rect.top - storyRect.top - padding;
      const width = rect.width + 2 * padding;
      const height = rect.height + 2 * padding;
      cutouts.push(rectangle(left, top, width, height, 'black'));
      if (smallScreen.matches) mobileTextBounds.push({ left, top, right: left + width, bottom: top + height });
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

  basePath.setAttribute('d', route);
  pathLength = basePath.getTotalLength();
  pathSamples = samplePath(basePath);

  // Keep the gradient fixed to the full route as the short tail moves.
  activeGradient.setAttribute('y1', String(pathSamples[0].y));
  activeGradient.setAttribute('y2', String(pathSamples.at(-1).y));

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
  visibleTop = scrollInStory;
  visibleBottom = scrollInStory + viewportHeight;
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
  const mobile = smallScreen.matches;
  const dt = lastSignalTime ? Math.min((now - lastSignalTime) / 1000, mobile ? .1 : .05) : 1 / 60;
  lastSignalTime = now;
  const delta = targetRevealY - displayedRevealY;
  const distance = Math.abs(delta);
  const nextAlignment = delta > 0 ? 1 : 0;
  const reversing = nextAlignment !== targetTailAlignment;
  // Ignore short reverse gestures, but still settle at the ends of the track.
  const ignoreTurn = mobile && reversing && distance < 16;
  const atTrackEnd = targetRevealY === pathSamples[0].y || targetRevealY === pathSamples.at(-1).y;
  const holdPosition = ignoreTurn && !atTrackEnd;
  if (distance >= .6 && !ignoreTurn) targetTailAlignment = nextAlignment;

  // Pass the tail through the pulse when reversing, then resume normal tracking.
  const turn = targetTailAlignment - tailAlignment;
  tailAlignment = Math.abs(turn) < .02
    ? targetTailAlignment
    : tailAlignment + turn * (1 - Math.exp(-28 * dt));

  if (distance < .6) {
    displayedRevealY = targetRevealY;
  } else if (!holdPosition) {
    const turnSpeed = 1 - .4 * Math.abs(targetTailAlignment - tailAlignment);
    const speedLimit = mobile ? Math.max(1900, Math.min(9000, distance * 7)) : 1900;
    const maxStep = speedLimit * dt;
    const softStep = distance * (1 - Math.exp(-12 * dt));
    const direction = Math.sign(delta);
    const step = Math.min(distance, maxStep, softStep) * turnSpeed;
    const nextY = displayedRevealY + direction * step;

    // A delayed frame should not skip a large stretch of the visible track.
    const crossesViewport = Math.max(displayedRevealY, nextY) >= visibleTop - 60
      && Math.min(displayedRevealY, nextY) <= visibleBottom + 60;
    const visibleStepLimit = Math.min(28, 1800 * dt);
    displayedRevealY += direction * (mobile && crossesViewport ? Math.min(step, visibleStepLimit) : step);
  }
  renderSignal(displayedRevealY);

  if ((displayedRevealY === targetRevealY || holdPosition) && tailAlignment === targetTailAlignment) {
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
  if (smallScreen.matches) moveMobileSignal(point, tail);
  else drawSignalTail(revealedLength, tail);
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

  if (!smallScreen.matches) {
    pulseHalo.setAttribute('cx', String(point.x));
    pulseHalo.setAttribute('cy', String(point.y));
    pulseCore.setAttribute('cx', String(point.x));
    pulseCore.setAttribute('cy', String(point.y));
    pulseHalo.style.opacity = hasSignal ? '' : '0';
    pulseCore.style.opacity = hasSignal ? '1' : '0';
  }

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
