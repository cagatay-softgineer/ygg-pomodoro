// app.js

// ─────────────────────────────────────────────────────────────────────────────
// API Base Selection
// ─────────────────────────────────────────────────────────────────────────────
const API_DEVELOPMENT = 'https://api-sync-branch.yggbranch.dev/';
const API_DEPLOYMENT  = 'https://python-hello-world-911611650068.europe-west3.run.app/';

// default to deployment
let API_BASE = API_DEPLOYMENT;

// on load, probe development and switch if healthy
(async function pickApiBase() {
  try {
    const res = await fetch(API_DEVELOPMENT + 'healthcheck', {
      method: 'GET',
      mode:   'cors',
      cache:  'no-cache',
    });
    if (res.ok) {
      API_BASE = API_DEVELOPMENT;
      console.log('✅ Switched to DEVELOPMENT API:', API_BASE);
    } else {
      console.warn('⚠️ Development API unhealthy (status', res.status + '), staying on DEPLOYMENT:', API_BASE);
    }
  } catch (err) {
    console.warn('⚠️ Could not reach DEVELOPMENT API; staying on DEPLOYMENT:', err);
  }
})();

const DURATION_ENDPOINT = 'spotify-micro-service/playlist_duration';


// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function getToken()    { return localStorage.getItem('token'); }
function getUserId()   { return localStorage.getItem('user_id'); }
function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}


// ─────────────────────────────────────────────────────────────────────────────
// Login & Register
// ─────────────────────────────────────────────────────────────────────────────
async function handleLogin(evt) {
  evt.preventDefault();
  const email = evt.target.email.value.trim();
  const pw    = evt.target.password.value.trim();
  if (!email || !pw) return alert('Fill all fields');
  const res = await fetch(API_BASE + 'auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password: pw })
  });
  const data = await res.json();
  if (data.error) return alert(data.message || 'Login failed');
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user_id', data.user_id);
  window.location = 'home.html';
}

async function handleRegister(evt) {
  evt.preventDefault();
  const email = evt.target.email.value.trim();
  const pw    = evt.target.password.value.trim();
  if (!email || !pw) return alert('Fill all fields');
  const res = await fetch(API_BASE + 'auth/register', {
    method: 'POST',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify({ email, password: pw })
  });
  const data = await res.json();
  if (data.error) return alert(data.message || 'Register failed');
  alert('Registration successful!');
  window.location = '/';
}


// ─────────────────────────────────────────────────────────────────────────────
// Fetch Playlist Info
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPlaylistInfo(playlistId, userEmail) {
  const resp = await fetch(API_BASE + DURATION_ENDPOINT, {
    method:  'POST',
    mode:    'cors',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ playlist_id: playlistId, user_email: userEmail })
  });
  if (!resp.ok) throw new Error(`Duration API error: ${resp.status}`);
  return resp.json();
}


// ─────────────────────────────────────────────────────────────────────────────
// Spotify Token from Backend
// ─────────────────────────────────────────────────────────────────────────────
async function getSpotifyAccessToken() {
  const res = await fetch(API_BASE + 'spotify/token', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ user_email: getUserId() })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Token fetch failed (${res.status})`);
  }
  const { token } = await res.json();
  if (!token) throw new Error('No token field in response');
  return token;
}


// ─────────────────────────────────────────────────────────────────────────────
// Playback Control
// ─────────────────────────────────────────────────────────────────────────────
async function playPlaylist(playlistId) {
  const token = await getSpotifyAccessToken();
  const res = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      context_uri: `spotify:playlist:${playlistId}`,
      offset:      { position: 0 },
      position_ms: 0
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Play failed (${res.status})`);
  }
}

async function pausePlayback() {
  const token = await getSpotifyAccessToken();
  const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Pause failed (${res.status})`);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Spotify Page Init (link/unlink & profile)
// ─────────────────────────────────────────────────────────────────────────────
async function initSpotifyPage() {
  const user = getUserId();
  if (!user) return location = '/';

  const res  = await fetch(API_BASE + 'apps/check_linked_app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ app_name: 'Spotify', user_email: user })
  });
  const data = await res.json();

  // Link/Unlink button
  const btn = document.getElementById('link-btn');
  if (data.user_linked) {
    btn.textContent = 'Unlink Spotify';
    btn.onclick     = unlinkSpotify;
  } else {
    btn.textContent = 'Link Spotify';
    btn.onclick     = () => window.open(API_BASE + `spotify/login/${user}`, '_blank');
  }

  // Profile Card
  const profileDiv = document.getElementById('spotify-profile');
  if (data.user_linked && data.user_profile) {
    const p      = data.user_profile;
    const imgUrl = p.images?.[0]?.url || 'https://placehold.co/64x64';
    profileDiv.innerHTML = `
      <div class="card">
        <img src="${imgUrl}" alt="Avatar of ${p.display_name}">
        <div class="card-content">
          <div class="title">${p.display_name}</div>
          <div class="subtitle">${p.email}</div>
          <div class="subtitle">Country: ${p.country}</div>
          <div class="subtitle">Followers: ${p.followers.total.toLocaleString()}</div>
          <a href="${p.external_urls.spotify}" target="_blank"
             class="subtitle" style="color:hsl(var(--primary));">
            Open in Spotify
          </a>
        </div>
      </div>
    `;
  } else {
    profileDiv.innerHTML = '';
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Unlink Spotify
// ─────────────────────────────────────────────────────────────────────────────
async function unlinkSpotify() {
  const res = await fetch(API_BASE + 'apps/unlink_app', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ app_name: 'Spotify', user_email: getUserId() })
  });
  const data = await res.json();
  alert(data.message || 'Spotify unlinked');
  initSpotifyPage();
}


// ─────────────────────────────────────────────────────────────────────────────
// Playlists Page Init & Render
// ─────────────────────────────────────────────────────────────────────────────
async function initPlaylistsPage() {
  const user = getUserId();
  if (!user) {
    location.assign('/');
    return;
  }

  const res = await fetch(API_BASE + 'spotify/playlists', {
    method:  'POST',
    mode:    'cors',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ user_email: user })
  });
  if (!res.ok) {
    console.error('Failed to load playlists:', res.status);
    return;
  }
  const list = await res.json();

  const infos = await Promise.all(
    list.map(pl =>
      fetchPlaylistInfo(pl.playlist_id, user)
        .then(data => ({ dur: data.formatted_duration || '', count: data.total_track_count || 0 }))
        .catch(err => { console.warn('Info error for', pl.playlist_name, err); return { dur: '', count: 0 }; })
    )
  );

  const container = document.getElementById('playlist-list');
  container.innerHTML = '';
  list.forEach((pl, i) => {
    const { dur, count } = infos[i];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${pl.playlist_image || 'https://placehold.co/64x64'}" alt="${pl.playlist_name} cover">
      <div class="card-content">
        <div class="title">${pl.playlist_name}</div>
        <div class="subtitle">by ${pl.playlist_owner}</div>
        ${count ? `<div class="subtitle">Tracks: ${count}</div>` : ''}
        ${dur   ? `<div class="subtitle">Duration: ${dur}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="play-btn" data-playlist-id="${pl.playlist_id}">▶ Play</button>
      </div>
    `;
    container.appendChild(card);
  });

  container.addEventListener('click', e => {
    if (!e.target.matches('.play-btn')) return;
    playPlaylist(e.target.dataset.playlistId)
      .catch(err => alert('Playback error: ' + err.message));
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Pomodoro Timer
// ─────────────────────────────────────────────────────────────────────────────
const POMODORO_DURATION = 25 * 60;
let pomodoroRemaining   = POMODORO_DURATION;
let pomodoroInterval    = null;

function updateTimerUI() {
  const m = String(Math.floor(pomodoroRemaining / 60)).padStart(2, '0');
  const s = String(pomodoroRemaining % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${m}:${s}`;
}

function startPomodoro() {
  if (pomodoroInterval) return;
  pomodoroInterval = setInterval(() => {
    if (pomodoroRemaining <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
      alert('Pomodoro tamamlandı!');
      return;
    }
    pomodoroRemaining--;
    updateTimerUI();
  }, 1000);
}

function pausePomodoro() {
  if (!pomodoroInterval) return;
  clearInterval(pomodoroInterval);
  pomodoroInterval = null;
}

function resetPomodoro() {
  pausePomodoro();
  pomodoroRemaining = POMODORO_DURATION;
  updateTimerUI();
}


// ─────────────────────────────────────────────────────────────────────────────
// Navigation Guard & Initialization
// ─────────────────────────────────────────────────────────────────────────────
function guard() {
  let page = location.pathname.split('/').pop();
  if (!page) page = 'index.html';
  if (!getToken() && !['index.html', 'register.html'].includes(page)) {
    location = '/';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // ─ Theme persistence & toggle ─────────────────────────────────────────────
  const bodyEl    = document.getElementById('app-body');
  const toggleBtn = document.getElementById('theme-toggle');
  if (bodyEl && localStorage.getItem('theme') === 'dark') {
    bodyEl.classList.add('dark');
  }
  if (bodyEl && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = bodyEl.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

const rootEl   = document.documentElement;
const toggleEl = document.getElementById('theme-toggle');

// on-click, flip it and store
toggleEl.addEventListener('click', () => {
  const isDark = rootEl.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

  // ─ Run guard & init page-specific logic ───────────────────────────────────
  guard();
  const path = location.pathname;
  if (path.endsWith('/') || path.endsWith('index.html')) {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
  } else if (path.endsWith('register.html')) {
    document.getElementById('register-form').addEventListener('submit', handleRegister);
  } else if (path.endsWith('spotify.html')) {
    initSpotifyPage();
  } else if (path.endsWith('playlists.html')) {
    initPlaylistsPage();
  }

  // ─ Pomodoro controls ─────────────────────────────────────────────────────
  document.getElementById('start-btn').addEventListener('click', () => {
    startPomodoro();
    const activeBtn = document.querySelector('.play-btn.active');
    if (activeBtn) playPlaylist(activeBtn.dataset.playlistId).catch(console.error);
  });
  document.getElementById('pause-btn').addEventListener('click', () => {
    pausePomodoro();
    pausePlayback().catch(console.error);
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    resetPomodoro();
    pausePlayback().catch(console.error);
  });

  // ─ Initial timer render ──────────────────────────────────────────────────
  updateTimerUI();
});
