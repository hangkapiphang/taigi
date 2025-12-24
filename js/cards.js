// js/cards.js

// 1. VARIABLES
let player;
let vocabList = [];
let currentVideoId = null;
let pendingSeekTime = null; // Stores the specific time to jump to

// 2. YOUTUBE API ENTRY
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('cards-container');

    if(!id) {
        container.innerHTML = `<div class="loading" style="color:red">No Data ID found.</div>`;
        return;
    }
    loadData(id);
}

// 3. LOAD DATA
async function loadData(id) {
    const container = document.getElementById('cards-container');
    const titleEl = document.getElementById('video-title');

    try {
        const response = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Data file not found");
        const data = await response.json();
        
        // Title
        fetch(`../data/library.json?t=${Date.now()}`)
            .then(r => r.json())
            .then(lib => {
                const meta = lib.find(v => v.id === id);
                if(meta) titleEl.innerText = meta.title;
            }).catch(()=>{});

        // Data
        vocabList = data.vocab || [];
        const videoUrl = data.video || ""; 
        currentVideoId = extractVideoId(videoUrl);

        renderCards();
        
        if(currentVideoId) {
            createPlayer(currentVideoId);
        } else {
            container.innerHTML = `<div class="loading">Error: Video ID not found.</div>`;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="loading" style="color:red">Error loading data.</div>`;
    }
}

// 4. RENDER CARDS
function renderCards() {
    const container = document.getElementById('cards-container');
    if(vocabList.length === 0) {
        container.innerHTML = `<div class="loading">No vocabulary found.</div>`;
        return;
    }
    vocabList.sort((a,b) => a.time - b.time);

    container.innerHTML = vocabList.map((v, index) => `
        <div class="card" id="card-${index}" onclick="playVocab(${index}, ${v.time})">
            <div class="card-word">${v.word}</div>
            <div class="card-def">${v.def}</div>
            <div class="timestamp">
                <i class="fas fa-play"></i> ${formatTime(v.time)}
            </div>
        </div>
    `).join('');
}

// 5. PLAYER SETUP
function createPlayer(vidId) {
    if (window.YT && window.YT.Player) {
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 'controls': 1, 'rel': 0, 'playsinline': 1 },
            events: {
                'onStateChange': onPlayerStateChange // Vital for iOS
            }
        });
    }
}

// THE iOS FIX LISTENER
function onPlayerStateChange(event) {
    // If Video just started Playing (State = 1)
    if (event.data === 1) {
        // Do we have a jump waiting?
        if (pendingSeekTime !== null) {
            player.seekTo(pendingSeekTime, true); // Jump to the word's time
            pendingSeekTime = null; // Reset
        }
    }
}

// 6. PLAY FUNCTION (Dynamic)
function playVocab(index, seconds) {
    if(!player || typeof player.seekTo !== 'function') return;

    // A. Calculate correct start time (Time of word - 2 seconds context)
    const startTime = Math.max(0, seconds - 2);

    // B. Highlight Card
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${index}`);
    if(activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // C. iOS Logic
    const playerState = player.getPlayerState();

    // If Video is NOT playing (Unstarted -1 or Cued 5)
    if (playerState === -1 || playerState === 5) {
        // 1. Remember where we want to go
        pendingSeekTime = startTime;
        // 2. Force it to start (iOS requires this)
        player.playVideo();
        // 3. The 'onPlayerStateChange' above will handle the jump automatically
    } else {
        // If already playing, just jump immediately
        pendingSeekTime = null;
        player.seekTo(startTime, true);
        player.playVideo();
    }
}

// 7. UTILS
function extractVideoId(url) { 
    if (!url) return null;
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); 
    return m && m[1] ? m[1] : null; 
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}
