// js/models.js

// === 1) MusicApp “enum” ===
const MusicApp = {
  Spotify: 'Spotify',
  YouTube: 'YouTube',
  Apple:   'Apple'
};

// === 2) Track model with fromJson ===
class Track {
  constructor({ trackName, artistName, trackId, trackImage }) {
    this.trackName  = trackName;
    this.artistName = artistName;
    this.trackId    = trackId;
    this.trackImage = trackImage;
  }

  static fromJson(json, app) {
    switch (app) {
      case MusicApp.YouTube:
        return new Track({
          trackName:  json.title          || '',
          artistName: json.channelTitle  || '',
          trackId:    json.video_id      || '',
          trackImage: json.thumbnail_url || ''
        });

      case MusicApp.Spotify:
      case MusicApp.Apple:
      default:
        return new Track({
          trackName:  json.track_name  || '',
          artistName: json.artist_name || '',
          trackId:    json.track_id    || '',
          trackImage: json.track_image || ''
        });
    }
  }
}

// === 3) Playlist model with fromJson ===
class Playlist {
  constructor({
    playlistName, playlistId, playlistImage, playlistOwner,
    playlistOwnerID, playlistTrackCount, playlistDuration,
    channelImage, tracks, app
  }) {
    this.playlistName      = playlistName;
    this.playlistId        = playlistId;
    this.playlistImage     = playlistImage;
    this.playlistOwner     = playlistOwner;
    this.playlistOwnerID   = playlistOwnerID;
    this.playlistTrackCount= playlistTrackCount;
    this.playlistDuration  = playlistDuration;
    this.channelImage      = channelImage;
    this.tracks            = tracks;
    this.app               = app;
  }

  static fromJson(json, app) {
    switch (app) {
      case MusicApp.YouTube: {
        const snippet        = json.snippet || {};
        const contentDetails = json.contentDetails || {};
        const thumbs         = snippet.thumbnails || {};

        // pick best thumbnail
        let imageUrl = '';
        if (thumbs.high?.url)    imageUrl = thumbs.high.url;
        else if (thumbs.default?.url) imageUrl = thumbs.default.url;

        const channelImg = snippet.channelImage || null;

        // parse tracks list
        const rawTracks = json.tracks || [];
        const tracks    = rawTracks.map(t => Track.fromJson(t, app));

        // total_tracks fallback to itemCount or tracks.length
        const totalTracks = json.total_tracks 
          ?? contentDetails.itemCount 
          ?? tracks.length;

        // pay attention to possible backend typo
        const duration = json.formatted_duration 
          ?? json.formatted_duraiton 
          ?? null;

        return new Playlist({
          playlistName:       snippet.title          || '',
          playlistId:         json.id                 || '',
          playlistImage:      imageUrl,
          playlistOwner:      snippet.channelTitle   || '',
          playlistOwnerID:    snippet.channelId      || '',
          playlistTrackCount: totalTracks,
          playlistDuration:   duration,
          channelImage:       channelImg,
          tracks,
          app
        });
      }

      case MusicApp.Spotify: {
        const tracks = (json.tracks || []).map(t => Track.fromJson(t, app));
        return new Playlist({
          playlistName:       json.playlist_name      || '',
          playlistId:         json.playlist_id        || '',
          playlistImage:      json.playlist_image     || '',
          playlistOwner:      json.playlist_owner     || '',
          playlistOwnerID:    json.playlist_owner_id  || '',
          playlistTrackCount: json.playlist_track_count || 0,
          playlistDuration:   json.playlist_duration || "0",
          channelImage:       null,
          tracks,
          app
        });
      }

      case MusicApp.Apple: {
        const attrs   = json.attributes || {};
        const artwork = attrs.artwork     || {};
        let imageUrl  = '';
        if (artwork.url) {
          imageUrl = artwork.url.replace('{w}', '200').replace('{h}', '200');
        }
        return new Playlist({
          playlistName:       attrs.name             || '',
          playlistId:         json.id                 || '',
          playlistImage:      imageUrl,
          playlistOwner:      '',
          playlistOwnerID:    '',
          playlistTrackCount: json.total_tracks       || 0,
          playlistDuration:   json.formatted_duration|| "0",
          channelImage:       null,
          tracks:             [],
          app
        });
      }
    }
  }
}

// expose to global
window.MusicApp = MusicApp;
window.Playlist = Playlist;
window.Track    = Track;
