// js/cards.js

// 1. GLOBAL VARIABLES
let player;
let vocabList = [];

// 2. YOUTUBE API ENTRY POINT
// This function is called automatically by the YouTube API when ready
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
        // A. Load the specific data file (e.g., ../data/suntiunn.json)
        const response = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Data file not found");
        
        const data = await response.json();
        
        // B. Load Library to get the Title (Optional enhancement)
        fetch(`../data/library.json?t=${Date.now()}`)
            .then(r => r.json())
            .then(lib => {
                const meta = lib.find(v => v.id === id);
                if(meta) titleEl.innerText = meta.title;
            }).catch(() => {});

        // C. Process Data
        vocabList = data.vocab || [];
        const videoUrl = data.video || ""; // Get URL from JSON
        const vidId = extractVideoId(videoUrl); // Extract ID

        // D. Render & Play
        renderCards();
        
        if(vidId) {
            createPlayer(vidId);
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

    // Sort by time so they appear in order
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
    // Check if API is ready
    if (window.YT && window.YT.Player) {
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 
                'controls': 1, 
                'rel': 0,
                'playsinline': 1 
            },
        });
    }
}

// --- CORE FUNCTION: PLAY WITH PRE-ROLL ---
function playVocab(index, seconds) {
    if(!player || typeof player.seekTo !== 'function') return;

    // 1. Calculate Start Time (2 seconds earlier)
    // Math.max(0, ...) ensures we don't try to seek to negative time (e.g. -1s)
    const startTime = Math.max(0, seconds - 2);

    // 2. Seek and Play
    player.seekTo(startTime, true);
    player.playVideo();

    // 3. Highlight Active Card UI
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${index}`);
    
    if(activeCard) {
        activeCard.classList.add('active');
        // Smooth scroll to keep the active card visible
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 6. UTILS
function extractVideoId(url) { 
    if (!url) return null;
    // Handle https://youtu.be/ID and https://youtube.com/watch?v=ID
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); 
    return m && m[1] ? m[1] : null; 
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    // Returns MM:SS format (e.g. 01:05)
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 7. INJECT YOUTUBE API MANUALLY (Safety Check)
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    // If API is already loaded (cached), trigger manually
    onYouTubeIframeAPIReady();
}