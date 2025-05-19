// js/pomodoro.js
// Web Pomodoro timer with Spotify Web API integration via your BaseAPI
API = API_BASE
// Pomodoro durations (in seconds)
const DURATION = {
  '25-5': { work: 25 * 60, break: 5 * 60, long: 30 * 60 },
  '40-10': { work: 40 * 60, break: 10 * 60, long: 30 * 60 }
};

let timerInterval = null;
let playbackInterval = null;
let remaining = 0;
let phase = 'work';
let cycleCount = 0;

// ─── Playback polling & local increment ───────────────────────────────────────
let pollingInterval = null;
let localProgressInterval = null;
let localProgressMs = 0;
let localDurationMs = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(1, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Get the Spotify OAuth token from your backend
// Retrieve Spotify token from your backend
async function getSpotifyToken() {
  try {
    const userEmail = getUserId();                // your JWT-backed helper
    const res = await fetch(`${API}spotify/token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders() 
      },
      body: JSON.stringify({ user_email: userEmail })
    });
    if (!res.ok) throw new Error(`Token HTTP ${res.status}`);
    const { token } = await res.json();           // Flask returns { "token": "<access_token>" }
    return token;
  } catch (e) {
    console.error('[Pomodoro] getSpotifyToken error:', e);
    return null;
  }
}

// Build headers for any Spotify Web API call
async function getHeadersSpotify() {
  const token = await getSpotifyToken();
  if (!token) throw new Error('No Spotify token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Fetch user's Spotify playlists
async function fetchPlaylists() {
  const headers = await getHeadersSpotify();
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers
  });
  if (!res.ok) throw new Error(`GET /me/playlists ${res.status}`);
  const data = await res.json();
  return data.items;
}

// Get an active or first available device ID
async function getDeviceId() {
  const headers = await getHeadersSpotify();
  const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
    headers
  });
  if (!res.ok) throw new Error(`GET /me/player/devices ${res.status}`);
  const { devices } = await res.json();
  const dev = devices.find(d => d.is_active) || devices[0];
  return dev?.id || null;
}

// ─── Initialization ───────────────────────────────────────────────────────────

async function initPomodoroPage() {
  console.log('[Pomodoro] initPomodoroPage');

  // Ensure we can get a token
  if (!(await getSpotifyToken())) {
    console.warn('[Pomodoro] no token, redirecting');
    // return location.href = 'home.html';
  }

  // Load playlists
  let playlists;
  try {
    playlists = await fetchPlaylists();
    console.log('[Pomodoro] Playlists:', playlists.length);
  } catch (e) {
    console.error('[Pomodoro] fetchPlaylists error:', e);
    return;
  }

  // Hidden <select> for legacy
  const select = document.getElementById('playlist-dropdown');
  select.hidden = true;
  select.innerHTML = `<option value="" disabled selected>Select Playlist</option>`;

  // Custom card grid
  const picker = document.getElementById('playlist-picker');
  picker.innerHTML = '';

  playlists.forEach(pl => {
    // add <option>
    const opt = document.createElement('option');
    opt.value = pl.id;
    opt.text = pl.name;
    select.appendChild(opt);

    // build card
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.innerHTML = `
      <img src="${pl.images[0]?.url}" alt="${pl.name}" />
      <h4>${pl.name}</h4>
      <p>${pl.owner.display_name}</p>
    `;
    card.addEventListener('click', () => {
      picker.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      select.value = pl.id;
    });
    picker.appendChild(card);
  });

  // Button hooks
  document.getElementById('start-25-5')
    .addEventListener('click', () => startSession('25-5'));
  document.getElementById('start-40-10')
    .addEventListener('click', () => startSession('40-10'));
  document.getElementById('stop-timer')
    .addEventListener('click', stopSession);
}


// ─── displayCurrentPlayback ─────────────────────────────────────────────

// ─── Display & increment current playback ────────────────────────────────────
async function displayCurrentPlayback() {
  try {
    const headers = await getHeadersSpotify();
    const res = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers }
    );

    // nothing playing?
    if (res.status === 204) {
      resetPlayerUI();
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const track = data.item;
    const progress = data.progress_ms;
    const duration = track.duration_ms;

    // update local state
    localProgressMs = progress;
    localDurationMs = duration;

    // render UI now
    updatePlayerUI(track, progress, duration);

    // restart local increment
    if (localProgressInterval) clearInterval(localProgressInterval);
    localProgressInterval = setInterval(() => {
      localProgressMs += 1000;
      updateProgressUI(localProgressMs, localDurationMs);
    }, 1000);
    document.getElementById('current-player').classList.remove('hidden');

  } catch (e) {
    console.error('[Pomodoro] displayCurrentPlayback error:', e);
  }
}

function updatePlayerUI(track, progress, duration) {
  document.getElementById('cp-cover').src = track.album.images[0]?.url || '';
  document.getElementById('cp-title').textContent = track.name;
  document.getElementById('cp-artist').textContent =
    track.artists.map(a => a.name).join(', ');
  document.getElementById('cp-album').textContent = track.album.name;

  updateProgressUI(progress, duration);
}

function updateProgressUI(progress, duration) {
  const pct = Math.min((progress / duration) * 100, 100);
  document.getElementById('cp-bar-fill').style.width = `${pct}%`;

  // update times
  document.getElementById('cp-time-elapsed').textContent = formatTime(progress);
  document.getElementById('cp-duration').    textContent = formatTime(duration);
}

function resetPlayerUI() {
  document.getElementById('cp-title').textContent = 'Nothing playing';
  document.getElementById('cp-cover').src = '';
  document.getElementById('cp-artist').textContent = '';
  document.getElementById('cp-album').textContent = '';
  document.getElementById('cp-bar-fill').style.width = '0%';
  document.getElementById('cp-time-elapsed').textContent = '0:00';
  document.getElementById('cp-duration').textContent = '0:00';
  if (localProgressInterval) {
    clearInterval(localProgressInterval);
    localProgressInterval = null;
  }
}
// ─── Timer Logic ───────────────────────────────────────────────────────────────

function startSession(key) {
  const fg = document.querySelector('.form-group');
  // hide
  stopSession();
  const { work, break: brk, long } = DURATION[key];
  phase = 'work';
  remaining = work;
  cycleCount = 0;
  updateUI();
  playPlaylist();
  timerInterval = setInterval(tick, 1000);
  fg.style.display = 'none';
}

function tick() {
  remaining--;
  if (remaining < 0) {
    if (phase === 'work') {
      cycleCount++;
      phase = (cycleCount % 4 === 0) ? 'break-long' : 'break';
      remaining = (phase === 'break-long')
        ? DURATION['25-5'].long
        : DURATION['25-5'].break;
    } else {
      phase = 'work';
      remaining = DURATION['25-5'].work;
      playPlaylist();
    }
  }
  updateUI();
}

function stopSession() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = null;
  resetPlayerUI();
  const fg = document.querySelector('.form-group');
  // show
  fg.style.display = '';
}

// ─── Timer UI ────────────────────────────────────────────────────────────────
function updateUI() {
  const label = phase === 'work'
    ? 'Work Time'
    : phase === 'break-long'
      ? 'Long Break'
      : 'Short Break';
  document.getElementById('phase-label').textContent = label;

  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${m}:${s}`;
}


// ─── Spotify Playback ─────────────────────────────────────────────────────────

async function playPlaylist() {
  const pid = document.getElementById('playlist-dropdown').value;
  if (!pid) return console.warn('[Pomodoro] no playlist selected');
  const deviceId = await getDeviceId();
  if (!deviceId) return console.warn('[Pomodoro] no device');

  const headers = await getHeadersSpotify();
  await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        context_uri: `spotify:playlist:${pid}`,
        offset: { position: 0 },
        position_ms: 0
      })
    }
  );
}


async function stopPlayback() {
  let deviceId;
  try {
    deviceId = await getDeviceId();
    if (!deviceId) throw new Error('No device');
  } catch (e) {
    return console.error('[Pomodoro] getDeviceId error:', e);
  }

  try {
    const headers = await getHeadersSpotify();
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,
      { method: 'PUT', headers }
    );
    if (!res.ok) throw new Error(`PAUSE ${res.status}`);
    console.log('[Pomodoro] playback paused');
  } catch (e) {
    console.error('[Pomodoro] stopPlayback error:', e);
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.endsWith('pomodoro.html')) {
    initPomodoroPage();
  }
  displayCurrentPlayback();

  // Then poll every 5 seconds forever
  setInterval(displayCurrentPlayback, 5000);
});
