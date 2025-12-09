// --- CONFIG ---
const user = localStorage.getItem('gh_user');
const repo = localStorage.getItem('gh_repo');
const token = localStorage.getItem('gh_token');
const BRANCH = 'gh-pages';
const FILE = 'data/library.json';

let libraryData = [];
let currentSHA = null;

// --- 1. STARTUP CHECK ---
window.onload = async function() {
    if(!user || !repo || !token) {
        log("❌ Credentials missing.", "err");
        const resetBtn = document.getElementById('btn-reset');
        resetBtn.style.display = 'inline-block';
        resetBtn.innerText = "Go to Generator";
        return;
    }

    log(`connecting to ${user}/${repo}...`, "ok");

    try {
        // STEP 1: Check Token
        const uReq = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
        if(!uReq.ok) throw new Error("Invalid Token.");
        log("✅ Token Valid", "ok");

        // STEP 2: Check Repo
        const rReq = await fetch(`https://api.github.com/repos/${user}/${repo}`, { headers: { Authorization: `token ${token}` } });
        if(!rReq.ok) throw new Error("Repository not found.");
        log("✅ Repository Found", "ok");

        // STEP 3: Check Branch List (SAFE METHOD)
        // We list branches instead of fetching the file directly to avoid "Load failed" crashes
        const bReq = await fetch(`https://api.github.com/repos/${user}/${repo}/branches`, { headers: { Authorization: `token ${token}` } });
        const branches = await bReq.json();
        const branchExists = branches.some(b => b.name === BRANCH);

        if(!branchExists) {
            log(`⚠️ Branch '${BRANCH}' does not exist.`, "err");
            document.getElementById('btn-create-branch').style.display = 'block';
            return; // STOP HERE if branch missing
        }
        log(`✅ Branch '${BRANCH}' found`, "ok");

        // STEP 4: Load File
        loadFile();

    } catch(e) {
        log(`❌ Error: ${e.message}`, "err");
        if(e.message === "Load failed" || e.message === "Failed to fetch") {
            log("💡 Hint: This usually means an AdBlocker is blocking GitHub, or the repo is empty.", "warn");
        }
    }
};

// --- 2. LOGIC ---
function log(msg, type) {
    const div = document.getElementById('logs');
    div.innerHTML += `<div class="log-line ${type}">${msg}</div>`;
}

async function createBranch() {
    const btn = document.getElementById('btn-create-branch');
    btn.innerText = "Creating...";
    try {
        // Get main SHA
        const m = await fetch(`https://api.github.com/repos/${user}/${repo}/git/ref/heads/main`, { headers: { Authorization: `token ${token}` } });
        const md = await m.json();
        // Create Branch
        const c = await fetch(`https://api.github.com/repos/${user}/${repo}/git/refs`, {
            method: 'POST',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: md.object.sha })
        });
        if(c.ok) {
            alert("Branch Created! Page will reload.");
            window.location.reload();
        } else { throw new Error("Could not create branch."); }
    } catch(e) { alert("Error: " + e.message); }
}

async function loadFile() {
    // NOTE: Removed 'Cache-Control' header to fix CORS 'Load failed' error
    // Added timestamp to prevent browser caching
    const url = `https://api.github.com/repos/${user}/${repo}/contents/${FILE}?ref=${BRANCH}&t=${Date.now()}`;
    try {
        const req = await fetch(url, { headers: { Authorization: `token ${token}` } });
        if(req.status === 404) {
            log("ℹ️ File not found. Starting New.", "warn");
            libraryData = [];
            currentSHA = null;
        } else if(req.ok) {
            const data = await req.json();
            currentSHA = data.sha;
            // Decode with UTF-8 support
            libraryData = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            log(`✅ Loaded ${libraryData.length} movies.`, "ok");
        }
        
        document.getElementById('editor-ui').style.display = 'block';
        render();
    } catch(e) {
        log(`❌ File Load Error: ${e.message}`, "err");
    }
}

// --- 3. EDITOR ---
function render() {
    const list = document.getElementById('list-area');
    list.innerHTML = "";
    libraryData.forEach((item, i) => {
        list.innerHTML += `
            <div class="card">
                <img src="https://img.youtube.com/vi/${item.yt}/hqdefault.jpg" class="thumb" onerror="this.src='https://via.placeholder.com/120x68?text=Error'">
                <div class="inputs">
                    <input value="${item.title}" onchange="up(${i}, 'title', this.value)" placeholder="Title">
                    <input value="${item.yt}" onchange="up(${i}, 'yt', this.value)" placeholder="YouTube ID">
                    <input value="${item.id}" onchange="up(${i}, 'id', this.value)" placeholder="ID (Filename)">
                    <select onchange="up(${i}, 'cat', this.value)">
                        <option value="cartoon" ${item.cat=='cartoon'?'selected':''}>Cartoon</option>
                        <option value="song" ${item.cat=='song'?'selected':''}>Song</option>
                        <option value="speech" ${item.cat=='speech'?'selected':''}>Speech</option>
                        <option value="drama" ${item.cat=='drama'?'selected':''}>Drama</option>
                    </select>
                    <input class="full" value="${item.desc}" onchange="up(${i}, 'desc', this.value)" placeholder="Description">
                    <input class="full" type="date" value="${item.date}" onchange="up(${i}, 'date', this.value)">
                </div>
                <button class="btn-del" onclick="del(${i})">X</button>
            </div>`;
    });
}

function up(i, k, v) { libraryData[i][k] = v; if(k==='yt') render(); }
function del(i) { if(confirm("Delete this row?")) { libraryData.splice(i,1); render(); } }
function addItem() { 
    libraryData.push({id:"new", title:"New Video", yt:"", cat:"cartoon", desc:"", date:new Date().toISOString().split('T')[0]}); 
    render();
    window.scrollTo(0, document.body.scrollHeight);
}

function resetCreds() { 
    localStorage.clear(); 
    // Redirect to sibling generator file
    window.location.href = "generator.html"; 
}

// --- 4. SAVE ---
async function saveToGitHub() {
    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    
    // Double Check SHA to prevent conflicts
    try {
        const c = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${FILE}?ref=${BRANCH}`, { headers: { Authorization: `token ${token}` } });
        if(c.ok) currentSHA = (await c.json()).sha;
    } catch(e){}

    const body = {
        message: "Update Library",
        // Encode for UTF-8 Support
        content: btoa(unescape(encodeURIComponent(JSON.stringify(libraryData, null, 2)))),
        branch: BRANCH
    };
    if(currentSHA) body.sha = currentSHA;

    try {
        const req = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${FILE}`, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if(req.ok) {
            const res = await req.json();
            currentSHA = res.content.sha;
            alert("✅ Saved successfully!");
        } else { throw new Error("Save Failed: " + req.status); }
    } catch(e) { alert(e.message); }
    
    btn.innerText = originalText;
}
