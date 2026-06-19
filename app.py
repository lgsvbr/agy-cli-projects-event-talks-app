"""
BigQuery Release Notes Viewer
Flask backend that proxies the Google Cloud BigQuery Atom feed
and serves a clean JSON API for the frontend.
"""

import re
import html
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, render_template
from xml.etree import ElementTree as ET

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = "http://www.w3.org/2005/Atom"

# Tag-type colour mapping (used by the frontend)
TYPE_COLOURS = {
    "feature": "#4285F4",
    "announcement": "#34A853",
    "breaking change": "#EA4335",
    "deprecation": "#FBBC04",
    "issue": "#FF6D00",
    "fix": "#00BCD4",
    "security": "#AB47BC",
    "changed": "#00ACC1",
}


def _strip_html(raw: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_types(content_html: str) -> list[str]:
    """Pull the category heading(s) from the entry HTML, e.g. Feature / Issue."""
    return re.findall(r"<h3[^>]*>(.*?)</h3>", content_html, re.IGNORECASE)


def _parse_feed(xml_text: str) -> dict:
    root = ET.fromstring(xml_text)

    feed_title = root.findtext(f"{{{ATOM_NS}}}title") or "BigQuery Release Notes"
    feed_updated_raw = root.findtext(f"{{{ATOM_NS}}}updated") or ""

    entries = []
    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        title = entry.findtext(f"{{{ATOM_NS}}}title") or ""
        updated_raw = entry.findtext(f"{{{ATOM_NS}}}updated") or ""
        entry_id = entry.findtext(f"{{{ATOM_NS}}}id") or ""

        link_el = entry.find(f"{{{ATOM_NS}}}link[@rel='alternate']")
        link = link_el.get("href", "#") if link_el is not None else "#"

        content_el = entry.find(f"{{{ATOM_NS}}}content")
        content_html = content_el.text or "" if content_el is not None else ""

        types = _extract_types(content_html)
        plain_text = _strip_html(content_html)

        # Build a short tweet-friendly snippet (≤ 220 chars to leave room for URL)
        snippet = plain_text[:220] + ("…" if len(plain_text) > 220 else "")

        entries.append(
            {
                "id": entry_id,
                "title": title,
                "updated": updated_raw,
                "link": link,
                "content_html": content_html,
                "plain_text": plain_text,
                "snippet": snippet,
                "types": types,
            }
        )

    return {
        "feed_title": feed_title,
        "feed_updated": feed_updated_raw,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "entries": entries,
        "type_colours": TYPE_COLOURS,
    }


# ─── Routes ──────────────────────────────────────────────────────────────────


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/feed")
def api_feed():
    try:
        resp = requests.get(FEED_URL, timeout=15)
        resp.raise_for_status()
        data = _parse_feed(resp.text)
        return jsonify({"ok": True, "data": data})
    except requests.exceptions.RequestException as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502
    except ET.ParseError as exc:
        return jsonify({"ok": False, "error": f"XML parse error: {exc}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
