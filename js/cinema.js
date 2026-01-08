const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let player;
let subtitleData = [];
let vocabData = [];
let videoMeta = {};
let lastActiveIndex = -1;
let visualSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
    if (!videoId) return;

    try {
        // 1. Load Library info (using cinema0107 logic)
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        videoMeta = library.find(v => v.id === videoId);

        if (videoMeta) {
            document.getElementById('video-title-display').innerText = videoMeta.title;
            const cardLink = document.getElementById('link-to-cards');
            if(cardLink) cardLink.href = `cards.html?id=${videoId}`;
        }

        // 2. Load Details (using cinema0107 logic)
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            if (detailReq.ok) {
                const data = await detailReq.json();
                
                vocabData = data.vocab || [];
                visualSettings = data.settings || {}; // Store for subtitle logic
                
                // Subtitles
                if (data.subtitle) subtitleData = parseSRT(data.subtitle);
                else if (data.hiddenSub) subtitleData = parseSRT(decrypt(data.hiddenSub));

                // Visuals
                applyVisuals(data.mask, data.settings);
            }
        } catch (e) { 
            console.log("Details loading error", e); 
        }

        renderVocab();

    } catch (err) { 
        console.error("Library loading error", err); 
    }
});

function onYouTubeIframeAPIReady() {
    const checkExist = setInterval(function() {
        if (videoMeta && videoMeta.yt) {
            clearInterval(checkExist);
            player = new YT.Player('player', {
                height: '100%', width: '100%', videoId: videoMeta.yt,
                playerVars: { 'playsinline': 1, 'rel': 0, 'autoplay': 1 },
                events: { 
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange 
                }
            });
        }
    }, 100);
}

function onPlayerReady(event) { setInterval(syncContent, 150); }

function onPlayerStateChange(event) {
    if (event.data === 0) { showEndSlide(); }
}

function showEndSlide() {
    const slide = document.getElementById('end-slide');
    const linkEl = document.getElementById('dynamic-link');
    if (slide && linkEl && videoMeta.yt) {
        const fullUrl = `https://youtu.be/${videoMeta.yt}`;
        linkEl.href = fullUrl;
        linkEl.innerText = fullUrl;
        slide.style.display = 'flex'; 
    }
}

function syncContent() {
    if (!player || !player.getCurrentTime) return;
    const time = player.getCurrentTime();
    updateSubtitle(time);
    updateActiveVocab(time);
}

function updateActiveVocab(time) {
    let activeIndex = -1;
    for(let i = 0; i < vocabData.length; i++) {
        const nextTime = vocabData[i+1] ? vocabData[i+1].time : 99999;
        if (time >= vocabData[i].time && time < nextTime) {
            activeIndex = i; break;
        }
    }
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
    vocabData.sort((a,b) => a.time - b.time).forEach((item, index) => {
        const div = document.createElement('div');
        div.id = `v-${index}`;
        div.className = 'vocab-item';
        div.innerHTML = `<div class="v-time">${formatTime(item.time)}</div><div style="flex:1"><span class="v-word">${item.word}</span><span class="v-def">${item.def}</span></div>`;
        div.onclick = () => { if(player) { player.seekTo(item.time, true); player.playVideo(); lastActiveIndex = -1; } };
        list.appendChild(div);
    });
}

function applyVisuals(mask, settings) {
    const maskEl = document.getElementById('cinematic-mask');
    if(mask && maskEl) {
        maskEl.style.height = (mask.h || 0) + "%";
        maskEl.style.width = (mask.w || 100) + "%";
        maskEl.style.bottom = (mask.b || 0) + "%";
        maskEl.style.left = (mask.l || 0) + "%";
        maskEl.style.backgroundColor = mask.c || "#000";
        maskEl.style.opacity = mask.o !== undefined ? mask.o : 1;
    }
    const subEl = document.getElementById('subtitle-box');
    if(settings && subEl) {
        if(settings.anchor === 'top') {
            subEl.style.bottom = 'auto'; subEl.style.top = (settings.offset || 10) + "%";
        } else {
            subEl.style.top = 'auto'; subEl.style.bottom = (settings.offset || 10) + "%";
        }
    }
}

function updateSubtitle(time) {
    const box = document.getElementById('subtitle-box');
    if(!box) return;

    const currentLine = subtitleData.find(s => time >= s.start && time <= s.end);
    if (currentLine) {
        let styles = [];
        const s = visualSettings;
        
        // --- 0107 LOOK: Serif & Normal Weight ---
        styles.push("font-family: 'Taigi Font', serif");
        styles.push("font-weight: 400");

        if (s.color) styles.push(`color: ${s.color}`);
        if (s.scale) styles.push(`font-size: calc(clamp(1.1rem, 2.5vw, 1.7rem) * ${s.scale})`);
        
        if (s.boxColor) {
            const rgb = hexToRgb(s.boxColor);
            const op = s.boxOp !== undefined ? s.boxOp : 0.6;
            if(rgb) styles.push(`background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op})`);
        }
        if (s.shadow && s.shadow > 0) {
            const sc = s.shadowColor || "#000000";
            styles.push(`text-shadow: 0 1px 3px ${sc}`);
        }

        const styleStr = styles.length > 0 ? `style="${styles.join('; ')}"` : '';
        const html = `<span ${styleStr}>${currentLine.text}</span>`;
        
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
        result.push({ start: timeToSeconds(match[2]), end: timeToSeconds(match[3]), text: match[4].replace(/\n/g, '<br>') });
    }
    return result;
}

function timeToSeconds(t) { const [h, m, s] = t.replace(',','.').split(':'); return (+h) * 3600 + (+m) * 60 + parseFloat(s); }
function formatTime(s) { const min = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${min}:${sec < 10 ? '0'+sec : sec}`; }
function decrypt(s) { try { return decodeURIComponent(escape(atob(atob(s).split('').reverse().join('')))); } catch(e){return"";} }
function hexToRgb(hex) { var r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null; }
