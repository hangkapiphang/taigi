// 1. GLOBAL VARIABLES
let player;
let vocabList = [];

// 2. YOUTUBE API READY
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('cards-container');

    if(!id) {
        container.innerHTML = `<div class="error-msg">No Data ID found.<br>Usage: cards.html?id=filename</div>`;
        return;
    }

    loadData(id);
}

// 3. LOAD DATA
function loadData(id) {
    // Fetch from ../data/
    fetch(`../data/${id}.json?t=${Date.now()}`)
    .then(r => {
        if(!r.ok) throw new Error("Data file not found");
        return r.json();
    })
    .then(data => {
        // Store vocab
        vocabList = data.vocab || [];
        const vidId = extractVideoId(data.video);

        // Render Cards
        renderCards();

        // Init Player
        createPlayer(vidId);
    })
    .catch(err => {
        console.error(err);
        document.getElementById('cards-container').innerHTML = 
            `<div class="error-msg">Error: ${err.message}</div>`;
    });
}

// 4. RENDER CARDS
function renderCards() {
    const container = document.getElementById('cards-container');
    
    if(vocabList.length === 0) {
        container.innerHTML = `<div class="error-msg">No vocabulary found in this file.</div>`;
        return;
    }

    container.innerHTML = vocabList.map((v, index) => `
        <div class="card" id="card-${index}" onclick="playVocab(${index}, ${v.time})">
            <div class="card-word">${v.word}</div>
            <div class="card-def">${v.def}</div>
            <div class="timestamp">▶ ${formatTime(v.time)}</div>
        </div>
    `).join('');
}

// 5. PLAYER LOGIC
function createPlayer(vidId) {
    if (window.YT && window.YT.Player) {
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 'controls': 1, 'rel': 0 }, // Controls enabled for study
        });
    }
}

function playVocab(index, seconds) {
    if(!player || typeof player.seekTo !== 'function') return;

    // 1. Seek and Play
    player.seekTo(seconds, true);
    player.playVideo();

    // 2. Highlight Active Card
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${index}`).classList.add('active');
}

// 6. UTILS
function extractVideoId(url) { 
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); 
    return m && m[1] ? m[1] : null; 
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 7. INJECT YOUTUBE API MANUALLY
// Ensures the function is defined before the API loads
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}