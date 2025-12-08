let player;
let vocabList = [];

window.onYouTubeIframeAPIReady = function() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(id) loadData(id);
    else document.getElementById('cards-container').innerHTML = "<div class='loading'>No ID provided</div>";
}

function loadData(id) {
    fetch(`../data/${id}.json?t=${Date.now()}`)
    .then(r => r.json())
    .then(data => {
        // Init Player
        const vidId = extractVideoId(data.video);
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 'controls': 1, 'rel': 0 }
        });

        // Render Cards
        renderCards(data.vocab);
    })
    .catch(err => {
        console.error(err);
        document.getElementById('cards-container').innerHTML = "<div class='loading'>Error loading data.</div>";
    });
}

function renderCards(vocab) {
    const container = document.getElementById('cards-container');
    container.innerHTML = ''; // Clear loading

    if(!vocab || vocab.length === 0) {
        container.innerHTML = "<div class='loading'>No vocabulary found.</div>";
        return;
    }

    vocab.forEach(item => {
        const card = document.createElement('div');
        card.className = 'vocab-card';
        
        // Format time (seconds to MM:SS)
        const timeStr = formatTime(item.time);

        card.innerHTML = `
            <div class="vocab-time">⏱ ${timeStr}</div>
            <div class="vocab-word">${item.word}</div>
            <div class="vocab-def">${item.def}</div>
        `;

        // Click to seek video
        card.onclick = () => {
            if(player && player.seekTo) {
                player.seekTo(item.time, true);
                player.playVideo();
                
                // Optional: Scroll to top on mobile so they see video
                if(window.innerWidth < 900) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        };

        container.appendChild(card);
    });
}

// Helper: Extract YouTube ID
function extractVideoId(url) {
    if(!url) return null;
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/);
    return m && m[1] ? m[1] : null;
}

// Helper: Seconds to MM:SS
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
