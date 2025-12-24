// js/cards.js

// 1. GLOBAL VARIABLES
let player;
let vocabList = [];
let currentVideoId = null; // Store ID globally for iOS fixes

// 2. YOUTUBE API ENTRY POINT
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('cards-container');

    if(!id) {
        container.innerHTML = `<div class="loading" style="color:red">No Data ID found.<br>Usage: cards.html?id=filename</div>`;
        return;
    }

    loadData(id);
}

// 3. LOAD REAL DATA
async function loadData(id) {
    const container = document.getElementById('cards-container');
    const titleEl = document.getElementById('video-title');

    try {
        const response = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Data file not found");
        
        const data = await response.json();
        
        // Load Title
        fetch(`../data/library.json?t=${Date.now()}`)
            .then(r => r.json())
            .then(lib => {
                const meta = lib.find(v => v.id === id);
                if(meta) titleEl.innerText = meta.title;
            }).catch(() => {});

        // Process Data
        vocabList = data.vocab || [];
        const videoUrl = data.video || ""; 
        currentVideoId = extractVideoId(videoUrl); // Save to global

        // Render & Play
        renderCards();
        
        if(currentVideoId) {
            createPlayer(currentVideoId);
        } else {
            container.innerHTML += `<div class="loading">Error: Video ID not found in JSON.</div>`;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="loading" style="color:red">Error loading data:<br>${err.message}</div>`;
    }
}

// 4. RENDER CARDS
function renderCards() {
    const container = document.getElementById('cards-container');
    
    if(vocabList.length === 0) {
        container.innerHTML = `<div class="loading">No vocabulary found in this file.</div>`;
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

// 5. PLAYER LOGIC
function createPlayer(vidId) {
    if (window.YT && window.YT.Player) {
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 
                'controls': 1, 
                'rel': 0,
                'playsinline': 1 // Crucial for iPhone
            },
        });
    }
}

// --- FIX FOR iOS PRE-ROLL SEEKING ---
function playVocab(index, seconds) {
    if(!player || typeof player.seekTo !== 'function') return;

    // 1. Calculate Start Time (2 seconds earlier)
    const startTime = Math.max(0, seconds - 2);

    // 2. iOS Fix: Check Player State
    // State -1 (Unstarted) or 5 (Cued) means video hasn't loaded fully yet.
    // iOS Safari ignores seekTo() in these states.
    const playerState = player.getPlayerState();

    if (playerState === -1 || playerState === 5) {
        // STEP A: Force Play first (User Gesture)
        player.playVideo();
        
        // STEP B: Wait slightly for the engine to wake up, THEN seek
        setTimeout(() => {
            player.seekTo(startTime, true);
        }, 150); // 150ms delay is usually enough for iOS
    } else {
        // Desktop / Already Playing: Standard Seek
        player.seekTo(startTime, true);
        player.playVideo();
    }

    // 3. Highlight Active Card
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${index}`);
    
    if(activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 6. UTILS
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

// 7. INJECT YOUTUBE API MANUALLY
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}