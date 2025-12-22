let libraryData = [];

// [GitHub Config logic from previous discussions goes here]

function render() {
    const list = document.getElementById('list-area');
    list.innerHTML = "";
    if(libraryData.length === 0) { list.innerHTML = "<div style='text-align:center;'>Archive empty. Add a new entry.</div>"; return; }

    libraryData.forEach((item, i) => {
        const { title="", yt="", id="", tag="", level="A1", desc="" } = item;
        list.innerHTML += `
            <div class="edit-card">
                <img src="https://img.youtube.com/vi/${yt}/mqdefault.jpg" class="thumb-preview" onerror="this.src='https://via.placeholder.com/120?text=No+Img'">
                <div class="input-grid">
                    <input value="${title}" onchange="up(${i},'title',this.value)" placeholder="Title">
                    <input value="${id}" onchange="up(${i},'id',this.value)" placeholder="ID">
                    <input value="${yt}" onchange="up(${i},'yt',this.value)" placeholder="YT ID">
                    <select onchange="up(${i},'cat',this.value)">
                        <option value="song" ${item.cat=='song'?'selected':''}>Song</option>
                        <option value="cartoon" ${item.cat=='cartoon'?'selected':''}>Cartoon</option>
                        <option value="speech" ${item.cat=='speech'?'selected':''}>Speech</option>
                        <option value="drama" ${item.cat=='drama'?'selected':''}>Drama</option>
                    </select>
                    
                    <!-- Tag with Datalist -->
                    <input list="tag-suggestions" value="${tag}" onchange="up(${i},'tag',this.value)" placeholder="Sub-Cat">
                    
                    <select onchange="up(${i},'level',this.value)">
                        <option value="A1" ${level=='A1'?'selected':''}>A1</option>
                        <option value="A2" ${level=='A2'?'selected':''}>A2</option>
                        <option value="B1" ${level=='B1'?'selected':''}>B1</option>
                        <option value="B2" ${level=='B2'?'selected':''}>B2</option>
                        <option value="C1" ${level=='C1'?'selected':''}>C1</option>
                    </select>
                    <input class="full-width" value="${desc}" onchange="up(${i},'desc',this.value)" placeholder="Desc">
                </div>
                <button class="btn-del" onclick="del(${i})"><i class="fas fa-trash"></i></button>
            </div>`;
    });
}
function up(i,k,v){ libraryData[i][k]=v; if(k==='yt') render(); }
function del(i){ if(confirm("Del?")) {libraryData.splice(i,1); render();} }
function addItem(){ libraryData.unshift({id:"new",title:"",yt:"",cat:"song",tag:"",level:"A1",desc:""}); render(); }
