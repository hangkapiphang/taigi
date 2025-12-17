// ==========================================
// 1. CONFIGURATION
// ==========================================
const ACTIVE_KEY = 'vr_arcade_active_v2';
const LIBRARY_KEY = 'vr_arcade_lib_v2';
const LEADERBOARD_KEY = 'vr_arcade_lb_v2';

function generateRoomCode() {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = ""; for(let i=0; i<4; i++) r += c.charAt(Math.floor(Math.random() * c.length));
    return r;
}

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

const defaultData = [{ id: 1, name: 'dog', icon: '🐶' }, { id: 2, name: 'cat', icon: '🐱' }];

let currentDeck = [];
let deckLibrary = {};
let leaderboards = { individual: [], team: [] };
let currentLanguage = 'en'; 
let gameMode = 'individual'; 

let peer = null, conn = null, myRoomId = "", localStream = null;
let mediaRecorder = null, audioChunks = [];

// ==========================================
// 2. INIT
// ==========================================
async function initData() {
    const sA = localStorage.getItem(ACTIVE_KEY);
    currentDeck = sA ? JSON.parse(sA) : [...defaultData];
    const sL = localStorage.getItem(LIBRARY_KEY);
    deckLibrary = sL ? JSON.parse(sL) : {};
    const sLB = localStorage.getItem(LEADERBOARD_KEY);
    leaderboards = sLB ? JSON.parse(sLB) : { individual: [], team: [] };

    try {
        const resp = await fetch('class_data.json');
        if (resp.ok) {
            const sd = await resp.json();
            for (const [n, c] of Object.entries(sd)) deckLibrary["⭐ " + n] = c;
        }
    } catch (e) {}
    
    renderActiveList();
    renderLibrary();
    initEmojiPicker();
}

function saveActive() { localStorage.setItem(ACTIVE_KEY, JSON.stringify(currentDeck)); renderActiveList(); }
function saveLibrary() { localStorage.setItem(LIBRARY_KEY, JSON.stringify(deckLibrary)); renderLibrary(); }
function saveLeaderboard() { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboards)); }

// ==========================================
// 3. UI LOGIC 
// ==========================================
function setGameMode(mode) {
    gameMode = mode;
    document.getElementById('mode-ind').classList.toggle('active', mode === 'individual');
    document.getElementById('mode-team').classList.toggle('active', mode === 'team');
}

function setLanguage(lang) {
    currentLanguage = lang;
    document.getElementById('btn-lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-lang-tw').classList.toggle('active', lang === 'tw');
    renderActiveList();
}

// ==========================================
// 4. GAME ENGINE
// ==========================================
const ROUND_CONFIG = [
    { time: 80, label: "Round 1 (10s/card)" },
    { time: 56, label: "Round 2 (7s/card)" },
    { time: 32, label: "Round 3 (4s/card)" }
];
const CARDS_PER_ROUND = 8;

let currentPlayerName = "";
let currentRoundIdx = 0; 
let sessionScore = 0;
let gridData = [], activeIndex = 0;
let isPlaying = false, isPractice = false;
let timerInterval, roundStartTime = 0;

function prepareGame() {
    if(currentDeck.length < 2) return alert("Add at least 2 cards!");
    document.getElementById('player-name-input').value = "";
    document.getElementById('name-prompt').innerText = gameMode === 'individual' ? "Enter Student Name:" : "Enter Team Name:";
    document.getElementById('overlay-name').style.display = 'flex';
}

function confirmName() {
    const name = document.getElementById('player-name-input').value.trim();
    if(!name) return alert("Name required!");
    currentPlayerName = name;
    document.getElementById('overlay-name').style.display = 'none';
    
    currentRoundIdx = 0;
    sessionScore = 0;
    
    document.getElementById('screen-setup').classList.remove('active');
    document.getElementById('screen-game').classList.add('active');
    
    if(!localStream && peer) navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { localStream = s; if(conn) peer.call(conn.peer, s); });

    showIntermission();
}

function showIntermission() {
    const overlay = document.getElementById('overlay-intermission');
    const title = document.getElementById('inter-title');
    const sub = document.getElementById('inter-sub');
    const btn = document.getElementById('inter-btn');
    document.getElementById('round-scores').style.display = 'none';

    let rLabel = ROUND_CONFIG[currentRoundIdx].label;
    
    if (gameMode === 'individual') {
        title.innerText = `${currentPlayerName}`;
        sub.innerText = `Get Ready for ${rLabel}`;
    } else {
        title.innerText = `TEAM: ${currentPlayerName}`;
        sub.innerText = `Member ${currentRoundIdx + 1}, Get Ready! (${rLabel})`;
    }
    
    btn.innerText = "START PRACTICE";
    btn.onclick = startPractice;
    
    syncToRemote('status', `Setup: ${rLabel}`);
    overlay.style.display = 'flex';
}

function startPractice() {
    document.getElementById('overlay-intermission').style.display = 'none';
    gridData = [];
    for(let i=0; i<CARDS_PER_ROUND; i++) gridData.push(currentDeck[Math.floor(Math.random() * currentDeck.length)]);
    renderGrid();
    
    isPractice = true; isPlaying = false;
    
    let label = gameMode === 'individual' ? currentPlayerName : `${currentPlayerName} (P${currentRoundIdx+1})`;
    document.getElementById('player-display').innerText = label;
    document.getElementById('round-display').innerText = `R${currentRoundIdx+1}`;
    document.getElementById('status-text').innerText = "Practice Mode: Check Mic";
    
    document.getElementById('btn-start-round').style.display = 'block';
    document.getElementById('timer-bar').style.width = '100%';
    
    syncToRemote('status', "Practice Mode");
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
}

function beginRankedRound() {
    isPractice = false; isPlaying = true;
    document.getElementById('btn-start-round').style.display = 'none';
    document.getElementById('status-text').innerText = "Game On!";
    
    renderGrid(); 
    activeIndex = 0; highlightCard(0); startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    const timeLimit = ROUND_CONFIG[currentRoundIdx].time;
    roundStartTime = Date.now();
    
    timerInterval = setInterval(() => {
        if(!isPlaying) return;
        let elapsed = (Date.now() - roundStartTime) / 1000;
        let pct = 1 - (elapsed / timeLimit);
        document.getElementById('timer-bar').style.transform = `scaleX(${pct})`;
        if(pct <= 0) turnFinished(false);
    }, 50);
}

function turnFinished(completed) {
    isPlaying = false; clearInterval(timerInterval);
    
    let points = 0;
    const timeLimit = ROUND_CONFIG[currentRoundIdx].time;
    
    if (completed) {
        let timeUsed = (Date.now() - roundStartTime) / 1000;
        let timeLeft = Math.max(0, timeLimit - timeUsed);
        points = Math.floor(500 + (timeLeft / timeLimit) * 500);
    }
    
    sessionScore += points;
    syncToRemote('score', sessionScore);
    
    currentRoundIdx++;
    
    if (currentRoundIdx >= 3) {
        finishGame();
    } else {
        showIntermission();
    }
}

function finishGame() {
    leaderboards[gameMode].push({ name: currentPlayerName, score: sessionScore, date: new Date().toLocaleDateString() });
    leaderboards[gameMode].sort((a,b) => b.score - a.score); 
    saveLeaderboard();
    
    renderLeaderboard(gameMode);
    switchScreen('screen-leaderboard');
}

// ==========================================
// 5. LEADERBOARD & EXPORT
// ==========================================
function renderLeaderboard(mode) {
    const list = document.getElementById('leaderboard-content');
    list.innerHTML = "";
    const data = leaderboards[mode];
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(mode === 'individual') document.querySelector('.tab-btn:first-child').classList.add('active');
    else document.querySelector('.tab-btn:last-child').classList.add('active');

    if(data.length === 0) { list.innerHTML = "<div style='text-align:center; padding:20px;'>No records yet.</div>"; return; }

    data.forEach((entry, i) => {
        let medal = "";
        if(i===0) medal = "🥇"; else if(i===1) medal = "🥈"; else if(i===2) medal = "🥉";
        const row = document.createElement('div');
        row.className = 'lb-item';
        row.innerHTML = `<div class="lb-rank">${i+1} ${medal}</div><div class="lb-name">${entry.name}</div><div class="lb-score">${entry.score}</div>`;
        list.appendChild(row);
    });
}

function clearLeaderboard() {
    if(confirm("Clear all scores?")) {
        leaderboards = { individual: [], team: [] };
        saveLeaderboard();
        renderLeaderboard('individual');
    }
}

// NEW: Export Function
function exportLeaderboard() {
    const dataStr = JSON.stringify(leaderboards, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_rush_scores_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ==========================================
// 6. SHARED UTILS (Network, TTS, Etc)
// ==========================================
function renderGrid() {
    const g = document.getElementById('grid'); g.innerHTML = '';
    gridData.forEach((d, i) => {
        const c = document.createElement('div');
        c.className = 'card'; c.id = `card-${i}`; c.innerHTML = d.icon;
        c.onclick = () => { if(isPractice) { speak(d); c.style.transform="scale(0.9)"; setTimeout(()=>c.style.transform="scale(1)",150); } };
        g.appendChild(c);
    });
}
function highlightCard(i) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    if(i < CARDS_PER_ROUND) {
        document.getElementById(`card-${i}`).classList.add('active');
        syncToRemote('card', gridData[i]);
    }
}
function advanceGame(isCorrect) {
    if(!isPlaying) return;
    if(isCorrect) {
        const c = document.getElementById(`card-${activeIndex}`);
        c.classList.remove('active'); c.classList.add('done'); c.style.backgroundColor='#dff9fb';
        activeIndex++;
        if(activeIndex >= CARDS_PER_ROUND) turnFinished(true); else highlightCard(activeIndex);
    }
}
function shakeCard() {
    if(!isPlaying) return;
    const c = document.getElementById(`card-${activeIndex}`);
    c.classList.add('shake'); setTimeout(()=>c.classList.remove('shake'),400);
}

// NETWORKING
function startHost() {
    myRoomId = generateRoomCode();
    peer = new Peer("vr-" + myRoomId);
    peer.on('open', id => { document.getElementById('my-room-code').innerText = myRoomId; switchScreen('screen-setup'); });
    peer.on('connection', c => { conn = c; document.getElementById('connection-status').innerText = "✅ Connected!"; conn.on('data', d => handleRemoteCommand(d)); });
}
function connectToHost() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if(code.length !== 4) return alert("Invalid Code");
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect("vr-" + code);
        conn.on('open', () => { switchScreen('screen-remote'); conn.on('data', d => {
                if(d.type === 'update_card') { document.getElementById('remote-target-icon').innerText = d.icon; document.getElementById('remote-target-name').innerText = d.name; } 
                else if(d.type === 'score_update') { document.getElementById('remote-score-display').innerText = d.score; }
            });
        });
        peer.on('call', call => { call.answer(); call.on('stream', s => { const aud = document.getElementById('remote-audio'); aud.srcObject = s; aud.play().catch(e=>console.log("Audio")); }); });
    });
}
function handleRemoteCommand(cmd) {
    if(cmd === 'correct') advanceGame(true);
    else if(cmd === 'wrong') shakeCard();
    else if(cmd === 'start_timer') beginRankedRound();
    else if(cmd === 'next_round') startPractice();
}
function syncToRemote(type, data) { if(conn && conn.open) { if(type === 'card') conn.send({type:'update_card', icon:data.icon, name:data.name}); if(type === 'score') conn.send({type:'score_update', score:data}); } }
function sendCmd(cmd) { if(conn && conn.open) conn.send(cmd); }

// AUDIO & LIST MANAGEMENT
function speak(item) {
    if(currentLanguage === 'en') { const u = new SpeechSynthesisUtterance(item.name); u.lang='en-US'; window.speechSynthesis.speak(u); } 
    else { if(item.audio) new Audio(item.audio).play(); }
}
function switchScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function goToSetup() { isPlaying=false; switchScreen('screen-setup'); }

function renderActiveList() {
    const c = document.getElementById('list-container'); c.innerHTML=currentDeck.length?'':'<div style="text-align:center;padding:10px;color:#999;">Empty</div>';
    currentDeck.forEach(a => {
        const d = document.createElement('div'); d.className = `animal-item ${a.audio?'has-audio':''}`;
        let mic = currentLanguage==='tw' ? (a.audio ? `<button class="btn-rec" onclick="clearRecording(${a.id})">✖ Audio</button>` : `<button class="btn-rec" id="btn-rec-${a.id}" onclick="startRecording(${a.id})">🎤</button>`) : '';
        d.innerHTML = `<div class="animal-info"><div class="animal-icon">${a.icon}</div><div><div class="animal-name">${a.name}</div></div></div><div class="item-actions">${mic}<button class="btn-del" onclick="deleteAnimal(${a.id})">✖</button></div>`;
        c.appendChild(d);
    });
}
function renderLibrary() {
    const c = document.getElementById('library-container'); const k = Object.keys(deckLibrary); c.innerHTML = k.length?'':'<div style="text-align:center;padding:10px;color:#999;">No decks</div>';
    k.forEach(n => {
        const d = document.createElement('div'); d.className='library-item';
        d.innerHTML = `<div><div class="lib-name">${n}</div><div class="lib-count">${deckLibrary[n].length} items</div></div><div><button class="btn-load" onclick="loadDeck('${n}')">LOAD</button><button class="btn-trash" onclick="deleteDeck('${n}')">🗑️</button></div>`;
        c.appendChild(d);
    });
}
function saveCurrentDeck(){ const n=prompt("Name:"); if(n){ deckLibrary[n]=[...currentDeck]; saveLibrary(); }}
function loadDeck(n){ if(confirm("Load?")) { currentDeck=[...deckLibrary[n]]; saveActive(); }}
function deleteDeck(n){ if(confirm("Delete?")) { delete deckLibrary[n]; saveLibrary(); }}
function addNewAnimal(){ const n=document.getElementById('new-name').value; const i=document.getElementById('new-emoji').value; if(n&&i){ currentDeck.push({id:Date.now(),name:n,icon:i}); saveActive(); document.getElementById('new-name').value=''; }}
function deleteAnimal(id){ currentDeck=currentDeck.filter(a=>a.id!==id); saveActive(); }
async function startRecording(id){ const s = await navigator.mediaDevices.getUserMedia({audio:true}); mediaRecorder = new MediaRecorder(s); audioChunks=[]; mediaRecorder.ondataavailable=e=>audioChunks.push(e.data); mediaRecorder.onstop=()=>{ const r=new FileReader(); r.readAsDataURL(new Blob(audioChunks)); r.onloadend=()=>{ const it=currentDeck.find(x=>x.id===id); if(it){ it.audio=r.result; saveActive(); } }; s.getTracks().forEach(t=>t.stop()); }; mediaRecorder.start(); document.getElementById(`btn-rec-${id}`).innerHTML="⏹"; document.getElementById(`btn-rec-${id}`).onclick=()=>mediaRecorder.stop(); }
function clearRecording(id){ if(confirm("Delete?")){ const it=currentDeck.find(x=>x.id===id); if(it){ delete it.audio; saveActive(); }}}
function initEmojiPicker(){ const c=document.getElementById('emoji-content'); let h=''; for(const [k,l] of Object.entries(emojis)){ h+=`<div class="category-title">${k}</div><div class="emoji-grid">`; l.forEach(x=>h+=`<button class="emoji-btn" onclick="selectEmoji('${x}')">${x}</button>`); h+='</div>'; } c.innerHTML=h; }
function openEmojiPicker(){ document.getElementById('emoji-modal').style.display='flex'; }
function closeEmojiPicker(e){ if(e.target.id==='emoji-modal') document.getElementById('emoji-modal').style.display='none'; }
function togglePicker(s){ document.getElementById('emoji-modal').style.display=s?'flex':'none'; }
function selectEmoji(c){ document.getElementById('new-emoji').value=c; togglePicker(false); }
function exportData() { const s = JSON.stringify(currentDeck); const b = new Blob([s],{type:"application/json"}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download="deck.json"; a.click(); }
function triggerImport() { document.getElementById('file-input').click(); }
function importData(i) { const f = i.files[0]; const r = new FileReader(); r.onload = e => { currentDeck = JSON.parse(e.target.result); saveActive(); }; r.readAsText(f); }

initData();
