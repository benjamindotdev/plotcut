"""Extract text content from .epub or .txt files."""

from __future__ import annotations
import sys
from pathlib import Path
from dataclasses import dataclass


@dataclass
class Chapter:
    title: str
    text: str


@dataclass
class BookContent:
    title: str
    chapters: list[Chapter]
    raw_text: str


def extract_txt(path: Path) -> BookContent:
    text = path.read_text(encoding="utf-8", errors="replace")
    return BookContent(
        title=path.stem,
        chapters=[Chapter(title=path.stem, text=text)],
        raw_text=text,
    )


def extract_epub(path: Path) -> BookContent:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup

    book = epub.read_epub(str(path), options={"ignore_ncx": True})
    title = book.get_metadata("DC", "title")
    title_str = title[0][0] if title else path.stem

    chapters: list[Chapter] = []
    full_text_parts: list[str] = []

    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        text = soup.get_text(separator="\n", strip=True)
        if len(text) < 100:
            continue
        ch_title = soup.find(["h1", "h2", "h3"])
        ch_title_str = ch_title.get_text(strip=True) if ch_title else f"Chapter {len(chapters) + 1}"
        chapters.append(Chapter(title=ch_title_str, text=text))
        full_text_parts.append(text)

    return BookContent(
        title=title_str,
        chapters=chapters,
        raw_text="\n\n".join(full_text_parts),
    )


def extract(path: str) -> BookContent:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")

    if p.suffix.lower() == ".epub":
        return extract_epub(p)
    else:
        return extract_txt(p)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract.py <path>")
        sys.exit(1)
    content = extract(sys.argv[1])
    print(f"Title: {content.title}")
    print(f"Chapters: {len(content.chapters)}")
    for i, ch in enumerate(content.chapters):
        print(f"  [{i}] {ch.title} ({len(ch.text)} chars)")
