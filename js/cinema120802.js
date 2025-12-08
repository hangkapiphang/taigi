let player, playerFS;
let subtitleData = [], vocabData = [];
let activeLayout = 'default';
let lastActiveVocabIndex = -1; // To track scroll changes

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'); // e.g. ?id=suntiunn
    const layout = urlParams.get('layout');

    // Handle Layout Switching
    if (layout === 'fullscreen') {
        activeLayout = 'fullscreen';
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('video-container-fs').style.display = 'flex';
    }

    if(id) {
        // PATH CORRECTION: HTML is in views/, Data is in data/ -> Go up one level (../data/)
        fetch(`../data/${id}.json?t=${Date.now()}`)
            .then(r => {
                if(r.ok) return r.json();
                throw new Error('Local data not found');
            })
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
    
    // Initialize YouTube Player based on active layout
    if (videoId) {
        const playerConfig = {
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'playsinline': 1, 'rel': 0 },
            events: { 'onReady': onPlayerReady }
        };

        if (activeLayout === 'fullscreen') {
            playerFS = new YT.Player('player-fs', playerConfig);
        } else {
            player = new YT.Player('player', playerConfig);
        }
    }

    // Process Subtitles
    if (data.subtitle) parseSRT(data.subtitle);
    else if (data.hiddenSub) parseSRT(decryptSubtitle(data.hiddenSub));

    // Process Vocabulary
    if (data.vocab) { 
        vocabData = data.vocab; 
        renderVocab(); 
    }

    // Apply specific visual settings from JSON
    applyVisuals(data.mask, data.settings);
}

function extractVideoId(url) {
    // Handles https://youtu.be/ID and https://youtube.com/watch?v=ID
    const match = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/);
    return match ? match[1] : null;
}

function applyVisuals(mask, settings) {
    if (activeLayout === 'default') {
        const subOverlay = document.getElementById('subtitle-overlay');
        if(settings) {
            if(settings.fontFamily) subOverlay.style.fontFamily = settings.fontFamily;
            if(settings.color) subOverlay.style.color = settings.color;
            if(settings.boxColor) subOverlay.style.backgroundColor = hexToRgba(settings.boxColor, settings.boxOp || 0.5);
            // Default position
            subOverlay.style.bottom = (settings.offset || 10) + "%"; 
        }
    } else {
         const sub = document.getElementById('subtitle-fs');
         if (settings && settings.anchor) {
            sub.style.top = 'auto'; 
            sub.style.bottom = 'auto';
            // Apply JSON settings to FS layout
            sub.style[settings.anchor] = (settings.offset || 5) + "%";
         }
    }
}

function onPlayerReady(event) {
    // Start the sync loop
    setInterval(updateLoop, 100);
}

function updateLoop() {
    const p = activeLayout === 'fullscreen' ? playerFS : player;
    
    // Safety check if player isn't ready
    if(!p || typeof p.getCurrentTime !== 'function') return;
    
    const t = p.getCurrentTime();

    // 1. Update Subtitles
    const sub = subtitleData.find(s => t >= s.start && t <= s.end);

    if (activeLayout === 'fullscreen') {
        const subDiv = document.querySelector('#subtitle-fs span');
        if (subDiv) {
            subDiv.parentElement.style.display = sub ? 'block' : 'none';
            if(sub) subDiv.innerHTML = sub.text.replace(/\n/g, '<br>');
        }
    } else {
        const subDiv = document.getElementById('subtitle-overlay');
        if (subDiv) {
            subDiv.style.opacity = sub ? 1 : 0;
            if(sub) subDiv.innerHTML = sub.text.replace(/\n/g, '<br>');
        }

        // 2. Update Vocabulary Highlighting
        // Find the vocab item that started most recently
        const currentVocabIndex = vocabData.findIndex((v, i) => {
            const nextV = vocabData[i + 1];
            return t >= v.time && (!nextV || t < nextV.time);
        });

        if(currentVocabIndex !== -1 && currentVocabIndex !== lastActiveVocabIndex) {
            // Remove old active class
            document.querySelectorAll('.vocab-item').forEach(el => el.classList.remove('active'));
            
            // Add new active class
            const activeEl = document.getElementById(`v-${currentVocabIndex}`);
            if(activeEl) {
                activeEl.classList.add('active');
                // Scroll into view nicely
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            lastActiveVocabIndex = currentVocabIndex;
        }
    }
}

function renderVocab() {
    const listContainer = document.getElementById('vocab-list'); 
    listContainer.innerHTML = '';
    
    // Sort by time just in case JSON isn't sorted
    vocabData.sort((a,b) => a.time - b.time).forEach((v, i) => {
        const div = document.createElement('div');
        div.className = 'vocab-item'; 
        div.id = `v-${i}`;
        // Seek video when clicked
        div.onclick = () => {
            if(player && player.seekTo) {
                player.seekTo(v.time, true);
                player.playVideo();
            }
        };
        
        // Format MM:SS for display
        const timeStr = new Date(v.time * 1000).toISOString().substr(14, 5);
        
        div.innerHTML = `
            <div class="v-time">${timeStr}</div>
            <div class="v-content">
                <div class="v-word">${v.word}</div>
                <div class="v-def">${v.def}</div>
            </div>
        `;
        listContainer.appendChild(div);
    });
}

function parseSRT(srt) {
    subtitleData = [];
    if(!srt) return;
    
    // Split by double newlines to get blocks
    const blocks = srt.trim().split(/\n\s*\n/);
    
    blocks.forEach(b => {
        const lines = b.split('\n');
        // Standard SRT: Index, Time --> Time, Text
        if(lines.length >= 2) {
            // Regex to match "00:00:00,000 --> 00:00:00,000" (accepts comma or dot)
            const m = lines[1].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d+)/);
            if(m) {
                subtitleData.push({
                    start: timeToSec(m[1]), 
                    end: timeToSec(m[2]), 
                    text: lines.slice(2).join('\n')
                });
            }
        }
    });
}

function timeToSec(t) { 
    // Converts HH:MM:SS,ms to seconds
    const p = t.replace(',','.').split(':'); 
    let s = 0;
    if (p.length === 3) {
        s = (+p[0]) * 3600 + (+p[1]) * 60 + (+p[2]);
    } else {
        s = (+p[0]) * 60 + (+p[1]);
    }
    return s;
}

function decryptSubtitle(scrambled) { 
    try { 
        return decodeURIComponent(escape(atob(atob(scrambled).split('').reverse().join('')))); 
    } catch (e) { return ""; } 
}

function toggleVocab() { 
    const v = document.getElementById('vocab-section'); 
    v.style.display = v.style.display === 'none' ? 'flex' : 'none'; 
}

function toggleFullscreen() {
    const elem = document.getElementById('video-container-fs');
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Helper for Hex to RGBA
function hexToRgba(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return 'rgba(0,0,0,'+alpha+')';
}
