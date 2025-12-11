// 1. GLOBAL VARIABLES
let player;
let subtitles = [];
let vocabList = [];
let currentIndex = 0;
let mediaRecorder;
let audioChunks = [];
let userAudioUrl = null;
let currentStream = null; // To clean up mic stream

// 2. ENTRY POINT
// This function MUST be defined before the API loads
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) {
        document.getElementById('current-text').innerHTML = 
            `<div class="error-msg">No Video ID found.<br>Use: shadow.html?id=filename</div>`;
        return;
    }
    loadData(id);
}

// 3. LOAD DATA
function loadData(id) {
    // Path: relative to views/shadow.html -> ../data/filename.json
    const path = `../data/${id}.json?t=${Date.now()}`;
    
    fetch(path)
    .then(r => {
        if(!r.ok) throw new Error(`File not found: ${path} (Status: ${r.status})`);
        return r.json();
    })
    .then(data => {
        const vidId = extractVideoId(data.video);
        
        // Clear old data
        vocabList = data.vocab || [];
        subtitles = [];
        currentIndex = 0;

        // Initialize Player
        if (window.YT && window.YT.Player) {
            // If player already exists (re-using page), destroy it first
            if(player && typeof player.destroy === 'function') player.destroy();
            createPlayer(vidId, data);
        } else {
            // Should be handled by onYouTubeIframeAPIReady, but just in case
            createPlayer(vidId, data);
        }
    })
    .catch(err => {
        console.error(err);
        document.getElementById('current-text').innerHTML = 
            `<div class="error-msg">Error loading data:<br>${err.message}</div>`;
    });
}

function createPlayer(vidId, data) {
    player = new YT.Player('player', {
        videoId: vidId,
        playerVars: { 'controls': 0, 'fs': 0, 'rel': 0 },
        events: { 'onReady': () => {
            if(data.subtitle) parseSRT(data.subtitle);
            else if(data.hiddenSub) parseSRT(decrypt(data.hiddenSub));
            
            if(data.mask) {
                const m = document.getElementById('mask-bar');
                m.style.height = data.mask.h + "%";
                m.style.width = data.mask.w + "%";
                m.style.bottom = data.mask.b + "%";
                m.style.left = data.mask.l + "%";
                if(data.mask.c) m.style.backgroundColor = data.mask.c;
                if(data.mask.o) m.style.opacity = data.mask.o;
            }
            updateUI();
        }}
    });
}

// 4. UI LOGIC
function updateUI() {
    if(subtitles.length === 0) return;
    const sub = subtitles[currentIndex];
    
    document.getElementById('current-text').innerHTML = sub.text;
    document.getElementById('progress').innerText = `${currentIndex + 1} / ${subtitles.length}`;

    // Vocab logic
    const currentVocab = vocabList.filter(v => v.time >= sub.start && v.time < sub.end);
    const vocabContainer = document.getElementById('vocab-display');
    if(currentVocab.length > 0) {
        vocabContainer.innerHTML = currentVocab.map(v => `
            <div class="vocab-card">
                <div class="v-word">${v.word}</div>
                <div class="v-def">${v.def}</div>
            </div>
        `).join('');
    } else {
        vocabContainer.innerHTML = '';
    }
}

function nextLine() {
    if(currentIndex < subtitles.length - 1) {
        currentIndex++;
        updateUI();
        playRef();
    }
}

function prevLine() {
    if(currentIndex > 0) {
        currentIndex--;
        updateUI();
        playRef();
    }
}

// 5. PLAYBACK
let stopTimer;
function playRef() {
    if(!player || typeof player.seekTo !== 'function') return;
    if(subtitles.length === 0) return;
    
    const sub = subtitles[currentIndex];
    player.seekTo(sub.start, true);
    player.playVideo();
    
    clearTimeout(stopTimer);
    const duration = (sub.end - sub.start) * 1000;
    stopTimer = setTimeout(() => { player.pauseVideo(); }, duration + 200);
}

// 6. RECORDING
async function toggleRecord() {
    const btn = document.getElementById('btn-mic');
    
    if (btn.classList.contains('recording')) {
        // STOP RECORDING
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        
        // Stop stream tracks
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        btn.classList.remove('recording');
        document.getElementById('mic-label').innerText = "Record";
    } else {
        // START RECORDING
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(currentStream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                userAudioUrl = URL.createObjectURL(blob);
                document.getElementById('user-audio').src = userAudioUrl;
                document.getElementById('btn-play-user').style.display = 'flex';
                document.getElementById('play-label').style.display = 'block';
            };

            mediaRecorder.start();
            btn.classList.add('recording');
            document.getElementById('mic-label').innerText = "Stop";
            
        } catch (err) {
            console.error("Mic access error:", err);
            alert("Cannot access microphone. Please ensure permission is granted.");
        }
    }
}

function playUser() {
    const audio = document.getElementById('user-audio');
    if(userAudioUrl) audio.play();
}

// 7. UTILS
function extractVideoId(url) { const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); return m && m[1] ? m[1] : null; }
function decrypt(s) { try { return decodeURIComponent(escape(atob(atob(s).split('').reverse().join('')))); } catch(e){return"";} }
function timeToSec(t) { const [h,m,s] = t.replace(',','.').split(':'); return parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s); }

function parseSRT(srt) {
    subtitles = [];
    srt.trim().split(/\n\s*\n/).forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const m = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            if (m) subtitles.push({ start: timeToSec(m[1]), end: timeToSec(m[2]), text: lines.slice(2).join('<br>') });
        }
    });
}

// 8. INJECT YOUTUBE API MANUALLY
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}
