from flask import Flask, render_template, jsonify, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import time
import html

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # 5 minutes in seconds

# In-memory cache for parsed release notes
feed_cache = {
    "items": [],
    "last_fetched": 0
}

def strip_html_tags(html_content):
    """
    Strips HTML tags and decodes entities to create a clean, plain text string
    suitable for tweets and search indexing.
    """
    if not html_content:
        return ""
    # Add newlines before block elements to preserve readability
    content = re.sub(r'</?(p|div|h3|h4|h5|h6|li|ul|ol|br)[^>]*>', '\n', html_content)
    # Remove all other HTML tags
    content = re.sub(r'<[^>]+>', '', content)
    # Decode HTML entities
    content = html.unescape(content)
    # Clean up whitespace
    lines = [line.strip() for line in content.split('\n')]
    content = '\n'.join([line for line in lines if line])
    return content

def fetch_and_parse_feed(force_refresh=False):
    """
    Fetches the Atom feed from Google Cloud and parses it into structured release items.
    Uses in-memory cache unless force_refresh is True.
    """
    global feed_cache
    current_time = time.time()
    
    # Return cache if valid and not forcing a refresh
    if not force_refresh and feed_cache["items"] and (current_time - feed_cache["last_fetched"]) < CACHE_DURATION:
        return feed_cache["items"], "cached"
        
    try:
        # Fetching XML
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BQReleaseNotesApp/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        # Parse XML
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        parsed_items = []
        for entry in root.findall('atom:entry', ns):
            # Extract date heading
            title = entry.find('atom:title', ns)
            date_text = title.text if title is not None else "Unknown Date"
            
            # Extract ISO updated timestamp
            updated = entry.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ""
            
            # Extract canonical link
            link = entry.find('atom:link[@rel="alternate"]', ns)
            href = link.attrib.get('href') if link is not None else ""
            
            # Extract content HTML
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Each entry (a date) can contain multiple release notes separated by <h3>
            # We use regex to partition them
            items = re.findall(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', content_html, re.DOTALL)
            
            # If no <h3> was found (fallback), treat whole block as one General update
            if not items:
                cleaned_body = content_html.strip()
                if cleaned_body:
                    parsed_items.append({
                        "id": f"{date_text.replace(' ', '_')}_0",
                        "date": date_text,
                        "type": "Update",
                        "body": cleaned_body,
                        "plain_text": strip_html_tags(cleaned_body),
                        "link": href,
                        "updated": updated_text
                    })
            else:
                for idx, (item_type, item_body) in enumerate(items):
                    item_type = item_type.strip()
                    item_body = item_body.strip()
                    
                    # Generate a unique key for each sub-item
                    item_id = f"{date_text.replace(' ', '_')}_{idx}"
                    
                    parsed_items.append({
                        "id": item_id,
                        "date": date_text,
                        "type": item_type,
                        "body": item_body,
                        "plain_text": strip_html_tags(item_body),
                        "link": href,
                        "updated": updated_text
                    })
                    
        # Update Cache
        feed_cache["items"] = parsed_items
        feed_cache["last_fetched"] = current_time
        return parsed_items, "success"
        
    except Exception as e:
        # If fetch fails but we have cached data, return cache as fallback
        if feed_cache["items"]:
            return feed_cache["items"], f"fallback_error: {str(e)}"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force = request.args.get('force', 'false').lower() == 'true'
    try:
        items, status = fetch_and_parse_feed(force_refresh=force)
        return jsonify({
            "success": True,
            "status": status,
            "count": len(items),
            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(feed_cache["last_fetched"])),
            "releases": items
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
