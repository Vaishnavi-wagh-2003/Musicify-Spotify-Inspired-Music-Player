let currentSong = new Audio();
let songs = [];
let currFolder = "";
let isPlaying = false;
let currentSongIndex = 0;

// Convert seconds → MM:SS
function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Update seekbar position
function updateSeekbar() {
  if (currentSong.duration) {
    const progressPercent = (currentSong.currentTime / currentSong.duration) * 100;
    document.querySelector('.progress').style.width = `${progressPercent}%`;
    document.querySelector('.circle').style.left = `${progressPercent}%`;
    document.querySelector('.songtime').innerText = 
      `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
  }
}

// Load songs from info.json
async function getSongs(folder, infoPath) {
  currFolder = folder;
  try {
    let res = await fetch(infoPath);
    let meta = await res.json();
    songs = meta.songs;

    // Display song list
    let songUL = document.querySelector(".songList ul");
    songUL.innerHTML = "";
    for (const song of songs) {
      const songName = song.replaceAll("%20", " ");
      songUL.innerHTML += `
        <li>
          <img width="40" src="songs/${folder}/cover.jpg" alt="${songName}">
          <div class="info">
            <div>${songName}</div>
            <div class="artist">${meta.artist || "Unknown Artist"}</div>
          </div>
          <div class="playnow"><span>Play</span></div>
        </li>`;
    }

    // Click event → play song
    Array.from(songUL.getElementsByTagName("li")).forEach((li, index) => {
      li.addEventListener("click", () => {
        currentSongIndex = index;
        playMusic(songs[index]);
      });
    });

    return songs;
  } catch (error) {
    console.error("Error loading songs:", error);
    return [];
  }
}

// Play a song
function playMusic(track, pause = false) {
  currentSong.src = `songs/${currFolder}/` + track;
  
  if (!pause) {
    currentSong.play()
      .then(() => {
        isPlaying = true;
        document.querySelector("#play").className = "fas fa-pause";
        document.querySelector(".play-pause-container").classList.add("playing");
      })
      .catch(error => {
        console.error("Playback failed:", error);
      });
  }

  // Update playbar song info
  const songName = decodeURI(track.split('.')[0]); // Remove file extension
  document.querySelector(".song-title").innerText = songName;
  document.querySelector(".songtime").innerText = "0:00 / 0:00";
  document.querySelector(".song-cover").src = `songs/${currFolder}/cover.jpg`;
  
  // Reset seekbar
  document.querySelector('.progress').style.width = '0%';
  document.querySelector('.circle').style.left = '0%';
}

// Display albums from albums.json
async function displayAlbums() {
  try {
    let res = await fetch("albums.json");
    let albums = await res.json();
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = "";

    for (let [folder, infoPath] of Object.entries(albums)) {
      let metaRes = await fetch(infoPath);
      let meta = await metaRes.json();

      cardContainer.innerHTML += `
        <div data-folder="${folder}" data-info="${infoPath}" class="card">
          <div class="card-image">
            <img src="songs/${folder}/cover.jpg" alt="${meta.title}">
            <div class="play">
              <i class="fas fa-play"></i>
            </div>
          </div>
          <h2>${meta.title}</h2>
          <p>${meta.description}</p>
        </div>`;
    }

    // Album click → load songs
    Array.from(document.getElementsByClassName("card")).forEach(card => {
      card.addEventListener("click", async () => {
        songs = await getSongs(card.dataset.folder, card.dataset.info);
        currentSongIndex = 0;
        if (songs.length > 0) {
          playMusic(songs[0]);
        }
      });
    });

    // Floating play button click
    Array.from(document.querySelectorAll(".card .play")).forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation(); // prevent card click
        let card = btn.closest(".card");
        songs = await getSongs(card.dataset.folder, card.dataset.info);
        currentSongIndex = 0;
        if (songs.length > 0) {
          playMusic(songs[0]);
        }
      });
    });
  } catch (error) {
    console.error("Error loading albums:", error);
  }
}

// Main function
async function main() {
  await displayAlbums();

  // Load default album (first one in albums.json)
  try {
    let albumsRes = await fetch("albums.json");
    let albums = await albumsRes.json();
    let defaultAlbum = Object.entries(albums)[0];
    
    if (defaultAlbum) {
      songs = await getSongs(defaultAlbum[0], defaultAlbum[1]);
      if (songs.length > 0) {
        playMusic(songs[0], true);
      }
    }
  } catch (error) {
    console.error("Error loading default album:", error);
  }

  // Play/Pause toggle
  document.querySelector("#play").addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play()
        .then(() => {
          isPlaying = true;
          document.querySelector("#play").className = "fas fa-pause";
          document.querySelector(".play-pause-container").classList.add("playing");
        })
        .catch(error => {
          console.error("Playback failed:", error);
        });
    } else {
      currentSong.pause();
      isPlaying = false;
      document.querySelector("#play").className = "fas fa-play";
      document.querySelector(".play-pause-container").classList.remove("playing");
    }
  });

  // Next song
  document.querySelector("#next").addEventListener("click", () => {
    if (songs.length === 0) return;
    
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playMusic(songs[currentSongIndex]);
  });

  // Previous song
  document.querySelector("#previous").addEventListener("click", () => {
    if (songs.length === 0) return;
    
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playMusic(songs[currentSongIndex]);
  });

  // Seekbar update
  currentSong.addEventListener("timeupdate", () => {
    updateSeekbar();
  });

  // Seek on click
  document.querySelector(".seekbar").addEventListener("click", e => {
    if (!currentSong.duration) return;
    
    const seekbar = document.querySelector('.seekbar');
    const percent = (e.offsetX / seekbar.clientWidth);
    currentSong.currentTime = percent * currentSong.duration;
    updateSeekbar();
  });

  // Volume control
  document.querySelector(".range input").addEventListener("input", e => {
    currentSong.volume = e.target.value / 100;
    
    // Update volume icon
    const volumeIcon = document.querySelector('.volume i');
    if (e.target.value == 0) {
      volumeIcon.className = 'fas fa-volume-mute';
    } else if (e.target.value < 50) {
      volumeIcon.className = 'fas fa-volume-down';
    } else {
      volumeIcon.className = 'fas fa-volume-up';
    }
  });

  // Song ended event
  currentSong.addEventListener('ended', () => {
    // Auto-play next song
    if (songs.length > 0) {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
      playMusic(songs[currentSongIndex]);
    }
  });

  // Initialize volume icon
  document.querySelector('.volume i').className = 'fas fa-volume-up';
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

console.log('Musicify Loaded 🎵');