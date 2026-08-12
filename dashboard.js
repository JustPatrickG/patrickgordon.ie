(() => {
  // ============ secret: dashboard ============
  // double-click (or double-tap) the title to open

  const GH_USER = 'JustPatrickG';
  const NAAS = { lat: 53.219, lon: -6.659 };

  let overlay = null;
  let clockTimer = null;

  // ---------- build ----------

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function panel(labelText) {
    const p = el('section', 'db-panel');
    p.appendChild(el('div', 'db-label', labelText));
    return p;
  }

  function row(k, v, vClass) {
    const r = el('div', 'db-row');
    r.appendChild(el('span', 'k', k));
    const val = el('span', 'v' + (vClass ? ' ' + vClass : ''), v);
    r.appendChild(val);
    return r;
  }

  function buildOverlay() {
    overlay = el('div', 'db-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'dashboard');

    const inner = el('div', 'db-inner');

    // header
    const head = el('div', 'db-head');
    const title = el('div', 'db-title');
    title.append('patrickgordon.ie');
    title.appendChild(el('span', 'db-path', '/dashboard'));
    title.appendChild(el('span', 'db-cursor'));
    const close = el('button', 'db-close', '[ esc ] close');
    close.addEventListener('click', closeDashboard);
    head.append(title, close);

    // grid
    const grid = el('div', 'db-grid');
    grid.append(
      buildClockPanel(),
      buildWeatherPanel(),
      buildGithubPanel(),
      buildSystemPanel(),
      buildLinksPanel(),
      buildSessionPanel()
    );

    inner.append(head, grid);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  // ---------- panels ----------

  function buildClockPanel() {
    const p = panel('time — local');
    const big = el('div', 'db-big', '--:--:--');
    const sub = el('div', 'db-sub');
    p.append(big, sub);

    function tick() {
      const now = new Date();
      big.textContent = now.toLocaleTimeString('en-IE', { hour12: false });
      const date = now.toLocaleDateString('en-IE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).toLowerCase();
      const utc = now.toUTCString().slice(17, 25);
      sub.textContent = date + '\nutc ' + utc;
      sub.style.whiteSpace = 'pre-line';
    }
    tick();
    clockTimer = setInterval(tick, 1000);
    return p;
  }

  const WMO = {
    0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'fog', 48: 'fog', 51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
    56: 'freezing drizzle', 57: 'freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain',
    66: 'freezing rain', 67: 'freezing rain',
    71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
    80: 'showers', 81: 'showers', 82: 'heavy showers',
    85: 'snow showers', 86: 'snow showers',
    95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm'
  };

  function buildWeatherPanel() {
    const p = panel('weather — naas, kildare');
    const big = el('div', 'db-big', '…');
    const sub = el('div', 'db-sub', 'fetching');
    p.append(big, sub);

    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + NAAS.lat + '&longitude=' + NAAS.lon
      + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
      + '&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FDublin';

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const c = d.current;
        big.textContent = Math.round(c.temperature_2m) + '°c';
        sub.textContent =
          (WMO[c.weather_code] || 'unknown')
          + ' · feels ' + Math.round(c.apparent_temperature) + '°'
          + ' · wind ' + Math.round(c.wind_speed_10m) + ' km/h\n'
          + 'today ' + Math.round(d.daily.temperature_2m_min[0]) + '° / '
          + Math.round(d.daily.temperature_2m_max[0]) + '°';
        sub.style.whiteSpace = 'pre-line';
      })
      .catch(() => { sub.textContent = 'weather unavailable — check connection'; });
    return p;
  }

  function relTime(iso) {
    const s = Math.max(1, Math.round((Date.now() - new Date(iso)) / 1000));
    if (s < 3600) return Math.round(s / 60) + 'm';
    if (s < 86400) return Math.round(s / 3600) + 'h';
    return Math.round(s / 86400) + 'd';
  }

  function buildGithubPanel() {
    const p = panel('github — ' + GH_USER.toLowerCase());
    const feed = el('div', 'db-feed');
    feed.appendChild(el('div', 'db-feed-item db-dim', 'loading activity…'));
    p.appendChild(feed);

    fetch('https://api.github.com/users/' + GH_USER + '/events/public?per_page=30')
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((events) => {
        feed.textContent = '';
        const pushes = events.filter((e) => e.type === 'PushEvent').slice(0, 5);
        if (!pushes.length) {
          feed.appendChild(el('div', 'db-feed-item db-dim', 'no recent public commits'));
          return;
        }
        pushes.forEach((e) => {
          const repo = e.repo.name.split('/')[1];
          const msg = (e.payload.commits && e.payload.commits.length)
            ? e.payload.commits[e.payload.commits.length - 1].message.split('\n')[0]
            : 'push';
          const item = el('div', 'db-feed-item');
          item.textContent = repo + ': ' + msg;
          item.appendChild(el('span', 't', relTime(e.created_at)));
          feed.appendChild(item);
        });
      })
      .catch(() => {
        feed.textContent = '';
        feed.appendChild(el('div', 'db-feed-item db-dim', 'github rate-limited — try again shortly'));
      });
    return p;
  }

  function buildSystemPanel() {
    const p = panel('this device');
    const rows = el('div', 'db-rows');

    const ua = navigator.userAgent;
    const browser =
      /edg\//i.test(ua) ? 'edge' :
      /opr\//i.test(ua) ? 'opera' :
      /chrome/i.test(ua) ? 'chrome' :
      /safari/i.test(ua) ? 'safari' :
      /firefox/i.test(ua) ? 'firefox' : 'browser';
    const os =
      /iphone|ipad/i.test(ua) ? 'ios' :
      /android/i.test(ua) ? 'android' :
      /mac/i.test(ua) ? 'macos' :
      /win/i.test(ua) ? 'windows' :
      /linux/i.test(ua) ? 'linux' : 'unknown';

    rows.append(
      row('browser', browser + ' / ' + os),
      row('screen', screen.width + '×' + screen.height + ' @' + (window.devicePixelRatio || 1) + 'x'),
      row('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase()),
      row('language', (navigator.language || '').toLowerCase())
    );

    const net = row('network', navigator.onLine ? 'online' : 'offline', navigator.onLine ? 'db-ok' : '');
    rows.appendChild(net);
    window.addEventListener('online', () => { net.lastChild.textContent = 'online'; net.lastChild.className = 'v db-ok'; });
    window.addEventListener('offline', () => { net.lastChild.textContent = 'offline'; net.lastChild.className = 'v'; });

    if (navigator.getBattery) {
      const bat = row('battery', '…');
      rows.appendChild(bat);
      navigator.getBattery().then((b) => {
        const set = () => {
          bat.lastChild.textContent = Math.round(b.level * 100) + '%' + (b.charging ? ' charging' : '');
        };
        set();
        b.addEventListener('levelchange', set);
        b.addEventListener('chargingchange', set);
      }).catch(() => { bat.remove(); });
    }

    p.appendChild(rows);
    return p;
  }

  function buildLinksPanel() {
    const p = panel('links');
    const links = el('div', 'db-links');
    [
      ['pgcs.ie', 'https://pgcs.ie'],
      ['github → patrickgordon.ie', 'https://github.com/JustPatrickG/patrickgordon.ie'],
      ['tiktok', 'https://www.tiktok.com/@_patrickgordon'],
      ['instagram', 'https://www.instagram.com/patrick.gordon7'],
      ['linkedin', 'https://www.linkedin.com/in/patrick-gordon-9a8422361']
    ].forEach(([label, href]) => {
      const a = el('a', null, label);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      links.appendChild(a);
    });
    p.appendChild(links);
    return p;
  }

  function buildSessionPanel() {
    const p = panel('session');
    const rows = el('div', 'db-rows');
    const opened = Date.now();
    const dur = row('dashboard open', '0s');
    rows.append(
      row('site', 'patrickgordon.ie'),
      row('hosting', 'vercel — static', 'db-ok'),
      row('protocol', location.protocol.replace(':', '')),
      dur
    );
    setInterval(() => {
      const s = Math.round((Date.now() - opened) / 1000);
      dur.lastChild.textContent = s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    }, 1000);
    p.appendChild(rows);
    return p;
  }

  // ---------- open / close ----------

  function openDashboard() {
    if (!overlay) buildOverlay();
    document.body.classList.add('db-open');
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  function closeDashboard() {
    if (!overlay) return;
    overlay.classList.remove('show');
    document.body.classList.remove('db-open');
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    setTimeout(() => { if (overlay) { overlay.remove(); overlay = null; } }, 480);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDashboard();
  });

  // ---------- trigger: double-click / double-tap on the title ----------

  function armTrigger() {
    const title = document.getElementById('title');
    if (!title) return;

    title.addEventListener('dblclick', (e) => {
      e.preventDefault();
      openDashboard();
    });

    // double-tap for touch devices
    let lastTap = 0;
    title.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 320) {
        e.preventDefault();
        openDashboard();
      }
      lastTap = now;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', armTrigger);
  } else {
    armTrigger();
  }
})();
