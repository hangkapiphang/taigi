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
// 4. NETWORKING (PEERJS)
// ==========================================

// --- HOST (iPad) ---
function startHost() {
    myRoomId = generateRoomCode();
    peer = new Peer("vr-" + myRoomId);
    peer.on('open', id => { 
        document.getElementById('my-room-code').innerText = myRoomId; 
        switchScreen('screen-setup'); 
    });
    peer.on('connection', c => {
        conn = c;
        document.getElementById('connection-status').innerText = "✅ Connected!";
        conn.on('data', d => handleRemoteCommand(d));
    });
}

// --- REMOTE (iPhone) ---
// *** THIS WAS THE MISSING FUNCTION ***
function showJoinMenu() {
    document.querySelector('.lobby-buttons').style.display = 'none';
    document.getElementById('join-menu').style.display = 'block';
}

function connectToHost() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if(code.length !== 4) return alert("Invalid Code");
    
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect("vr-" + code);
        
        conn.on('open', () => { 
            switchScreen('screen-remote'); 
            
            // Listen for data from Host
            conn.on('data', d => {
                if(d.type === 'update_card') {
                    document.getElementById('remote-target-icon').innerText = d.icon;
                    document.getElementById('remote-target-name').innerText = d.name;
                } else if(d.type === 'score_update') {
                    document.getElementById('remote-score-display').innerText = d.score;
                } else if(d.type === 'game_status') {
                    document.getElementById('remote-target-name').innerText = d.msg;
                    document.getElementById('remote-target-icon').innerText = "ℹ️";
                }
            });
        });
        
        peer.on('call', call => {
            call.answer();
            call.on('stream', s => { 
                const aud = document.getElementById('remote-audio'); 
                aud.srcObject = s; 
                aud.play().catch(e=>console.log("Audio needs click"));
 