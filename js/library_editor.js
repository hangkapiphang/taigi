let libraryData = [];
let currentSHA = null; 

// --- 1. INITIAL LOAD ---
window.onload = function() {
    // Check if credentials exist
    const user = localStorage.getItem('gh_user');
    const token = localStorage.getItem('gh_token');
    
    // Redirect logic: Since this file is used by a page in views/admin/,
    // generator.html is a sibling, so simple filename works.
    if(!user || !token) {
        alert("Credentials Missing! \n1. Go to 'Generator'.\n2. Enter User/Repo/Token.\n3. Click 'Save Credentials'.\n4. Come back here.");
        window.location.href = "generator.html";
    } else {
        // Auto-load if credentials exist
        loadFromGitHub();
    }
}

// --- 2. GITHUB API: READ ---
async function loadFromGitHub() {
    const user = localStorage.getItem('gh_user');
    const repo = localStorage.getItem('gh_repo');
    const token = localStorage.getItem('gh_token');
    const status = document.getElementById('status');

    if(!user || !repo) {
        alert("Error: Username or Repo is empty in settings.");
        return;
    }

    status.innerText = "Connecting...";
    
    // API path to data/library.json
    const url = `https://api.github.com/repos/${user}/${repo}/contents/data/library.json?ref=gh-pages`;

    try {
        const req = await fetch(url, { 
            headers: { 
                'Authorization': `token ${token}`,
                'Cache-Control': 'no-cache'
            } 
        });
        
        // DATA NOT FOUND (404) -> Start New
        if (req.status === 404) {
            status.innerText = "File not found. Starting fresh.";
            libraryData = [];
            renderList();
            return;
        }

        if (!req.ok) throw new Error(`GitHub API Error: ${req.status} ${req.statusText}`);
        
        const data = await req.json();
        currentSHA = data.sha; 
        
        // Decode UTF-8 correctly
        const jsonString = decodeURIComponent(escape(atob(data.content)));
        libraryData = JSON.parse(jsonString);
        
        renderList();
        status.innerText = "✅ Loaded!";
        setTimeout(() => status.innerText = "", 3000);

    } catch (err) {
        console.error(err);
        status.innerText = "Error!";
        alert("Failed to Load!\n\nReason: " + err.message + "\n\nCheck:\n1. Is your Token correct?\n2. Does 'gh-pages' branch exist?");
    }
}

// --- 3. RENDER UI ---
function renderList() {
    const container = document.getElementById('list-area');
    container.innerHTML = "";

    if (libraryData.length === 0) {
        container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>No movies in library yet. Click '+ Add New Movie'.</div>";
        return;
    }

    libraryData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `
            <div class="actions">
                <img src="https://img.youtube.com/vi/${item.yt}/hqdefault.jpg" class="thumb-preview" id="thumb-${index}" onerror="this.src='https://via.placeholder.com/120x68?text=No+Img'">
                <div style="display:flex; gap:5px; justify-content:center; margin-top:5px;">
                    <button class="btn btn-move" onclick="moveItem(${index}, -1)">▲</button>
                    <button class="btn btn-move" onclick="moveItem(${index}, 1)">▼</button>
                </div>
            </div>

            <div style="flex-grow:1;">
                <div class="input-grid">
                    <div class="form-group">
                        <label>JSON Filename (ID)</label>
                        <input type="text" value="${item.id}" onchange="updateItem(${index}, 'id', this.value)" placeholder="ironman">
                    </div>
                    <div class="form-group">
                        <label>YouTube ID</label>
                        <input type="text" value="${item.yt}" onchange="updateItem(${index}, 'yt', this.value)" placeholder="e.g. 8ugaeA-nMTc">
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select onchange="updateItem(${index}, 'cat', this.value)">
                            <option value="song" ${item.cat === 'song' ? 'selected' : ''}>🎵 Song</option>
                            <option value="cartoon" ${item.cat === 'cartoon' ? 'selected' : ''}>🧸 Cartoon</option>
                            <option value="speech" ${item.cat === 'speech' ? 'selected' : ''}>🎤 Speech</option>
                            <option value="drama" ${item.cat === 'drama' ? 'selected' : ''}>🎭 Drama</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Title</label>
                    <input type="text" class="full-width" value="${item.title}" onchange="updateItem(${index}, 'title', this.value)">
                </div>
                
                <div class="form-group" style="margin-top:10px;">
                    <label>Description</label>
                    <input type="text" class="full-width" value="${item.desc}" onchange="updateItem(${index}, 'desc', this.value)">
                </div>
            </div>

            <div class="actions">
                <button class="btn btn-del" onclick="deleteItem(${index})">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- 4. CRUD OPERATIONS ---
function updateItem(index, field, value) {
    libraryData[index][field] = value;
    if(field === 'yt') {
        const img = document.getElementById(`thumb-${index}`);
        if(value.length > 5) img.src = `https://img.youtube.com/vi/${value}/hqdefault.jpg`;
    }
}

function addItem() {
    libraryData.push({
        id: "",
        title: "New Video Title",
        desc: "Description here...",
        cat: "cartoon",
        yt: "",
        date: new Date().toISOString().slice(0, 10)
    });
    renderList();
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
}

function deleteItem(index) {
    if(confirm("Remove this movie from the menu? (The JSON file in 'data' will stay)")) {
        libraryData.splice(index, 1);
        renderList();
    }
}

function moveItem(index, direction) {
    if (index + direction < 0 || index + direction >= libraryData.length) return;
    const temp = libraryData[index];
    libraryData[index] = libraryData[index + direction];
    libraryData[index + direction] = temp;
    renderList();
}

// --- 5. GITHUB API: WRITE ---
async function saveToGitHub() {
    const user = localStorage.getItem('gh_user');
    const repo = localStorage.getItem('gh_repo');
    const token = localStorage.getItem('gh_token');
    const status = document.getElementById('status');

    if (!confirm("This will update the live website menu. Continue?")) return;

    status.innerText = "Saving...";

    const url = `https://api.github.com/repos/${user}/${repo}/contents/data/library.json`;
    
    // Encode
    const jsonString = JSON.stringify(libraryData, null, 2);
    const content = btoa(unescape(encodeURIComponent(jsonString)));

    const body = {
        message: "Update Library Menu",
        content: content,
        branch: "gh-pages"
    };
    if (currentSHA) body.sha = currentSHA; // Overwrite existing

    try {
        const req = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!req.ok) {
            const err = await req.json();
            throw new Error(err.message);
        }
        
        const res = await req.json();
        currentSHA = res.content.sha;
        status.innerText = "✅ Saved!";
        alert("Menu Updated! It will appear on the site in ~1 minute.");

    } catch (err) {
        console.error(err);
        status.innerText = "❌ Save Failed";
        alert("Error: " + err.message);
    }
}
