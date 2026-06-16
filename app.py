import datetime
import os
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for API requests
cache = {
    "data": None,
    "expiry": None
}
CACHE_DURATION = datetime.timedelta(minutes=10)

def parse_release_notes():
    """
    Fetches the BigQuery release notes XML feed, parses it, and returns
    a list of individual release note items.
    """
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_data = response.content
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return []

    try:
        root = ET.fromstring(xml_data)
        # Atom namespaces
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        entries = []
        for entry_el in root.findall("atom:entry", ns):
            title_el = entry_el.find("atom:title", ns)
            updated_el = entry_el.find("atom:updated", ns)
            link_el = entry_el.find("atom:link[@rel='alternate']", ns)
            content_el = entry_el.find("atom:content", ns)
            
            date_str = title_el.text if title_el is not None else "Unknown Date"
            updated_val = updated_el.text if updated_el is not None else ""
            link_url = link_el.attrib.get("href") if link_el is not None else ""
            html_content = content_el.text if content_el is not None else ""
            
            # Use BeautifulSoup to segment the content by <h3> headers (Feature, Change, Issue, etc.)
            soup = BeautifulSoup(html_content, "html.parser")
            headings = soup.find_all("h3")
            
            if not headings:
                # Fallback if there are no h3 tags: treat the entire body as one "General" update
                if html_content.strip():
                    entries.append({
                        "date": date_str,
                        "updated": updated_val,
                        "type": "General",
                        "content": html_content.strip(),
                        "link": link_url
                    })
            else:
                for heading in headings:
                    item_type = heading.get_text().strip()
                    
                    # Accumulate all siblings until the next h3 heading
                    sibling_content = []
                    sibling = heading.next_sibling
                    while sibling and sibling.name != "h3":
                        if sibling.name:
                            sibling_content.append(str(sibling))
                        elif isinstance(sibling, str) and sibling.strip():
                            sibling_content.append(sibling.strip())
                        sibling = sibling.next_sibling
                    
                    content_body = "".join(sibling_content).strip()
                    if content_body:
                        entries.append({
                            "date": date_str,
                            "updated": updated_val,
                            "type": item_type,
                            "content": content_body,
                            "link": link_url
                        })
                        
        return entries
    except Exception as e:
        print(f"Error parsing feed XML: {e}")
        return []

@app.route("/")
def index():
    """Renders the main dashboard template."""
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    """API endpoint providing the parsed release notes list (with cache support)."""
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    now = datetime.datetime.now()
    
    # Return cache if valid and not forced to refresh
    if not force_refresh and cache["data"] is not None and cache["expiry"] > now:
        return jsonify({
            "source": "cache",
            "cached_at": (cache["expiry"] - CACHE_DURATION).isoformat(),
            "notes": cache["data"]
        })
        
    # Fetch and parse
    notes = parse_release_notes()
    if notes:
        cache["data"] = notes
        cache["expiry"] = now + CACHE_DURATION
        return jsonify({
            "source": "live",
            "notes": notes
        })
    else:
        # Fallback to cache if feed is down
        if cache["data"] is not None:
            return jsonify({
                "source": "cache_fallback",
                "notes": cache["data"]
            })
        return jsonify({
            "source": "error",
            "notes": [],
            "message": "Failed to retrieve release notes."
        }), 500

if __name__ == "__main__":
    # Determine server settings dynamically from environment variables for production safety
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    host_ip = os.environ.get("FLASK_RUN_HOST", "127.0.0.1")
    port_num = int(os.environ.get("FLASK_RUN_PORT", 5000))

    app.run(debug=debug_mode, host=host_ip, port=port_num)
