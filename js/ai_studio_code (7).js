// js/cards.js

let player;
let vocabList = [];
let pendingSeekTime = null; // The "Latch" for iOS

// 1. INIT
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        document.getElementById('cards-grid').innerHTML = '<div class="loading">No ID provided.</div>';
        return;
    }
    loadData(id);
}

// 2. LOAD
async function loadData(id) {
    try {
        const res = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if (!res.ok) throw new Error("File missing");
        const data = await res.json();

        // Title
        fetch(`../data/library.json`).then(r => r.json()).then(lib => {
            const meta = lib.find(x => x.id === id);
            if (meta) document.getElementById('video-title').innerText = meta.title;
        }).catch(() => {});

        // Render
        vocabList = data.vocab || [];
        renderGrid();

        // Player
        const vidId = extractVideoId(data.video);
        if (vidId) initPlayer(vidId);

    } catch (err) {
        document.getElementById('cards-grid').innerHTML = '<div class="loading">Error loading content.</div>';
    }
}

// 3. RENDER
function renderGrid() {
    const grid = document.getElementById('cards-grid');
    if (vocabList.length === 0) {
        grid.innerHTML = '<div class="loading">No vocabulary found.</div>';
        return;
    }

    vocabList.sort((a, b) => a.time - b.time);

    grid.innerHTML = vocabList.map((v, i) => `
        <div class="card" id="card-${i}" onclick="handleCardClick(${i}, ${v.time})">
            <div class="card-word">${v.word}</div>
            <div class="card-def">${v.def}</div>
            <div class="timestamp">
                <i class="fas fa-play"></i> ${formatTime(v.time)}
            </div>
        </div>
    `).join('');
}

// 4. PLAYER SETUP
function initPlayer(vidId) {
    if (!window.YT) return;

    player = new YT.Player('player', {
        videoId: vidId,
        playerVars: {
            'playsinline': 1, // REQUIRED for iPhone split-screen
            'controls': 1,
            'rel': 0
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// 5. IOS SEEK LOGIC
function onPlayerStateChange(event) {
    // State 1 = PLAYING
    if (event.data === 1) {
        if (pendingSeekTime !== null) {
            const t = pendingSeekTime;
            pendingSeekTime = null; // Clear latch
            
            // Execute seek immediately while in the event loop
            if (player && typeof player.seekTo === 'function') {
                player.seekTo(t, true);
            }
        }
    }
}

// 6. CARD CLICK
function handleCardClick(index, seconds) {
    if (!player) return;

    // Visuals
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(`card-${index}`);
    if (el) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Rewind 2 seconds
    const targetTime = Math.max(0, seconds - 2);

    // Playback Logic
    const state = player.getPlayerState();
    
    // If Playing (1), Seek immediately
    if (state === 1) {
        pendingSeekTime = null;
        player.seekTo(targetTime, true);
    } 
    // If Not Playing, Latch and Play
    else {
        pendingSeekTime = targetTime;
        player.playVideo();
    }
}

// 7. UTILS
function extractVideoId(url) {
    if (!url) return null;
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/);
    return m && m[1] ? m[1] : null;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(tag, first);
} else {
    onYouTubeIframeAPIReady();
}