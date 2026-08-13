#!/usr/bin/env python3
"""Dependency-free production checks for the static Verto Studio site."""

from __future__ import annotations

import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".html", ".css", ".js", ".svg", ".xml", ".txt", ".md"}
LOCAL_ATTRS = {"href", "src", "srcset"}
IGNORE_SCHEMES = ("http://", "https://", "mailto:", "tel:", "data:")


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str, str]] = []
        self.images: list[dict[str, str]] = []
        self.ids: list[str] = []
        self.h1_count = 0
        self.title_count = 0
        self.meta_names: set[str] = set()
        self.meta_properties: set[str] = set()
        self.external_blank_links: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if "id" in values:
            self.ids.append(values["id"])
        if tag == "h1":
            self.h1_count += 1
        if tag == "title":
            self.title_count += 1
        if tag == "meta":
            if values.get("name"):
                self.meta_names.add(values["name"].lower())
            if values.get("property"):
                self.meta_properties.add(values["property"].lower())
        if tag == "img":
            self.images.append(values)
        for attr in LOCAL_ATTRS:
            value = values.get(attr)
            if value:
                self.refs.append((tag, attr, value))
        if tag == "a" and values.get("target") == "_blank":
            self.external_blank_links.append(values)


def local_target(page: Path, raw: str) -> Path | None:
    candidate = raw.split(",", 1)[0].strip().split()[0]
    if not candidate or candidate.startswith(("#", *IGNORE_SCHEMES)):
        return None
    path = urlsplit(candidate).path
    if not path:
        return None
    target = ROOT / path.lstrip("/") if path.startswith("/") else page.parent / path
    target = target.resolve()
    if target.is_dir():
        target /= "index.html"
    return target


def check_html(page: Path, failures: list[str]) -> None:
    parser = PageParser()
    text = page.read_text(encoding="utf-8")
    parser.feed(text)

    rel = page.relative_to(ROOT)
    if parser.title_count != 1:
        failures.append(f"{rel}: expected one <title>, found {parser.title_count}")
    if parser.h1_count != 1:
        failures.append(f"{rel}: expected one <h1>, found {parser.h1_count}")

    duplicates = [item for item, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        failures.append(f"{rel}: duplicate ids: {', '.join(duplicates)}")

    for tag, attr, raw in parser.refs:
        target = local_target(page, raw)
        if target is not None and not target.exists():
            failures.append(f"{rel}: broken {tag}[{attr}] -> {raw}")

    for image in parser.images:
        src = image.get("src", "<missing>")
        if not image.get("alt"):
            failures.append(f"{rel}: image has missing/empty alt: {src}")
        if not image.get("width") or not image.get("height"):
            failures.append(f"{rel}: image lacks width/height: {src}")

    for link in parser.external_blank_links:
        rel_tokens = set(link.get("rel", "").split())
        if not {"noopener", "noreferrer"}.issubset(rel_tokens):
            failures.append(f"{rel}: target=_blank link lacks safe rel: {link.get('href')}")

    if rel in {Path("index.html"), Path("services.html")}:
        required_names = {"description", "viewport", "twitter:card"}
        required_properties = {"og:title", "og:description", "og:url", "og:image"}
        missing_names = required_names - parser.meta_names
        missing_properties = required_properties - parser.meta_properties
        if missing_names:
            failures.append(f"{rel}: missing meta names: {', '.join(sorted(missing_names))}")
        if missing_properties:
            failures.append(f"{rel}: missing OG properties: {', '.join(sorted(missing_properties))}")
        if 'rel="canonical"' not in text:
            failures.append(f"{rel}: canonical link missing")


def check_css(css_file: Path, failures: list[str]) -> None:
    text = css_file.read_text(encoding="utf-8")
    for raw in re.findall(r"url\(([^)]+)\)", text):
        value = raw.strip().strip("'\"")
        target = local_target(css_file, value)
        if target is not None and not target.exists():
            failures.append(f"{css_file.relative_to(ROOT)}: broken url() -> {value}")


def check_security(failures: list[str]) -> dict[str, list[str]]:
    inventory = {
        "cookies": [],
        "localStorage": [],
        "sessionStorage": [],
        "analytics_or_trackers": [],
        "embedded_content": [],
    }
    unsafe_patterns = {
        "blob URL": re.compile(r"\bblob:", re.I),
        "file URL": re.compile(r"\bfile://", re.I),
        "localhost dependency": re.compile(r"(?:src|href)=[\"']https?://(?:localhost|127\.0\.0\.1)", re.I),
        "javascript URL": re.compile(r"javascript\s*:", re.I),
        "eval": re.compile(r"\beval\s*\(", re.I),
        "dangerous innerHTML": re.compile(r"\.innerHTML\s*=", re.I),
    }
    secret_pattern = re.compile(
        r"(?:BOT_TOKEN|TELEGRAM_TOKEN|OPENAI_API_KEY|API_SECRET)\s*[=:]\s*[\"'][^\"']{12,}",
        re.I,
    )
    tracker_pattern = re.compile(
        r"googletagmanager|google-analytics|gtag\s*\(|mc\.yandex|ym\s*\(|facebook\.com/tr|meta[_ -]?pixel|hotjar|clarity\.ms",
        re.I,
    )

    for file in ROOT.rglob("*"):
        if not file.is_file() or ".git" in file.parts or file.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = file.read_text(encoding="utf-8", errors="ignore")
        rel = str(file.relative_to(ROOT))
        if file.suffix.lower() in {".html", ".css", ".js", ".svg"}:
            for label, pattern in unsafe_patterns.items():
                if pattern.search(text):
                    failures.append(f"{rel}: found {label}")
            if secret_pattern.search(text):
                failures.append(f"{rel}: possible committed secret")
        if re.search(r"document\.cookie", text):
            inventory["cookies"].append(rel)
        if file.suffix.lower() == ".js" and "localStorage" in text:
            inventory["localStorage"].append(rel)
        if file.suffix.lower() == ".js" and "sessionStorage" in text:
            inventory["sessionStorage"].append(rel)
        if tracker_pattern.search(text):
            inventory["analytics_or_trackers"].append(rel)
        if file.suffix.lower() == ".html" and re.search(r"<(?:iframe|embed|object)\b", text, re.I):
            inventory["embedded_content"].append(rel)
    return inventory


def main() -> int:
    failures: list[str] = []
    html_pages = sorted(ROOT.rglob("*.html"))
    css_files = sorted(ROOT.rglob("*.css"))

    for page in html_pages:
        check_html(page, failures)
    for css_file in css_files:
        check_css(css_file, failures)

    inventory = check_security(failures)

    cname = (ROOT / "CNAME").read_text(encoding="utf-8").strip()
    if cname != "vertostudio.ru":
        failures.append(f"CNAME changed unexpectedly: {cname!r}")

    required_public_files = {
        "index.html",
        "services.html",
        "privacy.html",
        "personal-data-consent.html",
        "terms.html",
        "404.html",
        "robots.txt",
        "sitemap.xml",
        "favicon.svg",
    }
    for name in required_public_files:
        if not (ROOT / name).exists():
            failures.append(f"missing required public file: {name}")

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    for url in ("https://vertostudio.ru/", "https://vertostudio.ru/services.html"):
        if f"<loc>{url}</loc>" not in sitemap:
            failures.append(f"sitemap missing {url}")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    for start in ("order", "audit", "redesign", "contact"):
        if f"?start={start}" not in index:
            failures.append(f"index.html missing Telegram start parameter: {start}")

    css = (ROOT / "main.css").read_text(encoding="utf-8")
    if not re.search(r"body\s*\{[^}]*background:\s*var\(--bg\)", css, re.S):
        failures.append("main.css: body background is not explicitly var(--bg)")
    if "--bg: #071426" not in css:
        failures.append("main.css: protected brand background #071426 missing")

    print(f"HTML pages checked: {len(html_pages)}")
    print(f"CSS files checked: {len(css_files)}")
    print("Tracking technology inventory:")
    for label, files in inventory.items():
        print(f"  {label}: {', '.join(files) if files else 'none'}")

    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("\nPASS: internal resources, images, metadata, security patterns, CNAME and deep-links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
