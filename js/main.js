const gallery = document.getElementById('gallery');
const btns = document.querySelectorAll('.filter-btn');
let fullLibrary = [];

// 1. Fetch the Database
async function loadLibrary() {
    try {
        // ?t= timestamp prevents caching old data
        const response = await fetch(`../data/library.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("Library file missing");

        fullLibrary = await response.json();

        // Sort: Newest first (assuming you add new items to end of JSON)
        fullLibrary.reverse();

        render(fullLibrary);
    } catch (error) {
        console.error(error);
        gallery.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999; grid-column:1/-1;">
                <h3>Library is empty</h3>
                <p>Add items to <code>data/library.json</code> to see them here.</p>
            </div>`;
    }
}

// 2. Filter Logic
window.filterData = function(category) {
    // Update Active Button
    btns.forEach(b => {
        if(!b.classList.contains('req-btn')) b.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter
    const filtered = category === 'all'
        ? fullLibrary
        : fullLibrary.filter(item => item.cat === category);

    render(filtered);
}

// 3. Render Cards
function render(data) {
    gallery.innerHTML = '';

    if(data.length === 0) {
        gallery.innerHTML = '<div style="text-align:center; padding:40px; color:#999; grid-column:1/-1;">No videos found in this category.</div>';
        return;
    }

    data.forEach(item => {
        // Get High Res Thumbnail
        const thumb = `https://img.youtube.com/vi/${item.yt}/hqdefault.jpg`;

        // Format Tag
        let tagName = item.cat.toUpperCase();
        if(item.cat === 'song') tagName = '🎵 SONG';
        else if(item.cat === 'cartoon') tagName = '🧸 CARTOON';
        else if(item.cat === 'speech') tagName = '🎤 SPEECH';
        else if(item.cat === 'drama') tagName = '🎭 DRAMA';

        const html = `
            <div class="card">
                <a href="cinema.html?id=${item.id}" class="thumbnail-link">
                    <img src="${thumb}" class="thumbnail" alt="${item.title}">
                    <div class="play-icon">▶</div>
                </a>
                <div class="card-body">
                    <div class="card-tag">${tagName}</div>
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.desc}</div>

                    <div class="action-row">
                        <a href="cinema.html?id=${item.id}" class="action-btn btn-watch" title="Watch Video">▶ Watch</a>
                        <a href="shadow.html?id=${item.id}" class="action-btn btn-shadow" title="Speaking Practice">🎙 Shadow</a>
                        <a href="vocab.html?id=${item.id}" class="action-btn btn-vocab" title="Vocabulary Cards">📖 Vocab</a>
                        <a href="arcade.html?id=${item.id}" class="action-btn" style="background:#e67e22" title="Quiz Game">🎮 Quiz</a>
                    </div>
                </div>
            </div>
        `;
        gallery.insertAdjacentHTML('beforeend', html);
    });
}

// Start
loadLibrary();
