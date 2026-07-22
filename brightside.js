/**
 * Secret: double-tap "patrickgordon.ie" -> everything falls off screen ->
 * a play button appears -> tap it -> YouTube audio plays in the background
 * while lyrics appear word-by-word and each word drops off after it's "sung".
 *
 * Sync approach: exact per-word timecodes weren't available, so lines are
 * anchored to the song's known section timings (this specific video) and each
 * line's words are distributed evenly across the line's time window. The song's
 * pacing is steady, so this tracks well; a nudge control lets the viewer
 * correct drift on slow connections.
 *
 * The lyrics text itself is supplied by the site owner (transcribed by them).
 */
(function initBrightsideSecret(titleEl, fallTargets) {
  const VIDEO_ID = 'UGTHKx15WXA';

  // ---- lyric lines: [startSeconds, endSeconds, "line text"] ----
  // Timings tuned to the official video's structure. Words within each line
  // are spaced evenly between start and end.
  const LINES = [
    [24.0, 27.2, "Coming out of my cage and I've been doing just fine"],
    [27.4, 30.6, "Gotta gotta be down because I want it all"],
    [30.8, 34.2, "It started out with a kiss how did it end up like this"],
    [34.4, 37.6, "It was only a kiss it was only a kiss"],
    [38.0, 41.4, "Now I'm falling asleep and she's calling a cab"],
    [41.6, 45.0, "While he's having a smoke and she's taking a drag"],
    [45.2, 48.6, "Now they're going to bed and my stomach is sick"],
    [48.8, 52.4, "And it's all in my head but she's touching his"],
    // pre-chorus
    [52.8, 54.4, "Chest now"],
    [54.6, 56.6, "He takes off her dress now"],
    [56.8, 58.4, "Let me go"],
    [58.6, 61.6, "And I just can't look it's killing me"],
    [61.8, 64.4, "They're taking control"],
    // chorus
    [64.6, 66.6, "Jealousy"],
    [66.8, 69.4, "Turning saints into the sea"],
    [69.6, 72.2, "Swimming through sick lullabies"],
    [72.4, 75.0, "Choking on your alibi"],
    [75.2, 77.8, "But it's just the price I pay"],
    [78.0, 80.6, "Destiny is calling me"],
    [80.8, 83.4, "Open up my eager eyes"],
    [83.6, 86.6, "'Cause I'm Mr. Brightside"],
    // instrumental interlude ~86.6 - 99
    // verse 2
    [99.0, 102.4, "I'm coming out of my cage and I've been doing just fine"],
    [102.6, 105.8, "Gotta gotta be down because I want it all"],
    [106.0, 109.4, "It started out with a kiss how did it end up like this"],
    [109.6, 112.8, "It was only a kiss it was only a kiss"],
    [113.2, 116.6, "Now I'm falling asleep and she's calling a cab"],
    [116.8, 120.2, "While he's having a smoke and she's taking a drag"],
    [120.4, 123.8, "Now they're going to bed and my stomach is sick"],
    [124.0, 127.6, "And it's all in my head but she's touching his"],
    [128.0, 129.6, "Chest now"],
    [129.8, 131.8, "He takes off her dress now"],
    [132.0, 133.6, "Let me go"],
    [133.8, 136.8, "'Cause I just can't look it's killing me"],
    [137.0, 139.6, "They're taking control"],
    [139.8, 141.8, "Jealousy"],
    [142.0, 144.6, "Turning saints into the sea"],
    [144.8, 147.4, "Swimming through sick lullabies"],
    [147.6, 150.2, "Choking on your alibi"],
    [150.4, 153.0, "But it's just the price I pay"],
    [153.2, 155.8, "Destiny is calling me"],
    [156.0, 158.6, "Open up my eager eyes"],
    [158.8, 161.8, "'Cause I'm Mr. Brightside"],
    // outro
    [174.0, 175.4, "I never"],
    [176.0, 177.4, "I never"],
    [178.0, 179.4, "I never"],
    [180.0, 181.4, "I never"],
  ];

  // Flatten to word events: { t, word, lineId, isLineStart }
  const wordEvents = [];
  LINES.forEach((line, lineId) => {
    const [start, end, text] = line;
    const words = text.split(' ');
    const span = Math.max(0.4, end - start);
    const per = span / words.length;
    words.forEach((w, i) => {
      wordEvents.push({ t: start + i * per, word: w, lineId, isLineStart: i === 0 });
    });
  });
  wordEvents.sort((a, b) => a.t - b.t);

  let player = null;
  let started = false;
  let rafId = null;
  let nextIdx = 0;
  let nudge = 0; // seconds of manual correction
  let overlay, stage, lyricWrap, currentLineEl, currentLineId = -1;

  // ---------- fall animation ----------
  function fallEverythingOff(done) {
    const items = fallTargets();
    let maxDur = 0;
    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      // freeze element in place as fixed so it can fall independently
      const clone = el;
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.margin = '0';
      clone.style.zIndex = '5';
      clone.style.transition = 'none';

      const delay = i * 90 + Math.random() * 80;
      const dur = 900 + Math.random() * 400;
      maxDur = Math.max(maxDur, delay + dur);
      const rot = (Math.random() - 0.5) * 80;
      const drift = (Math.random() - 0.5) * 120;

      setTimeout(() => {
        clone.style.transition = `transform ${dur}ms cubic-bezier(0.4, 0, 0.7, 1), opacity ${dur}ms ease-in`;
        clone.style.transform = `translate(${drift}px, ${window.innerHeight + 200}px) rotate(${rot}deg)`;
        clone.style.opacity = '0';
      }, delay);
    });
    setTimeout(done, maxDur + 100);
  }

  // ---------- overlay / play button ----------
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    overlay.innerHTML = `
      <div id="bsYT" class="bs-yt"></div>
      <div class="bs-stage" id="bsStage">
        <button class="bs-play" id="bsPlay" aria-label="play">
          <svg viewBox="0 0 100 100" width="64" height="64">
            <polygon points="35,25 35,75 78,50" fill="currentColor"></polygon>
          </svg>
        </button>
      </div>
      <div class="bs-lyrics" id="bsLyrics" aria-live="polite"></div>
      <button class="bs-exit" id="bsExit">&larr; back</button>
      <button class="bs-nudge" id="bsNudge" title="sync">sync</button>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    stage = overlay.querySelector('#bsStage');
    lyricWrap = overlay.querySelector('#bsLyrics');

    overlay.querySelector('#bsPlay').addEventListener('click', onPlay);
    overlay.querySelector('#bsExit').addEventListener('click', () => location.reload());
    overlay.querySelector('#bsNudge').addEventListener('click', () => {
      // if lyrics feel ahead of audio, tap to hold them back a touch
      nudge -= 0.4;
    });
  }

  // ---------- YouTube ----------
  function loadYT(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = cb;
  }

  function onPlay() {
    const playBtn = overlay.querySelector('#bsPlay');
    playBtn.classList.add('gone');
    loadYT(() => {
      player = new YT.Player('bsYT', {
        videoId: VIDEO_ID,
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => { e.target.setVolume(85); e.target.playVideo(); },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING && !started) {
              started = true;
              overlay.querySelector('#bsNudge').classList.add('show');
              tick();
            }
          },
        },
      });
    });
  }

  // ---------- lyric sync loop ----------
  function currentTime() {
    if (!player || !player.getCurrentTime) return 0;
    return player.getCurrentTime() + nudge;
  }

  function showWord(ev) {
    // new line? make a fresh line container
    if (ev.lineId !== currentLineId) {
      currentLineId = ev.lineId;
      currentLineEl = document.createElement('div');
      currentLineEl.className = 'bs-line';
      lyricWrap.appendChild(currentLineEl);
      // keep only the last couple of lines around
      while (lyricWrap.children.length > 2) {
        lyricWrap.removeChild(lyricWrap.firstChild);
      }
    }
    const wEl = document.createElement('span');
    wEl.className = 'bs-word';
    wEl.textContent = ev.word;
    currentLineEl.appendChild(wEl);
    requestAnimationFrame(() => wEl.classList.add('in'));

    // schedule this word to fall off after a short life
    const life = 1600 + Math.random() * 500;
    setTimeout(() => dropWord(wEl), life);
  }

  function dropWord(wEl) {
    const rect = wEl.getBoundingClientRect();
    wEl.style.position = 'fixed';
    wEl.style.left = rect.left + 'px';
    wEl.style.top = rect.top + 'px';
    wEl.style.margin = '0';
    const dur = 700 + Math.random() * 400;
    const rot = (Math.random() - 0.5) * 70;
    const drift = (Math.random() - 0.5) * 80;
    wEl.style.transition = `transform ${dur}ms cubic-bezier(0.4,0,0.7,1), opacity ${dur}ms ease-in`;
    requestAnimationFrame(() => {
      wEl.style.transform = `translate(${drift}px, ${window.innerHeight}px) rotate(${rot}deg)`;
      wEl.style.opacity = '0';
    });
    setTimeout(() => wEl.remove(), dur + 50);
  }

  function tick() {
    const t = currentTime();
    while (nextIdx < wordEvents.length && wordEvents[nextIdx].t <= t) {
      showWord(wordEvents[nextIdx]);
      nextIdx++;
    }
    rafId = requestAnimationFrame(tick);
  }

  // ---------- trigger: double-tap the title ----------
  let lastTap = 0;
  let armed = true;
  function onTitleTap() {
    if (!armed) return;
    const now = Date.now();
    if (now - lastTap < 400) {
      armed = false;
      buildOverlay();
      fallEverythingOff(() => { stage.classList.add('ready'); });
    }
    lastTap = now;
  }

  titleEl.addEventListener('click', onTitleTap);
})(
  document.getElementById('title'),
  () => {
    // elements that should fall off the screen, in order
    const out = [];
    const title = document.getElementById('title');
    const menu = document.getElementById('menu');
    if (title) out.push(title);
    if (menu) menu.querySelectorAll('.menu-item').forEach((m) => out.push(m));
    return out;
  }
);
