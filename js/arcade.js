let player;
let allLines = [];
let currentQuestion = null;
let score = 0;
let roundsPlayed = 0;
const TOTAL_ROUNDS = 5;
let stopTimer;

// Required Global Callback for YouTube API
window.onYouTubeIframeAPIReady = function() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(id) loadGameData(id);
    else document.getElementById('question').textContent = "Error: No ID provided in URL";
}

function loadGameData(id) {
    // Note the path: ../data/ to go up from 'views' and into 'data'
    fetch(`../data/${id}.json?t=${Date.now()}`)
    .then(r => {
        if(!r.ok) throw new Error("Data not found");
        return r.json();
    })
    .then(data => {
        const vidId = extractVideoId(data.video);
        player = new YT.Player('player', {
            videoId: vidId,
            playerVars: { 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
            events: { 'onReady': () => parseAndStart(data.subtitle || decrypt(data.hiddenSub)) }
        });
    })
    .catch(e => {
        console.error(e);
        document.getElementById('question').textContent = "Error loading game data.";
    });
}

function parseAndStart(srt) {
    if(!srt) return;
    
    // Convert SRT to Array
    srt.trim().split(/\n\s*\n/).forEach(block => {
        const lines = block.split('\n');
        if(lines.length >= 3) {
            const m = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            if(m) {
                // Clean HTML tags for the game text
                const cleanText = lines.slice(2).join(' ').replace(/<[^>]*>/g, '');
                // Only use lines long enough to be a question
                if(cleanText.length > 5) {
                    allLines.push({
                        start: timeToSec(m[1]),
                        end: timeToSec(m[2]),
                        text: cleanText
                    });
                }
            }
        }
    });
    nextQuestion();
}

function nextQuestion() {
    if(roundsPlayed >= TOTAL_ROUNDS) { endGame(); return; }
    roundsPlayed++;

    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('options').innerHTML = '';
    
    // Pick Random Line
    const randomIdx = Math.floor(Math.random() * allLines.length);
    const line = allLines[randomIdx];
    
    // Split by spaces
    const words = line.text.split(' ');
    
    let targetWord = "";
    let targetIndex = -1;
    
    // Try to find a good word to hide (length > 1)
    for(let i=0; i<15; i++) {
        const idx = Math.floor(Math.random() * words.length);
        // Basic check to avoid punctuation-only strings
        const w = words[idx].replace(/[.,?!]/g, ""); 
        if(w.length > 1) {
            targetWord = words[idx]; // Keep punctuation for display/checking
            targetIndex = idx;
            break;
        }
    }
    
    // If we failed to find a good word, try a different line
    if(targetIndex === -1) { 
        roundsPlayed--; 
        nextQuestion(); 
        return; 
    } 

    // Build Question String with Blank
    const qWords = [...words];
    qWords[targetIndex] = '<span class="blank">______</span>';
    document.getElementById('question').innerHTML = qWords.join(' ');

    // Generate Options
    let options = [targetWord];
    while(options.length < 4) {
        const rLine = allLines[Math.floor(Math.random() * allLines.length)].text;
        const rWordsArr = rLine.split(' ');
        const rWord = rWordsArr[Math.floor(Math.random() * rWordsArr.length)];
        
        // Ensure unique and decent length
        if(!options.includes(rWord) && rWord.replace(/[.,?!]/g, "").length > 1) {
            options.push(rWord);
        }
    }
    options = shuffle(options);

    // Render Buttons
    const optDiv = document.getElementById('options');
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(btn, opt, targetWord);
        optDiv.appendChild(btn);
    });

    currentQuestion = line;
    replayClip();
}

function checkAnswer(btn, selected, correct) {
    const allBtns = document.querySelectorAll('.opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if(selected === correct) {
        btn.classList.add('correct');
        score += 10;
        document.getElementById('score').textContent = score;
    } else {
        btn.classList.add('wrong');
        allBtns.forEach(b => { if(b.textContent === correct) b.classList.add('correct'); });
    }
    document.getElementById('nextBtn').style.display = 'block';
}

function replayClip() {
    if(!currentQuestion || !player || !player.seekTo) return;
    player.seekTo(currentQuestion.start, true);
    player.playVideo();
    
    const duration = (currentQuestion.end - currentQuestion.start) * 1000;
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
        player.pauseVideo();
    }, duration + 500); 
}

function endGame() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
    document.getElementById('final-score').textContent = score;
}

// Utilities
function extractVideoId(url) { 
    if(!url) return null;
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); 
    return m && m[1] ? m[1] : null; 
}

function decrypt(s) { 
    if(!s) return "";
    try { return decodeURIComponent(escape(atob(atob(s).split('').reverse().join('')))); } catch(e){return"";} 
}

function timeToSec(t) { 
    const [h,m,s] = t.replace(',','.').split(':'); 
    return parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s); 
}

function shuffle(a) { 
    for(let i=a.length-1; i>0; i--){ 
        const j=Math.floor(Math.random()*(i+1)); 
        [a[i],a[j]]=[a[j],a[i]]; 
    } 
    return a; 
}

// Expose functions needed by HTML onClick
window.gameLogic = {
    replayClip,
    nextQuestion
};
