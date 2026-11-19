#!/usr/bin/env python3
"""
Local copy of Open Library's catalogue (CC0, https://openlibrary.org/developers/dumps), for Dewey
numbers, ISBN lookups and offline metadata.

  catalog.py build  <dir>   download the editions + authors dumps (resumable) and build <dir>/catalog.sqlite
  catalog.py serve  <dir>   JSON lines on stdin/stdout:
        {"op":"isbn","isbn":"978..."}                     -> {"ok":true,"rows":[...]}
        {"op":"search","title":"..","author":"..","ddcOnly":true} -> {"ok":true,"rows":[...]}
        {"op":"stats"}                                    -> {"ok":true,"books":N,"withDdc":N}

Progress while building goes to <dir>/status.json:
  {"phase":"download"|"authors"|"build"|"index"|"done"|"error", "file", "bytes", "total", "rows", "error"}
"""
import gzip
import json
import os
import re
import sqlite3
import sys
import time
import urllib.request
import zlib

EDITIONS_URL = os.environ.get("CATALOG_EDITIONS_URL", "https://openlibrary.org/data/ol_dump_editions_latest.txt.gz")
AUTHORS_URL = os.environ.get("CATALOG_AUTHORS_URL", "https://openlibrary.org/data/ol_dump_authors_latest.txt.gz")
UA = "ABS+ catalogue (Audiobookshelf add-on)"


def status(d, **kw):
    path = os.path.join(d, "status.json")
    cur = {}
    try:
        with open(path) as f:
            cur = json.load(f)
    except Exception:
        pass
    cur.update(kw)
    cur["at"] = int(time.time() * 1000)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(cur, f)
    os.replace(tmp, path)


def download(d, url, name, phase):
    """Resumable download into <dir>/<name>; returns the path."""
    dest = os.path.join(d, name)
    part = dest + ".part"
    if os.path.exists(dest):
        return dest
    have = os.path.getsize(part) if os.path.exists(part) else 0
    req = urllib.request.Request(url, headers={"User-Agent": UA, **({"Range": f"bytes={have}-"} if have else {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        if have and r.status != 206:
            have = 0  # server ignored the range: start over
        total = have + int(r.headers.get("Content-Length") or 0)
        mode = "ab" if have else "wb"
        last = 0
        with open(part, mode) as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
                have += len(chunk)
                if time.time() - last > 2:
                    last = time.time()
                    status(d, phase=phase, file=name, bytes=have, total=total)
    os.replace(part, dest)
    return dest


def isbn10to13(s):
    s = re.sub(r"[^0-9Xx]", "", s or "")
    if len(s) == 13:
        return s if s.isdigit() else None
    # ISBN-10: nine digits and a check character (a digit or X); anything else is a typo in the dump
    if len(s) != 10 or not s[:9].isdigit():
        return None
    core = "978" + s[:9]
    total = sum((1 if i % 2 == 0 else 3) * int(c) for i, c in enumerate(core))
    return core + str((10 - total % 10) % 10)


def clean_ddc(v):
    """'823.914', '[Fic]', '813/.54' -> '823.914' / None"""
    if not v:
        return None
    m = re.search(r"\d{3}(?:\.\d+)?", str(v).replace("/", "").replace("'", ""))
    return m.group(0) if m else None


def edition_rows(j, names, ol):
    """One Open Library edition -> rows for the books table (one per ISBN), or [] when it's of no use"""
    isbns = [isbn10to13(str(x)) for x in (j.get("isbn_13") or []) + (j.get("isbn_10") or [])]
    isbns = [x for x in dict.fromkeys(isbns) if x]
    ddc = clean_ddc((j.get("dewey_decimal_class") or [None])[0])
    if not isbns and not ddc:
        return []
    title = str(j.get("title") or "")[:300]
    if not title:
        return []
    author = ", ".join(names.get(a.get("key", ""), "") for a in (j.get("authors") or [])[:3] if isinstance(a, dict)).strip(", ")
    if not author:
        author = str(j.get("by_statement") or "")[:200]
    lcc = (j.get("lc_classifications") or [None])[0]
    lang = ((j.get("languages") or [{}])[0] or {}).get("key", "").replace("/languages/", "")
    pd = j.get("publish_date")
    m = re.search(r"\d{4}", str(pd)) if pd else None
    year = m.group(0) if m else None
    cover = next((c for c in (j.get("covers") or []) if isinstance(c, int) and c > 0), None)
    pub = (j.get("publishers") or [None])[0]
    subtitle = str(j.get("subtitle") or "")[:300] or None
    return [(isbn, title, subtitle, author or None, ddc, lcc, lang or None, year, cover, str(pub or "")[:200] or None, ol) for isbn in isbns or [None]]


def build(d):
    os.makedirs(d, exist_ok=True)
    status(d, phase="download", error=None, rows=0)
    try:
        authors_file = download(d, AUTHORS_URL, "ol_dump_authors.txt.gz", "authors")
        editions_file = download(d, EDITIONS_URL, "ol_dump_editions.txt.gz", "download")

        status(d, phase="authors", rows=0)
        names = {}
        with gzip.open(authors_file, "rt", encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f):
                parts = line.split("\t", 4)
                if len(parts) < 5:
                    continue
                try:
                    j = json.loads(parts[4])
                except Exception:
                    continue
                n = j.get("name")
                if n:
                    names[parts[1]] = n[:200]
                if i % 500000 == 0:
                    status(d, phase="authors", rows=i)

        out = os.path.join(d, "catalog.sqlite.building")
        if os.path.exists(out):
            os.remove(out)
        db = sqlite3.connect(out)
        db.execute("PRAGMA journal_mode=OFF")
        db.execute("PRAGMA synchronous=OFF")
        db.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, isbn13 TEXT, title TEXT, subtitle TEXT, author TEXT, ddc TEXT, lcc TEXT, lang TEXT, year TEXT, cover INTEGER, publisher TEXT, ol TEXT)")
        size = os.path.getsize(editions_file)
        status(d, phase="build", rows=0, bytes=0, total=size)
        rows = 0
        batch = []
        with open(editions_file, "rb") as raw, gzip.open(raw, "rt", encoding="utf-8", errors="replace") as f:
            for line in f:
                parts = line.split("\t", 4)
                if len(parts) < 5:
                    continue
                try:
                    j = json.loads(parts[4])
                    row = edition_rows(j, names, parts[1])
                except Exception:
                    continue  # one odd record never stops the build
                if not row:
                    continue
                batch.extend(row)
                rows += 1
                if len(batch) >= 50000:
                    db.executemany("INSERT INTO books (isbn13,title,subtitle,author,ddc,lcc,lang,year,cover,publisher,ol) VALUES (?,?,?,?,?,?,?,?,?,?,?)", batch)
                    batch = []
                    status(d, phase="build", rows=rows, bytes=raw.tell(), total=size)
        if batch:
            db.executemany("INSERT INTO books (isbn13,title,subtitle,author,ddc,lcc,lang,year,cover,publisher,ol) VALUES (?,?,?,?,?,?,?,?,?,?,?)", batch)
        names.clear()
        status(d, phase="index", rows=rows)
        db.execute("CREATE INDEX books_isbn ON books(isbn13)")
        # Title/author search, only for books with a Dewey number (that's what classification needs)
        db.execute("CREATE VIRTUAL TABLE ddc_fts USING fts5(title, author, content='books', content_rowid='id', tokenize='unicode61 remove_diacritics 2')")
        db.execute("INSERT INTO ddc_fts(rowid, title, author) SELECT id, title, author FROM books WHERE ddc IS NOT NULL")
        db.execute("CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT)")
        db.execute("INSERT INTO meta VALUES ('built', ?), ('source', ?)", (str(int(time.time() * 1000)), EDITIONS_URL))
        db.commit()
        db.execute("PRAGMA optimize")
        db.close()
        os.replace(out, os.path.join(d, "catalog.sqlite"))
        if os.environ.get("CATALOG_KEEP_DUMPS") != "1":
            for name in ("ol_dump_editions.txt.gz", "ol_dump_authors.txt.gz"):
                try:
                    os.remove(os.path.join(d, name))
                except OSError:
                    pass
        status(d, phase="done", rows=rows, error=None)
    except Exception as e:
        status(d, phase="error", error=str(e))
        # a damaged download (cut short, corrupt): delete it so the next try downloads it again
        if isinstance(e, (EOFError, gzip.BadGzipFile, zlib.error)):
            for name in ("ol_dump_editions.txt.gz", "ol_dump_authors.txt.gz"):
                p = os.path.join(d, name)
                try:
                    with gzip.open(p, "rb") as g:
                        while g.read(16 * 1024 * 1024):
                            pass
                except FileNotFoundError:
                    pass
                except Exception:
                    try:
                        os.remove(p)
                    except OSError:
                        pass
        raise


def serve(d):
    path = os.path.join(d, "catalog.sqlite")
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False)
    db.row_factory = sqlite3.Row
    cols = "isbn13, title, subtitle, author, ddc, lcc, lang, year, cover, publisher, ol"

    def out(o):
        sys.stdout.write(json.dumps(o) + "\n")
        sys.stdout.flush()

    def fts_query(s):
        words = re.findall(r"\w+", s or "", re.UNICODE)
        return " ".join('"%s"' % w.replace('"', "") for w in words[:12])

    for line in sys.stdin:
        try:
            req = json.loads(line)
            op = req.get("op")
            if op == "isbn":
                isbn = isbn10to13(req.get("isbn")) or ""
                rows = [dict(r) for r in db.execute(f"SELECT {cols} FROM books WHERE isbn13 = ? LIMIT 5", (isbn,))]
                out({"id": req.get("id"), "ok": True, "rows": rows})
            elif op == "search":
                q = fts_query(req.get("title"))
                a = fts_query(req.get("author"))
                if not q:
                    out({"id": req.get("id"), "ok": True, "rows": []})
                    continue
                match = f"title : ({q})" + (f" AND author : ({a})" if a else "")
                rows = [dict(r) for r in db.execute(f"SELECT {', '.join('b.' + c.strip() for c in cols.split(','))} FROM ddc_fts f JOIN books b ON b.id = f.rowid WHERE ddc_fts MATCH ? ORDER BY rank LIMIT ?", (match, int(req.get("limit") or 10)))]
                out({"id": req.get("id"), "ok": True, "rows": rows})
            elif op == "stats":
                n = db.execute("SELECT COUNT(*) FROM books").fetchone()[0]
                k = db.execute("SELECT COUNT(*) FROM ddc_fts").fetchone()[0]
                built = db.execute("SELECT v FROM meta WHERE k='built'").fetchone()
                out({"id": req.get("id"), "ok": True, "books": n, "withDdc": k, "built": int(built[0]) if built else None})
            else:
                out({"id": req.get("id"), "ok": False, "error": "unknown op"})
        except Exception as e:
            out({"id": (req or {}).get("id") if isinstance(locals().get("req"), dict) else None, "ok": False, "error": str(e)})


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    {"build": build, "serve": serve}[sys.argv[1]](sys.argv[2])
