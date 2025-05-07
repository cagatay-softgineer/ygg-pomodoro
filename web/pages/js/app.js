const API_DEVELOPMENT = 'https://api-sync-branch.yggbranch.dev/';
const API_DEPLOYMENT  = 'https://python-hello-world-911611650068.europe-west3.run.app/';

// default to deployment
let API_BASE = API_DEPLOYMENT;

// on load, test the development URL once and switch if healthy
(async function pickApiBase() {
  const probeUrl = API_DEVELOPMENT + 'healthcheck';
  try {
    const res = await fetch(probeUrl, {
      method: 'GET',
      mode:   'cors',
      cache:  'no-cache',
    });

    if (res.ok) {
      API_BASE = API_DEVELOPMENT;
      console.log('✅ Development API is up — switched API_BASE to:', API_BASE);
    } else {
      console.warn(
        '⚠️ Development API unhealthy (status', 
        res.status + 
        '); staying on deployment:', 
        API_BASE
      );
    }
  } catch (err) {
    console.warn(
      '⚠️ Could not reach Development API; staying on deployment:', 
      err
    );
  }
})();
const DURATION_ENDPOINT = 'spotify-micro-service/playlist_duration';

// utils
function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('user_id'); }
function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}

// ► LOGIN
async function handleLogin(evt) {
  evt.preventDefault();
  const email = evt.target.email.value.trim(),
        pw    = evt.target.password.value.trim();
  if(!email||!pw) return alert('Fill all fields');
  const res = await fetch(API_BASE + 'auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email,password:pw})
  });
  const data = await res.json();
  if(data.error) return alert(data.message||'Login failed');
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user_id', data.user_id);
  window.location='home.html';
}

// ► REGISTER
async function handleRegister(evt) {
  evt.preventDefault();
  const email = evt.target.email.value.trim(),
        pw    = evt.target.password.value.trim();
  if(!email||!pw) return alert('Fill all fields');
  const res = await fetch(API_BASE + 'auth/register', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email,password:pw})
  });
  const data = await res.json();
  if(data.error) return alert(data.message||'Register failed');
  alert('Registration successful!');
  window.location='index.html';
}

async function fetchPlaylistInfo(playlistId, userEmail) {
    const resp = await fetch(`${API_BASE}${DURATION_ENDPOINT}`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        playlist_id: playlistId,
        user_email:  userEmail
      })
    });
    if (!resp.ok) throw new Error(`Duration API error: ${resp.status}`);
    return resp.json(); // { formatted_duration, total_track_count, … }
  }
  

// ► CHECK SPOTIFY LINK
async function initSpotifyPage() {
  const user = getUserId();
  if (!user) return location = 'index.html';

  // 1) fetch link status + profile
  const res  = await fetch(API_BASE + 'apps/check_linked_app', {
    method: 'POST',
    headers: {'Content-Type':'application/json', ...authHeaders()},
    body: JSON.stringify({app_name:'Spotify', user_email: user})
  });
  const data = await res.json();

  // 2) set up the link/unlink button
  const linkSection = document.getElementById('spotify-link-section');
  const btn          = document.getElementById('link-btn');
  if (data.user_linked) {
    btn.textContent = 'Unlink Spotify';
    btn.onclick     = unlinkSpotify;
  } else {
    btn.textContent = 'Link Spotify';
    btn.onclick     = () => window.open(API_BASE + `spotify/login/${user}`, '_blank');
  }

  // 3) render profile if linked
  const profileDiv = document.getElementById('spotify-profile');
  if (data.user_linked && data.user_profile) {
    const p = data.user_profile;
    const imgUrl = p.images?.[0]?.url || 'https://placehold.co/64x64';
    profileDiv.innerHTML = `
      <div class="card">
        <img src="${imgUrl}" alt="Avatar of ${p.display_name}">
        <div class="card-content">
          <div class="title">${p.display_name}</div>
          <div class="subtitle">${p.email}</div>
          <div class="subtitle">Country: ${p.country}</div>
          <div class="subtitle">Followers: ${p.followers.total.toLocaleString()}</div>
          <a href="${p.external_urls.spotify}" target="_blank" class="subtitle" style="color:hsl(var(--primary));">
            Open in Spotify
          </a>
        </div>
      </div>
    `;
  } else {
    profileDiv.innerHTML = '';
  }
}

// ► UNLINK SPOTIFY
async function unlinkSpotify() {
  const res = await fetch(API_BASE + 'apps/unlink_app', {
    method:'POST',
    headers:{'Content-Type':'application/json', ...authHeaders()},
    body: JSON.stringify({app_name:'Spotify', user_email:getUserId()})
  });
  const data = await res.json();
  alert(data.message || 'Spotify unlinked');
  initSpotifyPage();
}

async function getSpotifyAccessToken() {
  // your backend expects { user_email } in body + JWT in Authorization
  const res = await fetch(API_BASE + 'spotify/token', {
    method: 'POST',
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
  if (!token) {
    throw new Error('No token field in response');
  }
  return token;
}

// ► FETCH PLAYLISTS
async function initPlaylistsPage() {
    const user = getUserId();
    if (!user) {
      location.assign('index.html');
      return;
    }
  
    // 1) fetch playlists
    const res = await fetch(`${API_BASE}spotify/playlists`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ user_email: user })
    });
    if (!res.ok) {
      console.error('Failed to load playlists:', res.status);
      return;
    }
    const list = await res.json();
  
    const container = document.getElementById('playlist-list');
    container.innerHTML = '';  // clear any old cards
  
    // 2) parallel fetch duration + count
    const infoPromises = list.map(pl =>
      fetchPlaylistInfo(pl.playlist_id, user)
        .then(data => ({
          dur:   data.formatted_duration || '',
          count: data.total_track_count  || 0
        }))
        .catch(err => {
          console.warn('Info error for', pl.playlist_name, err);
          return { dur: '', count: 0 };
        })
    );
    const infos = await Promise.all(infoPromises);
  
    // 3) render cards
    list.forEach((pl, i) => {
      const { dur, count } = infos[i];
      const card = document.createElement('div');
      card.className = 'card';  // uses the improved .card CSS
    
      card.innerHTML = `
        <img
          src="${pl.playlist_image || 'https://placehold.co/64x64'}"
          alt="${pl.playlist_name} cover"
        />
    
        <div class="card-content">
          <div class="title">${pl.playlist_name}</div>
          <div class="subtitle">by ${pl.playlist_owner}</div>
          ${count ? `<div class="subtitle">Tracks: ${count}</div>` : ''}
          ${dur   ? `<div class="subtitle">Duration: ${dur}</div>` : ''}
        </div>
    
        <div class="card-actions">
          <button class="play-btn" data-playlist-id="${pl.playlist_id}">
            ▶ Play
          </button>
        </div>
      `;
    
      container.appendChild(card);
    });

    // ► 4) Play butonlarına event listener ekle
    document.getElementById('playlist-list')
    .addEventListener('click', e => {
      if (!e.target.matches('.play-btn')) return;
      const pid = e.target.dataset.playlistId;
      playPlaylist(pid).catch(err => alert('Playback error: ' + err.message));
    });
  }

// ► playPlaylist now uses your backend-fetched token
async function playPlaylist(playlistId) {
  // 1) get a fresh Spotify token from your backend
  const token = await getSpotifyAccessToken();

  // 2) call Spotify’s play endpoint
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

// ► pausePlayback also uses your backend token
async function pausePlayback() {
  const token = await getSpotifyAccessToken();
  const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Pause failed (${res.status})`);
  }
}

// ► NAVIGATION guard
function guard() {
  const page = location.pathname.split('/').pop();
  if(!getToken() && !['index.html','register.html'].includes(page)) {
    location='index.html';
  }
}

// ► INIT
window.addEventListener('DOMContentLoaded',()=>{
  guard();
  const path = location.pathname;
  if(path.endsWith('index.html')) {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
  } else if(path.endsWith('register.html')) {
    document.getElementById('register-form').addEventListener('submit', handleRegister);
  } else if(path.endsWith('spotify.html')) {
    initSpotifyPage();
  } else if(path.endsWith('playlists.html')) {
    initPlaylistsPage();
  }
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.getElementById('app-body').classList.toggle('dark');
  });




  const POMODORO_DURATION = 25 * 60;  // saniye
  let pomodoroRemaining = POMODORO_DURATION;
  let pomodoroInterval = null;
  
  // ► Zamanlayıcı UI güncelleme
  function updateTimerUI() {
    const m = String(Math.floor(pomodoroRemaining / 60)).padStart(2,'0');
    const s = String(pomodoroRemaining % 60).padStart(2,'0');
    document.getElementById('timer').textContent = `${m}:${s}`;
  }
  
  // ► Başlat
  document.getElementById('start-btn').addEventListener('click', () => {
    if (pomodoroInterval) return; // zaten çalışıyor
    // Eğer Spotify’dan seçili bir liste varsa, oynatın:
    const activePlayBtn = document.querySelector('.play-btn.active');
    if (activePlayBtn) playPlaylist(activePlayBtn.dataset.playlistId).catch(console.error);
  
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
  });
  
  // ► Duraklat
  document.getElementById('pause-btn').addEventListener('click', () => {
    if (!pomodoroInterval) return;
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    // Spotify’ı da durdur:
    pausePlayback().catch(console.error);
  });
  
  // ► Sıfırla
  document.getElementById('reset-btn').addEventListener('click', () => {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    pomodoroRemaining = POMODORO_DURATION;
    updateTimerUI();
    pausePlayback().catch(console.error);
  });
  
  // ► Spotify duraklatma fonksiyonu
  async function pausePlayback() {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {'Authorization': 'Bearer ' + token}
    });
  }
  
  // ► DOMContentLoaded sonrası ilk UI güncellemesi
  window.addEventListener('DOMContentLoaded', updateTimerUI);