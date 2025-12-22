📽️ ReelTaigi (Tâi-gí Reel)
Cinema for Learning Taiwanese.
A curated video immersion platform designed for visual learners.
ReelTaigi is a static web application that helps students learn the Taiwanese language (Taigi) through YouTube clips. It features a "Study Desk" environment, interactive flashcards, and a robust categorization system based on proficiency levels (A1-C2).
✨ Features
👩‍🎓 For Learners
Curated Gallery: Filter content by Category (Song, Drama, Cartoon, Speech) or Proficiency Level.
Smart Search: Search by title, sub-genre tags (e.g., "Indie Folk"), or level.
Cinema Mode: A "Study Desk" interface with the video on the left and a scrollable vocabulary notepad on the right.
Flashcards: Interactive vocabulary cards synced to the video timestamp. Click a word to jump to that moment in the video.
Responsive Design: Optimized for Desktop, Tablets, and iPhones (Notch-safe).
👨‍🏫 For Teachers / Admins
Librarian Desk: A built-in Admin Dashboard (library_editor.html) to manage the video database.
GitHub Sync: Directly edit and save the database (library.json) to your GitHub repository without touching code.
Tagging System: Flexible sub-categorization to keep the library organized.
📂 Project Structure
The project uses a clean, separation-of-concerns architecture. No build tools or frameworks are required.
code
Text
/ReelTaigi
│
├── data/
│   └── library.json            # The Database (Stores Videos, Levels, Tags)
│
├── css/
│   ├── style.css               # Homepage Theme (Cream & Lime)
│   ├── cinema.css              # Player Theme (Study Desk)
│   ├── cards.css               # Flashcards Theme
│   └── library_editor.css      # Admin Panel Theme (Ledger style)
│
├── js/
│   ├── main.js                 # Homepage Logic (Grid generation & Filters)
│   ├── cinema.js               # Player Logic (YouTube API & Vocab List)
│   ├── cards.js                # Flashcards Logic (Time-sync)
│   └── library_editor.js       # Admin Logic (CRUD & GitHub API)
│
└── views/
    ├── index.html              # Homepage (User Entrance)
    ├── cinema.html             # Video Player View
    ├── cards.html              # Flashcard View
    └── admin/
        └── library_editor.html # Admin Dashboard
🚀 How to Run
1. Local Development
Because this project uses the fetch() API to load the JSON database, browser security (CORS) will block it if you just double-click index.html.
Recommended: Use VS Code "Live Server".
Open the project folder in VS Code.
Right-click views/index.html.
Select "Open with Live Server".
2. Deployment
Simply upload the entire folder to GitHub Pages.
Push code to GitHub.
Go to Repo Settings > Pages.
Source: Deploy from a branch (main).
Important: Since the HTML files are in views/, you may need to move index.html to the root OR create a root index.html that redirects to views/index.html.
📚 Categorization Guide
When adding videos via the Librarian Desk, adhere to these tagging standards to ensure the Search filter works effectively.
Main Categories (cat)
Song (song)
Speech (speech)
Animation (cartoon)
Drama (drama)
Proficiency Levels (level)
A1: Beginner (Single words, greetings)
A2: Elementary (Simple sentences)
B1: Intermediate (Daily conversation)
B2: Upper Intermediate (Abstract ideas)
C1: Advanced (News, Politics, Fast speech)
Sub-Category Tags (tag)
Type these manually in the Admin "Sub-Cat" field.
Category	Recommended Tags
Song	Indie Folk, Ballad, Rock, Pop, Rap, Old School
Speech	Lecture, Vlog, Interview, News, Essay
Cartoon	Folklore, Modern, Kids, Adult
Drama	Romance, Thriller, Comedy, Short Film
🛠️ Admin Setup (GitHub Integration)
To make the Save button work in the Admin Panel:
Open the website in your browser.
Navigate to the Librarian page.
The first time you load it, it may ask for credentials or you might need to hardcode them in js/library_editor.js (for private use) or use a generated Token.
Required Credentials:
User: Your GitHub Username.
Repo: The name of this repository.
Token: A GitHub Personal Access Token with repo scope.
🎨 Design System
Theme: "Organic / Literary"
Colors:
Background: #FFFDF5 (Warm Cream)
Primary: #A8C834 (Lime Green)
Text: #556B2F (Olive) & #545454 (Grey)
Accents: #7E7CB0 (Purple)
Fonts: Lora (English/Romanization) & Noto Serif TC (Hanzi).
© 2026 Taigi Learning Project.
