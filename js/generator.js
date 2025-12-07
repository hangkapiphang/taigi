// Relative path from views/admin/generator.html to the root cinema.html
const CINEMA_FILENAME = "../../cinema.html"; 

let player; 
let subtitles = [];

// Initialize GitHub settings from LocalStorage
window.onload = function() {
    if(localStorage.getItem('gh_user')) document.getElementById('ghUsername').value = localStorage.getItem('gh_user');
    if(localStorage.getItem('gh_repo')) document.getElementById('ghRepo').value = localStorage.getItem('gh_repo');
    if(localStorage.getItem('gh_token')) document.getElementById('ghToken').value = localStorage.getItem('gh_token');
}

function saveSettings() {
    localStorage.setItem('gh_user', document.getElementById('ghUsername').value.trim());
    localStorage.setItem('gh_repo', document.getElementById('ghRepo').value.trim());
    localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim());
    alert("Saved!");
}

// Helper to convert hex to rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function updateSubtitleStyle() {
    const anchor = document.getElementById('subAnchor').value;
    const offset = document.getElementById('subOffset').value;
    const size = document.getElementById('subSize').value;
    const txtColor = document.getElementById('subColor').value;
    const boxColor = document.getElementById('subBoxColor').value;
    const boxOp = document.getElementById('subBoxOp').value;
    const shadow = document.getElementById('subShadow').value;
    const shadowColor = document.getElementById('subShadowColor').value;

    document.getElementById('valOffset').textContent = offset + "%";
    document.getElementById('valSize').textContent = size + "%";
    document.getElementById('valBoxOp').textContent = boxOp + "%";
    document.getElementById('valShadow').textContent = shadow;

    const sub = document.getElementById('subtitle');
    
    sub.style.top = 'auto'; sub.style.bottom = 'auto';
    if (anchor === 'top') sub.style.top = offset + "%"; else sub.style.bottom = offset + "%";
    
    sub.style.fontSize = (32 * (size / 100)) + "px";
    sub.style.color = txtColor;
    
    const rgb = hexToRgb(boxColor);
    sub.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${boxOp / 100})`;
    
    const s = shadow; 
    if (s == 0) sub.style.textShadow = "none";
    else sub.style.textShadow = `${s}px ${s}px ${s}px ${shadowColor}`;
}

function updateMask() {
    const h = document.getElementById('mHeight').value; const w = document.getElementById('mWidth').value;
    const b = document.getElementById('mBottom').value; const l = document.getElementById('mLeft').value;
    const c = document.getElementById('mColor').value; const o = document.getElementById('mOpacity').value;
    const m = document.getElementById('preview-mask');
    m.style.height = h + "%"; m.style.width = w + "%"; m.style.bottom = b + "%"; m.style.left = l + "%";
    m.style.backgroundColor = c; m.style.opacity = o / 100;
}

async function uploadToGitHub() {
    const user = document.getElementById('ghUsername').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    const videoUrl = document.getElementById('youtubeUrl').value.trim();
    const rawContent = document.getElementById('rawContentStorage').value;

    if (!user || !repo || !token) { alert("Missing GitHub Settings."); return; }
    if (!videoUrl || !rawContent) { alert("Missing Video or Subtitle."); return; }

    const id = prompt("Filename ID (no spaces):");
    if (!id) return;

    try {
        const testReq = await fetch(`https://api.github.com/repos/${user}/${repo}`, { headers: { 'Authorization': `token ${token}` } });
        if (!testReq.ok) throw new Error(`Connection Failed: ${testReq.status}`);
    } catch (e) { alert(e.message); return; }

    const maskData = { 
        h: document.getElementById('mHeight').value, w: document.getElementById('mWidth').value, 
        b: document.getElementById('mBottom').value, l: document.getElementById('mLeft').value,
        c: document.getElementById('mColor').value, o: document.getElementById('mOpacity').value / 100
    };
    const settingsData = { 
        anchor: document.getElementById('subAnchor').value, 
        offset: document.getElementById('subOffset').value, 
        scale: document.getElementById('subSize').value / 100,
        color: document.getElementById('subColor').value,
        boxColor: document.getElementById('subBoxColor').value,
        boxOp: document.getElementById('subBoxOp').value / 100,
        shadow: document.getElementById('subShadow').value,
        shadowColor: document.getElementById('subShadowColor').value
    };
    
    const jsonObject = { "video": videoUrl, "subtitle": rawContent, "mask": maskData, "settings": settingsData };
    const base64Content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonObject, null, 2))));
    
    // API Path assumes standard structure
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/data/${id}.json`;

    try {
        let sha = null;
        const checkReq = await fetch(apiUrl + "?ref=gh-pages", { headers: { 'Authorization': `token ${token}` } });
        if (checkReq.ok) {
            sha = (await checkReq.json()).sha;
            if(!confirm("File exists. Overwrite?")) return;
        }

        const uploadReq = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Update ${id}.json`,
                content: base64Content,
                branch: "gh-pages",
                sha: sha
            })
        });

        if (!uploadReq.ok) throw new Error((await uploadReq.json()).message);

        document.getElementById('result-area').style.display = 'block';
        
        // Calculate the public link
        const baseUrl = new URL(window.location.href);
        const targetUrl = new URL(CINEMA_FILENAME, baseUrl);
        targetUrl.searchParams.set('id', id);
        document.getElementById('finalLink').value = targetUrl.toString();
        
        alert("Uploaded!");

    } catch (error) { alert("Error: " + error.message); }
}

// YouTube Player Logic
function onYouTubeIframeAPIReady() {}

function loadVideo() {
    const url = document.getElementById('youtubeUrl').value;
    const videoId = extractVideoId(url);
    if (!videoId) { alert('Invalid URL'); return; }
    if (player) { player.loadVideoById(videoId); } else { player = new YT.Player('player', { height: '100%', width: '100%', videoId: videoId, events: { 'onReady': onPlayerReady } }); }
}

function extractVideoId(url) { const match = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); return match && match[1] ? match[1] : null; }

function onPlayerReady(event) { setInterval(updateSubtitles, 100); }

function updateSubtitles() {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    try {
        const ct = player.getCurrentTime();
        const sub = subtitles.find(s => ct >= s.start && ct <= s.end);
        const div = document.getElementById('subtitle');
        if (sub) { div.innerHTML = sub.text; div.style.display = 'block'; } else { div.innerHTML = ''; div.style.display = 'none'; }
    } catch (e) {}
}

// Subtitle Parsers
document.getElementById('srtFile').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (e) => { document.getElementById('rawContentStorage').value = e.target.result; processSubtitle(e.target.result, file.name); };
    r.readAsText(file);
});

function fetchSubtitleFromUrl() {
    const url = document.getElementById('subtitleUrl').value.trim(); if (!url) return;
    fetch(url).then(r=>r.text()).then(txt => { document.getElementById('rawContentStorage').value = txt; processSubtitle(txt, url); });
}

function processSubtitle(content, name) {
    let processed = content;
    if (name.toLowerCase().endsWith('.txt')) processed = convertTxtToSrt(content);
    document.getElementById('rawContentStorage').value = processed;
    parseSRT(processed);
    alert("Subtitle Loaded");
}

function parseSRT(srt) {
    subtitles = [];
    srt.trim().split(/\n\s*\n/).forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const m = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            if (m) subtitles.push({ start: timeToSeconds(m[1]), end: timeToSeconds(m[2]), text: lines.slice(2).join('<br>').replace(/-/g, '‑') });
        }
    });
}

function convertTxtToSrt(txt) {
    if(txt.indexOf('-->') !== -1) return txt;
    const matches = [...txt.matchAll(/\[(\d+):(\d+)\]\s*(.*)/g)];
    let srt = '';
    matches.forEach((m, i) => {
        const [_, min, sec, text] = m;
        const start = `00:${min.padStart(2,'0')}:${sec.padStart(2,'0')},000`;
        let nextMin = min, nextSec = parseInt(sec) + 5;
        if(i < matches.length - 1) { nextMin = matches[i+1][1]; nextSec = matches[i+1][2]; } 
        else { if(nextSec>=60) { nextMin = parseInt(nextMin)+1; nextSec%=60; } }
        const end = `00:${nextMin.toString().padStart(2,'0')}:${nextSec.toString().padStart(2,'0')},000`;
        srt += `${i+1}\n${start} --> ${end}\n${text.trim()}\n\n`;
    });
    return srt;
}

function timeToSeconds(t) { const [h, m, s] = t.replace(',', '.').split(':'); return parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s); }