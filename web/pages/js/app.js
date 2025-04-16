const API_BASE = 'https://api-sync-branch.yggbranch.dev/';
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
  if(!user) return location='index.html';
  // GET link status
  const res = await fetch(API_BASE + 'apps/check_linked_app', {
    method:'POST',
    headers:{'Content-Type':'application/json', ...authHeaders()},
    body: JSON.stringify({app_name:'Spotify', user_email:user})
  });
  const data = await res.json();
  const btn = document.getElementById('link-btn');
  if(data.user_linked==='true' || data.user_linked===true) {
    btn.textContent='Unlink Spotify';
    btn.onclick = unlinkSpotify;
  } else {
    btn.textContent='Link Spotify';
    btn.onclick = () => {
      window.open(API_BASE + `spotify/login/${user}`, '_blank');
    };
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
      card.className = 'card rounded-app bg-accent';
      card.innerHTML = `
        <img src="${pl.playlist_image || 'https://via.placeholder.com/60'}" alt="">
        <div>
          <strong>${pl.playlist_name}</strong><br>
          <small>by ${pl.playlist_owner}</small><br>
          ${count  ? `<small>Tracks: ${count}</small><br>` : ''}
          ${dur    ? `<small>Duration: ${dur}</small>`   : ''}
        </div>
      `;
      container.appendChild(card);
    });
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