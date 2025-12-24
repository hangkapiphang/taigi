// js/cards.js

// --- STATE MANAGEMENT ---
let player;
let vocabList = [];
let pendingSeekTime = null; // CRITICAL: Holds the timestamp while we wait for iOS to play

// 1. ENTRY POINT
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        document.getElementById('cards-grid').innerHTML = '<div class="loading">No ID provided.</div>';
        return;
    }
    loadData(id);
}

// 2. DATA LOADER
async function loadData(id) {
    try {
        // Fetch JSON
        const res = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!res.ok) throw new Error("File missing");
        const data = await res.json();

        // Set Title (Async)
        fetch(`../data/library.json`).then(r=>r.json()).then(lib => {
            const meta = lib.find(x => x.id === id);
            if(meta) document.getElementById('video-title').innerText = meta.title;
        }).catch(() => {});

        // Render Cards
        vocabList = data.vocab || [];
        renderGrid();

        // Initialize Player
        const vidId = extractVideoId(data.video);
        if(vidId) initPlayer(vidId);

    } catch (err) {
        console.error(err);
        document.getElementById('cards-grid').innerHTML = '<div class="loading">Error loading content.</div>';
    }
}

// 3. RENDER FUNCTION
function renderGrid() {
    const grid = document.getElementById('cards-grid');
    if (vocabList.length === 0) {
        grid.innerHTML = '<div class="loading">No vocabulary found.</div>';
        return;
    }
    
    // Sort chronological
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
            'playsinline': 1, // REQUIRED for iOS to allow split-screen interaction
            'controls': 1,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// 5. THE IOS SEEK ALGORITHM
// Problem: iOS fails to seek if video is "Unstarted" or "Cued".
// Solution: Queue the time -> Play -> Wait for State=1 (Playing) -> Seek.
function onPlayerStateChange(event) {
    // 1 = PLAYING
    if (event.data === 1) {
        if (pendingSeekTime !== null) {
            const t = pendingSeekTime;
            pendingSeekTime = null; // Clear immediately
            
            // 100ms Delay: Allows the iOS media decoder to stabilize.
            // Without this delay, the seek command is often ignored on iPhones.
            setTimeout(() => {
                if(player && typeof player.seekTo === 'function') {
                    player.seekTo(t, true);
                }
            }, 100);
        }
    }
}

// 6. INTERACTION HANDLER
function handleCardClick(index, seconds) {
    if (!player) return;

    // A. VISUALS: Highlight & Scroll
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(`card-${index}`);
    if (el) {
        el.classList.add('active');
        // 'center' ensures the card isn't hidden by headers/footers
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // B. REWIND LOGIC (Time - 2 seconds)
    const targetTime = Math.max(0, seconds - 2);

    // C. PLAYBACK LOGIC
    const state = player.getPlayerState();
    
    // State -1 (Unstarted) or 5 (Cued) means we CANNOT seek yet.
    if (state !== 1) {
        pendingSeekTime = targetTime; // Queue it
        player.playVideo();           // Force iOS to wake up the video
    } else {
        // If already playing, seek immediately
        pendingSeekTime = null;
        player.seekTo(targetTime, true);
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

// Inject API safely
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(tag, first);
} else {
    onYouTubeIframeAPIReady();
}