// Admin Check
if (localStorage.getItem('is_admin') !== 'true') {
    if (prompt("Enter Admin Password:") === "Taigibun") {
        localStorage.setItem('is_admin', 'true');
    } else { 
        alert("Access Denied"); 
        window.location.href = "../index.html"; 
    }
}

let player;
let subtitleData = [];
let globalData = { subtitle: "", vocab: [], mask: {}, settings: {} };

// --- INITIALIZATION ---
window.onload = function() {
    ['ghUser', 'ghRepo', 'ghToken'].forEach(k => { 
        if(localStorage.getItem(k)) document.getElementById(k).value = localStorage.getItem(k); 
    });

    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');
    if (fileId) {
        document.getElementById('targetFilename').value = fileId;
        setTimeout(fetchFromGithub, 500);
    }

    updatePreview();
}

function toggleConfig() {
    const el = document.getElementById('gh-config-group');
    el.style.display = (el.style.display === 'none' ? 'block' : 'none');
}

// --- SYNC FUNCTION (New) ---
// Syncs the slider (range) and the number box
function sync(srcId, dstId) {
    const val = document.getElementById(srcId).value;
    document.getElementById(dstId).value = val;
    updatePreview();
}

// --- YOUTUBE PLAYER & SYNC ---
function onYouTubeIframeAPIReady() {}

function loadVideo(url) {
    const id = (url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/))?.[1];
    if(!id) return;
    globalData.video = url;
    
    if(player) {
        player.loadVideoById(id);
    } else {
        player = new YT.Player('player', { 
            videoId: id,
            events: { 'onReady': function(e) { setInterval(checkTime, 100); } }
        });
    }
}

function checkTime() {
    if(!player || !player.getCurrentTime) return;
    const ct = player.getCurrentTime();
    const sub = subtitleData.find(s => ct >= s.start && ct <= s.end);
    const previewEl = document.getElementById('subtitle-preview');
    
    if (sub) previewEl.innerHTML = sub.text.replace(/\n/g, '<br>');
    else {
        if(ct < 0.5) previewEl.innerHTML = "SAMPLE SUBTITLE TEXT"; 
        else previewEl.innerHTML = ""; 
    }
}

// --- DATA PARSING ---
function parseSRT(srt) { 
    subtitleData = []; 
    if(!srt) return;
    srt.trim().split(/\n\s*\n/).forEach(b => { 
        const lines = b.split('\n'); 
        if(lines.length >= 3) { 
            const m = lines[1].match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/); 
            if(m) subtitleData.push({
                start: timeToSec(m[1]), end: timeToSec(m[2]), text: lines.slice(2).join('\n')
            }); 
        } 
    }); 
}

function timeToSec(t) { 
    const p=t.replace(',','.').split(':'); 
    return p.length===3 ? (+p[0])*3600+(+p[1])*60+(+p[2]) : 0; 
}

// --- VISUAL STYLING LOGIC ---
function updatePreview() {
    // Mask
    const m = document.getElementById('preview-mask');
    m.style.height = document.getElementById('mHeight').value + "%";
    m.style.width = document.getElementById('mWidth').value + "%";
    m.style.bottom = document.getElementById('mBottom').value + "%";
    m.style.left = document.getElementById('mLeft').value + "%";
    m.style.backgroundColor = document.getElementById('mColor').value;
    m.style.opacity = document.getElementById('mOpacity').value / 100;

    // Subtitle Style
    const s = document.getElementById('subtitle-preview');
    if(document.getElementById('subFont')) s.style.fontFamily = document.getElementById('subFont').value;

    s.style.fontSize = (24 * (document.getElementById('subSize').value/100)) + "px";
    s.style.color = document.getElementById('subColor').value;
    
    const rgb = hexToRgb(document.getElementById('subBoxColor').value);
    if(rgb) s.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${document.getElementById('subBoxOp').value/100})`;
    
    const sh = document.getElementById('subShadow').value;
    const shColor = document.getElementById('subShadowColor').value;
    s.style.textShadow = sh > 0 ? `${sh}px ${sh}px ${sh}px ${shColor}` : 'none';

    const anchor = document.getElementById('subAnchor').value;
    const off = document.getElementById('subOffset').value;
    s.style.top = 'auto'; s.style.bottom = 'auto';
    s.style[anchor] = off + "%";
}

function hexToRgb(hex) { 
    var r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); 
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null; 
}

// --- FETCH & SAVE LOGIC ---
function fetchFileList() {
    const u = document.getElementById('ghUser').value.trim();
    const r = document.getElementById('ghRepo').value.trim();
    const t = document.getElementById('ghToken').value.trim();
    const select = document.getElementById('fileSelectDropdown');

    if(!u || !r) { alert("Please enter User and Repo."); return; }
    localStorage.setItem('ghUser', u); localStorage.setItem('ghRepo', r);
    if(t) localStorage.setItem('ghToken', t);

    select.innerHTML = "<option>Loading...</option>";
    const url = `https://api.github.com/repos/${u}/${r}/contents/data?ref=gh-pages`;
    const headers = t ? { 'Authorization': `token ${t}` } : {};

    fetch(url, { headers: headers }).then(res => {
            if(!res.ok) throw new Error("Status: " + res.status);
            return res.json();
    }).then(data => {
            select.innerHTML = '<option value="">-- Select a File --</option>';
            const jsonFiles = data.filter(item => item.name.endsWith('.json'));
            if(jsonFiles.length === 0) { select.innerHTML = '<option>No .json files found</option>'; return; }
            jsonFiles.forEach(file => {
                const opt = document.createElement('option');
                opt.value = file.name;
                opt.innerText = file.name;
                select.appendChild(opt);
            });
    }).catch(err => { alert("Error: " + err.message); select.innerHTML = "<option>Error loading list</option>"; });
}

function selectFileFromList(val) {
    if(!val) return;
    document.getElementById('targetFilename').value = val;
    fetchFromGithub();
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
    
    fetch(url).then(res => { if (!res.ok) throw new Error("404 Not Found"); return res.json(); })
    .then(d => { processJsonData(d); btn.innerText = "✅"; setTimeout(()=>btn.innerText=txt, 1500); })
    .catch(e => { alert("Error: " + e.message); btn.innerText = txt; });
}

function loadLocalJson(input) {
    const r = new FileReader();
    r.onload = e => { try { processJsonData(JSON.parse(e.target.result)); } catch(e) { alert("Error parsing JSON"); } };
    r.readAsText(input.files[0]);
}

function processJsonData(d) {
    globalData = d;
    if(d.video) { document.getElementById('videoUrl').value = d.video; loadVideo(d.video); }
    if(d.subtitle) parseSRT(d.subtitle);
    else if (d.hiddenSub) parseSRT(decodeURIComponent(escape(atob(atob(d.hiddenSub).split('').reverse().join('')))));
    
    // Set Mask Controls (and sync numbers)
    if(d.mask) {
        ['Height','Width','Bottom','Left'].forEach(k => {
             const key = k[0].toLowerCase(); 
             if(d.mask[key] !== undefined) {
                 document.getElementById('m'+k).value = d.mask[key];
                 document.getElementById('nb_m'+k).value = d.mask[key];
             }
        });
        if(d.mask.c) document.getElementById('mColor').value = d.mask.c;
        if(d.mask.o !== undefined) {
            document.getElementById('mOpacity').value = d.mask.o * 100;
            document.getElementById('nb_mOpacity').value = d.mask.o * 100;
        }
    }

    // Set Visual Settings Controls (and sync numbers)
    if(d.settings) {
        if(d.settings.fontFamily && document.getElementById('subFont')) document.getElementById('subFont').value = d.settings.fontFamily;
        if(d.settings.scale) {
             document.getElementById('subSize').value = d.settings.scale * 100;
             document.getElementById('nb_subSize').value = d.settings.scale * 100;
        }
        if(d.settings.anchor) document.getElementById('subAnchor').value = d.settings.anchor;
        if(d.settings.offset) {
            document.getElementById('subOffset').value = d.settings.offset;
            document.getElementById('nb_subOffset').value = d.settings.offset;
        }
        if(d.settings.color) document.getElementById('subColor').value = d.settings.color;
        if(d.settings.boxColor) document.getElementById('subBoxColor').value = d.settings.boxColor;
        if(d.settings.boxOp !== undefined) {
            document.getElementById('subBoxOp').value = d.settings.boxOp * 100;
            document.getElementById('nb_subBoxOp').value = d.settings.boxOp * 100;
        }
        if(d.settings.shadow !== undefined) {
            document.getElementById('subShadow').value = d.settings.shadow;
            document.getElementById('nb_subShadow').value = d.settings.shadow;
        }
        if(d.settings.shadowColor) document.getElementById('subShadowColor').value = d.settings.shadowColor;
    }
    updatePreview();
}

function buildJson() {
    const vUrl = document.getElementById('videoUrl').value;
    if(vUrl) globalData.video = vUrl;

    globalData.mask = {
        h: document.getElementById('mHeight').value, w: document.getElementById('mWidth').value,
        b: document.getElementById('mBottom').value, l: document.getElementById('mLeft').value,
        c: document.getElementById('mColor').value, o: document.getElementById('mOpacity').value / 100
    };
    globalData.settings = {
        fontFamily: document.getElementById('subFont') ? document.getElementById('subFont').value : undefined,
        scale: document.getElementById('subSize').value / 100,
        anchor: document.getElementById('subAnchor').value, offset: document.getElementById('subOffset').value,
        color: document.getElementById('subColor').value,
        boxColor: document.getElementById('subBoxColor').value, boxOp: document.getElementById('subBoxOp').value / 100,
        shadow: document.getElementById('subShadow').value,
        shadowColor: document.getElementById('subShadowColor').value
    };
    return JSON.stringify(globalData, null, 2);
}

function downloadJson() {
    const b = new Blob([buildJson()], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); 
    a.download = (document.getElementById('targetFilename').value || "cinema_visual").replace('.json','') + ".json"; a.click();
}

function uploadToGithub() {
    const u=document.getElementById('ghUser').value, r=document.getElementById('ghRepo').value, t=document.getElementById('ghToken').value;
    let id = document.getElementById('targetFilename').value || prompt("Filename ID:");
    if(!id) return; id = id.replace('.json', '');
    localStorage.setItem('ghUser', u); localStorage.setItem('ghRepo', r); localStorage.setItem('ghToken', t);
    
    const url = `https://api.github.com/repos/${u}/${r}/contents/data/${id}.json`;
    const content = btoa(unescape(encodeURIComponent(buildJson())));
    
    fetch(url + "?ref=gh-pages", { headers:{'Authorization':`token ${t}`} }).then(res => { return res.status === 404 ? { sha: null } : res.json(); })
    .then(d => { 
        fetch(url, {
            method: 'PUT', headers: { 'Authorization': `token ${t}`, 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ message: "Update Visuals via Editor", content: content, branch: "gh-pages", sha: d.sha })
        }).then(x => { if(x.ok) alert("✅ Saved!"); else x.json().then(e => alert("Error: "+e.message)); }); 
    });
}
