// --- CONFIG ---
const user = localStorage.getItem('gh_user');
const repo = localStorage.getItem('gh_repo');
const token = localStorage.getItem('gh_token');
const BRANCH = 'main'; // Usually 'main' for Voice Rush, change to 'gh-pages' if needed
const FILE = 'class_data.json';

let fullData = {}; // Stores { "Week 1": [...], "Week 2": [...] }
let activeDeckName = null;
let currentSHA = null;

// --- 1. INITIALIZE ---
window.onload = async function() {
    if(!user || !repo || !token) {
        log("❌ Credentials missing. Go to Generator to set them.", "err");
        return;
    }
    
    document.getElementById('repo-status').innerText = `🔵 Connecting to ${user}/${repo}...`;
    await loadFile();
};

async function loadFile() {
    // Timestamp prevents caching
    const url = `https://api.github.com/repos/${user}/${repo}/contents/${FILE}?ref=${BRANCH}&t=${Date.now()}`;
    
    try {
        const req = await fetch(url, { headers: { Authorization: `token ${token}` } });
        
        if(req.status === 404) {
            log("⚠️ class_data.json not found. Creating new.", "warn");
            fullData = {};
            currentSHA = null;
        } else if(req.ok) {
            const data = await req.json();
            currentSHA = data.sha;
            // UTF-8 Safe Decode
            fullData = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            document.getElementById('repo-status').innerText = `🟢 Connected`;
            document.getElementById('repo-status').style.color = "#2ecc71";
            log("✅ Data Loaded Successfully", "ok");
        } else {
            throw new Error(`GitHub API Error: ${req.status}`);
        }
        
        renderDecks();
    } catch(e) {
        log(`❌ Error: ${e.message}`, "err");
    }
}

// --- 2. RENDER LOGIC ---
function renderDecks() {
    const list = document.getElementById('deck-list');
    list.innerHTML = "";
    
    Object.keys(fullData).forEach(key => {
        const div = document.createElement('div');
        div.className = `deck-item ${key === activeDeckName ? 'active' : ''}`;
        div.innerHTML = `
            <span onclick="selectDeck('${key}')">${key}</span>
            <button class="btn-del-mini" onclick="deleteDeck('${key}')">×</button>
        `;
        list.appendChild(div);
    });
}

function selectDeck(key) {
    activeDeckName = key;
    document.getElementById('current-deck-title').innerText = key;
    document.getElementById('empty-msg').style.display = 'none';
    document.getElementById('btn-add-card').style.display = 'block';
    renderDecks(); // Refresh highlight
    renderCards();
}

function renderCards() {
    const list = document.getElementById('card-list');
    list.innerHTML = "";
    const cards = fullData[activeDeckName] || [];

    cards.forEach((card, index) => {
        const div = document.createElement('div');
        div.className = 'card-row';
        div.innerHTML = `
            <input type="text" class="inp-icon" value="${card.icon}" onchange="updateCard(${index}, 'icon', this.value)" placeholder="🦁">
            <input type="text" class="inp-name" value="${card.name}" onchange="updateCard(${index}, 'name', this.value)" placeholder="Name">
            <button class="btn-del-mini" onclick="deleteCard(${index})">×</button>
        `;
        list.appendChild(div);
    });
}

// --- 3. EDIT ACTIONS ---
function updateCard(index, field, value) {
    fullData[activeDeckName][index][field] = value;
}

function addNewDeck() {
    const name = prompt("Enter new Deck Name (e.g. 'Week 5: Space')");
    if(name && !fullData[name]) {
        fullData[name] = [];
        selectDeck(name);
    } else if (fullData[name]) {
        alert("Deck already exists!");
    }
}

function deleteDeck(key) {
    if(confirm(`Delete entire deck "${key}"?`)) {
        delete fullData[key];
        if(activeDeckName === key) {
            activeDeckName = null;
            document.getElementById('card-list').innerHTML = "";
            document.getElementById('current-deck-title').innerText = "Select a Deck";
            document.getElementById('empty-msg').style.display = 'block';
            document.getElementById('btn-add-card').style.display = 'none';
        }
        renderDecks();
    }
}

function addCard() {
    if(!activeDeckName) return;
    fullData[activeDeckName].push({ id: Date.now(), name: "", icon: "❓" });
    renderCards();
    // Scroll to bottom
    const list = document.getElementById('card-list');
    list.scrollTop = list.scrollHeight;
}

function deleteCard(index) {
    fullData[activeDeckName].splice(index, 1);
    renderCards();
}

// --- 4. CLOUD SAVE ---
async function saveToGitHub() {
    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Saving...";
    btn.disabled = true;

    try {
        // 1. Get latest SHA to prevent conflicts
        const shaReq = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${FILE}?ref=${BRANCH}`, { headers: { Authorization: `token ${token}` } });
        if(shaReq.ok) {
            const shaData = await shaReq.json();
            currentSHA = shaData.sha;
        }

        // 2. Prepare Payload (UTF-8 Safe)
        const contentString = JSON.stringify(fullData, null, 2);
        const contentEncoded = btoa(unescape(encodeURIComponent(contentString)));

        const body = {
            message: "Update class_data via Cloud Editor",
            content: contentEncoded,
            branch: BRANCH,
            sha: currentSHA
        };

        // 3. Send Request
        const req = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${FILE}`, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if(req.ok) {
            const res = await req.json();
            currentSHA = res.content.sha;
            log("✅ Saved to GitHub!", "ok");
            setTimeout(() => log("", "clear"), 3000);
        } else {
            throw new Error("Save Failed");
        }
    } catch(e) {
        log(`❌ Save Error: ${e.message}`, "err");
        alert("Failed to save. Check console/logs.");
    }

    btn.innerText = originalText;
    btn.disabled = false;
}

// --- UTILS ---
function log(msg, type) {
    const div = document.getElementById('logs');
    if(type === "clear") { div.innerHTML = ""; return; }
    div.innerHTML = `<div class="${type}">${msg}</div>`;
}
