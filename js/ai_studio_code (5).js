// js/cards.js

let player;
let vocabList = [];
let pendingSeekTime = null; // Stores target time for iOS workaround

// 1. INIT
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;
    loadData(id);
}

// 2. LOAD
async function loadData(id) {
    const container = document.getElementById('cards-container');
    const titleEl = document.getElementById('video-title');
    
    try {
        const response = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("File not found");
        const data = await response.json();

        // Load Title
        fetch(`../data/library.json`).then(r=>r.json()).then(lib => {
            const meta = lib.find(x => x.id === id);
            if(meta) titleEl.innerText = meta.title;
        }).catch(e=>{});

        // Render
        vocabList = data.vocab || [];
        renderCards();

        // Setup Player
        const vidId = extractVideoId(data.video);
        if(vidId) createPlayer(vidId);

    } catch(e) {
        container.innerHTML = `<div class="loading" style="color:red">Error loading data</div>`;
    }
}

// 3. RENDER
function renderCards() {
    const container = document.getElementById('cards-container');
    if(vocabList.length === 0) {
        container.innerHTML = `<div class="loading">No vocabulary found.</div>`;
        return;
    }
    // Sort by timestamp
    vocabList.sort((a,b) => a.time - b.time);

    container.innerHTML = vocabList.map((v, i) => `
        <div class="card" id="card-${i}" onclick="playVocab(${i}, ${v.time})">
            <div class="card-word">${v.word}</div>
            <div class="card-def">${v.def}</div>
            <div class="timestamp"><i class="fas fa-play"></i> ${formatTime(v.time)}</div>
        </div>
    `).join('');
}

// 4. YOUTUBE PLAYER
function createPlayer(vidId) {
    if (window.YT && window.YT.Player) {
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 'controls': 1, 'rel': 0, 'playsinline': 1 },
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

// 5. IOS SEEK WORKAROUND
function onPlayerStateChange(event) {
    // Event 1 = Playing
    if (event.data === 1) {
        if (pendingSeekTime !== null) {
            const t = pendingSeekTime;
            pendingSeekTime = null; // Reset immediately
            
            // Short delay to let iOS "settle" into playing state before seeking
            setTimeout(() => {
                player.seekTo(t, true);
            }, 100);
        }
    }
}

// 6. MAIN ACTION: CLICK CARD
function playVocab(index, seconds) {
    if(!player || typeof player.seekTo !== 'function') return;

    // A. REWIND 2 SECONDS (Logic: Target Time - 2)
    const startTime = Math.max(0, seconds - 2);

    // B. EMPHASIZE CARD
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${index}`);
    if(activeCard) {
        activeCard.classList.add('active');
        // 'center' ensures card is visible in middle of scroll area (good for mobile)
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // C. PLAYBACK CONTROL
    const state = player.getPlayerState();
    
    // If Unstarted(-1) or Cued(5), iOS requires playVideo() BEFORE seekTo()
    if (state !== 1) {
        pendingSeekTime = startTime; // Store target
        player.playVideo();          // Trigger play
        // Listener `onPlayerStateChange` will handle the Seek
    } else {
        // Already playing? Just seek immediately
        pendingSeekTime = null;
        player.seekTo(startTime, true);
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
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}