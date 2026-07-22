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
    [21.0, 24.2, "Coming out of my cage and I've been doing just fine"],
    [24.4, 27.6, "Gotta gotta be down because I want it all"],
    [27.8, 31.2, "It started out with a kiss how did it end up like this"],
    [31.4, 34.6, "It was only a kiss it was only a kiss"],
    [35.0, 38.4, "Now I'm falling asleep and she's calling a cab"],
    [38.6, 42.0, "While he's having a smoke and she's taking a drag"],
    [42.2, 45.6, "Now they're going to bed and my stomach is sick"],
    [45.8, 49.4, "And it's all in my head but she's touching his"],
    // pre-chorus
    [49.8, 51.4, "Chest now"],
    [51.6, 53.6, "He takes off her dress now"],
    [53.8, 55.4, "Let me go"],
    [55.6, 58.6, "And I just can't look it's killing me"],
    [58.8, 61.4, "They're taking control"],
    // chorus
    [61.6, 63.6, "Jealousy"],
    [63.8, 66.4, "Turning saints into the sea"],
    [66.6, 69.2, "Swimming through sick lullabies"],
    [69.4, 72.0, "Choking on your alibi"],
    [72.2, 74.8, "But it's just the price I pay"],
    [75.0, 77.6, "Destiny is calling me"],
    [77.8, 80.4, "Open up my eager eyes"],
    [80.6, 83.6, "'Cause I'm Mr. Brightside"],
    // instrumental interlude ~86.6 - 99
    // verse 2
    [96.0, 99.4, "I'm coming out of my cage and I've been doing just fine"],
    [99.6, 102.8, "Gotta gotta be down because I want it all"],
    [103.0, 106.4, "It started out with a kiss how did it end up like this"],
    [106.6, 109.8, "It was only a kiss it was only a kiss"],
    [110.2, 113.6, "Now I'm falling asleep and she's calling a cab"],
    [113.8, 117.2, "While he's having a smoke and she's taking a drag"],
    [117.4, 120.8, "Now they're going to bed and my stomach is sick"],
    [121.0, 124.6, "And it's all in my head but she's touching his"],
    [125.0, 126.6, "Chest now"],
    [126.8, 128.8, "He takes off her dress now"],
    [129.0, 130.6, "Let me go"],
    [130.8, 133.8, "'Cause I just can't look it's killing me"],
    [134.0, 136.6, "They're taking control"],
    [136.8, 138.8, "Jealousy"],
    [139.0, 141.6, "Turning saints into the sea"],
    [141.8, 144.4, "Swimming through sick lullabies"],
    [144.6, 147.2, "Choking on your alibi"],
    [147.4, 150.0, "But it's just the price I pay"],
    [150.2, 152.8, "Destiny is calling me"],
    [153.0, 155.6, "Open up my eager eyes"],
    [155.8, 158.8, "'Cause I'm Mr. Brightside"],
    // outro
    [171.0, 172.4, "I never"],
    [173.0, 174.4, "I never"],
    [175.0, 176.4, "I never"],
    [177.0, 178.4, "I never"],
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
      <div class="bs-scrim"></div>
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

    // Preload the YouTube IFrame API now (during the fall), so that when the
    // user taps play, YT is already available and we can create + play the
    // player synchronously inside the tap gesture — which is what iOS requires
    // to permit audio. Waiting until the tap to load the API means play happens
    // in an async callback, which iOS treats as non-user-initiated and blocks.
    loadYT(() => {});

    overlay.querySelector('#bsPlay').addEventListener('click', onPlay);
    overlay.querySelector('#bsExit').addEventListener('click', () => location.reload());
    overlay.querySelector('#bsNudge').addEventListener('click', () => {
      // if lyrics feel ahead of audio, tap to hold them back a touch
      nudge -= 0.4;
    });
  }

  // ---------- YouTube ----------
  let ytReady = false;
  let ytCallbacks = [];
  let ytLoading = false;

  function loadYT(cb) {
    if (window.YT && window.YT.Player) { ytReady = true; cb(); return; }
    ytCallbacks.push(cb);
    if (ytLoading) return;
    ytLoading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytReady = true;
      ytCallbacks.forEach((fn) => fn());
      ytCallbacks = [];
    };
  }

  function onPlay() {
    const playBtn = overlay.querySelector('#bsPlay');
    playBtn.classList.add('gone');
    const ytBox = overlay.querySelector('#bsYT');
    loadYT(() => {
      player = new YT.Player('bsYT', {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1, controls: 0, playsinline: 1, rel: 0,
          modestbranding: 1, fs: 0, disablekb: 1, iv_load_policy: 3,
          mute: 1,
        },
        events: {
          onReady: (e) => {
            // iOS only reliably allows MUTED autoplay when playback starts after
            // an async gap (the API script had to load). Start muted, get it
            // playing, then unmute — unmuting an already-playing video is allowed.
            e.target.mute();
            e.target.playVideo();
            let tries = 0;
            const unmute = setInterval(() => {
              tries++;
              const st = e.target.getPlayerState && e.target.getPlayerState();
              if (st === YT.PlayerState.PLAYING) {
                e.target.unMute();
                e.target.setVolume(90);
                clearInterval(unmute);
              } else if (tries > 25) {
                // give up trying to unmute silently; still unmute in case
                e.target.unMute();
                e.target.setVolume(90);
                clearInterval(unmute);
              }
            }, 120);

            ytBox.classList.add('playing');
            if (!started) { started = true; overlay.querySelector('#bsNudge').classList.add('show'); tick(); }
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              ytBox.classList.add('playing');
              if (!started) { started = true; overlay.querySelector('#bsNudge').classList.add('show'); tick(); }
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
