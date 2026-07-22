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
  // Exact start timecodes supplied from the official lyric video. Each line's
  // end is the next line's start, so words distribute across the real gap.
  const LINES = [
    [6.62, 10.22, "Coming out of my cage and I've been doing just fine"],
    [10.22, 13.00, "Gotta gotta be down because I want it all"],
    [13.00, 16.59, "It started out with a kiss how did it end up like this"],
    [16.59, 19.87, "It was only a kiss it was only a kiss"],
    [19.87, 22.96, "Now I'm falling asleep and she's calling a cab"],
    [22.96, 26.34, "While he's having a smoke and she's taking a drag"],
    [26.34, 29.61, "Now they're going to bed and my stomach is sick"],
    [29.61, 34.17, "And it's all in my head but she's touching his chest now"],
    [34.17, 42.00, "He takes off her dress now let me go"],
    [45.71, 51.42, "I just can't look it's killing me"],
    [51.42, 58.34, "And taking control"],
    [58.34, 63.14, "Jealousy turning saints into the sea"],
    [63.14, 69.61, "Swimming through sick lullabies choking on your alibis"],
    [69.61, 76.05, "But it's just the price I pay destiny is calling me"],
    [76.05, 84.91, "Open up my eager eyes 'cause I'm Mr. Brightside"],
    // instrumental interlude ~84.91 - 97.48
    [97.48, 101.13, "I'm coming out of my cage and I've been doing just fine"],
    [101.13, 104.06, "Gotta gotta be down because I want it all"],
    [104.06, 107.65, "It started out with a kiss how did it end up like this"],
    [107.65, 110.99, "It was only a kiss it was only a kiss"],
    [110.99, 114.22, "Now I'm falling asleep and she's calling a cab"],
    [114.22, 117.46, "While he's having a smoke and she's taking a drag"],
    [117.46, 120.67, "Now they're going to bed and my stomach is sick"],
    [120.67, 124.75, "And it's all in my head but she's touching his chest now"],
    [124.75, 136.36, "He takes off her dress now let me go"],
    [136.36, 142.00, "'Cause I just can't look it's killing me"],
    [142.00, 149.17, "And taking control"],
    [149.17, 153.63, "Jealousy turning saints into the sea"],
    [153.63, 160.60, "Swimming through sick lullabies choking on your alibis"],
    [160.60, 167.17, "But it's just the price I pay destiny is calling me"],
    [167.17, 187.65, "Open up my eager eyes 'cause I'm Mr. Brightside"],
    // outro
    [187.65, 194.02, "I never"],
    [194.02, 200.40, "I never"],
    [200.40, 206.95, "I never"],
    [206.95, 212.71, "I never"],
  ];

  // Timecodes above are exact, so no global shift is needed.
  // If the whole thing ever drifts, nudge this: + = earlier, - = later.
  const TIME_OFFSET = 0.0;

  // Flatten to word events: { t, word, lineId, isLineStart }
  // Words spread across each line's window, but the span is capped so a line
  // followed by a long instrumental gap doesn't dribble its words out slowly —
  // it uses at most ~0.42s per word.
  const wordEvents = [];
  LINES.forEach((line, lineId) => {
    const [start, end, text] = line;
    const words = text.split(' ');
    const rawSpan = Math.max(0.4, end - start);
    const cappedSpan = Math.min(rawSpan, words.length * 0.42);
    const per = cappedSpan / words.length;
    words.forEach((w, i) => {
      wordEvents.push({ t: (start + i * per) - TIME_OFFSET, word: w, lineId, isLineStart: i === 0 });
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
    try {
      if (!player || !player.getCurrentTime) return 0;
      const t = player.getCurrentTime();
      return (typeof t === 'number' && isFinite(t) ? t : 0) + nudge;
    } catch (err) {
      return 0;
    }
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
