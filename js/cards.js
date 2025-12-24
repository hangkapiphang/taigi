const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let vocabData = [];
let videoMeta = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!videoId) return;

    try {
        // 1. Load Library info (Get Title & YouTube ID)
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        videoMeta = library.find(v => v.id === videoId);

        if (videoMeta) {
            document.getElementById('video-title').innerText = videoMeta.title;
        }

        // 2. Load Details (Get Vocab from the specific JSON file)
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            if (detailReq.ok) {
                const data = await detailReq.json();
                vocabData = data.vocab || [];
            } else {
                console.warn("Detail file not found.");
            }
        } catch (e) { 
            console.error("Data loading error", e); 
        }

        // 3. Render
        renderCards();

    } catch (err) {
        console.error("Library loading error", err);
        document.getElementById('cards-container').innerHTML = '<div class="loading">Error loading library.</div>';
    }
});

// --- YOUTUBE PLAYER ---
function onYouTubeIframeAPIReady() {
    // Wait until we have the YouTube ID from library.json
    const checkExist = setInterval(function() {
        if (videoMeta && videoMeta.yt) {
            clearInterval(checkExist);
            player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: videoMeta.yt,
                playerVars: { 'playsinline': 1, 'rel': 0 },
                events: { 'onReady': onPlayerReady }
            });
        }
    }, 100);
}

function onPlayerReady(event) {
    // Player ready
}

// --- RENDER LOGIC ---
function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    if (vocabData.length === 0) {
        container.innerHTML = '<div class="loading">No vocabulary notes found for this video.</div>';
        return;
    }

    // Sort by time just like cinema.js
    vocabData.sort((a,b) => a.time - b.time).forEach(item => {
        
        // Format time (e.g. 65 -> 1:05)
        const min = Math.floor(item.time / 60);
        const sec = Math.floor(item.time % 60);
        const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-word">${item.word}</div>
            <div class="card-def">${item.def}</div>
            <div class="timestamp">
                <i class="fas fa-play" style="font-size:0.8em; margin-right:4px;"></i> ${timeStr}
            </div>
        `;

        // Click to Seek
        card.onclick = () => {
            // Visual feedback
            document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Player control
            if (player && typeof player.seekTo === 'function') {
                player.seekTo(item.time, true);
                player.playVideo();
            }
        };

        container.appendChild(card);
    });
}
