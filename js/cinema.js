const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

// Global State
let player;
let subtitleData = [];
let vocabData = [];
let videoMeta = {};

// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    if (!videoId) {
        alert("No video ID specified!");
        window.location.href = 'index.html';
        return;
    }

    try {
        // A. Load Main Library to get YouTube ID & Title
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        videoMeta = library.find(v => v.id === videoId);

        if (!videoMeta) throw new Error("Video not found in library");

        // Update UI with Basic Info
        document.getElementById('video-title-display').innerText = videoMeta.title;
        
        // Update Flashcard Link
        const cardLink = document.getElementById('link-to-cards');
        if(cardLink) cardLink.href = `cards.html?id=${videoId}`;

        // B. Load Detail Data (Subtitles & Vocab) from "data/{id}.json"
        // Note: It's okay if this fails (file might not exist yet)
        try {
            const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
            if (detailReq.ok) {
                const details = await detailReq.json();
                vocabData = details.vocab || [];
                // Parse SRT Subtitles if they exist
                if (details.subtitle) {
                    subtitleData = parseSRT(details.subtitle);
                }
            }
        } catch (e) {
            console.log("No detail file found for this video. Subtitles/Vocab will be empty.");
        }

        // C. Render Vocab List immediately
        renderVocab();

    } catch (err) {
        console.error(err);
        document.getElementById('video-title-display').innerText = "Error loading video.";
    }
});

// --- 2. YOUTUBE PLAYER SETUP ---
// This function is called automatically by the YouTube Iframe API
function onYouTubeIframeAPIReady() {
    // Wait until videoMeta is loaded from JSON
    const checkExist = setInterval(function() {
        if (videoMeta.yt) {
            clearInterval(checkExist);
            initPlayer(videoMeta.yt);
        }
    }, 100);
}

function initPlayer(ytID) {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: ytID,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    // Start the Subtitle Loop
    setInterval(updateSubtitle, 200);
}

function onPlayerStateChange(event) {
    // Optional: Auto-scroll vocab or highlight active words could go here
}

// --- 3. SUBTITLE LOGIC ---
function parseSRT(srtString) {
    // Simple regex parser for SRT format
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

function timeToSeconds(timeString) {
    const p = timeString.split(':');
    const s = p[2].split(',');
    return (+p[0]) * 3600 + (+p[1]) * 60 + (+s[0]) + (+s[1]) / 1000;
}

function updateSubtitle() {
    if (!player || !player.getCurrentTime) return;
    
    const time = player.getCurrentTime();
    const box = document.getElementById('subtitle-box');
    
    // Find current subtitle line
    const currentLine = subtitleData.find(s => time >= s.start && time <= s.end);
    
    if (currentLine) {
        // Only update if text is different to prevent flickering
        if (box.innerHTML !== currentLine.text) {
            box.innerHTML = `<span>${currentLine.text}</span>`;
            box.style.display = 'block';
        }
    } else {
        box.style.display = 'none';
    }
}

// --- 4. VOCAB LOGIC ---
function renderVocab() {
    const list = document.getElementById('vocab-list');
    list.innerHTML = '';

    if (vocabData.length === 0) {
        list.innerHTML = '<div style="padding:20px; color:#999; text-align:center;">No vocabulary notes available.</div>';
        return;
    }

    vocabData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `<span class="v-word">${item.word}</span><span style="font-size:0.9em; color:#666">${item.def}</span>`;
        
        // Click word to jump video to that time
        div.onclick = () => {
            if(player && player.seekTo) {
                player.seekTo(item.time, true);
                player.playVideo();
            }
        };
        list.appendChild(div);
    });
}
