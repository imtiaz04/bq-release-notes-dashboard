# BigQuery Release Notes Dashboard

A highly responsive, modern, and beautiful Flask web application that fetches, parses, and visualizes Google Cloud BigQuery release notes in a card-based layout. It features a powerful client-side search, tags filter, theme selection, and an automated Twitter/X post formatter.

---

## 🚀 Key Features
- **Smart Atom Feed Parsing:** Pulls live release notes from the official Google Cloud feed. It parses and splits dates grouping multiple updates into clean, individual cards.
- **Filtering & Real-time Search:** Instantly search keywords or filter by update type (`Feature`, `Change`, `Issue`, `Deprecation`).
- **Caching Mechanism:** Cache feed responses locally for 10 minutes to minimize network latency and prevent API throttling.
- **Refresh Flow:** Update data on-demand with a click. While loading, you'll see clean skeleton states and an active loading spinner.
- **Twitter/X Share Helper:** Click the share icon on any release note to generate a Twitter/X compatible post with hashtags and auto-truncated text, copyable to clipboard or directly postable to X.
- **Light/Dark Mode Theme:** Automatically detects system preferences and remembers user selections using local storage.

---

## 📂 Project Structure
```text
bq-release-notes/
├── app.py                  # Flask App & Feed Parser Engine
├── requirements.txt        # Python dependency list
├── README.md               # Setup and usage guide (this file)
├── templates/
│   └── index.html          # HTML structure & SVG icons
└── static/
    ├── css/
    │   └── style.css       # Layout grids, color vars, dark mode, animations
    └── js/
        └── app.js          # App controller (fetching, filters, sharing, theme)
```
## Architecture Diagram

<img width="577" height="688" alt="Architechture" src="https://github.com/user-attachments/assets/d000d825-5dc0-4d19-8877-bc7b97bfd84c" />

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Python 3.8+** must be installed on your system.
- Access to the Internet (to download dependencies and fetch Google Cloud XML feeds).

### 2. Install Dependencies
Navigate to the project directory and install the packages listed in `requirements.txt`:
```powershell
# In PowerShell / command prompt
cd C:\Users\Admin\bq-release-notes
pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask development server:
```powershell
python app.py
```

### 4. Access the Dashboard
Open your web browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 📖 How to Use

- **Search:** Start typing in the search bar. It instantly filters cards by matching title, content body, or date.
- **Category Filter:** Click any of the category pills (`All Updates`, `Features`, `Changes`, `Issues`, `Deprecations`) to filter cards instantly.
- **Sorting:** Use the drop-down menu on the right to toggle between `Newest First` and `Oldest First`.
- **Manual Refresh:** Click the **Refresh Notes** button in the header. The spinner will rotate as it downloads fresh data.
- **Sharing:** Click the share icon (connected nodes symbol) at the bottom-right of any card. A modal will appear displaying an auto-generated tweet containing the summary, date, category tag, and official link. You can edit the text, monitor character limits (280 max), copy it, or click **Post to X** to tweet it.
