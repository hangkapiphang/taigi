const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let subtitleData = [];
let vocabData = [];
let videoMeta = {};
let lastActiveIndex = -1; // To track scroll state

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
                if (details.subtitle) subtitleData = parseSRT(details.subtitle);
            }
        } catch (e) { console.log("Data file missing"); }

        renderVocab();

    } catch (err) { console.error(err); }
});

function onYouTubeIframeAPIReady() {
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
    // Run the sync loop every 200ms
    setInterval(syncContent, 200);
}

// --- CORE SYNC LOGIC ---
function syncContent() {
    if (!player || !player.getCurrentTime) return;
    const time = player.getCurrentTime();

    // A. Update Subtitles
    updateSubtitle(time);

    // B. Update Vocabulary (Auto-Scroll)
    updateActiveVocab(time);
}

function updateActiveVocab(time) {
    // Find the word that has happened most recently (but not in future)
    let activeIndex = -1;
    for(let i = 0; i < vocabData.length; i++) {
        if (vocabData[i].time <= time) {
            activeIndex = i;
        } else {
            break; // Stop once we hit a word in the future
        }
    }

    // Only update if the active word changed
    if (activeIndex !== -1 && activeIndex !== lastActiveIndex) {
        
        // 1. Remove old active class
        const old = document.querySelector('.vocab-item.active');
        if (old) old.classList.remove('active');

        // 2. Add new active class
        const newItem = document.getElementById(`v-item-${activeIndex}`);
        if (newItem) {
            newItem.classList.add('active');
            
            // 3. SCROLL TO MIDDLE (The "Rolling" Effect)
            newItem.scrollIntoView({
                behavior: 'smooth',
                block: 'center' // This forces it to the middle of the box
            });
        }
        
        lastActiveIndex = activeIndex;
    }
}

function renderVocab() {
    const list = document.getElementById('vocab-list');
    list.innerHTML = '';
    
    if(vocabData.length === 0) {
        list.innerHTML = '<div style="padding:20px;color:#999;">No vocab data.</div>';
        return;
    }

    vocabData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        // Assign ID for scrolling logic
        div.id = `v-item-${index}`; 
        div.innerHTML = `<span class="v-word">${item.word}</span><span style="font-size:0.9em;color:#666">${item.def}</span>`;
        
        div.onclick = () => { 
            if(player) { 
                player.seekTo(item.time, true); 
                player.playVideo(); 
                // Reset scroll tracking
                lastActiveIndex = index;
            }
        };
        list.appendChild(div);
    });
}

// --- SUBTITLE HELPERS ---
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

function updateSubtitle(time) {
    const box = document.getElementById('subtitle-box');
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
