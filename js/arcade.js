// 1. GLOBAL VARIABLES
let player;
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswered = false;

// 2. ENTRY POINT
// We attach this explicitly to 'window' so the YouTube API can find it globally.
window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube API is ready."); // Debug log
    
    const id = new URLSearchParams(window.location.search).get('id');
    
    if(!id) {
        // Show error on screen instead of just alert
        const container = document.getElementById('game-container');
        if(container) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:#e74c3c;">
                    <h2>No Data ID Found</h2>
                    <p>Please use a link like: <code>arcade.html?id=suntiunn</code></p>
                    <a href="index.html" style="color:white; text-decoration:underline;">Return to Menu</a>
                </div>`;
        }
        return;
    }
    
    loadData(id);
};

// 3. LOAD DATA
function loadData(id) {
    console.log("Loading data for:", id); // Debug log

    // Fetch path: steps up from views/ to root, then into data/
    fetch(`../data/${id}.json?t=${Date.now()}`)
    .then(r => {
        if(!r.ok) throw new Error(`HTTP Error ${r.status}`);
        return r.json();
    })
    .then(data => {
        const vocab = data.vocab || [];
        
        // Validation
        if(vocab.length < 4) {
            alert("Not enough vocabulary to play Arcade Mode (Need at least 4 words).");
            return;
        }

        const vidId = extractVideoId(data.video);
        
        // Generate Quiz
        quizData = generateQuestions(vocab);
        
        // Init Player
        createPlayer(vidId);
    })
    .catch(err => {
        console.error("Error loading data:", err);
        document.getElementById('progress-text').innerText = "Error loading data.";
        alert("Error loading data file. Check console (F12) for details.");
    });
}

// Generate questions: 1 Correct + 3 Wrong options
function generateQuestions(vocab) {
    const shuffled = [...vocab].sort(() => 0.5 - Math.random());
    
    // Limit to 10 questions max
    const questions = shuffled.slice(0, 10).map(target => {
        const distractors = vocab
            .filter(v => v.word !== target.word)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        
        const options = [target, ...distractors].sort(() => 0.5 - Math.random());
        
        return {
            target: target,
            options: options
        };
    });

    return questions;
}

// 4. PLAYER SETUP
function createPlayer(vidId) {
    console.log("Creating player for:", vidId); // Debug log
    
    // Check if container exists
    if(!document.getElementById('player')) {
        console.error("Player div not found");
        return;
    }

    player = new YT.Player('player', {
        videoId: vidId,
        playerVars: { 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
        events: {
            'onReady': () => {
                console.log("Player Ready. Starting Game.");
                startGame();
            },
            'onError': (e) => {
                console.error("YouTube Player Error:", e);
            }
        }
    });
}

// 5. GAME LOGIC
function startGame() {
    score = 0;
    currentQuestionIndex = 0;
    updateScoreBoard();
    renderQuestion();
}

function renderQuestion() {
    if(currentQuestionIndex >= quizData.length) {
        endGame();
        return;
    }

    const q = quizData[currentQuestionIndex];
    isAnswered = false;

    // Update UI Text
    const progressEl = document.getElementById('progress-text');
    if(progressEl) progressEl.innerText = `Question ${currentQuestionIndex + 1} / ${quizData.length}`;
    
    const targetEl = document.getElementById('target-word');
    if(targetEl) targetEl.innerText = q.target.word;
    
    document.getElementById('nextBtn').disabled = true;

    // Render Options Buttons
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.def; 
        btn.onclick = () => checkAnswer(btn, opt, q.target);
        optionsContainer.appendChild(btn);
    });

    // Auto-play the clip
    playClip();
}

let stopTimer;
function playClip() {
    if(!player || typeof player.seekTo !== 'function') return;
    
    const q = quizData[currentQuestionIndex];
    const start = q.target.time;
    const end = start + 3; // Play for 3 seconds

    player.seekTo(start, true);
    player.playVideo();
    
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
        player.pauseVideo();
    }, (end - start) * 1000);
}

// Make globally available for HTML buttons
window.replayClip = playClip;
window.nextQuestion = function() {
    currentQuestionIndex++;
    renderQuestion();
};

function checkAnswer(btn, selected, correct) {
    if(isAnswered) return;
    isAnswered = true;

    const btns = document.querySelectorAll('.option-btn');
    
    if(selected.word === correct.word) {
        btn.classList.add('correct');
        score++;
    } else {
        btn.classList.add('wrong');
        btns.forEach(b => {
            if(b.innerText === correct.def) b.classList.add('correct');
        });
    }

    btns.forEach(b => b.disabled = true);
    document.getElementById('nextBtn').disabled = false;
    updateScoreBoard();
}

function updateScoreBoard() {
    const el = document.getElementById('score');
    if(el) el.innerText = score;
}

function endGame() {
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    document.getElementById('total-questions').innerText = quizData.length;
}

// 6. UTILS
function extractVideoId(url) { 
    const m = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/); 
    return m && m[1] ? m[1] : null; 
}

// 7. INJECT YOUTUBE API MANUALLY
// This logic ensures the API loads AFTER our function is ready.
if (!window.YT) {
    console.log("Injecting YouTube API...");
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    // API already loaded
    onYouTubeIframeAPIReady();
}
