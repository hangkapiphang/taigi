const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

// Mock Data
const vocabDB = {
    "suntiunn": [{t:10,w:"Sūn-tiûⁿ",d:"Patrol"}, {t:25,w:"Ia-koan",d:"Night Officer"}, {t:40,w:"Lio̍k-sú",d:"History"}],
    "LahjihL1": [{t:5,w:"Tâi-oân-jī",d:"Taiwanese Text"}, {t:15,w:"Pe̍h-ōe-jī",d:"Romanization"}],
    "Tabong":   [{t:12,w:"Tāi-bū",d:"Thick Fog"}, {t:30,w:"Sim-chêng",d:"Mood"}]
};

let player;
function onYouTubeIframeAPIReady() {
    // Mapping ID to real YouTube ID for demo
    const ytMap = { "suntiunn": "oIxzTwt6sZg", "LahjihL1": "hM9KbU3l3IA", "Tabong": "518Ohuh6CJE" };
    
    player = new YT.Player('player', {
        height: '100%', width: '100%',
        videoId: ytMap[videoId] || "oIxzTwt6sZg",
        events: { 'onReady': onPlayerReady }
    });
}

function onPlayerReady(event) {
    document.getElementById('video-title').innerText = "Deck: " + (videoId || "Demo");
    renderCards();
}

function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    const words = vocabDB[videoId] || [];
    
    if(words.length === 0) { container.innerHTML = '<div class="loading">No cards found for this clip.</div>'; return; }

    words.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-word">${item.w}</div>
            <div class="card-def">${item.d}</div>
            <div class="timestamp">⏱ ${item.t}s</div>
        `;
        card.onclick = () => {
            document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            player.seekTo(item.t, true); player.playVideo();
        };
        container.appendChild(card);
    });
}