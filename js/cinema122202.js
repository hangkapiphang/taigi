const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

// Update link to flashcards
const cardLink = document.getElementById('link-to-cards');
if(cardLink) cardLink.href = videoId ? `cards.html?id=${videoId}` : 'index.html';

document.getElementById('video-title-display').innerText = "Watching: " + (videoId || "Clip");

let player;
// In real app, fetch YouTube ID from JSON using videoId
// Here we default to a placeholder for demo
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%', width: '100%', videoId: 'hM9KbU3l3IA', 
        events: { 'onReady': loadVocab }
    });
}

function loadVocab() {
    const list = document.getElementById('vocab-list');
    list.innerHTML = '';
    const words = [{w:"Tâi-gí",d:"Taiwanese"},{w:"Siaⁿ-ūn",d:"Phonology"},{w:"Ki-chhó͘",d:"Basic"}];
    words.forEach(item => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `<span class="v-word">${item.w}</span><span style="font-size:0.9em; color:#666">${item.d}</span>`;
        list.appendChild(div);
    });
}
