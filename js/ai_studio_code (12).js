// js/cards.js

// 1. VARIABLES
let player;
let vocabList = [];

// 2. YOUTUBE API ENTRY
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('cards-container');

    if(!id) {
        container.innerHTML = `<div class="loading" style="color:red">No ID provided.</div>`;
        return;
    }

    loadData(id);
}

// 3. FETCH DATA
async function loadData(id) {
    const container = document.getElementById('cards-container');
    const titleEl = document.getElementById('video-title');

    try {
        // A. Load Data File
        const response = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Data file not found");
        const data = await response.json();

        // B. Load Title (Optional)
        fetch(`../data/library.json?t=${Date.now()}`)
            .then(r => r.json())
            .then(lib => {
                const meta = lib.find(v => v.id === id);
                if(meta) titleEl.innerText = meta.title;
            }).catch(()=>{});

        // C. Process
        vocabList = data.vocab || [];
        const vidId = extractVideoId(data.video);

        if(!vidId) throw new Error("Invalid Video URL in JSON");

        // D. Render
        renderCards();
        createPlayer(vidId);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="loading" style="color:red">${err.message}</div>`;
    }
}

// 4. RENDER
function renderCards() {
    const container = document.getElementById('cards-container');
    
    if(vocabList.length === 0) {
        container.innerHTML = `<div class="loading">No vocabulary notes available.</div>`;
        return;
    }

    // Sort chronologically
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

// 5. PLAYER
function createPlayer(vidId) {
    if (window.YT && window.YT.Player) {
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 'controls': 1, 'rel': 0, 'playsinline': 1 }
        });
    }
}

function playVocab(index, seconds) {
    if(!player || typeof player.seekTo !== 'function') return;

    // Play Video
    player.seekTo(seconds, true);
    player.playVideo();

    // Highlight UI
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${index}`);
    
    if(activeCard) {
        activeCard.classList.add('active');
        // Smooth scroll to keep it visible (useful on mobile)
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 6. UTILS
function extractVideoId(url) { 
    if(!url) return null;
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); 
    return m && m[1] ? m[1] : null; 
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 7. INJECT SCRIPT
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}