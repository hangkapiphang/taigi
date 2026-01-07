const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let subtitleData = [];
let vocabData = [];
let videoMeta = {};
let lastActiveIndex = -1;

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

        // 2. Load Details (Subtitles/Vocab/Visuals)
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            if (detailReq.ok) {
                const data = await detailReq.json();
                
                // Vocab
                vocabData = data.vocab || [];
                
                // Subtitles (SRT or Hidden)
                if (data.subtitle) subtitleData = parseSRT(data.subtitle);
                else if (data.hiddenSub) subtitleData = parseSRT(decrypt(data.hiddenSub));

                // Visuals (Mask & Settings)
                applyVisuals(data.mask, data.settings);
            }
        } catch (e) { console.log("Data file loading error", e); }

        renderVocab();

    } catch (err) { console.error(err); }
});

function onYouTubeIframeAPIReady() {
    const checkExist = setInterval(function() {
        if (videoMeta && videoMeta.yt) {
            clearInterval(checkExist);
            player = new YT.Player('player', {
                height: '100%', width: '100%', videoId: videoMeta.yt,
                playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
                events: { 'onReady': onPlayerReady }
            });
        }
    }, 100);
}

function onPlayerReady(event) {
    setInterval(syncContent, 150); // 150ms loop for smooth sync
}

function syncContent() {
    if (!player || !player.getCurrentTime) return;
    const time = player.getCurrentTime();

    updateSubtitle(time);
    updateActiveVocab(time);
}

function updateActiveVocab(time) {
    // Find current word
    let activeIndex = -1;
    for(let i = 0; i < vocabData.length; i++) {
        const nextTime = vocabData[i+1] ? vocabData[i+1].time : 99999;
        if (time >= vocabData[i].time && time < nextTime) {
            activeIndex = i;
            break;
        }
    }

    // Scroll Logic
    if (activeIndex !== -1 && activeIndex !== lastActiveIndex) {
        document.querySelectorAll('.vocab-item').forEach(el => el.classList.remove('active'));
        
        const newItem = document.getElementById(`v-${activeIndex}`);
        if (newItem) {
            newItem.classList.add('active');
            newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        lastActiveIndex = activeIndex;
    }
}

function renderVocab() {
    const list = document.getElementById('vocab-list');
    list.innerHTML = '';
    
    if(vocabData.length === 0) {
        list.innerHTML = '<div style="padding:20px;color:#999;text-align:center;">No vocabulary notes.</div>';
        return;
    }

    // Sort by time
    vocabData.sort((a,b) => a.time - b.time).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.id = `v-${index}`;
        
        div.innerHTML = `
            <div class="v-time">${formatTime(item.time)}</div>
            <div style="flex:1">
                <span class="v-word">${item.word}</span>
                <span class="v-def">${item.def}</span>
            </div>
        `;
        
        div.onclick = () => { 
            if(player) { 
                player.seekTo(item.time, true); 
                player.playVideo(); 
                lastActiveIndex = -1; // Force re-highlight
            }
        };
        list.appendChild(div);
    });
}

// --- VISUALS ---
function applyVisuals(mask, settings) {
    // 1. Mask
    const maskEl = document.getElementById('cinematic-mask');
    if(mask && maskEl) {
        maskEl.style.height = (mask.h || 0) + "%";
        maskEl.style.width = (mask.w || 100) + "%";
        maskEl.style.bottom = (mask.b || 0) + "%";
        maskEl.style.left = (mask.l || 0) + "%";
        maskEl.style.backgroundColor = mask.c || "#000";
        maskEl.style.opacity = mask.o !== undefined ? mask.o : 1;
    }

    // 2. Settings (Subtitle Position/Style)
    const subEl = document.getElementById('subtitle-box');
    if(settings && subEl) {
        const span = subEl.querySelector('span'); // Might not exist yet
        
        // Position
        if(settings.anchor === 'top') {
            subEl.style.bottom = 'auto'; subEl.style.top = (settings.offset || 10) + "%";
        } else {
            subEl.style.bottom = (settings.offset || 10) + "%";
        }

        // Style overrides via CSS variable injection or direct style could go here
        // For organic theme, we mostly stick to CSS classes, but box opacity can be set:
        if(settings.boxOp !== undefined && span) {
            // Complex to set dynamically on pseudo elements, but doable on span
        }
    }
}

// --- HELPERS ---
function updateSubtitle(time) {
    const box = document.getElementById('subtitle-box');
    if(!box) return;

    const currentLine = subtitleData.find(s => time >= s.start && time <= s.end);
    if (currentLine) {
        const html = `<span>${currentLine.text}</span>`;
        if (box.innerHTML !== html) {
            box.innerHTML = html;
            box.style.display = 'block';
        }
    } else {
        box.style.display = 'none';
    }
}

function parseSRT(srt) {
    if(!srt) return [];
    const pattern = /(\d+)\n(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
    const result = [];
    let match;
    while ((match = pattern.exec(srt)) !== null) {
        result.push({
            start: timeToSeconds(match[2]),
            end: timeToSeconds(match[3]),
            text: match[4].replace(/\n/g, '<br>')
        });
    }
    return result;
}

function timeToSeconds(t) {
    const [h, m, s] = t.replace(',','.').split(':');
    return (+h) * 3600 + (+m) * 60 + parseFloat(s);
}

function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0'+sec : sec}`;
}

function decrypt(s) { 
    try { return decodeURIComponent(escape(atob(atob(s).split('').reverse().join('')))); } 
    catch(e){return"";} 
}
