const CINEMA_FILENAME = "cinema.html";
function saveSettings() {
    localStorage.setItem('gh_user', document.getElementById('ghUsername').value.trim());
    localStorage.setItem('gh_repo', document.getElementById('ghRepo').value.trim());
    localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim());
    alert("Saved!");
}
window.onload = function() {
    document.getElementById('ghUsername').value = localStorage.getItem('gh_user') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('gh_repo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('gh_token') || '';
}

function updateSubtitleStyle() {
    const anchor = document.getElementById('subAnchor').value;
    const offset = document.getElementById('subOffset').value;
    const size = document.getElementById('subSize').value;
    document.getElementById('valOffset').textContent = offset + "%";
    document.getElementById('valSize').textContent = size + "%";
    const sub = document.getElementById('subtitle');
    sub.style.top = 'auto'; sub.style.bottom = 'auto';
    sub.style[anchor] = offset + "%";
    sub.style.fontSize = (32 * (size / 100)) + "px";
}

function updateMask() {
    const m = document.getElementById('preview-mask');
    m.style.height = document.getElementById('mHeight').value + "%";
    m.style.width = document.getElementById('mWidth').value + "%";
    m.style.bottom = document.getElementById('mBottom').value + "%";
    m.style.left = document.getElementById('mLeft').value + "%";
}

async function uploadToGitHub() {
    const user = document.getElementById('ghUsername').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    const videoUrl = document.getElementById('youtubeUrl').value.trim();
    const rawContent = document.getElementById('rawContentStorage').value;

    if (!user || !repo || !token || !videoUrl || !rawContent) { alert("Missing required fields."); return; }
    const id = prompt("Filename ID (no spaces):");
    if (!id) return;

    const maskData = { h: document.getElementById('mHeight').value, w: document.getElementById('mWidth').value, b: document.getElementById('mBottom').value, l: document.getElementById('mLeft').value };
    const settingsData = { anchor: document.getElementById('subAnchor').value, offset: document.getElementById('subOffset').value, scale: document.getElementById('subSize').value / 100 };
    const jsonObject = { "video": videoUrl, "subtitle": rawContent, "mask": maskData, "settings": settingsData };
    const base64Content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonObject, null, 2))));
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/data/${id}.json`;

    try {
        const checkReq = await fetch(apiUrl + "?ref=gh-pages", { headers: { 'Authorization': `token ${token}` } });
        let sha = null;
        if (checkReq.ok) {
            sha = (await checkReq.json()).sha;
            if(!confirm("File exists. Overwrite?")) return;
        }
        const uploadReq = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Update ${id}.json`, content: base64Content, branch: "gh-pages", sha: sha })
        });
        if (!uploadReq.ok) throw new Error((await uploadReq.json()).message);

        document.getElementById('result-area').style.display = 'block';
        const dir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        document.getElementById('finalLink').value = `${window.location.origin}${dir.replace('/admin', '')}/${CINEMA_FILENAME}?id=${id}`;
        alert("Uploaded!");
    } catch (error) { alert("Error: " + error.message); }
}

let player, subtitles = [];
function onYouTubeIframeAPIReady(){}
function loadVideo() {
    const url = document.getElementById('youtubeUrl').value;
    const videoId = extractVideoId(url);
    if (!videoId) { alert('Invalid URL'); return; }
    if (player) player.loadVideoById(videoId);
    else player = new YT.Player('player', { videoId: videoId, events: { 'onReady': onPlayerReady } });
}
function extractVideoId(url) { return (url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/))?.[1]; }
function onPlayerReady(event) { setInterval(updateSubtitles, 100); }
function updateSubtitles() {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    const ct = player.getCurrentTime();
    const sub = subtitles.find(s => ct >= s.start && ct <= s.end);
    document.getElementById('subtitle').style.display = sub ? 'block' : 'none';
    if (sub) document.getElementById('subtitle').innerHTML = sub.text;
}
document.getElementById('srtFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = e => { processSubtitle(e.target.result); };
    r.readAsText(file);
});
function fetchSubtitleFromUrl() {
    const url = document.getElementById('subtitleUrl').value.trim(); if (!url) return;
    fetch(url).then(r=>r.text()).then(txt => processSubtitle(txt));
}
function processSubtitle(content) {
    document.getElementById('rawContentStorage').value = content;
    parseSRT(content);
    alert("Subtitle Loaded");
}
function parseSRT(srt) {
    subtitles = [];
    srt.trim().split(/\n\s*\n/).forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 2) {
            const m = lines[1].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d+)/);
            if (m) subtitles.push({ start: timeToSec(m[1]), end: timeToSec(m[2]), text: lines.slice(2).join('<br>') });
        }
    });
}
function timeToSec(t) { const p=t.replace(',','.').split(':'); return (p.length===3?+p[0]*3600:+0)+ +p[p.length-2]*60 + +p[p.length-1]; }
