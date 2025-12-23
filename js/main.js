const gallery = document.getElementById('gallery');
const btns = document.querySelectorAll('.filter-btn');
let fullLibrary = [];

async function loadLibrary() {
    try {
        const response = await fetch(`../data/library.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("Missing File");
        fullLibrary = await response.json();
        fullLibrary.reverse();
        render(fullLibrary);
    } catch (error) {
        gallery.innerHTML = `<div style="text-align:center; padding:40px; color:#BFA66F;">Library File (data/library.json) Not Found.</div>`;
    }
}

window.filterData = function(category) {
    btns.forEach(b => { if(!b.classList.contains('req-btn')) b.classList.remove('active'); });
    event.target.classList.add('active');
    const filtered = category === 'all' ? fullLibrary : fullLibrary.filter(item => item.cat === category);
    render(filtered);
}

document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = fullLibrary.filter(v => v.title.toLowerCase().includes(term) || v.level.toLowerCase().includes(term) || (v.tag && v.tag.toLowerCase().includes(term)));
    render(filtered);
});

function render(data) {
    gallery.innerHTML = '';
    if(data.length === 0) { gallery.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No results.</div>'; return; }

    data.forEach(item => {
        const thumb = `https://img.youtube.com/vi/${item.yt}/mqdefault.jpg`;
        let catDisplay = item.cat.charAt(0).toUpperCase() + item.cat.slice(1);
        const subCat = item.tag ? ` • ${item.tag}` : '';
        const levelBadge = item.level ? `<span style="border:1px solid #BFA66F; padding:0 4px; border-radius:4px; font-size:0.75em; margin-right:5px; color:#556B2F;">${item.level}</span>` : '';

        const html = `
            <div class="card">
                <a href="cinema.html?id=${item.id}" class="thumbnail-link">
                    <img src="${thumb}" class="thumbnail" alt="${item.title}">
                    <div class="play-icon"><i class="fas fa-play"></i></div>
                </a>
                <div class="card-body">
                    <div class="card-tag">${levelBadge} ${catDisplay}${subCat}</div>
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-desc">${item.desc}</p>
                    <div class="action-row">
                        <a href="cinema.html?id=${item.id}" class="action-btn btn-watch">Watch Clip</a>
                        <!-- 2. Shadowing (FIXED LINK HERE) -->
                    <a href="shadow.html?id=${item.id}" class="action-btn btn-shadow">Shadowing</a>
                    
                    <!-- 3. Vocab -->
                    <a href="cards.html?id=${item.id}" class="action-btn btn-vocab">Vocab Cards</a>
                    
                    <!-- 4. Quiz -->
                    <a href="arcade.html?id=${item.id}" class="action-btn btn-quiz">Take Quiz</a>
                </div>
            </div>
        </div>`;
        gallery.insertAdjacentHTML('beforeend', html);
    });
}
loadLibrary();
