// ==========================================
// 1. CONFIGURATION & DATA
// ==========================================
const ACTIVE_KEY = 'voice_rush_active_final_v4';
const LIBRARY_KEY = 'voice_rush_lib_final_v4';

const emojis = {
    "Wild Animals": ["🦁","🐯","🐆","🦓","🦒","🐘","🦏","🦛","🐻","🐼","🐨","🦊","🐗","🐊","🐅","🦍"],
    "Fruits": ["🍎","🍌","🍇","🍉","🍓","🍒","🍍","🥭","🥝","🍑","🍐","🍋","🍊","🍈","🥑"],
    "Vegetables": ["🥦","🥕","🌽","🥒","🍆","🍅","🥔","🧅","🥬","🧄","🌶️","🍄","🥜"],
    "Farm Animals": ["🐶","🐱","🐷","🐮","🐔","🐣","🦆","🐴","🐑","🐐","🐇","🦃","🐁"],
    "Sea & Sky": ["🐙","🐬","🐳","🦈","🦀","🐢","🐠","🐦","🦅","🦉","🦜","🐧","🦆","🦋"],
    "Food": ["🍔","🍕","🌭","🥪","🍦","🍩","🍪","🎂","🍫","🍿","🥤","🥛","🍞","🧀","🥚"],
    "Sports": ["⚽","🏀","🏈","⚾","🎾","🏐","🏓","🥊","🏆","🥇","🏊","🚴"],
    "Clothing": ["👕","👖","👗","👘","👙","🎒","👞","👟","👠","🧢","👒","🕶️","👔"],
    "Objects": ["🚗","🚀","🎸","🎈","🎁","👑","💎","⏰","📱","💻","✏️","📚"]
};

const defaultData = [
    { id: 1, name: 'dog', icon: '🐶', trigger: 'dog' },
    { id: 2, name: 'cat', icon: '🐱', trigger: 'cat' }
];

let currentDeck = [];
let deckLibrary = {};
let trainingId = null;

// ==========================================
// 2. INIT
// ==========================================
async function initData() {
    const storedActive = localStorage.getItem(ACTIVE_KEY);
    currentDeck = storedActive ? JSON.parse(storedActive) : [...defaultData];
    
    const storedLib = localStorage.getItem(LIBRARY_KEY);
    deckLibrary = storedLib ? JSON.parse(storedLib) : {};

    try {
        const response = await fetch('class_data.json');
        if (response.ok) {
            const serverDecks = await response.json();
            for (const [name, cards] of Object.entries(serverDecks)) {
                deckLibrary["⭐ " + name] = cards;
            }
        }
    } catch (e) { console.log("Local data only."); }

    renderActiveList();
    renderLibrary();
    initEmojiPicker();
}

function saveActive() { localStorage.setItem(ACTIVE_KEY, JSON.stringify(currentDeck)); renderActiveList(); }
function saveLibrary() { localStorage.setItem(LIBRARY_KEY, JSON.stringify(deckLibrary)); renderLibrary(); }

// ==========================================
// 3. DATA MANAGEMENT
// ==========================================
function exportData() {
    if(currentDeck.length === 0) return alert("Nothing to save!");
    const dataStr = JSON.stringify(currentDeck, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `voice_rush_deck_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function triggerImport() { document.getElementById('file-input').click(); }
function importData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if(Array.isArray(json)) {
                if(confirm("Load this file?")) { currentDeck = json; saveActive(); alert("Loaded!"); }
            } else alert("Invalid JSON");
        } catch(err) { alert("Error"); }
        input.value = ''; 
    };
    reader.readAsText(file);
}

// ==========================================
// 4. UI RENDERERS
// ==========================================
function renderActiveList() {
    const container = document.getElementById('list-container');
    container.innerHTML = currentDeck.length ? '' : '<div style="text-align:center;color:#999;padding:10px;">Empty List</div>';
    currentDeck.forEach(a => {
        const div = document.createElement('div');
        div.className = `animal-item ${a.trigger !== a.name ? 'trained' : ''}`;
        div.innerHTML = `
            <div class="animal-info"><div class="animal-icon">${a.icon}</div><div><div class="animal-name">${a.name}</div><span class="animal-trigger">"${a.trigger}"</span></div></div>
            <div class="item-actions"><button class="btn-rec" id="btn-${a.id}" onclick="trainVoice(${a.id})">REC</button><button class="btn-del" onclick="deleteAnimal(${a.id})">✖</button></div>`;
        container.appendChild(div);
    });
}
function renderLibrary() {
    const container = document.getElementById('library-container');
    const names = Object.keys(deckLibrary);
    container.innerHTML = names.length ? '' : '<div style="text-align:center;color:#999;padding:10px;">No saved decks.</div>';
    names.forEach(name => {
        const div = document.createElement('div');
        div.className = 'library-item';
        const isMaster = name.startsWith("⭐");
        const delBtn = isMaster ? '' : `<button class="btn-trash" onclick="deleteDeck('${name}')">🗑️</button>`;
        div.innerHTML = `<div><div class="lib-name">${name}</div><div class="lib-count">${deckLibrary[name].length} items</div></div><div><button class="btn-load" onclick="loadDeck('${name}')">LOAD</button>${delBtn}</div>`;
        container.appendChild(div);
    });
}

function saveCurrentDeck() {
    if(currentDeck.length < 1) return alert("Empty!");
    const name = prompt("Deck Name:");
    if(name) { deckLibrary[name] = [...currentDeck]; saveLibrary(); alert(`Saved "${name}"`); }
}
function loadDeck(name) { if(confirm(`Load "${name}"?`)) { currentDeck = [...deckLibrary[name]]; saveActive(); } }
function deleteDeck(name) { if(confirm(`Delete "${name}"?`)) { delete deckLibrary[name]; saveLibrary(); } }

function addNewAnimal() {
    const n = document.getElementById('new-name').value.trim().toLowerCase();
    const i = document.getElementById('new-emoji').value.trim();
    if(!n||!i) return alert("Select Emoji & Name");
    currentDeck.push({ id: Date.now(), name: n, icon: i, trigger: n });
    document.getElementById('new-name').value = '';
    saveActive();
}
function deleteAnimal(id) { currentDeck = currentDeck.filter(a => a.id !== id); saveActive(); }

// ==========================================
// 5. EMOJI PICKER
// ==========================================
function initEmojiPicker() {
    const c = document.getElementById('emoji-content');
    let h = '';
    for(const [cat, list] of Object.entries(emojis)) {
        h+=`<div class="category-title">${cat}</div><div class="emoji-grid">`;
        list.forEach(x=>{h+=`<button class="emoji-btn" onclick="selectEmoji('${x}')">${x}</button>`});
        h+='</div>';
    }
    c.innerHTML = h;
}
function openEmojiPicker() { document.getElementById('emoji-modal').style.display = 'flex'; }
function togglePicker(s) { document.getElementById('emoji-modal').style.display = s?'flex':'none'; }
function closeEmojiPicker(e) { if(e.target.id === 'emoji-modal') togglePicker(false); }
function selectEmoji(c) { document.getElementById('new-emoji').value = c; togglePicker(false); document.getElementById('new-name').focus(); }

// ==========================================
// 6. SPEECH API
// ==========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRec = false;

if(SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { isRec = true; document.getElementById('mic-led').classList.add('on'); };
    recognition.onend = () => {
        isRec = false; 
        document.getElementById('mic-led').classList.remove('on');
        if(isPlaying) { try { recognition.start(); } catch(e) {} }
    };
    recognition.onresult = (event) => {
        const t = event.results[0][0].transcript.trim().toLowerCase();
        if(trainingId) finalizeTraining(t);
        else if(isPlaying) {
             document.getElementById('status-text').innerText = `Heard: "${t}"`;
             checkAnswer(t);
        }
    };
} else { alert("Use Safari (iOS) or Chrome"); }

function trainVoice(id) {
    if(!recognition) return;
    isPlaying = false;
    if(isRec) recognition.abort();
    trainingId = id;
    const btn = document.getElementById(`btn-${id}`);
    btn.innerHTML = "Say it..."; btn.classList.add('recording');
    setTimeout(() => { try{recognition.start()}catch(e){} }, 100);
}
function finalizeTraining(text) {
    if(!trainingId) return;
    const item = currentDeck.find(a => a.id === trainingId);
    if(item) {
        item.trigger = text;
        saveActive();
        const btn = document.getElementById(`btn-${trainingId}`);
        if(btn) { btn.innerHTML = "✔"; btn.classList.remove('recording'); setTimeout(()=> btn.innerHTML="REC", 1500); }
    }
    trainingId = null; recognition.abort(); 
}

// ==========================================
// 7. GAME ENGINE (TOURNAMENT MODE)
// ==========================================
const MAX_STUDENTS = 5;
const CARDS_PER_PLAYER = 8;
const TIME_LIMIT = 25; 
const TOTAL_TOURNAMENTS = 3; // Number of rounds in tournament

let currentStudentIndex = 0;
let currentTournament = 1; 

let roundScores = []; // Scores for current round only
let totalScores = [0, 0, 0, 0, 0]; // Cumulative scores for all students

let gridData = []; 
let activeIndex = 0; 
let isPlaying = false;
let isPractice = false; 
let timerInterval;
let roundStartTime = 0;

function goToGame() {
    if(currentDeck.length < 2) return alert("List too short (Need 2+)");
    
    // Reset Tournament
    currentStudentIndex = 0;
    currentTournament = 1;
    roundScores = [];
    totalScores = [0, 0, 0, 0, 0]; // Reset totals
    
    document.getElementById('screen-setup').classList.remove('active');
    document.getElementById('screen-game').classList.add('active');
    if(isRec) recognition.abort();
    
    showIntermission();
}

function goToSetup() {
    isPlaying = false; isPractice = false; clearInterval(timerInterval);
    if(isRec) recognition.abort();
    document.getElementById('screen-game').classList.remove('active');
    document.getElementById('screen-setup').classList.add('active');
}

// STEP 1: PREVIEW MODE
function startNextPlayer() {
    document.getElementById('overlay').style.display = 'none';
    
    // Update Tournament Header
    document.getElementById('tournament-display').innerText = `🏆 Match ${currentTournament}/${TOTAL_TOURNAMENTS}`;
    
    // Randomize for this student
    gridData = [];
    for(let i=0; i<CARDS_PER_PLAYER; i++) gridData.push(currentDeck[Math.floor(Math.random() * currentDeck.length)]);
    
    renderGrid();
    isPractice = true; isPlaying = true;
    
    document.getElementById('player-display').innerText = `Student ${currentStudentIndex + 1} (Practice)`;
    document.getElementById('status-text').innerText = "PRACTICE: Check Mic!";
    document.getElementById('btn-start-round').style.display = 'block'; 
    document.getElementById('timer-bar').style.width = '100%';
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));

    try { recognition.start(); } catch(e) {}
}

// STEP 2: RANKED MODE
function beginRankedRound() {
    isPractice = false;
    document.getElementById('player-display').innerText = `Student ${currentStudentIndex + 1} (GO!)`;
    document.getElementById('btn-start-round').style.display = 'none'; 
    document.getElementById('status-text').innerText = "Say the GLOWING card!";
    renderGrid(); 
    activeIndex = 0; highlightCard(0); startTimer();
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    gridData.forEach((anim, idx) => {
        const card = document.createElement('div');
        card.className = 'card'; card.id = `card-${idx}`; card.innerHTML = anim.icon;
        grid.appendChild(card);
    });
}
function highlightCard(idx) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    if(idx < CARDS_PER_PLAYER) document.getElementById(`card-${idx}`).classList.add('active');
}

function checkAnswer(spoken) {
    if (isPractice) {
        gridData.forEach((item, index) => {
            if (spoken.includes(item.trigger)) {
                const card = document.getElementById(`card-${index}`);
                card.classList.add('practice-success');
                setTimeout(() => card.classList.remove('practice-success'), 1000);
            }
        });
        return; 
    }
    const target = gridData[activeIndex];
    if(spoken.includes(target.trigger)) {
        const card = document.getElementById(`card-${activeIndex}`);
        card.classList.remove('active'); card.classList.add('done'); card.style.backgroundColor = '#dff9fb';
        activeIndex++;
        if(activeIndex >= CARDS_PER_PLAYER) turnFinished(true); else highlightCard(activeIndex);
    }
}

function turnFinished(completed) {
    isPlaying = false; isPractice = false; recognition.abort(); clearInterval(timerInterval);
    
    // Calculate Score
    let score = 0;
    if (completed) {
        let timeUsed = (Date.now() - roundStartTime) / 1000;
        let timeLeft = Math.max(0, TIME_LIMIT - timeUsed);
        score = Math.floor((timeLeft / TIME_LIMIT) * 1000);
    }
    
    // Add to lists
    roundScores.push(score);
    totalScores[currentStudentIndex] += score; // Cumulative score
    
    currentStudentIndex++;

    if(currentStudentIndex >= MAX_STUDENTS) {
        // End of a Tournament Round
        if (currentTournament < TOTAL_TOURNAMENTS) {
            showTournamentResults(); // Show partial results, move to next tourney
        } else {
            showGrandFinalResults(); // All 3 done
        }
    } else {
        showIntermission();
    }
}

function startTimer() {
    clearInterval(timerInterval);
    const bar = document.getElementById('timer-bar');
    roundStartTime = Date.now();
    timerInterval = setInterval(() => {
        if(!isPlaying || isPractice) return; 
        let pct = 1 - ((Date.now() - roundStartTime) / 1000 / TIME_LIMIT);
        bar.style.transform = `scaleX(${pct})`;
        if(pct <= 0) turnFinished(false);
    }, 50);
}

// ==========================================
// 8. OVERLAYS (TOURNAMENT LOGIC)
// ==========================================

function showIntermission() {
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('overlay-title');
    const sub = document.getElementById('overlay-sub');
    const btn = document.getElementById('overlay-btn');
    document.getElementById('score-list').style.display = 'none';
    
    if(currentStudentIndex === 0 && currentTournament === 1) { 
        title.innerText = "STUDENT 1"; sub.innerText = "Get Ready!"; btn.innerText = "START"; 
    } else { 
        title.innerText = `STUDENT ${currentStudentIndex} DONE`; 
        sub.innerText = `Pass to Student ${currentStudentIndex + 1}`; 
        btn.innerText = `I AM STUDENT ${currentStudentIndex + 1}`; 
        
        // Show button specific to logic
        btn.onclick = startNextPlayer;
    }
    overlay.style.display = 'flex';
}

function showTournamentResults() {
    // End of Match 1 or 2
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('overlay-title');
    const sub = document.getElementById('overlay-sub');
    const btn = document.getElementById('overlay-btn');
    const list = document.getElementById('score-list');

    title.innerText = `MATCH ${currentTournament} FINISHED!`; 
    sub.innerText = "Current Standings (Total Points)"; 
    btn.innerText = `START MATCH ${currentTournament + 1}`;
    
    // Generate Table based on TOTAL scores
    let html = `<div class="score-row header-row"><span>Student</span><span>Total</span></div>`;
    let max = Math.max(...totalScores);
    
    totalScores.forEach((score, index) => {
        let style = (score === max && score > 0) ? "color:green; font-weight:bold;" : "";
        let icon = (score === max && score > 0) ? "⭐" : "";
        html += `<div class="score-row" style="${style}"><span>Student ${index + 1} ${icon}</span><span>${score} pts</span></div>`;
    });

    list.innerHTML = html; 
    list.style.display = 'block';
    
    btn.onclick = function() {
        // Setup next tournament
        currentTournament++;
        currentStudentIndex = 0;
        roundScores = []; // Reset round scores, but keep totalScores
        startNextPlayer(); // Immediately start Student 1 for next round
    };
    overlay.style.display = 'flex';
}

function showGrandFinalResults() {
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('overlay-title');
    const sub = document.getElementById('overlay-sub');
    const btn = document.getElementById('overlay-btn');
    const list = document.getElementById('score-list');

    title.innerText = "GRAND CHAMPION! 🏆"; 
    sub.innerText = "Final Total Scores (3 Matches)"; 
    btn.innerText = "EXIT CLASS";
    
    let html = `<div class="score-row header-row"><span>Student</span><span>Grand Total</span></div>`;
    let max = Math.max(...totalScores);
    
    totalScores.forEach((score, index) => {
        let style = (score === max && score > 0) ? "color:green; font-weight:bold;" : "";
        let icon = (score === max && score > 0) ? "👑" : "";
        html += `<div class="score-row" style="${style}"><span>Student ${index + 1} ${icon}</span><span>${score} pts</span></div>`;
    });

    list.innerHTML = html; 
    list.style.display = 'block';
    
    btn.onclick = function() { document.getElementById('overlay').style.display = 'none'; goToSetup(); };
    overlay.style.display = 'flex';
}

initData();