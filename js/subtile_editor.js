// Admin Check
if (localStorage.getItem('is_admin') !== 'true') {
    if (prompt("Enter Admin Password:") === "Taigibun") {
        localStorage.setItem('is_admin', 'true');
    } else { 
        alert("Access Denied"); 
        location.reload(); 
    }
}

let player, subtitleData = [];
let globalData = { vocab: [], mask: {}, settings: {} };

function toggleSettings() { 
    const el = document.getElementById('global-controls'); 
    el.classList.toggle('show'); 
}

window.onload = function() {
    // 1. Load LocalStorage configs
    ['ghUser', 'ghRepo', 'ghToken'].forEach(k => { 
        if(localStorage.getItem(k)) document.getElementById(k).value = localStorage.getItem(k); 
    });

    // 2. Responsive UI
    if(window.innerWidth < 768) document.getElementById('global-controls').style.display = 'none';

    // 3. Auto-load ID if present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');
    if (fileId) {
        document.getElementById('targetFilename').value = fileId;
        setTimeout(fetchFromGithub, 500);
    }
}

function onYouTubeIframeAPIReady() {}

function loadVideo(url) {
    const id = (url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/))?.[1];
    if(!id) return; globalData.video = url;
    if(player) player.loadVideoById(id); 
    else player = new YT.Player('player', { videoId: id, events: {'onReady': e=>setInterval(checkTime, 100)} });
}

function checkTime() {
    if(!player || !player.getCurrentTime) return;
    const ct = player.getCurrentTime();
    document.querySelectorAll('.sub-card').forEach(r => r.classList.remove('active'));
    const sub = subtitleData.find((s, i) => {
        const match = ct >= s.start && ct <= s.end;
        if(match) document.getElementById(`card-${i}`)?.classList.add('active');
        return match;
    });
    document.getElementById('preview-overlay').innerHTML = sub ? sub.text.replace(/\n/g, '<br>') : '';
}

// --- NEW RENDER & TIME LOGIC ---

function renderEditor() {
    const c = document.getElementById('rows-area'); 
    c.innerHTML = '';
    
    subtitleData.forEach((s, i) => {
        c.innerHTML += `
            <div class="sub-card" id="card-${i}">
                <div class="card-header">
                    <span class="idx-badge">#${i+1}</span>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-icon" style="color:green; font-size:14px;" onclick="player.seekTo(${s.start}, true)" title="Play from Start">▶ Play</button>
                        <button class="btn-icon" style="color:red" onclick="deleteLine(${i})" title="Delete Line">✖</button>
                    </div>
                </div>

                <div class="time-control-area">
                    <!-- Start Time -->
                    <div class="time-row">
                        <span class="time-label">START</span>
                        <button class="btn-sync" onclick="syncTime(${i}, 'start')" title="Set to current video time">Sync</button>
                        <input type="text" class="time-inp" value="${secToTime(s.start)}" onchange="updateData(${i}, 'start', this.value)">
                        <div class="btn-group">
                            <button class="time-btn" onclick="adjustTime(${i}, 'start', -1)">-1s</button>
                            <button class="time-btn" onclick="adjustTime(${i}, 'start', -0.1)">-.1s</button>
                            <button class="time-btn" onclick="adjustTime(${i}, 'start', 0.1)">+.1s</button>
                            <button class="time-btn" onclick="adjustTime(${i}, 'start', 1)">+1s</button>
                        </div>
                    </div>

                    <!-- End Time -->
                    <div class="time-row">
                        <span class="time-label">END</span>
                        <button class="btn-sync" onclick="syncTime(${i}, 'end')" title="Set to current video time">Sync</button>
                        <input type="text" class="time-inp" value="${secToTime(s.end)}" onchange="updateData(${i}, 'end', this.value)">
                        <div class="btn-group">
                            <button class="time-btn" onclick="adjustTime(${i}, 'end', -1)">-1s</button>
                            <button class="time-btn" onclick="adjustTime(${i}, 'end', -0.1)">-.1s</button>
                            <button class="time-btn" onclick="adjustTime(${i}, 'end', 0.1)">+.1s</button>
                            <button class="time-btn" onclick="adjustTime(${i}, 'end', 1)">+1s</button>
                        </div>
                    </div>
                </div>

                <div class="format-bar">
                    <button class="fmt-btn" onclick="applyFormat(${i}, '<b>', '</b>')" title="Bold"><b>B</b></button>
                    <button class="fmt-btn" onclick="applyFormat(${i}, '<i>', '</i>')" title="Italic"><i>I</i></button>
                    <div style="width:1px; background:#ddd; margin:0 5px;"></div>
                    <button class="fmt-btn fw-500" onclick="applyFormat(${i}, '<span style=\\'font-weight:500\\'>', '</span>')" title="Medium">Med</button>
                    <div style="width:1px; background:#ddd; margin:0 5px;"></div>
                    <div class="color-wrapper" title="Color"><input type="color" onchange="applyColor(${i}, this.value); this.value='#000000'"></div>
                </div>
                <textarea id="txt-${i}" class="text-area" rows="2" placeholder="Subtitle text..." onchange="updateData(${i}, 'text', this.value)">${s.text}</textarea>
            </div>`;
    });
}

function adjustTime(index, type, amount) {
    if(!subtitleData[index]) return;
    let val = subtitleData[index][type] + amount;
    if (val < 0) val = 0;
    
    // Round to 3 decimals to avoid floating point weirdness (e.g. 1.10000002)
    subtitleData[index][type] = Math.round(val * 1000) / 1000;
    
    // If updating start time, we might want to sort, but let's keep position stable until manual refresh
    renderEditor();
    
    // Optional: preview the change
    if(type === 'start' && player && player.seekTo) {
        player.seekTo(subtitleData[index][type], true);
    }
}

function syncTime(index, type) {
    if(!player || !player.getCurrentTime) {
        alert("Player not ready.");
        return;
    }
    const t = player.getCurrentTime();
    subtitleData[index][type] = Math.round(t * 1000) / 1000;
    renderEditor();
}

function applyFormat(index, startTag, endTag) {
    const el = document.getElementById('txt-' + index); if (!el) return;
    const start = el.selectionStart; const end = el.selectionEnd; const txt = el.value;
    const newText = txt.substring(0, start) + startTag + txt.substring(start, end) + endTag + txt.substring(end);
    el.value = newText; updateData(index, 'text', newText);
    el.focus(); el.selectionStart = start + startTag.length; el.selectionEnd = end + startTag.length;
}
function applyColor(index, color) { applyFormat(index, `<font color="${color}">`, `</font>`); }

function updateData(i, f, v) {
    if (f === 'text') {
        subtitleData[i].text = v;
    } else {
        subtitleData[i][f] = timeToSec(v);
        // If user manually edited start time, sort data
        if(f === 'start') {
            subtitleData.sort((a,b)=>a.start-b.start);
            renderEditor();
        }
    }
}

function addSubtitleLine() { 
    const t = player ? player.getCurrentTime() : 0; 
    subtitleData.push({start:t, end:t+3, text:""}); 
    subtitleData.sort((a,b)=>a.start-b.start); 
    renderEditor(); 
    // Scroll to bottom
    setTimeout(() => {
        const area = document.getElementById('rows-area');
        area.scrollTop = area.scrollHeight;
    }, 100);
}

function deleteLine(i) { 
    if(confirm("Delete this line?")) { 
        subtitleData.splice(i,1); 
        renderEditor(); 
    }
}

// --- DATA IO ---

function fetchFileList() {
    const u = document.getElementById('ghUser').value.trim();
    const r = document.getElementById('ghRepo').value.trim();
    const t = document.getElementById('ghToken').value.trim();
    const select = document.getElementById('fileSelectDropdown');

    if(!u || !r) { alert("Please enter User and Repo."); return; }

    localStorage.setItem('ghUser', u);
    localStorage.setItem('ghRepo', r);
    if(t) localStorage.setItem('ghToken', t);

    select.innerHTML = "<option>Loading...</option>";

    const url = `https://api.github.com/repos/${u}/${r}/contents/data?ref=gh-pages`;
    const headers = t ? { 'Authorization': `token ${t}` } : {};

    fetch(url, { headers: headers })
        .then(res => {
            if(!res.ok) throw new Error("Status: " + res.status);
            return res.json();
        })
        .then(data => {
            select.innerHTML = '<option value="">-- Select a File --</option>';
            const jsonFiles = data.filter(item => item.name.endsWith('.json'));
            if(jsonFiles.length === 0) { select.innerHTML = '<option>No .json files found</option>'; return; }
            jsonFiles.forEach(file => {
                const opt = document.createElement('option');
                opt.value = file.name;
                opt.innerText = file.name;
                select.appendChild(opt);
            });
        })
        .catch(err => {
            alert("Error: " + err.message);
            select.innerHTML = "<option>Error loading list</option>";
        });
}

function selectFileFromList(val) {
    if(!val) return;
    document.getElementById('targetFilename').value = val;
    fetchFromGithub();
}

function processJsonData(d) {
    globalData = d;
    if(d.video) { document.getElementById('videoUrl').value = d.video; loadVideo(d.video); }
    if(d.subtitle) parseSRT(d.subtitle); 
    else if (d.hiddenSub) parseSRT(decodeURIComponent(escape(atob(atob(d.hiddenSub).split('').reverse().join('')))));
    renderEditor();
}

function fetchFromGithub() {
    const u = document.getElementById('ghUser').value.trim();
    const r = document.getElementById('ghRepo').value.trim();
    let f = document.getElementById('targetFilename').value.trim();
    
    if(!u || !r || !f) { alert("Please ensure User, Repo, and Filename are filled."); return; }
    
    f = f.replace('.json', '');
    const url = `https://raw.githubusercontent.com/${u}/${r}/gh-pages/data/${f}.json`;
    const btn = document.querySelector('button[onclick="fetchFromGithub()"]');
    const txt = btn.innerText; btn.innerText = "⏳";
    
    fetch(url).then(res => {
        if (!res.ok) throw new Error("404 Not Found");
        return res.json();
    }).then(d => { processJsonData(d); btn.innerText = "✅"; setTimeout(()=>btn.innerText=txt, 1500); })
    .catch(e => { alert("Error: " + e.message); btn.innerText = txt; });
}

function loadLocalJson(input) {
    const r = new FileReader();
    r.onload = e => { try { processJsonData(JSON.parse(e.target.result)); } catch(e){alert("Error");} }; 
    r.readAsText(input.files[0]);
}

function parseSRT(srt) { 
    subtitleData = []; 
    srt.trim().split(/\n\s*\n/).forEach(b => { 
        const lines = b.split('\n'); 
        if(lines.length >= 3) { 
            const m = lines[1].match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/); 
            if(m) subtitleData.push({start:timeToSec(m[1]), end:timeToSec(m[2]), text:lines.slice(2).join('\n')}); 
        } 
    }); 
}

function buildJson() { 
    let srt = ""; 
    subtitleData.forEach((s,i) => srt += `${i+1}\n${secToTime(s.start)} --> ${secToTime(s.end)}\n${s.text.replace(/\n/g, '<br>')}\n\n`); 
    globalData.subtitle = srt; 
    globalData.video = document.getElementById('videoUrl').value; 
    return JSON.stringify(globalData, null, 2); 
}

// Convert "00:00:00,000" to Seconds (Float)
function timeToSec(t) { 
    // Handle comma or dot
    const p = t.replace(',','.').split(':'); 
    return p.length === 3 ? (+p[0])*3600 + (+p[1])*60 + (+p[2]) : 0; 
}

// Convert Seconds to "00:00:00,000"
function secToTime(s) {
    if(isNaN(s) || s < 0) s = 0;
    
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.round((s % 1) * 1000);

    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    const mms = String(ms).padStart(3, '0');

    return `${hh}:${mm}:${ss},${mms}`;
}

function downloadJson() { 
    const b = new Blob([buildJson()], {type:"application/json"}); 
    const a = document.createElement("a"); 
    a.href=URL.createObjectURL(b); 
    a.download = (document.getElementById('targetFilename').value || "cinema_sub").replace('.json','') + ".json"; 
    a.click(); 
}

function downloadSrt() {
    let content = "";
    subtitleData.forEach((s, i) => {
        content += `${i + 1}\r\n`;
        content += `${secToTime(s.start)} --> ${secToTime(s.end)}\r\n`;
        content += `${s.text.replace(/<br>/g, '\n')}\r\n\r\n`; // Ensure br converts back for pure SRT
    });

    const b = new Blob([content], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = (document.getElementById('targetFilename').value || "cinema_sub").replace('.json','') + ".srt";
    a.click();
}

function uploadToGithub() {
    const u=document.getElementById('ghUser').value;
    const r=document.getElementById('ghRepo').value;
    const t=document.getElementById('ghToken').value;
    let id = document.getElementById('targetFilename').value || prompt("Filename ID:");
    if(!id) return;
    id = id.replace('.json', '');

    localStorage.setItem('ghUser', u); localStorage.setItem('ghRepo', r); localStorage.setItem('ghToken', t);
    
    const url = `https://api.github.com/repos/${u}/${r}/contents/data/${id}.json`;
    const content = btoa(unescape(encodeURIComponent(buildJson())));
    
    fetch(url + "?ref=gh-pages", { headers:{'Authorization':`token ${t}`} })
        .then(res => { return res.status === 404 ? { sha: null } : res.json(); })
        .then(d => { 
            fetch(url, {
                method: 'PUT', 
                headers: { 'Authorization': `token ${t}`, 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ message: "Update via Editor", content: content, branch: "gh-pages", sha: d.sha })
            }).then(x => { if(x.ok) alert("✅ Saved!"); else x.json().then(e => alert("Error: "+e.message)); }); 
        });
}
