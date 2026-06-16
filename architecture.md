# System Architecture: BigQuery Release Notes Dashboard

This document details the architectural layout, component interactions, and data flows of the BigQuery Release Notes Dashboard.

---

## 🏗️ System Component Map

```mermaid
flowchart TD
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef server fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px;
    classDef external fill:#fef3c7,stroke:#d97706,stroke-width:2px;

    subgraph Client [Browser / Client-Side UI]
        HTML[HTML5 Layout & SVGs]
        CSS[Vanilla CSS3 Grid/Flexbox]
        JS[ES6+ app.js Controller]
        Modal[Share/Tweet Modal]
        Toggle[Theme Storage]
    end
    class HTML,CSS,JS,Modal,Toggle client;

    subgraph Server [Flask Backend Server]
        app[app.py Core Application]
        wsgi[wsgi.py Entrypoint]
        Parser[BeautifulSoup Parser]
        Cache[(In-Memory Cache Dict)]
    end
    class app,wsgi,Parser,Cache server;

    subgraph External [External Resources]
        Feed[BigQuery Release Notes XML]
        XIntent[Twitter/X Web Intent API]
    end
    class Feed,XIntent external;

    %% User interaction
    User([User]) -->|Opens Browser| HTML
    HTML <--> JS
    JS <--> Modal
    JS <--> Toggle

    %% API Data Flow
    JS -->|1. GET /api/release-notes| app
    app -->|2. Check Cache| Cache
    
    %% Cache Miss
    app -.->|3a. HTTP GET Feed| Feed
    Feed -.->|4a. XML Response| app
    app -.->|5a. Slice by H3 headers| Parser
    app -.->|6a. Write Data & Expiry| Cache
    
    %% Cache Hit
    Cache -->|3b. Serve Data| app
    
    %% JSON Response & Render
    app -->|7. JSON Response| JS
    JS -->|8. Render Cards| HTML

    %% Sharing Actions
    Modal -->|Copy text to Clipboard| Clipboard[[System Clipboard]]
    Modal -->|Post intent redirect| XIntent
```

---

## 📂 Component Responsibilities

### 1. Browser Client-Side
* **HTML/CSS:** Handles structural grids, cards rendering, glassmorphic themes (dark/light), and skeleton loading animations.
* **JavaScript (`app.js`):**
  * Controls view states (loading, empty filters, cards grid).
  * Executes client-side filters (by keyword search, category pills) and date-based sorting.
  * Formats custom tweet strings based on selected card contents, validating length limitations (280 characters).
  * Manages theme toggling and persists selection using local storage (`localStorage`).

### 2. Flask Backend Application
* **Flask Router (`app.py`):** Serves the main template index route (`/`) and handles API requests (`/api/release-notes`). Supports a force-refresh trigger (`?refresh=true`).
* **XML Parsing Engine:** Utilizes Python's standard `xml.etree.ElementTree` to identify entries, extracting metadata like entry titles (dates) and update links.
* **BeautifulSoup Segmenter:** Parses raw HTML nested inside Atom CDATA blocks, dividing content into discrete updates sorted by type (Feature, Change, Issue, Deprecation).
* **Caching Layer:** Stores parsed JSON payloads in-memory, locked to a 10-minute timeout. This avoids rate-limiting, handles fallback returns in case the external feed is offline, and reduces API loading latencies.

### 3. External integrations
* **Google Cloud Feed:** The source feed hosting BigQuery updates.
* **Twitter/X Intent API:** Used to securely pre-populate posts for sharing via URL redirects, avoiding API writes or keys.
