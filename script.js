(() => {
  const WORD = 'patrickgordon.ie';
  const ANCHORS = [0, 7]; // 'p' and 'g' — the letters already on screen at load

  const titleEl = document.getElementById('title');
  const menuEl = document.getElementById('menu');
  const menuItems = Array.from(menuEl.querySelectorAll('.menu-item'));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function buildChars() {
    titleEl.textContent = '';
    titleEl.setAttribute('aria-label', WORD);
    const spans = WORD.split('').map((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.className = 'char';
      const isAnchor = ANCHORS.includes(i);
      span.style.display = 'inline-block';
      span.style.maxWidth = isAnchor ? '1ch' : '0ch';
      span.style.opacity = isAnchor ? '1' : '0';
      span.style.overflow = 'hidden';
      span.style.transition = 'max-width 360ms cubic-bezier(0.16,1,0.3,1), opacity 260ms ease';
      titleEl.appendChild(span);
      return { span, index: i, isAnchor };
    });
    return spans;
  }

  function groupByDistance(spans) {
    const groups = new Map();
    spans.forEach(({ index, isAnchor }) => {
      if (isAnchor) return;
      const dist = Math.min(...ANCHORS.map((a) => Math.abs(index - a)));
      if (!groups.has(dist)) groups.set(dist, []);
      groups.get(dist).push(index);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, idxs]) => idxs);
  }

  function revealWord(spans, onDone) {
    if (reduceMotion) {
      spans.forEach(({ span }) => {
        span.style.maxWidth = '1ch';
        span.style.opacity = '1';
      });
      onDone();
      return;
    }

    const groups = groupByDistance(spans);
    const byIndex = new Map(spans.map((s) => [s.index, s.span]));
    const stagger = 55;

    groups.forEach((idxs, i) => {
      setTimeout(() => {
        idxs.forEach((idx) => {
          const span = byIndex.get(idx);
          span.style.maxWidth = '1ch';
          span.style.opacity = '1';
        });
      }, i * stagger);
    });

    const totalDelay = groups.length * stagger + 400;
    setTimeout(onDone, totalDelay);
  }

  function revealMenu() {
    menuEl.style.opacity = '1';
    menuItems.forEach((item, i) => {
      setTimeout(() => {
        item.classList.add('show');
      }, reduceMotion ? 0 : i * 130);
    });
  }

  function start() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 500ms ease';
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });

    const holdBeforeGrow = reduceMotion ? 0 : 650;

    setTimeout(() => {
      const spans = buildChars();
      revealWord(spans, () => {
        setTimeout(() => {
          titleEl.classList.add('rise');
          setTimeout(revealMenu, reduceMotion ? 0 : 250);
        }, reduceMotion ? 0 : 350);
      });
    }, holdBeforeGrow);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
