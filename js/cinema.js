const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let subtitleData = [];
let vocabData = [];
let videoMeta = {};

document.addEventListener('DOMContentLoaded', async () => {
    if (!videoId) return;

    try {
        // 1. Load Library info
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        videoMeta = library.find(v => v.id === videoId);

        if (videoMeta) {
            document.getElementById('video-title-display').innerText = videoMeta.title;
            const cardLink = document.getElementById('link-to-cards');
            if(cardLink) cardLink.href = `cards.html?id=${videoId}`;
        }

        // 2. Load Details (Subtitles/Vocab)
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            if (detailReq.ok) {
                const details = await detailReq.json();
                vocabData = details.vocab || [];
                // Parse Subtitles
                if (details.subtitle) subtitleData = parseSRT(details.subtitle);
            }
        } catch (e) {
            console.log("Subtitle file not found, skipping.");
        }

        renderVocab();

    } catch (err) {
        console.error(err);
    }
});

// YouTube API Ready
function onYouTubeIframeAPIReady() {
    // Keep checking until metadata is loaded
    const checkExist = setInterval(function() {
        if (videoMeta && videoMeta.yt) {
            clearInterval(checkExist);
            player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: videoMeta.yt,
                events: { 'onReady': onPlayerReady }
            });
        }
    }, 100);
}

function onPlayerReady(event) {
    // Start subtitle loop
    setInterval(updateSubtitle, 200);
}

// Subtitle Parser
function parseSRT(srtString) {
    const pattern = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
    const result = [];
    let match;
    while ((match = pattern.exec(srtString)) !== null) {
        result.push({
            start: timeToSeconds(match[2]),
            end: timeToSeconds(match[3]),
            text: match[4].replace(/\n/g, '<br>')
        });
    }
    return result;
}

function timeToSeconds(t) {
    const [h, m, s] = t.split(':');
    const [sec, ms] = s.split(',');
    return (+h) * 3600 + (+m) * 60 + (+sec) + (+ms) / 1000;
}

function updateSubtitle() {
    if (!player || !player.getCurrentTime) return;
    const time = player.getCurrentTime();
    const box = document.getElementById('subtitle-box');
    
    // Safety check if box exists
    if(!box) return;

    const currentLine = subtitleData.find(s => time >= s.start && time <= s.end);
    
    if (currentLine) {
        if (box.innerHTML !== `<span>${currentLine.text}</span>`) {
            box.innerHTML = `<span>${currentLine.text}</span>`;
            box.style.display = 'block';
        }
    } else {
        box.style.display = 'none';
    }
}

function renderVocab() {
    const list = document.getElementById('vocab-list');
    list.innerHTML = '';
    
    if(vocabData.length === 0) {
        list.innerHTML = '<div style="padding:20px;color:#999;">No vocab data.</div>';
        return;
    }

    vocabData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `<span class="v-word">${item.word}</span><span style="font-size:0.9em;color:#666">${item.def}</span>`;
        div.onclick = () => { if(player) { player.seekTo(item.time, true); player.playVideo(); }};
        list.appendChild(div);
    });
}
