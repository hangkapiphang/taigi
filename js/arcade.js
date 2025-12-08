// 1. GLOBAL VARIABLES
let player;
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswered = false;

// 2. ENTRY POINT
function onYouTubeIframeAPIReady() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) {
        alert("No Video ID found. Redirecting to menu.");
        window.location.href = "index.html";
        return;
    }
    loadData(id);
}

// 3. LOAD DATA & GENERATE QUIZ
function loadData(id) {
    // Path relative to views/arcade.html -> ../data/
    fetch(`../data/${id}.json?t=${Date.now()}`)
    .then(r => r.json())
    .then(data => {
        const vocab = data.vocab || [];
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
    .catch(err => console.error("Error loading data:", err));
}

// Generate questions: 1 Correct + 3 Wrong options
function generateQuestions(vocab) {
    // Shuffle the full vocab list
    const shuffled = [...vocab].sort(() => 0.5 - Math.random());
    
    // Create a question for each word (or limit to 10 for a shorter game)
    const questions = shuffled.slice(0, 10).map(target => {
        // Find 3 distractors (words that are NOT the target)
        const distractors = vocab
            .filter(v => v.word !== target.word)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        
        // Combine and shuffle options
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
    player = new YT.Player('player', {
        videoId: vidId,
        playerVars: { 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
        events: {
            'onReady': () => {
                startGame();
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

    // Update UI
    document.getElementById('progress-text').innerText = `Question ${currentQuestionIndex + 1} / ${quizData.length}`;
    document.getElementById('target-word').innerText = q.target.word; // Show Taigi word
    document.getElementById('nextBtn').disabled = true;

    // Render Options
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.def; // Show Definition
        btn.onclick = () => checkAnswer(btn, opt, q.target);
        optionsContainer.appendChild(btn);
    });

    // Auto-play clip
    playClip();
}

let stopTimer;
function playClip() {
    if(!player || typeof player.seekTo !== 'function') return;
    
    const q = quizData[currentQuestionIndex];
    const start = q.target.time;
    // Play for 3 seconds or slightly more
    const end = start + 3; 

    player.seekTo(start, true);
    player.playVideo();
    
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
        player.pauseVideo();
    }, (end - start) * 1000);
}

// Global wrapper for HTML onclick
window.replayClip = playClip;

function checkAnswer(btn, selected, correct) {
    if(isAnswered) return;
    isAnswered = true;

    const btns = document.querySelectorAll('.option-btn');
    
    // Check logic
    if(selected.word === correct.word) {
        btn.classList.add('correct');
        score++;
        playSuccessSound();
    } else {
        btn.classList.add('wrong');
        // Highlight the correct one
        btns.forEach(b => {
            if(b.innerText === correct.def) b.classList.add('correct');
        });
        playErrorSound();
    }

    // Disable all buttons
    btns.forEach(b => b.disabled = true);
    
    // Enable Next
    document.getElementById('nextBtn').disabled = false;
    updateScoreBoard();
}

// Wrapper for Next Button
window.nextQuestion = function() {
    currentQuestionIndex++;
    renderQuestion();
}

function updateScoreBoard() {
    document.getElementById('score').innerText = score;
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

// Simple Audio Feedback (Optional)
function playSuccessSound() {
    // You could add an Audio object here
    // const audio = new Audio('../sfx/correct.mp3'); audio.play();
}
function playErrorSound() {
    // const audio = new Audio('../sfx/wrong.mp3'); audio.play();
}

// 7. INJECT YOUTUBE API MANUALLY
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    onYouTubeIframeAPIReady();
}
