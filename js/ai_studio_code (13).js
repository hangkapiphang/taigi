const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let vocabList = [];
let currentQ = 0;
let score = 0;
let isAnswered = false;

// 1. Load Data
document.addEventListener('DOMContentLoaded', async () => {
    if(!videoId) return;

    try {
        // Load video title
        const libReq = await fetch(`../data/library.json?t=${Date.now()}`);
        const library = await libReq.json();
        const vid = library.find(v => v.id === videoId);
        if(vid) document.getElementById('video-title').innerText = vid.title;

        // Load Vocab Data
        const detailReq = await fetch(`../data/${videoId}.json?t=${Date.now()}`);
        if(detailReq.ok) {
            const data = await detailReq.json();
            vocabList = data.vocab || [];
            
            if(vocabList.length < 2) {
                alert("Not enough vocabulary words to generate a quiz!");
                return;
            }

            // Shuffle questions
            vocabList.sort(() => Math.random() - 0.5);
            
            initGame();
        } else {
            document.getElementById('question-text').innerText = "Quiz data not found.";
        }
    } catch(e) { console.error(e); }
});

// 2. Init Game
function initGame() {
    currentQ = 0;
    score = 0;
    document.getElementById('total-display').innerText = vocabList.length;
    showQuestion();
}

// 3. Render Question
function showQuestion() {
    const qData = vocabList[currentQ];
    isAnswered = false;

    // UI Updates
    document.getElementById('current-q-num').innerText = currentQ + 1;
    document.getElementById('progress-fill').style.width = ((currentQ / vocabList.length) * 100) + "%";
    document.getElementById('question-text').innerText = qData.word;
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('feedback-msg').innerText = '';

    // Generate Options (1 Correct + 3 Wrong)
    let options = [qData];
    
    // Pick random wrong answers from the rest of the list
    const otherWords = vocabList.filter(w => w.word !== qData.word);
    
    // Shuffle others and take up to 3
    otherWords.sort(() => Math.random() - 0.5);
    options = options.concat(otherWords.slice(0, 3));
    
    // Shuffle options so correct answer isn't always first
    options.sort(() => Math.random() - 0.5);

    // Render Buttons
    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt.def; // Show definition as the answer
        btn.onclick = () => checkAnswer(opt, btn, qData);
        grid.appendChild(btn);
    });
}

// 4. Check Answer
function checkAnswer(selected, btnElement, correctData) {
    if(isAnswered) return; // Prevent double clicking
    isAnswered = true;

    const allBtns = document.querySelectorAll('.option-btn');
    
    if(selected.word === correctData.word) {
        // Correct
        btnElement.classList.add('correct');
        score++;
        document.getElementById('score-display').innerText = score;
        document.getElementById('feedback-msg').innerText = "Correct! 🎉";
        document.getElementById('feedback-msg').style.color = "green";
    } else {
        // Wrong
        btnElement.classList.add('wrong');
        document.getElementById('feedback-msg').innerText = "Oops! The correct answer is highlighted.";
        document.getElementById('feedback-msg').style.color = "red";
        
        // Highlight the correct one
        allBtns.forEach(b => {
            if(b.innerText === correctData.def) b.classList.add('correct');
        });
    }

    // Disable all buttons
    allBtns.forEach(b => b.classList.add('disabled'));

    // Show Next Button
    document.getElementById('next-btn').style.display = 'inline-block';
}

// 5. Next Question or End
function nextQuestion() {
    currentQ++;
    if(currentQ < vocabList.length) {
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById('question-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'block';
    document.getElementById('progress-fill').style.width = "100%";
    
    const percentage = Math.round((score / vocabList.length) * 100);
    document.getElementById('final-score').innerText = percentage + "%";
    
    let msg = "Keep practicing!";
    if(percentage === 100) msg = "Perfect Score! 🏆";
    else if(percentage >= 80) msg = "Excellent work! 🌟";
    else if(percentage >= 50) msg = "Good effort! 👍";
    
    document.getElementById('final-msg').innerText = msg;
}