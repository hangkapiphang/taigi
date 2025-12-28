// --- CONFIG ---
const user = localStorage.getItem('gh_user');
const repo = localStorage.getItem('gh_repo');
const token = localStorage.getItem('gh_token');
const BRANCH = 'gh-pages';
const FILE = 'data/library.json'; // The standard data path

let libraryData = [];
let currentSHA = null;

// --- 1. STARTUP CHECK (From 1222 Logic) ---
window.onload = async function() {
    if(!user || !repo || !token) {
        log("❌ Credentials missing. Please login via Generator.", "err");
        // Redirect logic could go here, or just show a link
        return;
    }

    log(`Connecting to ${user}/${repo}...`, "ok");

    try {
        // Step 1: Check Token
        const uReq = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
        if(!uReq.ok) throw new Error("Invalid Token.");
        log("✅ Token Valid", "ok");

        // Step 2: Check Branch
        const bReq = await fetch(`https://api.github.com/repos/${user}/${repo}/branches`, { headers: { Authorization: `token ${token}` } });
        const branches = await bReq.json();
        const branchExists = branches.some(b => b.name === BRANCH);

        if(!branchExists) {
            log(`⚠️ Branch '${BRANCH}' does not exist.`, "err");
            document.getElementById('btn-create-branch').style.display = 'block';
            return;
        }
        log(`✅ Branch '${BRANCH}' found`, "ok");

        // Step 3: Load File
        loadFile();

    } catch(e) {
        log(`❌ Error: ${e.message}`, "err");
    }
};

// --- 2. CORE LOGIC ---
function log(msg, type) {
    const div = document.getElementById('logs');
    div.innerHTML += `<div class="log-line ${type}">${msg}</div>`;
}

async function createBranch() {
    const btn = document.getElementById('btn-create-branch');
    btn.innerText = "Creating...";
    try {
        const m = await fetch(`https://api.github.com/repos/${user}/${repo}/git/ref/heads/main`, { headers: { Authorization: `token ${token}` } });
        const md = await m.json();
        const c = await fetch(`https://api.github.com/repos/${user}/${repo}/git/refs`, {
            method: 'POST',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: md.object.sha })
        });
        if(c.ok) { alert("Branch Created! Page will reload."); window.location.reload(); }
        else { throw new Error("Could not create branch."); }
    } catch(e) { alert("Error: " + e.message); }
}

async function loadFile() {
    // Add timestamp to bypass cache
    const url = `https://api.github.com/repos/${user}/${repo}/contents/${FILE}?ref=${BRANCH}&t=${Date.now()}`;
    try {
        const req = await fetch(url, { headers: { Authorization: `token ${token}` } });
        if(req.status === 404) {
            log("ℹ️ File not found. Starting New Library.", "warn");
            libraryData = [];
            currentSHA = null;
        } else if(req.ok) {
            const data = await req.json();
            currentSHA = data.sha;
            // Decode (Base64 -> UTF8)
            libraryData = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            log(`✅ Loaded ${libraryData.length} items.`, "ok");
        }
        
        document.getElementById('editor-ui').style.display = 'block';
        render();
    } catch(e) {
        log(`❌ File Load Error: ${e.message}`, "err");
    }
}

// --- 3. RENDER & EDIT (Merged UI Logic) ---
function render() {
    const list = document.getElementById('list-area');
    list.innerHTML = "";
    
    if(libraryData.length === 0) {
        list.innerHTML = "<div style='text-align:center; padding:20px; color:#888;'>Library is empty. Click 'New Entry'.</div>";
        return;
    }

    libraryData.forEach((item, i) => {
        // Destructure with defaults
        const { title="", yt="", id="", cat="song", tag="", level="A1", desc="", date="" } = item;
        
        list.innerHTML += `
            <div class="edit-card">
                <img src="https://img.youtube.com/vi/${yt}/mqdefault.jpg" class="thumb-preview" onerror="this.src='https://via.placeholder.com/120x80?text=No+Img'">
                
                <div class="input-grid">
                    <!-- Row 1: Title, ID, Date -->
                    <input value="${title}" onchange="up(${i},'title',this.value)" placeholder="Title">
                    <input value="${id}" onchange="up(${i},'id',this.value)" placeholder="File ID (slug)">
                    <input type="date" value="${date}" onchange="up(${i},'date',this.value)" title="Date Added">

                    <!-- Row 2: YT, Category, Level -->
                    <input value="${yt}" onchange="up(${i},'yt',this.value)" placeholder="YouTube ID">
                    <select onchange="up(${i},'cat',this.value)">
                        <option value="song" ${cat=='song'?'selected':''}>Song</option>
                        <option value="cartoon" ${cat=='cartoon'?'selected':''}>Cartoon</option>
                        <option value="speech" ${cat=='speech'?'selected':''}>Speech</option>
                        <option value="drama" ${cat=='drama'?'selected':''}>Drama</option>
                    </select>
                    <select onchange="up(${i},'level',this.value)">
                        <option value="A1" ${level=='A1'?'selected':''}>A1</option>
                        <option value="A2" ${level=='A2'?'selected':''}>A2</option>
                        <option value="B1" ${level=='B1'?'selected':''}>B1</option>
                        <option value="B2" ${level=='B2'?'selected':''}>B2</option>
                        <option value="C1" ${level=='C1'?'selected':''}>C1</option>
                    </select>

                    <!-- Row 3: Tag, Desc (Full Width) -->
                    <input list="tag-suggestions" value="${tag}" onchange="up(${i},'tag',this.value)" placeholder="Tag (e.g., Indie Folk)">
                    <input class="full-width" value="${desc}" onchange="up(${i},'desc',this.value)" placeholder="Description / Notes" style="grid-column: span 2;">
                </div>
                
                <button class="btn-del" onclick="del(${i})"><i class="fas fa-trash-alt"></i></button>
            </div>`;
    });
}

function up(i, k, v) { 
    libraryData[i][k] = v; 
    if(k === 'yt') render(); // Re-render thumbnail if YT changes
}

function del(i) { 
    if(confirm("Delete this entry?")) { 
        libraryData.splice(i,1); 
        render(); 
    } 
}

function addItem() { 
    const today = new Date().toISOString().split('T')[0];
    libraryData.unshift({
        id: "new_entry_" + Date.now(), 
        title: "", 
        yt: "", 
        cat: "song", 
        tag: "", 
        level: "A1", 
        desc: "",
        date: today
    }); 
    render(); 
}

function resetCreds() { 
    localStorage.clear(); 
    window.location.href = "generator.html"; // Assume generator is sibling or parent
}

// --- 4. SAVE ---
async function saveToGitHub() {
    const btn = document.querySelector('.btn-purple');
    const oldText = btn.innerHTML;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Saving...";
    
    // Refresh SHA
    try {
        const c = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${FILE}?ref=${BRANCH}`, { headers: { Authorization: `token ${token}` } });
        if(c.ok) currentSHA = (await c.json()).sha;
    } catch(e){}

    const body = {
        message: "Update Library " + new Date().toISOString(),
        // Encode (UTF8 -> Base64)
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
        } else { 
            throw new Error("Save Failed: " + req.status); 
        }
    } catch(e) { 
        alert(e.message); 
    }
    
    btn.innerHTML = oldText;
}