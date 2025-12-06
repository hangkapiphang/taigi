let player, playerFS;
let subtitleData = [], vocabData = [];
let activeLayout = 'default';

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const layout = urlParams.get('layout');

    if (layout === 'fullscreen') {
        activeLayout = 'fullscreen';
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('video-container-fs').style.display = 'flex';
    }

    if(id) {
        fetch(`data/${id}.json?t=${Date.now()}`)
            .then(r => r.ok ? r.json() : Promise.reject('Failed to load local data'))
            .catch(() => fetch(`https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/gh-pages/data/${id}.json`).then(r=>r.json()))
            .then(data => initCinema(data))
            .catch(e => alert("Could not load data. " + e));
    }
};

function initCinema(data) {
    const videoId = extractVideoId(data.video);
    if (videoId) {
        if (activeLayout === 'fullscreen') {
            playerFS = new YT.Player('player-fs', { videoId: videoId, playerVars: { 'autoplay': 1, 'playsinline': 1 }, events: {'onReady': onPlayerReady} });
        } else {
            player = new YT.Player('player', { videoId: videoId, events: {'onReady': onPlayerReady} });
        }
    }

    if (data.subtitle) parseSRT(data.subtitle);
    else if (data.hiddenSub) parseSRT(decryptSubtitle(data.hiddenSub));

    if (data.vocab) { vocabData = data.vocab; renderVocab(); }

    applyVisuals(data.mask, data.settings);
}

function extractVideoId(url) {
    const match = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/);
    return match ? match[1] : null;
}

function applyVisuals(mask, settings) {
    if (activeLayout === 'default') {
        const m = document.getElementById('cinematic-mask');
        if(mask) { /* Masking logic for default player */ }
        const s = document.getElementById('subtitle-overlay');
        if(settings) { /* Settings for default subtitles */ }
    } else {
         const sub = document.getElementById('subtitle-fs');
         if (settings && settings.anchor) {
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
    if(!p || !p.getCurrentTime) return;
    const t = p.getCurrentTime();

    const sub = subtitleData.find(s => t >= s.start && t <= s.end);

    if (activeLayout === 'fullscreen') {
        const subDiv = document.querySelector('#subtitle-fs span');
        subDiv.style.display = sub ? 'inline' : 'none';
        if(sub) subDiv.innerHTML = sub.text.replace(/\n/g, '<br>');
    } else {
        const subDiv = document.getElementById('subtitle-overlay');
        subDiv.style.opacity = sub ? 1 : 0;
        if(sub) subDiv.innerHTML = sub.text.replace(/\n/g, '<br>');

        document.querySelectorAll('.vocab-item').forEach(el => el.classList.remove('active'));
        const activeVocab = vocabData.slice().reverse().find(v => t >= v.time);
        if(activeVocab) {
            document.getElementById(`v-${vocabData.indexOf(activeVocab)}`)?.classList.add('active');
        }
    }
}

function renderVocab() {
    const c = document.getElementById('vocab-list'); c.innerHTML = '';
    vocabData.sort((a,b) => a.time - b.time).forEach((v, i) => {
        const div = document.createElement('div');
        div.className = 'vocab-item'; div.id = `v-${i}`;
        div.onclick = () => player.seekTo(v.time, true);
        div.innerHTML = `<div class="v-word">${v.word}</div><div class="v-def">${v.def}</div>`;
        c.appendChild(div);
    });
}

function parseSRT(srt) {
    subtitleData = [];
    srt.trim().split(/\n\s*\n/).forEach(b => {
        const lines = b.split('\n');
        if(lines.length >= 2) {
            const m = lines[1].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d+)/);
            if(m) subtitleData.push({start:timeToSec(m[1]), end:timeToSec(m[2]), text:lines.slice(2).join('\n')});
        }
    });
}

function decryptSubtitle(scrambled) { try { return decodeURIComponent(escape(atob(atob(scrambled).split('').reverse().join('')))); } catch (e) { return ""; } }
function timeToSec(t) { const p=t.replace(',','.').split(':'); return p.length===3 ? (+p[0])*3600+(+p[1])*60+(+p[2]) : (+p[0])*60+(+p[1]); }
function toggleVocab() { const v = document.getElementById('vocab-section'); v.style.display = v.style.display === 'none' ? 'flex' : 'none'; }
function toggleFullscreen() {
    const elem = document.getElementById('video-container-fs');
    if (!document.fullscreenElement) elem.requestFullscreen().catch(err => alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
    else document.exitFullscreen();
}
