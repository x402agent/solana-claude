# Task 15 — Website Consolidation

> **Scope:** Audit + consolidate `website/`, `site/`, `pumpfun-site/` directories
> **Priority:** LOW
> **Status:** COMPLETED

## Problem

The repository had three web directories with unclear boundaries:
- `website/` — SDK docs site (5 files, 96KB)
- `pumpfun-site/` — pump.fun UI mockup (7 files, 108KB)
- `site/` — PumpOS web desktop (100+ files, 48MB)
- `site/website/` — **stale duplicate** of PumpOS (53 files, 23MB)

Issues found:
1. `site/website/` was an old copy of PumpOS — 23MB of dead weight
2. READMEs lacked clear purpose statements; `site/README.md` was titled "Pump Fun SDK" (confusing)
3. No cross-references between directories — unclear which to use when
4. Inconsistent `vercel.json` security headers across all three
5. CSS color palettes diverged without documentation explaining why
6. No central guide explaining the three directories

## Changes Made

### 1. Removed `site/website/` duplicate
- Deleted 53 files, 23MB of stale PumpOS copy
- No functional code depended on it (only stale doc references)

### 2. Updated all three READMEs
- Added clear single-line purpose statement to each (`> **Purpose:** ...`)
- Added cross-reference table linking all three directories
- Fixed `site/README.md` title from "Pump Fun SDK" to "PumpOS — Web Desktop"

### 3. Standardized `vercel.json` security headers
All three now include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or `SAMEORIGIN` for PumpOS iframes)
- `Referrer-Policy: strict-origin-when-cross-origin`
- Cache headers for CSS/JS (`max-age=31536000, immutable`)

PumpOS retains its CSP `frame-ancestors` for Sperax domain embedding.

### 4. Created `WEBSITES.md`
Central guide at repo root documenting:
- Directory map with purpose/tech/deployment
- When to use each directory
- Quick start commands
- Color palette differences (intentional, now documented)
- Security header standards

### 5. Documented CSS color choices
Added cross-reference comments to `website/styles.css` and `pumpfun-site/styles.css` explaining the different green accents are intentional (SDK branding vs pump.fun clone vs PumpOS desktop).

## Files Changed

| File | Action |
|------|--------|
| `site/website/` (53 files) | **Deleted** — stale duplicate |
| `website/README.md` | Updated — purpose + cross-refs |
| `pumpfun-site/README.md` | Updated — purpose + cross-refs |
| `site/README.md` | Updated — title fix + purpose + cross-refs |
| `site/vercel.json` | Updated — added security + cache headers |
| `pumpfun-site/vercel.json` | Updated — added cache headers |
| `website/styles.css` | Updated — color palette documentation |
| `pumpfun-site/styles.css` | Updated — color palette documentation |
| `WEBSITES.md` | **Created** — central directory guide |

## Verification

```bash
# Confirm site/website/ is gone
ls site/website/ 2>&1  # Should error: No such file or directory

# Confirm site/ size reduction
du -sh site/  # Should be ~25MB (down from 48MB)

# Verify all vercel.json files are valid JSON
for f in website/vercel.json pumpfun-site/vercel.json site/vercel.json; do
  python3 -c "import json; json.load(open('$f')); print(f'OK: $f')"
done
```
