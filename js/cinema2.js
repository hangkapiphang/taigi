let player, playerFS;
let subtitleData = [], vocabData = [];
let activeLayout = 'default';
let lastActiveVocabIndex = -1;

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'); // e.g., ?id=suntiunn
    const layout = urlParams.get('layout');

    // Handle Layout Switching
    if (layout === 'fullscreen') {
        activeLayout = 'fullscreen';
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('video-container-fs').style.display = 'flex';
    }

    if(id) {
        // Fetch data from ../data/{id}.json
        fetch(`../data/${id}.json?t=${Date.now()}`)
            .then(r => r.ok ? r.json() : Promise.reject('Data not found'))
            .then(data => initCinema(data))
            .catch(e => {
                console.error("Error loading data:", e);
                alert("Could not load data. Ensure 'data/" + id + ".json' exists.");
            });
    } else {
        alert("No ID provided in URL. Try adding ?id=suntiunn");
    }
};

function initCinema(data) {
    const videoId = extractVideoId(data.video);
    
    // Initialize YouTube Player
    if (videoId) {
        const config = { 
            videoId: videoId, 
            playerVars: { 'autoplay': 1, 'playsinline': 1, 'rel': 0 }, 
            events: { 'onReady': onPlayerReady } 
        };

        if (activeLayout === 'fullscreen') {
            playerFS = new YT.Player('player-fs', config);
        } else {
            player = new YT.Player('player', config);
        }
    }

    // Process Subtitles
    if (data.subtitle) parseSRT(data.subtitle);
    else if (data.hiddenSub) parseSRT(decryptSubtitle(data.hiddenSub));

    // Process Vocabulary
    if (data.vocab) { vocabData = data.vocab; renderVocab(); }

    // Apply Mask and Settings from JSON
    applyVisuals(data.mask, data.settings);
}

function extractVideoId(url) {
    // Regex handles both standard youtube.com and youtu.be links
    const match = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/);
    return match ? match[1] : null;
}

function applyVisuals(mask, settings) {
    if (activeLayout === 'default') {
        // 1. Apply Mask (e.g., to cover hardcoded subtitles)
        const maskEl = document.getElementById('cinematic-mask');
        if(mask && maskEl) {
            maskEl.style.height = (mask.h || 0) + "%";
            maskEl.style.width = (mask.w || 100) + "%";
            maskEl.style.bottom = (mask.b || 0) + "%";
            maskEl.style.left = (mask.l || 0) + "%";
            maskEl.style.backgroundColor = mask.c || "#000";
            maskEl.style.opacity = mask.o !== undefined ? mask.o : 1;
        }

        // 2. Apply Subtitle Styling from settings
        const subEl = document.getElementById('subtitle-overlay');
        if(settings && subEl) {
            if(settings.fontFamily) subEl.style.fontFamily = settings.fontFamily;
            if(settings.scale) subEl.style.transform = `translateX(-50%) scale(${settings.scale})`;
            if(settings.color) subEl.style.color = settings.color;
            
            // Box color and opacity
            if(settings.boxColor) {
                subEl.style.backgroundColor = hexToRgba(settings.boxColor, settings.boxOp || 0.5);
            }
            
            // Shadow
            if(settings.shadow) {
                const s = settings.shadow;
                subEl.style.textShadow = `${s}px ${s}px ${s}px #000`;
            }

            // Position (Anchor & Offset)
            subEl.style.bottom = (settings.offset || 10) + "%";
            if(settings.anchor === 'top') {
                subEl.style.bottom = 'auto';
                subEl.style.top = (settings.offset || 10) + "%";
            }
        }
    } else {
         // Fullscreen Layout Settings
         const sub = document.getElementById('subtitle-fs');
         if (settings && settings.anchor && sub) {
            sub.style.top = 'auto'; sub.style.bottom = 'auto';
            sub.style[settings.anchor] = (settings.offset || 5) + "%";
         }
    }
}

function onPlayerReady(event) {
    setInterval(updateLoop, 100);
}

function updateLoop() {
    const p = activeLayout === 'fullscreen' ? playerFS : player;
    if(!p || typeof p.getCurrentTime !== 'function') return;
    const t = p.getCurrentTime();

    // 1. Subtitle Logic
    const sub = subtitleData.find(s => t >= s.start && t <= s.end);

    if (activeLayout === 'fullscreen') {
        const subDiv = document.querySelector('#subtitle-fs span');
        if(subDiv) {
            subDiv.parentElement.style.display = sub ? 'block' : 'none';
            if(sub) subDiv.innerHTML = sub.text.replace(/\n/g, '<br>');
        }
    } else {
        const subDiv = document.getElementById('subtitle-overlay');
        if(subDiv) {
            subDiv.style.opacity = sub ? 1 : 0;
            if(sub) subDiv.innerHTML = sub.text.replace(/\n/g, '<br>');
        }

        // 2. Vocabulary Highlight Logic
        const currentVocabIndex = vocabData.findIndex((v, i) => {
            const nextV = vocabData[i+1];
            return t >= v.time && (!nextV || t < nextV.time);
        });

        if(currentVocabIndex !== -1 && currentVocabIndex !== lastActiveVocabIndex) {
            document.querySelectorAll('.vocab-item').forEach(el => el.classList.remove('active'));
            const activeEl = document.getElementById(`v-${currentVocabIndex}`);
            if(activeEl) {
                activeEl.classList.add('active');
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            lastActiveVocabIndex = currentVocabIndex;
        }
    }
}

function renderVocab() {
    const c = document.getElementById('vocab-list'); 
    c.innerHTML = '';
    
    vocabData.sort((a,b) => a.time - b.time).forEach((v, i) => {
        const div = document.createElement('div');
        div.className = 'vocab-item'; 
        div.id = `v-${i}`;
        div.onclick = () => { if(player && player.seekTo) player.seekTo(v.time, true); };
        
        div.innerHTML = `
            <div class="v-time">${formatTime(v.time)}</div>
            <div class="v-content">
                <div class="v-word">${v.word}</div>
                <div class="v-def">${v.def}</div>
            </div>
        `;
        c.appendChild(div);
    });
}

function parseSRT(srt) {
    subtitleData = [];
    if(!srt) return;
    srt.trim().split(/\n\s*\n/).forEach(b => {
        const lines = b.split('\n');
        if(lines.length >= 2) {
            const m = lines[1].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d+)/);
            if(m) subtitleData.push({start:timeToSec(m[1]), end:timeToSec(m[2]), text:lines.slice(2).join('\n')});
        }
    });
}

function timeToSec(t) { 
    const p = t.replace(',','.').split(':'); 
    return p.length === 3 ? (+p[0])*3600+(+p[1])*60+(+p[2]) : (+p[0])*60+(+p[1]); 
}

function formatTime(s) { 
    return new Date(s * 1000).toISOString().substr(14, 5); 
}

function decryptSubtitle(scrambled) { 
    try { return decodeURIComponent(escape(atob(atob(scrambled).split('').reverse().join('')))); } 
    catch (e) { return ""; } 
}

function toggleVocab() { 
    const v = document.getElementById('vocab-section'); 
    v.style.display = v.style.display === 'none' ? 'flex' : 'none'; 
}

function toggleFullscreen() {
    const elem = document.getElementById('video-container-fs');
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.log(err));
    } else {
        document.exitFullscreen();
    }
}

function hexToRgba(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3) c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return 'rgba(0,0,0,'+alpha+')';
}
