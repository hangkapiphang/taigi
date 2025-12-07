const REPO_API_URL = "https://api.github.com/repos/hangkapiphang/taigi/contents/data";

/**
 * Initialize: Fetch file list from GitHub when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    const select = document.getElementById('repo-files');
    const loading = document.getElementById('loading');
    
    loading.style.display = 'block';

    try {
        const response = await fetch(REPO_API_URL);
        if (!response.ok) throw new Error("Failed to fetch data");
        
        const data = await response.json();
        
        // Extract unique IDs (filenames without extensions)
        const ids = new Set();
        
        data.forEach(file => {
            // Filter mainly for files, exclude hidden files
            if (file.type === "file" && !file.name.startsWith('.')) {
                // Remove extension (e.g., "movie_01.json" -> "movie_01")
                const id = file.name.replace(/\.[^/.]+$/, "");
                ids.add(id);
            }
        });

        // Populate Select Option
        ids.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            select.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        const option = document.createElement('option');
        option.text = "Error loading files (Check Network)";
        select.appendChild(option);
    } finally {
        loading.style.display = 'none';
    }
});

/**
 * Handle Dropdown Selection
 */
function selectFile() {
    const select = document.getElementById('repo-files');
    const input = document.getElementById('fileId');
    
    if (select.value) {
        input.value = select.value;
        updateButtons(); // Trigger button update
    }
}

/**
 * Update Editor Links with the ID parameter
 */
function updateButtons() {
    const id = document.getElementById('fileId').value.trim();
    const subBtn = document.getElementById('link-sub');
    const vocabBtn = document.getElementById('link-vocab');
    const visBtn = document.getElementById('link-vis');

    if (id) {
        // Enable buttons
        subBtn.classList.remove('disabled');
        vocabBtn.classList.remove('disabled');
        visBtn.classList.remove('disabled');

        // Update HREFs with query param
        subBtn.href = `subtitle_editor.html?id=${id}`;
        vocabBtn.href = `vocab_editor.html?id=${id}`;
        visBtn.href = `visual_editor.html?id=${id}`;
    } else {
        // Disable buttons if no ID
        subBtn.classList.add('disabled');
        vocabBtn.classList.add('disabled');
        visBtn.classList.add('disabled');
    }
}

/**
 * Generate and open the player link
 */
function openPlayer() {
    const id = document.getElementById('fileId').value.trim();
    if(!id) { alert("Please enter or select an ID"); return; }
    
    // Construct Link
    // Removes 'views/admin/editor.html' and points to root 'cinema.html'
    // Logic: Current path "views/admin/" -> go up two levels to root -> cinema.html
    const currentPath = window.location.pathname;
    
    // Simple replace strategy assuming standard folder structure
    // If hosted at /taigi/views/admin/editor.html -> /taigi/cinema.html
    let newPath = currentPath.replace('views/admin/editor.html', 'cinema.html');
    
    // Fallback if structure is flat locally
    if(newPath === currentPath) {
        newPath = newPath.replace('editor.html', 'cinema.html');
    }

    const url = `${window.location.origin}${newPath}?id=${id}`;
    
    const out = document.getElementById('link-output');
    out.style.display = 'block';
    out.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
    
    window.open(url, '_blank');
}