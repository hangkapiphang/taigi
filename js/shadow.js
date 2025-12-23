// js/shadow.js

// 1. VARIABLES
let player;
let subtitles = [];
let vocabList = [];
let currentIndex = 0;
let mediaRecorder;
let audioChunks = [];
let userAudioUrl = null;
let currentStream = null; 
let stopTimer; 
let recordedMimeType = 'audio/webm'; 

// 2. INIT
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) {
        document.getElementById('current-text').innerText = "Error: No Video ID";
        return;
    }
    loadData(id);
}

// 3. LOAD
async function loadData(id) {
    try {
        // 1. Get Video Metadata
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        const meta = library.find(v => v.id === id);
        if(!meta) throw new Error("Video not found in library");

        // 2. Get Subtitles & Vocab
        const detailReq = await fetch(`../data/${id}.json?t=${Date.now()}`);
        if(!detailReq.ok) throw new Error("Data file missing");
        const data = await detailReq.json();

        // 3. Setup
        vocabList = data.vocab || [];
        subtitles = [];
        currentIndex = 0;

        createPlayer(meta.yt, data);

    } catch (err) {
        console.error(err);
        document.getElementById('current-text').innerText = "Data not available yet.";
    }
}

function createPlayer(ytId, data) {
    player = new YT.Player('player', {
        videoId: ytId,
        playerVars: { 'controls': 0, 'fs': 0, 'rel': 0, 'playsinline': 1 },
        events: { 'onReady': () => {
            if(data.subtitle) parseSRT(data.subtitle);
            
            // Mask setup (Legacy support)
            if(data.mask) {
                const m = document.getElementById('mask-bar');
                m.style.height = data.mask.h + "%";
                m.style.width = data.mask.w + "%";
                m.style.bottom = data.mask.b + "%";
                m.style.left = data.mask.l + "%";
            }
            updateUI();
        }}
    });
}

// 4. UI UPDATE
function updateUI() {
    if(subtitles.length === 0) return;
    const sub = subtitles[currentIndex];
    
    // Convert newlines to breaks for display
    document.getElementById('current-text').innerHTML = sub.text;
    document.getElementById('progress').innerText = `${currentIndex + 1} / ${subtitles.length}`;

    // Filter Vocab for current timestamp
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
        vocabContainer.innerHTML = '<span style="color:#ccc; font-size:0.8rem; font-style:italic;">No key words</span>';
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

// 6. RECORDING (iOS Friendly)
async function toggleRecord() {
    const btn = document.getElementById('btn-mic');
    
    if (btn.classList.contains('recording')) {
        // Stop
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        btn.classList.remove('recording');
        document.getElementById('mic-label').innerText = "Record";
    } else {
        // Start
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Detect MIME
            const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
            recordedMimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

            mediaRecorder = new MediaRecorder(currentStream, recordedMimeType ? { mimeType: recordedMimeType } : {});
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => { if(e.data.size > 0) audioChunks.push(e.data); };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: recordedMimeType || 'audio/webm' });
                userAudioUrl = URL.createObjectURL(blob);
                const audio = document.getElementById('user-audio');
                audio.src = userAudioUrl;
                audio.load();
                
                document.getElementById('play-label').style.opacity = '1';
                document.getElementById('play-label').innerText = "Play Check";
            };

            mediaRecorder.start();
            btn.classList.add('recording');
            document.getElementById('mic-label').innerText = "Stop";
            document.getElementById('play-label').style.opacity = '0.5';
            
        } catch (err) {
            alert("Mic access denied or error: " + err.message);
        }
    }
}

function playUser() {
    const audio = document.getElementById('user-audio');
    if(userAudioUrl) audio.play();
}

// 7. UTILS
function timeToSec(t) { 
    const [h,m,s] = t.replace(',','.').split(':'); 
    return parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s); 
}

function parseSRT(srt) {
    subtitles = [];
    srt.trim().split(/\n\s*\n/).forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const m = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            if (m) {
                subtitles.push({ 
                    start: timeToSec(m[1]), 
                    end: timeToSec(m[2]), 
                    text: lines.slice(2).join('<br>') 
                });
            }
        }
    });
}
