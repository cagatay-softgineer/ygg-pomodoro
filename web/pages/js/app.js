// app.js

// ─────────────────────────────────────────────────────────────────────────────
// API Base Selection
// ─────────────────────────────────────────────────────────────────────────────
const API_DEVELOPMENT = "https://api-sync-branch.yggbranch.dev/";
const API_DEPLOYMENT =
  "https://python-hello-world-911611650068.europe-west3.run.app/";

// default to deployment
let API_BASE = API_DEPLOYMENT;

// on load, probe development and switch if healthy
(async function pickApiBase() {
  try {
    const res = await fetch(API_DEVELOPMENT + "healthcheck", {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
    });
    if (res.ok) {
      API_BASE = API_DEVELOPMENT;
      console.log("✅ Switched to DEVELOPMENT API:", API_BASE);
    } else {
      console.warn(
        "⚠️ Development API unhealthy (status",
        res.status + "), staying on DEPLOYMENT:",
        API_BASE
      );
    }
  } catch (err) {
    console.warn(
      "⚠️ Could not reach DEVELOPMENT API; staying on DEPLOYMENT:",
      err
    );
  }
})();

const DURATION_ENDPOINT = "spotify-micro-service/playlist_duration";

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token");
}
function getUserId() {
  return localStorage.getItem("user_id");
}
function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Login & Register
// ─────────────────────────────────────────────────────────────────────────────
async function handleLogin(evt) {
  evt.preventDefault();
  const email = evt.target.email.value.trim();
  const pw = evt.target.password.value.trim();
  if (!email || !pw) return alert("Fill all fields");
  const res = await fetch(API_BASE + "auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  });
  const data = await res.json();
  if (data.error) return alert(data.message || "Login failed");
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user_id", data.user_id);
  window.location = "home.html";
}

async function handleRegister(evt) {
  evt.preventDefault();
  const email = evt.target.email.value.trim();
  const pw = evt.target.password.value.trim();
  if (!email || !pw) return alert("Fill all fields");
  const res = await fetch(API_BASE + "auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  });
  const data = await res.json();
  if (data.error) return alert(data.message || "Register failed");
  alert("Registration successful!");
  window.location = "/";
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Playlist Info
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPlaylistInfo(playlistId, userEmail) {
  const resp = await fetch(API_BASE + DURATION_ENDPOINT, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ playlist_id: playlistId, user_email: userEmail }),
  });
  if (!resp.ok) throw new Error(`Duration API error: ${resp.status}`);
  return resp.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Spotify Token from Backend
// ─────────────────────────────────────────────────────────────────────────────
async function getSpotifyAccessToken() {
  const res = await fetch(API_BASE + "spotify/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ user_email: getUserId() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Token fetch failed (${res.status})`);
  }
  const { token } = await res.json();
  if (!token) throw new Error("No token field in response");
  return token;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playback Control
// ─────────────────────────────────────────────────────────────────────────────
async function playPlaylist(playlistId) {
  const token = await getSpotifyAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context_uri: `spotify:playlist:${playlistId}`,
      offset: { position: 0 },
      position_ms: 0,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Play failed (${res.status})`);
  }
}

async function pausePlayback() {
  const token = await getSpotifyAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { Authorization: "Bearer " + token },
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
  if (!user) return (location = "/");

  const res = await fetch(API_BASE + "apps/check_linked_app", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ app_name: "Spotify", user_email: user }),
  });
  const data = await res.json();

  // Link/Unlink button
  const btn = document.getElementById("link-btn");
  if (data.user_linked) {
    btn.textContent = "Unlink Spotify";
    btn.onclick = unlinkSpotify;
  } else {
    btn.textContent = "Link Spotify";
    btn.onclick = () =>
      window.open(API_BASE + `spotify/login/${user}`, "_blank");
  }

  // Profile Card
  const profileDiv = document.getElementById("spotify-profile");
  if (data.user_linked && data.user_profile) {
    const p = data.user_profile;
    const imgUrl = p.images?.[0]?.url || "https://placehold.co/64x64";
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
    profileDiv.innerHTML = "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unlink Spotify
// ─────────────────────────────────────────────────────────────────────────────
async function unlinkSpotify() {
  const res = await fetch(API_BASE + "apps/unlink_app", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ app_name: "Spotify", user_email: getUserId() }),
  });
  const data = await res.json();
  alert(data.message || "Spotify unlinked");
  initSpotifyPage();
}

// ─────────────────────────────────────────────────────────────────────────────
// Playlists Page Init & Render
// ─────────────────────────────────────────────────────────────────────────────
async function initPlaylistsPage() {
  const user = getUserId();
  if (!user) {
    location.assign("/");
    return;
  }

  const res = await fetch(API_BASE + "spotify/playlists", {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ user_email: user }),
  });
  if (!res.ok) {
    console.error("Failed to load playlists:", res.status);
    return;
  }
  const list = await res.json();

  const infos = await Promise.all(
    list.map((pl) =>
      fetchPlaylistInfo(pl.playlist_id, user)
        .then((data) => ({
          dur: data.formatted_duration || "",
          count: data.total_track_count || 0,
        }))
        .catch((err) => {
          console.warn("Info error for", pl.playlist_name, err);
          return { dur: "", count: 0 };
        })
    )
  );

  const container = document.getElementById("playlist-list");
  container.innerHTML = "";
  list.forEach((pl, i) => {
    const { dur, count } = infos[i];
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${pl.playlist_image || "https://placehold.co/64x64"}" alt="${
      pl.playlist_name
    } cover">
      <div class="card-content">
        <div class="title">${pl.playlist_name}</div>
        <div class="subtitle">by ${pl.playlist_owner}</div>
        ${count ? `<div class="subtitle">Tracks: ${count}</div>` : ""}
        ${dur ? `<div class="subtitle">Duration: ${dur}</div>` : ""}
      </div>
      <div class="card-actions">
        <button class="play-btn" data-playlist-id="${
          pl.playlist_id
        }">▶ Play</button>
      </div>
    `;
    container.appendChild(card);
  });

  container.addEventListener("click", (e) => {
    if (!e.target.matches(".play-btn")) return;
    playPlaylist(e.target.dataset.playlistId).catch((err) =>
      alert("Playback error: " + err.message)
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pomodoro Timer
// ─────────────────────────────────────────────────────────────────────────────
const POMODORO_DURATION = 25 * 60;
let pomodoroRemaining = POMODORO_DURATION;
let pomodoroInterval = null;

function updateTimerUI() {
  const m = String(Math.floor(pomodoroRemaining / 60)).padStart(2, "0");
  const s = String(pomodoroRemaining % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${m}:${s}`;
}

function startPomodoro() {
  if (pomodoroInterval) return;
  pomodoroInterval = setInterval(() => {
    if (pomodoroRemaining <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
      alert("Pomodoro tamamlandı!");
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
/*─────────────────────────────────────────────────────────────────────────────
  Playlist models
  ─────────────────────────────────────────────────────────────────────────────*/

// js/models.js

// === 1) MusicApp “enum” ===
const MusicApp = {
  Spotify: "Spotify",
  YouTube: "YouTube",
  Apple: "Apple",
};

// === 2) Track model with fromJson ===
class Track {
  constructor({ trackName, artistName, trackId, trackImage }) {
    this.trackName = trackName;
    this.artistName = artistName;
    this.trackId = trackId;
    this.trackImage = trackImage;
  }

  static fromJson(json, app) {
    switch (app) {
      case MusicApp.YouTube:
        return new Track({
          trackName: json.title || "",
          artistName: json.channelTitle || "",
          trackId: json.video_id || "",
          trackImage: json.thumbnail_url || "",
        });

      case MusicApp.Spotify:
      case MusicApp.Apple:
      default:
        return new Track({
          trackName: json.track_name || "",
          artistName: json.artist_name || "",
          trackId: json.track_id || "",
          trackImage: json.track_image || "",
        });
    }
  }
}

// === 3) Playlist model with fromJson ===
class Playlist {
  constructor({
    playlistName,
    playlistId,
    playlistImage,
    playlistOwner,
    playlistOwnerID,
    playlistTrackCount,
    playlistDuration,
    channelImage,
    tracks,
    app,
  }) {
    this.playlistName = playlistName;
    this.playlistId = playlistId;
    this.playlistImage = playlistImage;
    this.playlistOwner = playlistOwner;
    this.playlistOwnerID = playlistOwnerID;
    this.playlistTrackCount = playlistTrackCount;
    this.playlistDuration = playlistDuration;
    this.channelImage = channelImage;
    this.tracks = tracks;
    this.app = app;
  }

  static fromJson(json, app) {
    switch (app) {
      case MusicApp.YouTube: {
        const snippet = json.snippet || {};
        const contentDetails = json.contentDetails || {};
        const thumbs = snippet.thumbnails || {};

        // pick best thumbnail
        let imageUrl = "";
        if (thumbs.high?.url) imageUrl = thumbs.high.url;
        else if (thumbs.default?.url) imageUrl = thumbs.default.url;

        const channelImg = snippet.channelImage || null;

        // parse tracks list
        const rawTracks = json.tracks || [];
        const tracks = rawTracks.map((t) => Track.fromJson(t, app));

        // total_tracks fallback to itemCount or tracks.length
        const totalTracks =
          json.total_tracks ?? contentDetails.itemCount ?? tracks.length;

        // pay attention to possible backend typo
        const duration =
          json.formatted_duration ?? json.formatted_duraiton ?? null;

        return new Playlist({
          playlistName: snippet.title || "",
          playlistId: json.id || "",
          playlistImage: imageUrl,
          playlistOwner: snippet.channelTitle || "",
          playlistOwnerID: snippet.channelId || "",
          playlistTrackCount: totalTracks,
          playlistDuration: duration,
          channelImage: channelImg,
          tracks,
          app,
        });
      }

      case MusicApp.Spotify: {
        const tracks = (json.tracks || []).map((t) => Track.fromJson(t, app));
        return new Playlist({
          playlistName: json.playlist_name || "",
          playlistId: json.playlist_id || "",
          playlistImage: json.playlist_image || "",
          playlistOwner: json.playlist_owner || "",
          playlistOwnerID: json.playlist_owner_id || "",
          playlistTrackCount: json.playlist_track_count || 0,
          playlistDuration: json.playlist_duration || "0",
          channelImage: null,
          tracks,
          app,
        });
      }

      case MusicApp.Apple: {
        // The backend returns { data: [ { attributes, formatted_duration, ... } ] }
        // but fetchPlaylists already passed us one element from data[], so here json is that element.
        const attrs = json.attributes || {};
        const artwork = attrs.artwork || {};

        // Use the provided width/height or default to 200px
        const w = artwork.width || 200;
        const h = artwork.height || 200;

        // Build the URL, swapping out ALL {w}/{h} tokens if present
        let imageUrl = "";
        if (typeof artwork.url === "string") {
          imageUrl = artwork.url.replace(/{w}/g, w).replace(/{h}/g, h);
        }
        // Fallback placeholder if something went wrong
        if (!imageUrl) {
          imageUrl =
            "https://toolbox.marketingtools.apple.com/_next/static/media/music.159ea19e.svg";
        }
        return new Playlist({
          playlistName: attrs.name || "",
          playlistId: json.playlist_id || json.id || "",
          playlistImage: imageUrl,
          playlistOwner: "", // Apple Music doesn’t expose owner here
          playlistOwnerID: "",
          playlistTrackCount: json.total_tracks || 0,
          playlistDuration: json.formatted_duration || "0",
          channelImage: null,
          tracks: [], // fetched separately if needed
          app,
        });
      }
    }
  }
}

// expose to global
window.MusicApp = MusicApp;
window.Playlist = Playlist;
window.Track = Track;

/*─────────────────────────────────────────────────────────────────────────────
  Youtube Connections
  ─────────────────────────────────────────────────────────────────────────────*/
async function initYouTubePage() {
  const user = getUserId();
  if (!user) {
    location.assign("index.html");
    return;
  }

  const res = await fetch(`${API_BASE}youtube-music/playlists`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ user_email: user }),
  });

  if (!res.ok) {
    console.error("Failed to load YouTube playlists:", res.status);
    return;
  }

  const data = await res.json();
  const items = (data.items || []).map((i) =>
    Playlist.fromJson(i, MusicApp.YouTube)
  );
  const container = document.getElementById("ytm-playlist-list");
  container.innerHTML = "";

  items.forEach((pl) => {
    const card = document.createElement("div");
    card.className = "card rounded-app bg-accent";
    card.innerHTML = `
     <img src="${pl.playlistImage}" alt="${pl.playlistName}">
     <div>
       <strong>${pl.playlistName}</strong><br>
       ${
         pl.playlistTrackCount
           ? `<small>Tracks: ${pl.playlistTrackCount}</small><br>`
           : ""
       }
       ${
         pl.playlistDuration
           ? `<small>Duration: ${pl.playlistDuration}</small>`
           : ""
       }
     </div>
   `;
    container.appendChild(card);
  });
}
/*─────────────────────────────────────────────────────────────────────────────
  Apple Music Page
  ─────────────────────────────────────────────────────────────────────────────*/

async function initApplePage() {
  const user = getUserId();
  if (!user) {
    location.assign("index.html");
    return;
  }

  // 1) Use the Apple Music endpoint
  const res = await fetch(`${API_BASE}apple-music/playlists`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ user_email: user }),
  });

  if (!res.ok) {
    console.error("Failed to load Apple Music playlists:", res.status);
    return;
  }

  // 2) Parse the JSON
  const json = await res.json();

  // Apple returns its list under `data`
  const raw = Array.isArray(json.data) ? json.data : [];

  // 3) Map through `raw` with the Apple model
  const items = raw.map(i => Playlist.fromJson(i, MusicApp.Apple));

  // 4) Render
  const container = document.getElementById("apple-playlist-list");
  container.innerHTML = "";

  items.forEach(pl => {
    const card = document.createElement("div");
    card.className = "card rounded-app bg-accent";
    card.innerHTML = `
      <img src="${pl.playlistImage}" alt="${pl.playlistName}" />
      <div class="p-2">
        <strong>${pl.playlistName}</strong><br/>
        ${pl.playlistTrackCount
          ? `<small>Tracks: ${pl.playlistTrackCount}</small><br/>`
          : ""}
        ${pl.playlistDuration
          ? `<small>Duration: ${pl.playlistDuration}</small>`
          : ""}
      </div>
    `;
    container.appendChild(card);
  });
}

/*─────────────────────────────────────────────────────────────────────────────
  App Page
  ─────────────────────────────────────────────────────────────────────────────*/

async function initAppsPage() {
  const user = getUserId();
  if (!user) {
    location.assign("index.html");
    return;
  }

  const res = await fetch(`${API_BASE}apps/get_all_apps_binding`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ user_email: user }),
  });

  if (!res.ok) {
    console.error("Failed to fetch app bindings:", res.status);
    return;
  }

  const { apps } = await res.json();
  // map backend app_name → slug used in our IDs
  const slug = {
    Spotify: "spotify",
    YoutubeMusic: "youtube",
    AppleMusic: "apple",
  };

  apps.forEach((entry) => {
    const key = slug[entry.app_name];
    if (!key) return;

    const btn = document.getElementById(`link-${key}-btn`);
    const statusEl = document.getElementById(`status-${key}`);

    if (entry.user_linked) {
      // mark linked
      btn.textContent = "Unlink";
      btn.classList.add("linked");

      // show profile snippet
      const profile = entry.user_profile || {};
      let html = "";
      if (profile.display_name) {
        html += `<p>${profile.display_name}</p>`;
      } else if (profile.name) {
        html += `<p>${profile.name}</p>`;
      }
      // Spotify has images[]
      if (Array.isArray(profile.images) && profile.images[0]?.url) {
        html += `<img src="${profile.images[0].url}" alt="Avatar" class="avatar" style="width:32px; border-radius:50%;">`;
      }
      statusEl.innerHTML = html;
    } else {
      // not linked
      statusEl.textContent = "Not connected";
      btn.textContent = `Link ${
        entry.app_name === "AppleMusic" ? "Apple Music" : entry.app_name
      }`;
      btn.classList.remove("linked");
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  guard();
  const path = location.pathname;
  if (path.endsWith("apps.html")) {
    initAppsPage();
    // you can also attach click handlers here:
    document
      .getElementById("link-spotify-btn")
      .addEventListener(
        "click",
        () => (window.location.href = `${API_BASE}spotify/link`)
      );
    document
      .getElementById("link-youtube-btn")
      .addEventListener(
        "click",
        () => (window.location.href = `${API_BASE}youtubeMusic/link`)
      );
    document
      .getElementById("link-apple-btn")
      .addEventListener(
        "click",
        () => (window.location.href = `${API_BASE}appleMusic/link`)
      );
  }
  // … your other routes …
});

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Guard & Initialization
// ─────────────────────────────────────────────────────────────────────────────
function guard() {
  const path = window.location.pathname;
  const publicPages = ["index.html", "login.html", "register.html", "/"];
  // allow root (/) or landing, login, register
  if (
    !localStorage.getItem("token") &&
    !publicPages.some((p) => path.endsWith(p))
  ) {
    window.location.href = "index.html";
  }
}

const logoutLink = document.getElementById("logout-link");
if (logoutLink) {
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    // 1) clear all stored data
    localStorage.clear();
    // 2) replace current history entry so back button won’t return to this page
    window.location.replace("index.html");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  // ─ Theme persistence & toggle ─────────────────────────────────────────────
  const bodyEl = document.getElementById("app-body");
  const toggleBtn = document.getElementById("theme-toggle");
  if (bodyEl && localStorage.getItem("theme") === "dark") {
    bodyEl.classList.add("dark");
  }
  if (bodyEl && toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = bodyEl.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  const rootEl = document.documentElement;
  const toggleEl = document.getElementById("theme-toggle");

  // on-click, flip it and store
  toggleEl.addEventListener("click", () => {
    const isDark = rootEl.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // ─ Run guard & init page-specific logic ───────────────────────────────────
  guard();
  const path = location.pathname;
  if (path.endsWith("/") || path.endsWith("login.html")) {
    document
      .getElementById("login-form")
      .addEventListener("submit", handleLogin);
  } else if (path.endsWith("register.html")) {
    document
      .getElementById("register-form")
      .addEventListener("submit", handleRegister);
  } else if (path.endsWith("spotify.html")) {
    initSpotifyPage();
  } else if (path.endsWith("playlists.html")) {
    initPlaylistsPage();
  } else if (path.endsWith("pomodoro.html")) {
  } else if (path.endsWith("youtube.html")) {
    initYouTubePage();
  } else if (path.endsWith("apple.html")) {
    initApplePage();
  }

  // ─ Pomodoro controls ─────────────────────────────────────────────────────
  document.getElementById("start-btn").addEventListener("click", () => {
    startPomodoro();
    const activeBtn = document.querySelector(".play-btn.active");
    if (activeBtn)
      playPlaylist(activeBtn.dataset.playlistId).catch(console.error);
  });
  document.getElementById("pause-btn").addEventListener("click", () => {
    pausePomodoro();
    pausePlayback().catch(console.error);
  });
  document.getElementById("reset-btn").addEventListener("click", () => {
    resetPomodoro();
    pausePlayback().catch(console.error);
  });

  // ─ Initial timer render ──────────────────────────────────────────────────
  updateTimerUI();
});
