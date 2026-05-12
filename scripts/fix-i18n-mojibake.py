#!/usr/bin/env python3
"""
Repair mojibake in apps/web locale JSON catalogs (UTF-8 files with mis-decoded Unicode).
Uses ftfy + a cp1251→UTF-8 unmojibake pass (see unmojibake_cp1251_utf8).

Reads/writes catalogs with explicit UTF-8 only (repo root AGENTS.md — Web i18n locale catalogs).

Requires: pip install ftfy

Usage (from repo root):
  python scripts/fix-i18n-mojibake.py
"""

from __future__ import annotations

import json
from pathlib import Path

import ftfy


LOCALES_DIR = (
    Path(__file__).resolve().parents[1] / 'apps' / 'web' / 'src' / 'i18n' / 'locales'
)


def repair_string(val: str) -> str:
    if not val or all(ord(c) < 128 for c in val):
        return val
    cur = val
    for _ in range(6):
        nxt = ftfy.fix_encoding(cur)
        if nxt == cur:
            break
        cur = nxt
    return unmojibake_cp1251_utf8(cur)


def unmojibake_cp1251_utf8(s: str) -> str:
    """
    Some catalogs store UTF-8 bytes mis-decoded via Windows-1251 as Unicode chars.
    Reversible via encode(cp1251) -> decode(utf-8); correct Cyrillic rejects this path (invalid UTF-8).
    """
    try:
        raw = s.encode('cp1251')
    except UnicodeEncodeError:
        return s
    try:
        return raw.decode('utf8')
    except UnicodeDecodeError:
        return s


def walk(obj):
    if isinstance(obj, str):
        return repair_string(obj)
    if isinstance(obj, list):
        return [walk(x) for x in obj]
    if isinstance(obj, dict):
        return {k: walk(v) for k, v in obj.items()}
    return obj


def main():
    for path in sorted(LOCALES_DIR.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        fixed = walk(data)
        path.write_text(
            json.dumps(fixed, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8',
        )
        print('fixed', path.name)


if __name__ == '__main__':
    main()
