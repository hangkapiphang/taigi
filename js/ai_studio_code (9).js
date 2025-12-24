const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let vocabList = [];
let videoMeta = null;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('cards-container');
    
    if (!videoId) {
        container.innerHTML = '<div class="loading">Error: No video ID provided in URL.</div>';
        return;
    }

    try {
        // A. Fetch Master Library
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        if (!libReq.ok) throw new Error("Could not load library.json");
        
        const library = await libReq.json();
        videoMeta = library.find(v => v.id === videoId);

        if (videoMeta) {
            document.getElementById('video-title').innerText = videoMeta.title;
        } else {
            throw new Error(`Video ID '${videoId}' not found in library.`);
        }

        // B. Fetch Data File
        // We use a try/catch here specifically for the data file parsing
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            
            if (!detailReq.ok) {
                // File doesn't exist
                container.innerHTML = `<div class="loading">
                    Data file not found: <code>data/${videoId}.json</code><br>
                    <small>Please create this file to see flashcards.</small>
                </div>`;
                return;
            }

            const data = await detailReq.json();
            vocabList = data.vocab || [];
            renderCards();

        } catch (parseErr) {
            // JSON Syntax Error
            console.error(parseErr);
            container.innerHTML = `<div class="loading" style="color:red">
                <strong>JSON Error:</strong><br>
                Could not parse <code>data/${videoId}.json</code>.<br>
                <small>Check for missing commas or brackets.</small>
            </div>`;
        }

    } catch (err) {
        console.error("General Error:", err);
        container.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
    }
});

// --- YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() {
    const checkInterval = setInterval(() => {
        if (videoMeta && videoMeta.yt) {
            clearInterval(checkInterval);
            player = new YT.Player('player', {
                height: '100%', width: '100%', videoId: videoMeta.yt,
                playerVars: { 'playsinline': 1, 'rel': 0 },
                events: { 'onReady': () => {} }
            });
        }
    }, 100);
}

// --- RENDER CARDS ---
function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    if (vocabList.length === 0) {
        container.innerHTML = '<div class="loading">No vocabulary words available in file.</div>';
        return;
    }

    vocabList.forEach(item => {
        const min = Math.floor(item.time / 60);
        const sec = Math.floor(item.time % 60);
        const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-word">${item.word}</div>
            <div class="card-def">${item.def}</div>
            <div class="timestamp"><i class="fas fa-play" style="font-size:0.8em; margin-right:4px;"></i> ${timeStr}</div>
        `;

        card.onclick = () => {
            document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            if (player && typeof player.seekTo === 'function') {
                player.seekTo(item.time, true);
                player.playVideo();
            }
        };
        container.appendChild(card);
    });
}