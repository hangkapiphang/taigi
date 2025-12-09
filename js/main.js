const gallery = document.getElementById('gallery');
const btns = document.querySelectorAll('.filter-btn');
let fullLibrary = [];

// 1. Fetch the Database
async function loadLibrary() {
    try {
        const response = await fetch(`../data/library.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("Library file missing");

        fullLibrary = await response.json();
        fullLibrary.reverse();

        render(fullLibrary);
    } catch (error) {
        console.error(error);
        gallery.innerHTML = `
            <div class="signal-card" style="grid-column: 1/-1;">
                <h2 class="target-word" style="color:var(--neon-red)">CONNECTION FAILED</h2>
                <p>Unable to retrieve library protocol. Check console.</p>
            </div>`;
    }
}

// 2. Filter Logic
window.filterData = function(category) {
    // Update Active Button Visuals
    btns.forEach(b => {
        if(!b.classList.contains('req-btn')) b.classList.remove('active');
    });
    // Find the button that was clicked and make it active
    const clickedBtn = Array.from(btns).find(b => b.textContent.toLowerCase().includes(category) || (category === 'all' && b.textContent.includes('All')));
    if(event.target.classList.contains('filter-btn')) {
        event.target.classList.add('active');
    }

    // Filter
    const filtered = category === 'all'
        ? fullLibrary
        : fullLibrary.filter(item => item.cat === category);

    render(filtered);
}

// 3. Render Cards (Sci-Fi Theme)
function render(data) {
    gallery.innerHTML = '';

    if(data.length === 0) {
        gallery.innerHTML = `
            <div class="signal-card" style="grid-column: 1/-1;">
                <div class="signal-label">SYSTEM ALERT</div>
                <div class="target-word" style="font-size:2rem; color:var(--text-main)">NO DATA FOUND</div>
            </div>`;
        return;
    }

    data.forEach(item => {
        // High Res Thumbnail
        const thumb = `https://img.youtube.com/vi/${item.yt}/hqdefault.jpg`;

        // Map Category to Sci-Fi Label
        let tagName = item.cat.toUpperCase();
        let glowColor = 'var(--neon-cyan)';
        
        if(item.cat === 'song') { tagName = 'AUDIO SIGNAL'; glowColor = 'var(--neon-orange)'; }
        else if(item.cat === 'cartoon') { tagName = 'VISUAL FEED'; }
        else if(item.cat === 'speech') { tagName = 'VOCAL DATA'; }
        else if(item.cat === 'drama') { tagName = 'SIMULATION'; }

        // Generate Sci-Fi Card HTML
        // We use inline styles for the buttons to make them smaller than the main game buttons
        const html = `
            <div class="signal-card">
                <div class="signal-label" style="color:${glowColor}">
                    <span style="background:${glowColor}; width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:5px; box-shadow: 0 0 5px ${glowColor}"></span>
                    INCOMING: ${tagName}
                </div>
                
                <div class="target-word" style="font-size: 1.8rem; margin-top: 30px; line-height:1.1; min-height: 3.6rem; display:flex; align-items:end; justify-content:center;">
                    ${item.title}
                </div>

                <a href="cinema.html?id=${item.id}">
                    <img src="${thumb}" class="holo-thumb" alt="${item.title}">
                </a>
                
                <div class="sub-word" style="font-size: 1rem; margin-bottom: 20px; color: var(--text-main); font-family:'Share Tech Mono'">
                    ${item.desc}
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <a href="cinema.html?id=${item.id}" class="hud-btn" style="padding: 10px; font-size: 1rem; text-decoration:none; text-align:center; color:var(--neon-cyan); border-color:var(--neon-cyan);">
                        ▶ WATCH
                    </a>
                    <a href="shadow.html?id=${item.id}" class="hud-btn" style="padding: 10px; font-size: 1rem; text-decoration:none; text-align:center;">
                        🎙 SHADOW
                    </a>
                    <a href="cards.html?id=${item.id}" class="hud-btn" style="padding: 10px; font-size: 1rem; text-decoration:none; text-align:center;">
                        📖 VOCAB
                    </a>
                    <a href="arcade.html?id=${item.id}" class="hud-btn" style="padding: 10px; font-size: 1rem; text-decoration:none; text-align:center; color:var(--neon-orange); border-color:var(--neon-orange);">
                        🎮 QUIZ
                    </a>
                </div>
            </div>
        `;
        gallery.insertAdjacentHTML('beforeend', html);
    });
}

// Start
loadLibrary();
