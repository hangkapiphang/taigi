// explicitly fetch from 'gh-pages' branch where the site and data live
const REPO_API_URL = "https://api.github.com/repos/hangkapiphang/taigi/contents/data?ref=gh-pages";

/**
 * Initialize: Fetch file list from GitHub when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    const select = document.getElementById('repo-files');
    const loading = document.getElementById('loading');
    
    loading.style.display = 'block';

    try {
        const response = await fetch(REPO_API_URL);
        
        if (!response.ok) {
            // Fallback: If gh-pages fails, try default branch (remove query param)
            if (REPO_API_URL.includes("?ref=")) {
                console.warn("gh-pages branch not found or accessible, trying default branch...");
                const fallbackUrl = REPO_API_URL.split("?")[0];
                const fallbackResponse = await fetch(fallbackUrl);
                if (fallbackResponse.ok) {
                   processData(await fallbackResponse.json(), select);
                   return;
                }
            }
            throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        processData(data, select);

    } catch (error) {
        console.error("Error details:", error);
        const option = document.createElement('option');
        option.text = "Error loading files (See Console)";
        select.appendChild(option);
    } finally {
        loading.style.display = 'none';
    }
});

/**
 * Helper to process the JSON response and populate the dropdown
 */
function processData(data, selectElement) {
    // Extract unique IDs (filenames without extensions)
    const ids = new Set();
    
    if (Array.isArray(data)) {
        data.forEach(file => {
            // Filter mainly for files, exclude hidden files
            if (file.type === "file" && !file.name.startsWith('.')) {
                // Remove extension (e.g., "movie_01.json" -> "movie_01")
                const id = file.name.replace(/\.[^/.]+$/, "");
                ids.add(id);
            }
        });
    }

    // Populate Select Option
    ids.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        selectElement.appendChild(option);
    });
    
    if (ids.size === 0) {
         const option = document.createElement('option');
         option.text = "No data files found";
         selectElement.appendChild(option);
    }
}

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
    const currentPath = window.location.pathname;
    
    // Logic: Current path "views/admin/" -> go up two levels to root -> cinema.html
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
