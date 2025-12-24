const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let vocabList = [];
let videoMeta = null;

// --- 1. INITIALIZATION & DATA FETCHING ---
document.addEventListener('DOMContentLoaded', async () => {
    if (!videoId) return;

    try {
        // A. Fetch Master Library to get the YouTube ID
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        videoMeta = library.find(v => v.id === videoId);

        if (videoMeta) {
            document.getElementById('video-title').innerText = videoMeta.title;
        }

        // B. Fetch Specific Data File (for Vocab)
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            if (detailReq.ok) {
                const data = await detailReq.json();
                vocabList = data.vocab || []; // Get the vocab list from real file
                renderCards();
            } else {
                document.getElementById('cards-container').innerHTML = 
                    '<div class="loading">No flashcards data found for this video.</div>';
            }
        } catch (e) {
            console.error("Data file error:", e);
        }

    } catch (err) {
        console.error("Library error:", err);
    }
});

// --- 2. YOUTUBE PLAYER SETUP ---
function onYouTubeIframeAPIReady() {
    // Wait until we have the YouTube ID from library.json
    const checkInterval = setInterval(() => {
        if (videoMeta && videoMeta.yt) {
            clearInterval(checkInterval);
            player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: videoMeta.yt,
                playerVars: { 
                    'playsinline': 1, 
                    'rel': 0 
                },
                events: { 'onReady': onPlayerReady }
            });
        }
    }, 100);
}

function onPlayerReady(event) {
    // Player is ready
}

// --- 3. RENDER CARDS & CLICK LOGIC ---
function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    if (vocabList.length === 0) {
        container.innerHTML = '<div class="loading">No vocabulary words available.</div>';
        return;
    }

    vocabList.forEach(item => {
        // 1. Format Timestamp (e.g. 65 seconds -> 1:05)
        const min = Math.floor(item.time / 60);
        const sec = Math.floor(item.time % 60);
        const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;

        // 2. Create Card HTML
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-word">${item.word}</div>
            <div class="card-def">${item.def}</div>
            <div class="timestamp">
                <i class="fas fa-play" style="font-size:0.8em; margin-right:4px;"></i> ${timeStr}
            </div>
        `;

        // 3. ADD CLICK EVENT (The Rewind Logic)
        card.onclick = () => {
            // A. Visual Feedback: Highlight the card
            document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // B. Video Control: Seek and Play
            if (player && typeof player.seekTo === 'function') {
                player.seekTo(item.time, true); // Jump to 'item.time' (seconds)
                player.playVideo();             // Start playing immediately
            } else {
                console.warn("Player not ready yet.");
            }
        };

        container.appendChild(card);
    });
}
