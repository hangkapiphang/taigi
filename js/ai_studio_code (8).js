// --- AUTH & INIT ---
if (localStorage.getItem('is_admin') !== 'true') {
    if (prompt("Enter Admin Password:") === "1234") localStorage.setItem('is_admin', 'true');
    else { alert("Access Denied"); window.location.href = "../index.html"; }
}

let player, vocabData = [], globalData = { subtitle:"", mask:{}, settings:{} };
let currentFilename = "";
let activeIndex = -1;

window.onload = function() {
    // Load config from local storage
    ['ghUser', 'ghRepo', 'ghToken'].forEach(k => { 
        if(localStorage.getItem(k)) document.getElementById(k).value = localStorage.getItem(k); 
    });

    // Start auto-highlight loop
    setInterval(highlightActiveVocab, 500);
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
        // Ctrl + Space: Play/Pause
        if(e.ctrlKey && e.code === 'Space') { e.preventDefault(); togglePlay(); }
        // Ctrl + Enter: Add Word
        if(e.ctrlKey && e.code === 'Enter') { e.preventDefault(); addVocabLine(); }
        // Ctrl + S: Save to Github
        if(e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); uploadToGithub(); }
    });
};

function toggleConfig() {
    const el = document.getElementById('config-area');
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

// --- GITHUB INTEGRATION ---
function getGhHeaders() {
    const token = document.getElementById('ghToken').value;
    return { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' };
}

function listGithubFiles() {
    const u = document.getElementById('ghUser').value;
    const r = document.getElementById('ghRepo').value;
    const t = document.getElementById('ghToken').value;
    
    if(!u || !r) return alert("Please check GitHub settings (User/Repo)");
    
    // Save settings
    localStorage.setItem('ghUser', u); localStorage.setItem('ghRepo', r); localStorage.setItem('ghToken', t);

    const sel = document.getElementById('file-select');
    sel.innerHTML = "<option>Loading...</option>";

    fetch(`https://api.github.com/repos/${u}/${r}/contents/data?ref=gh-pages`, { headers: t ? getGhHeaders() : {} })
    .then(res => res.json())
    .then(data => {
        sel.innerHTML = "<option value=''>-- Select File --</option>";
        if(Array.isArray(data)) {
            data.forEach(f => {
                if(f.name.endsWith('.json')) {
                    const opt = document.createElement('option');
                    opt.value = f.download_url; // Use raw URL
                    opt.text = f.name;
                    sel.appendChild(opt);
                }
            });
        } else {
            sel.innerHTML = "<option>Error fetching files</option>";
        }
    }).catch(e => { alert(e); sel.innerHTML = "<option>Error</option>"; });
}

function fetchFromDropdown() {
    const sel = document.getElementById('file-select');
    const url = sel.value;
    const name = sel.options[sel.selectedIndex].text;
    if(url && name.endsWith('.json')) loadGithubUrl(url, name);
}

function fetchManual() {
    let name = document.getElementById('manual-filename').value.trim();
    if(!name) return;
    if(!name.endsWith('.json')) name += '.json';
    
    const u = document.getElementById('ghUser').value;
    const r = document.getElementById('ghRepo').value;
    // Construct raw URL for gh-pages branch
    const url = `https://raw.githubusercontent.com/${u}/${r}/gh-pages/data/${name}`;
    loadGithubUrl(url, name);
}

function loadGithubUrl(url, name) {
    fetch(url).then(r => {
        if(!r.ok) throw new Error("File not found or network error");
        return r.json();
    }).then(d => {
        globalData = d;
        if(d.video) { 
            document.getElementById('videoUrl').value = d.video; 
            loadVideo(d.video); 
        }
        vocabData = d.vocab || [];
        vocabData.sort((a,b)=>a.time-b.time);
        renderEditor();
        
        currentFilename = name;
        document.getElementById('current-filename').textContent = "Editing: " + name;
    }).catch(e => alert(e.message));
}

// --- LOCAL FILE HANDLING ---
function loadLocalJson(input) {
    const file = input.files[0];
    if(!file) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            globalData = JSON.parse(e.target.result);
            if(globalData.video) { 
                document.getElementById('videoUrl').value = globalData.video; 
                loadVideo(globalData.video); 
            }
            vocabData = globalData.vocab || [];
            vocabData.sort((a,b)=>a.time-b.time);
            renderEditor();
            currentFilename = file.name;
            document.getElementById('current-filename').textContent = "Local: " + currentFilename;
        } catch(e) { alert("Invalid JSON file"); }
    };
    r.readAsText(file);
}

// --- EDITOR LOGIC ---
function onYouTubeIframeAPIReady() {}

function loadVideo(url) {
    const id = (url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/))?.[1];
    if(id) {
        globalData.video = url;
        if(player) player.loadVideoById(id); 
        else player = new YT.Player('player', { videoId: id });
    }
}

function togglePlay() { 
    if(player && typeof player.getPlayerState === 'function') {
        player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
    }
}

function renderEditor(filter="") {
    const c = document.getElementById('rows-area'); 
    c.innerHTML = '';
    vocabData.forEach((v, i) => {
        if(filter && !v.word.toLowerCase().includes(filter.toLowerCase()) && !v.def.toLowerCase().includes(filter.toLowerCase())) return;
        const active = i === activeIndex ? 'active' : '';
        c.innerHTML += `
            <div class="vocab-card ${active}" id="c-${i}">
                <div class="v-header">
                    <div class="time-display" onclick="player.seekTo(${v.time}, true)">${fmtTime(v.time)}</div>
                    
                    <button class="btn btn-grey btn-xs" onclick="syncTime(${i})">Sync</button>
                    
                    <!-- Time Adjustments -->
                    <button class="btn btn-teal btn-xs" onclick="adjustTime(${i}, -1.0)">-1s</button>
                    <button class="btn btn-teal btn-xs" onclick="adjustTime(${i}, -0.5)">-0.5s</button>
                    <button class="btn btn-teal btn-xs" onclick="adjustTime(${i}, 0.5)">+0.5s</button>
                    <button class="btn btn-teal btn-xs" onclick="adjustTime(${i}, 1.0)">+1s</button>
                    
                    <div style="flex:1"></div>
                    <button style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;" onclick="del(${i})">✖</button>
                </div>
                <div class="v-inputs">
                    <input class="word-inp" placeholder="Word/POJ" value="${esc(v.word)}" onchange="upd(${i},'word',this.value)">
                    <input class="def-inp" placeholder="Definition" value="${esc(v.def)}" onchange="upd(${i},'def',this.value)">
                </div>
            </div>`;
    });
}

function esc(s) { return s ? s.replace(/"/g,"&quot;") : ""; }
function fmtTime(s) { return new Date(s * 1000).toISOString().substr(14, 5); }

function syncTime(i) { 
    if(player) { 
        vocabData[i].time = player.getCurrentTime(); 
        vocabData.sort((a,b)=>a.time-b.time); 
        renderEditor(); 
    } 
}

function adjustTime(i, amount) {
    let t = vocabData[i].time + amount;
    if(t < 0) t = 0;
    vocabData[i].time = t;
    
    // Sort to keep timeline correct if adjustment moves it past neighbors
    vocabData.sort((a,b)=>a.time-b.time); 
    
    renderEditor(); 
    
    // Seek to new time for instant auditory feedback
    if(player && typeof player.seekTo === 'function') {
        player.seekTo(t, true);
    }
}

function upd(i,f,v) { vocabData[i][f] = v; }
function del(i) { if(confirm("Delete line?")) { vocabData.splice(i,1); renderEditor(); } }

function addVocabLine() { 
    vocabData.push({time: player ? player.getCurrentTime() : 0, word:"", def:""}); 
    vocabData.sort((a,b)=>a.time-b.time); 
    renderEditor(); 
}

function highlightActiveVocab() {
    if(!player || !player.getCurrentTime) return;
    const t = player.getCurrentTime();
    let idx = -1;
    for(let i=0; i<vocabData.length; i++) { 
        if(t >= vocabData[i].time) idx = i; 
        else break; 
    }
    if(idx !== activeIndex) {
        if(activeIndex !== -1) document.getElementById(`c-${activeIndex}`)?.classList.remove('active');
        if(idx !== -1) {
            const el = document.getElementById(`c-${idx}`);
            if(el) { 
                el.classList.add('active'); 
                el.scrollIntoView({behavior:"smooth", block:"center"}); 
            }
        }
        activeIndex = idx;
    }
}

function importAiVocab() {
    const str = prompt("Paste AI JSON Array:");
    try {
        const arr = JSON.parse(str);
        if(Array.isArray(arr)) { vocabData = vocabData.concat(arr); vocabData.sort((a,b)=>a.time-b.time); renderEditor(); }
    } catch(e){ alert("Invalid JSON"); }
}

// --- SAVE FUNCTIONS ---
function buildJson() {
    globalData.vocab = vocabData;
    // ensure video url is up to date
    globalData.video = document.getElementById('videoUrl').value;
    return JSON.stringify(globalData, null, 2);
}

function downloadJson() {
    const blob = new Blob([buildJson()], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = currentFilename || "vocab.json";
    a.click();
}

function downloadCSV() {
    let csv = "Time,Word,Definition\n";
    vocabData.forEach(v => {
        csv += `${v.time.toFixed(2)},"${v.word.replace(/"/g,'""')}","${v.def.replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (currentFilename || "vocab").replace('.json','') + ".csv";
    a.click();
}

function uploadToGithub() {
    let fname = currentFilename;
    if(!fname) { 
        fname = prompt("Save as (e.g. episode_01.json):"); 
        if(!fname) return; 
    }
    if(!fname.endsWith('.json')) fname += '.json';
    
    const u = document.getElementById('ghUser').value;
    const r = document.getElementById('ghRepo').value;
    const t = document.getElementById('ghToken').value;

    if(!u || !r || !t) return alert("Missing Github Config");

    const url = `https://api.github.com/repos/${u}/${r}/contents/data/${fname}`;
    const content = btoa(unescape(encodeURIComponent(buildJson())));

    // Check if file exists to get SHA
    fetch(url+"?ref=gh-pages", { headers: getGhHeaders() })
    .then(res => res.ok ? res.json() : null)
    .then(d => {
        const sha = d ? d.sha : undefined;
        // Upload (PUT)
        fetch(url, {
            method:'PUT', 
            headers: getGhHeaders(),
            body:JSON.stringify({
                message: "Update Vocab: " + fname, 
                content: content, 
                branch: "gh-pages", 
                sha: sha
            })
        }).then(res => {
            if(res.ok) { 
                alert("✅ Saved to GitHub!"); 
                currentFilename = fname; 
                document.getElementById('current-filename').textContent="Saved: "+fname; 
            } else {
                res.json().then(e => alert("Error: " + e.message));
            }
        });
    });
}