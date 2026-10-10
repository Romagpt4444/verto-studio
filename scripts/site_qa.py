#!/usr/bin/env python3
"""Статические проверки собранного сайта (dist/) без зависимостей.

Запуск: npm run build && python3 scripts/site_qa.py
Печатает SITE_QA_OK, если всё в порядке; иначе — список ошибок и код выхода 1.
"""

from __future__ import annotations

import html
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
LOCAL_ATTRS = {"href", "src", "srcset", "poster", "data-src"}
IGNORE_SCHEMES = ("http://", "https://", "mailto:", "tel:", "data:")
SITE = "https://vertostudio.ru"

# Страницы, которые нужно сохранить (ТЗ, раздел 17)
LEGACY = [
    "projects/morrow-coffee/index.html", "projects/apex-detailing/index.html", "projects/forma-estate/index.html",
    "projects/auren-dental/index.html", "projects/nord-cabin/index.html", "projects/noir-golf/index.html",
    "projects/otklik/index.html", "cases/lead-desk.html", "cases/master-tyres.html", "cases/the-weshalka.html",
    "lead-agent.html", "privacy.html", "terms.html", "personal-data-consent.html", "404.html",
]
REDIRECTS = {"services.html": "/#create", "studio.html": "/#start", "projects.html": "/#works"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str, str]] = []
        self.images: list[dict[str, str]] = []
        self.ids: list[str] = []
        self.h1 = 0
        self.titles = 0
        self.meta: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.blank: list[dict[str, str]] = []
        self.jsonld = False
        self._in_jsonld = False
        self.text: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        v = {k: (x or "") for k, x in attrs}
        if "id" in v:
            self.ids.append(v["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.titles += 1
        if tag == "meta":
            key = (v.get("name") or v.get("property") or v.get("http-equiv") or "").lower()
            if key:
                self.meta[key] = v.get("content", "")
        if tag == "link":
            self.links.append(v)
        if tag == "img":
            self.images.append(v)
        if tag == "script" and v.get("type") == "application/ld+json":
            self.jsonld = True
        if tag in ("script", "style"):
            self._skip += 1
        for attr in LOCAL_ATTRS:
            if v.get(attr):
                self.refs.append((tag, attr, v[attr]))
        if tag == "a" and v.get("target") == "_blank":
            self.blank.append(v)

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.text.append(data)


def parse(page: Path) -> PageParser:
    p = PageParser()
    p.feed(page.read_text(encoding="utf-8"))
    return p


def local_target(page: Path, raw: str) -> Path | None:
    cand = raw.strip().split()[0] if raw.strip() else ""
    if not cand or cand.startswith(("#", *IGNORE_SCHEMES)):
        return None
    path = urlsplit(cand).path
    if not path:
        return None
    t = DIST / path.lstrip("/") if path.startswith("/") else page.parent / path
    t = t.resolve()
    if t.is_dir():
        t = t / "index.html"
    return t


def check_page(page: Path, fails: list[str]) -> PageParser:
    rel = page.relative_to(DIST)
    text = page.read_text(encoding="utf-8")
    p = parse(page)
    is_redirect = "http-equiv=\"refresh\"" in text.lower() or "refresh" in p.meta
    if "<!doctype html>" not in text.lower():
        fails.append(f"{rel}: нет doctype")
    if "charset" not in text.lower():
        fails.append(f"{rel}: нет charset")
    if "viewport" not in p.meta:
        fails.append(f"{rel}: нет viewport")
    if p.titles != 1:
        fails.append(f"{rel}: <title> {p.titles} шт.")
    if not is_redirect and p.h1 != 1:
        fails.append(f"{rel}: <h1> {p.h1} шт.")
    dup = [i for i, c in Counter(p.ids).items() if c > 1]
    if dup:
        fails.append(f"{rel}: повтор id: {', '.join(dup)}")
    for tag, attr, raw in p.refs:
        for cand in (raw.split(",") if attr == "srcset" else [raw]):
            t = local_target(page, cand)
            if t is not None and not t.exists():
                fails.append(f"{rel}: битая ссылка {tag}[{attr}] → {cand.strip()}")
            frag = urlsplit(cand.strip().split()[0] if cand.strip() else "").fragment
            if frag and not cand.strip().startswith(IGNORE_SCHEMES):
                dest = t if t is not None else page
                if dest.exists() and dest.suffix == ".html" and frag not in parse(dest).ids:
                    fails.append(f"{rel}: нет якоря → {cand.strip()}")
    for img in p.images:
        if "alt" not in img:
            fails.append(f"{rel}: у картинки нет alt: {img.get('src')}")
        if not img.get("width") or not img.get("height"):
            fails.append(f"{rel}: у картинки нет width/height: {img.get('src')}")
    for a in p.blank:
        if not {"noopener", "noreferrer"} <= set(a.get("rel", "").split()):
            fails.append(f"{rel}: target=_blank без noopener noreferrer: {a.get('href')}")
    return p


def check_home(lang: str, fails: list[str]) -> None:
    path = DIST / ("index.html" if lang == "ru" else "en/index.html")
    rel = path.relative_to(DIST)
    text = path.read_text(encoding="utf-8")
    p = parse(path)
    t = json.loads((ROOT / f"src/i18n/{lang}.json").read_text(encoding="utf-8"))
    url = SITE + ("/" if lang == "ru" else "/en/")

    if not re.search(rf'<html[^>]*\blang="{lang}"', text):
        fails.append(f"{rel}: lang не {lang}")
    for key in ("description", "twitter:card", "og:title", "og:description", "og:url", "og:image", "og:locale", "content-security-policy", "referrer"):
        if key not in p.meta:
            fails.append(f"{rel}: нет meta {key}")
    if p.meta.get("og:locale") != ("ru_RU" if lang == "ru" else "en_US"):
        fails.append(f"{rel}: og:locale = {p.meta.get('og:locale')}")
    og = p.meta.get("og:image", "")
    if not og.startswith(SITE) or not (DIST / urlsplit(og).path.lstrip("/")).exists():
        fails.append(f"{rel}: og:image не найден: {og}")
    canon = [l.get("href") for l in p.links if l.get("rel") == "canonical"]
    if canon != [url]:
        fails.append(f"{rel}: canonical {canon} ≠ {url}")
    alts = {l.get("hreflang"): l.get("href") for l in p.links if l.get("rel") == "alternate" and l.get("hreflang")}
    if alts != {"ru": SITE + "/", "en": SITE + "/en/", "x-default": SITE + "/"}:
        fails.append(f"{rel}: hreflang {alts}")
    if not p.jsonld:
        fails.append(f"{rel}: нет JSON-LD Organization")
    if p.meta.get("description") != t["meta"]["description"] or t["meta"]["title"] not in text:
        fails.append(f"{rel}: title/description не из i18n")

    csp = p.meta.get("content-security-policy", "")
    for need in ("default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'none'", "frame-src 'none'"):
        if need not in csp:
            fails.append(f"{rel}: в CSP нет {need}")
    if "unsafe-eval" in csp or re.search(r"script-src[^;]*'unsafe-inline'", csp):
        fails.append(f"{rel}: CSP разрешает unsafe-eval/unsafe-inline для скриптов")
    if re.search(r"<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>", text) and "sha256-" not in csp:
        fails.append(f"{rel}: inline-скрипт без хэша в CSP")
    if re.search(r"https?://(?!vertostudio\.ru)[^\"' ]+\.(?:js|css)(?:[\"' ?])", text):
        fails.append(f"{rel}: внешний скрипт/стиль (CDN)")

    # Все тексты из i18n есть в HTML (кроме шаблонов и служебных ключей)
    visible = html.unescape(" ".join(p.text) + " " + text)
    skip_keys = {"_note", "contacts", "meta"}

    def walk(node, path=""):
        if isinstance(node, dict):
            for k, v in node.items():
                if path == "" and k in skip_keys:
                    continue
                if k in {"href", "link", "site", "sticker", "rocketPart", "id", "type", "maxKm", "linkNote"}:
                    continue
                yield from walk(v, f"{path}.{k}" if path else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                yield from walk(v, f"{path}.{i}")
        elif isinstance(node, str):
            if "{" not in node:
                yield path, node
    missing = [f"{k}: {v}" for k, v in walk(t) if v.replace(" ", " ") not in visible.replace(" ", " ")]
    if missing:
        fails.append(f"{rel}: нет текстов из i18n ({len(missing)}): " + "; ".join(missing[:6]))

    # Обязательное в подвале
    for must in (t["footer"]["metaNote"].split(" / ")[0],):
        if must not in visible:
            fails.append(f"{rel}: нет обязательного текста/ссылки: {must[:60]}")
    for link in (t["contacts"]["telegram"], t["contacts"]["whatsapp"], t["contacts"]["instagram"], t["contacts"]["channel"]):
        if f'href="{link}"' not in text:
            fails.append(f"{rel}: нет ссылки {link}")
    if lang == "en" and t["works"]["items"][0]["linkNote"] not in visible:
        fails.append(f"{rel}: ссылки на русские страницы не помечены (RU)")
    if re.search(r"(?:от\s*\d[\d\s]*₽|\d[\d\s]*\s?₽|\$\d)", visible):
        fails.append(f"{rel}: на странице есть цена")


def main() -> int:
    if not DIST.exists():
        print("Нет dist/: сначала npm run build")
        return 1
    fails: list[str] = []
    pages = sorted(DIST.rglob("*.html"))
    for page in pages:
        check_page(page, fails)
    check_home("ru", fails)
    check_home("en", fails)

    for name in LEGACY:
        if not (DIST / name).exists():
            fails.append(f"нет старой страницы: {name}")
    for name, target in REDIRECTS.items():
        f = DIST / name
        txt = f.read_text(encoding="utf-8") if f.exists() else ""
        if f"url={target}" not in txt or 'rel="canonical"' not in txt or f'href="{target}"' not in txt:
            fails.append(f"{name}: редирект не на {target} или нет canonical/ссылки")

    terms = (DIST / "terms.html").read_text(encoding="utf-8")
    if "Noto Emoji Animation" not in terms or "creativecommons.org/licenses/by/4.0" not in terms:
        fails.append("terms.html: нет атрибуции Noto Emoji Animation (CC BY 4.0)")
    if (DIST / "CNAME").read_text(encoding="utf-8").strip() != "vertostudio.ru":
        fails.append("CNAME изменился")
    robots = (DIST / "robots.txt").read_text(encoding="utf-8")
    if "Sitemap: https://vertostudio.ru/sitemap-index.xml" not in robots:
        fails.append("robots.txt: нет ссылки на sitemap-index.xml")
    sm = (DIST / "sitemap-0.xml").read_text(encoding="utf-8") if (DIST / "sitemap-0.xml").exists() else ""
    for url in (SITE + "/", SITE + "/en/", SITE + "/cases/lead-desk.html", SITE + "/lead-agent.html", SITE + "/projects/noir-golf/"):
        if f"<loc>{url}</loc>" not in sm:
            fails.append(f"sitemap: нет {url}")
    if "services.html" in sm:
        fails.append("sitemap: есть страница-редирект")
    for f in ("llms.txt", "favicon.svg", "og/og-ru.jpg", "og/og-en.jpg", "rocket/poster-hero.webp"):
        if not (DIST / f).exists():
            fails.append(f"нет файла {f}")
    if (DIST / "claude-code-brief").exists() or (DIST / "TZ-VERTO-ROCKET.md").exists():
        fails.append("в публикацию попали материалы брифа")
    for js in (DIST / "_astro").glob("*.js"):
        body = js.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"\beval\s*\(|new Function\s*\(", body):
            fails.append(f"{js.name}: eval/new Function (несовместимо с CSP)")
        if re.search(r"googletagmanager|google-analytics|mc\.yandex|facebook\.com/tr", body):
            fails.append(f"{js.name}: трекер")

    print(f"Проверено HTML-страниц: {len(pages)}")
    if fails:
        print(f"\nОШИБКИ ({len(fails)}):")
        for f in fails:
            print("-", f)
        return 1
    print("SITE_QA_OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
