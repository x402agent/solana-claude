# Mnemosyne Docs Audit — Reusable Workflow Checklist

**Purpose:** Bi-weekly cross-reference audit of docs site against codebase.
**Cadence:** Every 2 weeks (or after any version bump / major feature merge).
**Audience:** Hermes Agent (send this document as context to re-run the audit).
**Checkpoint file:** `.audit-state.json` in `mnemosyne-docs` repo — tracks what was audited when.

---

## Phase 0: Load Checkpoint + Determine Scope (2 min)

**This is the key to avoiding redundant work.** The checkpoint file at `/root/.hermes/projects/mnemosyne-docs/.audit-state.json` tracks every page's last audit hash. Only re-audit pages whose content hash changed since then.

### Step 0.1: Load the checkpoint
```python
import json
with open("/root/.hermes/projects/mnemosyne-docs/.audit-state.json") as f:
    state = json.load(f)
```

### Step 0.2: Find changed files
```bash
cd /root/.hermes/projects/mnemosyne-docs
# For each tracked file, compare current hash to audited hash
git diff --name-only HEAD~10..HEAD -- 'content/**' 'src/app/(docs)/**'
```

### Step 0.3: Build audit scope

Three categories:

| Category | Condition | Action |
|----------|-----------|--------|
| **Skip** | File hash matches `audit_hash` in checkpoint AND codebase version hasn't changed | Skip entirely. This page was verified against this exact code and content. |
| **Re-audit** | File hash differs from `audit_hash` | The page was edited since last audit. Verify it against current codebase. |
| **First audit** | File not in checkpoint at all | Never audited. Full audit needed. |

**Also check:**
- [ ] Codebase version changed? → Re-audit ALL previously audited pages (API may have changed)
- [ ] New pages added to docs site? → They won't be in checkpoint, add to audit scope
- [ ] New tools/importers/features in codebase? → Check relevant doc pages exist

### Step 0.4: Report scope
Before starting, report: "Skipping X pages (unchanged), auditing Y pages (changed), first-auditing Z pages (new)." This transparency is how you know you're not burning tokens.

---

## Phase 1: Codebase Surface Map (only if version changed)

Generate a fresh codebase map. This tells you what actually exists.

**Method:** Delegate to a subagent with:
```
Map the entire Mnemosyne codebase surface in /root/.hermes/projects/mnemosyne.
Catalog every class, method signature, CLI command, configuration option,
tool schema (MCP + Hermes plugin), API endpoint, and importer.
Output structured JSON to mnemosyne_codebase_surface.json.
```

**Key files to check for changes since last audit:**
- `mnemosyne/core/beam.py` — BeamMemory (new methods, changed defaults)
- `mnemosyne/core/memory.py` — Mnemosyne class (new methods, changed signatures)
- `mnemosyne/mcp_tools.py` — MCP tool definitions (new tools, changed params)
- `mnemosyne/core/importers/` — New import providers
- Plugin yamls — `plugin.yaml`, `hermes_plugin/plugin.yaml` — tool counts, hook names
- `pyproject.toml` — dependencies, entry points

**Verify key numbers from code:**
- [ ] Default `top_k` in `recall()` — check `beam.py` line with `def recall`
- [ ] MCP tool count — check `mcp_tools.py` for `get_tool_definitions()`
- [ ] Hermes plugin tool count — check plugin.yaml `tools:` field
- [ ] Hook names — check `hermes_plugin/__init__.py` for hook registration
- [ ] Config env vars — check `mnemosyne/core/beam.py` and `memory.py` for `os.getenv`
- [ ] config.yaml keys — check `hermes_plugin/__init__.py` for config reads

---

## Phase 2: Critical Page Audit (30 min)

These 10 pages are the ones most likely to rot. Check them every time.

### 1. `getting-started/configuration.mdx`
- [ ] Every env var listed EXISTS in the actual codebase (grep for `os.getenv`)
- [ ] Defaults match code defaults
- [ ] Config file is correctly `config.yaml` (not `mnemosyne.yaml`)
- [ ] Class name is `Mnemosyne` (not `Memory`)
- [ ] Embedding model matches `MNEMOSYNE_EMBEDDING_MODEL` default
- [ ] config.yaml keys match actual `memory.mnemosyne.*` structure

### 2. `api/python-sdk.mdx`
- [ ] Constructor signature matches `Mnemosyne.__init__` exactly
- [ ] `recall()` default `top_k` matches code default
- [ ] All methods listed in docs exist in code (grep for `def method_name`)
- [ ] All public methods from code are documented in docs
- [ ] V2 Properties table matches actual properties on Mnemosyne class
- [ ] Stream API methods match `MemoryStream` class
- [ ] DeltaSync methods match `DeltaSync` class
- [ ] Hermes Plugin Tools table lists ALL tools from plugin.yaml

### 3. `api/tool-schema.mdx`
- [ ] Every tool definition's `required` params match MCP tool code
- [ ] Every tool definition's `properties` match MCP tool code
- [ ] No fictional parameters (like `tags` that was here before)
- [ ] Number of tools matches actual tool count

### 4. `api/hermes-plugin.mdx`
- [ ] Hooks table names match actual hook registration in `hermes_plugin/__init__.py`
- [ ] Hook descriptions are accurate
- [ ] Tool list matches plugin.yaml
- [ ] No fictional configuration options

### 5. `api/mcp-server.mdx`
- [ ] Tool names match `mcp_tools.py` exactly
- [ ] Tool count matches
- [ ] Transport options (stdio, SSE) match CLI

### 6. `architecture/beam-overview.mdx`
- [ ] Number of memory tiers is correct (3: working, episodic, scratchpad)
- [ ] TripleStore is correctly described as separate, not a 4th tier
- [ ] Capacity numbers match env var defaults
- [ ] Latency claims match benchmark data

### 7. `architecture/system-design.mdx`
- [ ] No fictional components (like the "REST API" box that was here)
- [ ] Component names match actual classes/modules
- [ ] Technology stack table is accurate

### 8. `operations/performance.mdx`
- [ ] Memory tier names match actual tables
- [ ] Memory usage numbers are realistic
- [ ] No fictional tiers (like "Semantic Memory")
- [ ] Benchmark numbers are recent

### 9. `architecture/streaming.mdx`
- [ ] API method names match actual `MemoryStream` class
- [ ] API method names match actual `DeltaSync` class
- [ ] `compute_delta()` shows required `peer_id` param

### 10. `architecture/plugin-system.mdx`
- [ ] Registration method names match `PluginManager` class
- [ ] Hook signatures match `MnemosynePlugin` abstract class
- [ ] Built-in plugin names match actual plugins

---

## Phase 3: Comparison Pages (10 min)

These should match current version and feature set.

- [ ] `comparisons/*.mdx` — all say v2.5.0 (or current version)
- [ ] `comparisons/*.mdx` — "Last updated" dates are recent
- [ ] Tool counts referenced match actual counts
- [ ] Provider counts match actual importers list

### Comparison pages:
- [ ] `comparisons/honcho.mdx`
- [ ] `comparisons/zep.mdx`
- [ ] `comparisons/mem0.mdx`
- [ ] `comparisons/letta.mdx`
- [ ] `comparisons/cognee.mdx`
- [ ] `comparisons/supermemory.mdx`
- [ ] `comparisons/hindsight.mdx`

---

## Phase 4: Landing/Quick-Start Pages (5 min)

- [ ] `getting-started/quick-start.mdx` — version number, code snippets work
- [ ] `getting-started/installation.mdx` — pip install command correct
- [ ] `getting-started/first-steps.mdx` — API usage matches current signatures
- [ ] `migration/overview.mdx` — provider count accurate, version current

---

## Phase 5: Fix and Commit (15-30 min)

### Fixing approach:
1. **Use patch tool** for targeted edits — never rewrite entire files with sed/read_file
2. **Fix `content/` files first**, then mirror to `src/app/(docs)/` copies
3. **Verify with:** `grep -rn 'old_string' content/ src/` before declaring done

### Mirroring script:
```python
import os, shutil
content_dir = "/root/.hermes/projects/mnemosyne-docs/content"
app_dir = "/root/.hermes/projects/mnemosyne-docs/src/app/(docs)"
for rel_path in modified_files:
    src = os.path.join(content_dir, rel_path)
    dir_part = os.path.dirname(rel_path)
    name_part = os.path.splitext(os.path.basename(rel_path))[0]
    dst = os.path.join(app_dir, dir_part, name_part, "page.mdx")
    shutil.copy2(src, dst)
```

### Commit template:
```
fix(docs): bi-weekly audit — [brief summary of what changed]
```

---

## Phase 7: Update Checkpoint + Report (5 min)

### 7.1: Update the checkpoint file
After fixing everything, update `.audit-state.json`:

```python
import json, subprocess
from datetime import datetime, timezone

with open("/root/.hermes/projects/mnemosyne-docs/.audit-state.json") as f:
    state = json.load(f)

now = datetime.now(timezone.utc).isoformat()

# Update timestamps
state["last_full_audit"] = now
state["codebase_version"] = CURRENT_VERSION  # from Phase 1

# Update each audited file's hash and status
for filepath in audited_files:
    h = subprocess.check_output(["git", "ls-tree", "HEAD", filepath]).decode().split()[2]
    if filepath in state["files"]:
        state["files"][filepath]["last_audited"] = now[:10]
        state["files"][filepath]["audit_hash"] = h
        state["files"][filepath]["status"] = "clean"
    else:
        state["files"][filepath] = {
            "last_audited": now[:10],
            "audit_hash": h,
            "status": "clean",
            "category": "source" if filepath.startswith("content/") else "mirror"
        }

# Append to audit history
state["audit_history"].append({
    "date": now[:10],
    "codebase_version": CURRENT_VERSION,
    "pages_audited": len(audited_files),
    "issues_found": N_ISSUES,
    "issues_fixed": N_FIXED,
    "commit": GIT_COMMIT_HASH,
    "summary": "Brief description of what changed"
})

with open("/root/.hermes/projects/mnemosyne-docs/.audit-state.json", "w") as f:
    json.dump(state, f, indent=2)
```

### 7.2: Write executive report
- Write to `docs/audit-report-YYYY-MM-DD.md` in the main mnemosyne repo
- Include: pages audited, skipped, issues found, fixes applied, remaining risks
- Reference the checkpoint for full state

### 7.3: Commit both repos
```bash
cd /root/.hermes/projects/mnemosyne-docs
git add .audit-state.json && git commit -m "chore: update audit checkpoint [date]"
git push

cd /root/.hermes/projects/mnemosyne
git add docs/audit-report-*.md docs/audit-workflow.md && git commit -m "docs: audit report [date]"
git push
```

---

## Checkpoint File Schema

The `.audit-state.json` file follows this structure:

```json
{
  "_schema": "mnemosyne-docs-audit-checkpoint-v1",
  "last_full_audit": "ISO timestamp",
  "codebase_version": "2.5.0",
  "audit_history": [
    {
      "date": "YYYY-MM-DD",
      "codebase_version": "X.Y.Z",
      "pages_audited": N,
      "issues_found": N,
      "issues_fixed": N,
      "commit": "git hash",
      "summary": "text"
    }
  ],
  "files": {
    "content/path/to/page.mdx": {
      "last_audited": "YYYY-MM-DD",
      "audit_hash": "git blob hash",
      "status": "clean|issues_pending",
      "category": "source|mirror",
      "note": "optional context"
    }
  }
}
```

**Key invariant:** A page's `audit_hash` is the git blob hash of the file AT THE TIME of the audit. On next audit, compare current blob hash to `audit_hash`. If they match and codebase version hasn't changed, skip the page.

---

## Edge Cases and Failure Modes

The checkpoint system handles these edge cases automatically. When any are detected during Phase 0, the health check reports them and adjusts the audit scope.

### 1. Git History Rewrite (Rebase/Squash)
**What happens:** All git blob hashes change simultaneously after a rebase or squash merge.
**Detection:** If ALL tracked file hashes differ from audited hashes at once, the checkpoint flags `_rebase_detected: true`.
**Action:** Full re-audit of all pages. The old audit data is preserved as historical context but all pages are re-verified.

### 2. Checkpoint File Missing or Corrupted
**What happens:** `.audit-state.json` is deleted, has malformed JSON, or is missing required fields.
**Detection:** JSON parse fails or `_schema` field is missing/wrong version.
**Action:** Full audit of all pages. New checkpoint generated from scratch.

### 3. Page Renamed or Moved
**What happens:** A file is renamed (e.g., `old-name.mdx` → `new-name.mdx`). The old path disappears and a new path appears.
**Detection:** Old path shows `status: gone`. New path shows `status: unaudited`.
**Action:** The old entry is kept with `status: gone` for historical tracking. The new path gets a full audit. If git detected the rename, the agent can optionally carry forward the audit status.

### 4. Mirror Drift (Source and Mirror Out of Sync)
**What happens:** Someone edits `content/foo.mdx` but forgets to sync `src/app/(docs)/foo/page.mdx`. The hashes diverge.
**Detection:** Mirror hash differs from its source hash while both are marked `clean`.
**Action:** Mark mirror as `status: drifted`. Sync it from source before auditing. The drifted status prevents skipping a stale mirror.

### 5. Codebase Version Bump
**What happens:** Mnemosyne upgrades from v2.5.0 to v2.6.0. Doc pages were audited against v2.5.0.
**Detection:** `codebase_version` in checkpoint differs from current `mnemosyne.__version__`.
**Action:** All source pages marked `status: stale_version`. They need re-verification even if content hasn't changed — API signatures, tool counts, or config keys may have changed.

### 6. Concurrent Edits During Audit
**What happens:** Someone pushes a doc change while the audit is running.
**Detection:** At end of Phase 5 (before commit), re-check git hashes of all audited files. If any differ from what was audited, flag as `possibly_stale`.
**Action:** Re-audit those specific files before finalizing the checkpoint.

### 7. Partial Audits (Only Some Pages Audited This Round)
**What happens:** User requests audit of only specific pages, not the full site.
**Detection:** Some pages have newer `last_audited` dates than others.
**Action:** The checkpoint tracks per-page status independently. Each page's `audit_hash` is its own truth. No global consistency issue — this is by design.

### 8. Pages Deleted from Docs Site
**What happens:** A page is removed from the repo entirely.
**Detection:** File path exists in checkpoint but not in current `git ls-tree`.
**Action:** Mark as `status: gone` with a note about when it disappeared. Kept for audit trail. Remove from checkpoint after 3 audit cycles (manual cleanup or automatic).

### 9. Untracked Pages (Never Audited)
**What happens:** Pages exist in the repo but were never added to the checkpoint.
**Detection:** File exists in `git ls-tree` but not in checkpoint's `files` dict.
**Action:** Added with `status: unaudited`. Prioritized for audit on next run. The health check reports how many remain.

### 10. Agent Fixes Introduce New Issues
**What happens:** During Phase 4, fixing one discrepancy accidentally breaks something else (e.g., wrong method name propagated to multiple places).
**Detection:** Phase 5 verification step — after all fixes, re-run key cross-reference checks on the fixed pages.
**Action:** If new issues found, fix them in the same audit cycle. The checkpoint only gets updated after all issues are resolved.

---

## Phase 6: Website Cross-Check (5 min)

- [ ] `mnemosyne-website/src/components/HomePage.tsx` — BEAM labels still correct
- [ ] `mnemosyne-website/src/data/changelog.json` — last sync date is recent
- [ ] Website version matches codebase version

---

## Pain Points Log (Lessons Learned)

### From May 11, 2026 Audit:

#### Tooling Pain Points

1. **Never use sed with special characters in search strings.** The `|` in markdown tables conflicts with sed's `|` delimiter. Parentheses in file paths like `src/app/(docs)/` break shell parsing. **Solution:** Use Python's `str.replace()` for multi-file batch edits, or the `patch` tool for single-file targeted edits. `patch` does fuzzy matching and handles special characters natively.

2. **The patch tool is the safest edit method.** It does fuzzy matching (9 strategies) and won't corrupt files. `sed` can silently fail or corrupt files when special characters, newlines, or unicode are involved. **Rule:** Always reach for `patch` first, Python `str.replace` second, `sed` never.

3. **Mirror files are a trap.** `content/` and `src/app/(docs)/` are separate copies with no build-time sync. If you fix one and not the other, the live site shows stale content. 4 mirrors were found drifted during this audit. **Solution:** Always sync mirrors after content edits. Checkpoint now detects mirror drift automatically.

#### Process Pain Points

4. **The configuration page was the worst rot.** It had zero correspondence with actual code — fictional env vars (`MNEMOSYNE_DB_PATH`), wrong class name (`Memory`), wrong config file (`mnemosyne.yaml`), wrong embedding model (`text-embedding-3-small`). **Root cause:** Config systems have no type checking and vary across environments. They're the hardest to keep in sync. **Solution:** The audit now prioritizes config pages. Verify every env var name against `grep os.getenv` in source.

5. **Subagent timeouts on large scans.** A single subagent cataloging 67 pages timed out at 600 seconds (18 API calls). **Solution:** Break work into chunks — one subagent for codebase mapping, separate subagents for page groups of ~15-20 pages each. 3 concurrent max.

6. **Don't assume documentation is accurate.** Some pages (configuration, system design) were clearly generated from assumptions, not from reading source code. **Solution:** Always verify claims against source code, not against other documentation pages. Trust `grep` over prose.

7. **subagent `read_file` can drop data.** When subagents read files with `read_file` and rewrite with `write_file`/`open()`, frontmatter export blocks and metadata can be lost. **Solution:** Use the `patch` tool for all edits. For full rewrites, verify content integrity by checking line counts before and after.

8. **The checkpoint file eliminates redundant work.** Without it, every audit is a full scan of 67+ pages (~2 hours, ~$3 in tokens). With it, only changed pages get re-audited. **Solution:** The `.audit-state.json` checkpoint stores per-page git blob hashes. Phase 0 diffs and skips unchanged pages.

9. **Shell escaping in execute_code is fragile.** Using `terminal()` from inside `execute_code` to run sed commands with dynamic strings caused repeated failures from unescaped characters. **Solution:** When inside `execute_code`, use Python's native `open()/read()/write()` for file operations. Reserve `terminal()` for git commands and system calls.

10. **Gitignored directories block saving artifacts.** The `.planning/` directory was gitignored in mnemosyne-docs, so the audit report couldn't be committed there. **Solution:** Save reports to the main mnemosyne repo's `docs/` directory, which is tracked.

11. **Version drift across comparison pages.** All 8 comparison pages referenced v2.3.0 while codebase was v2.5.0. These are high-visibility marketing pages. **Solution:** Comparison pages are now part of the critical audit list, checked every cycle.

12. **The docs-mapping subagent timed out.** 18 API calls across 67 pages in 600s was too much. **Solution:** For Phase 2 (page cataloging), split into 4 subagents by section (API pages, Architecture pages, Comparison pages, Everything else). Each gets ~15-20 pages.

#### Fixes-Introducing-Bugs Pain Points

13. **sed corrupted comparison files.** Running sed on files with pipe characters in table rows produced massive diffs (1355 insertions, 1361 deletions) from line ending changes. Required `git checkout` to restore and redo with `patch`. **Solution:** Never use sed for markdown files. Use `patch` tool exclusively.

14. **Mirror drift went undetected for 4 files.** During the main audit pass, `content/` pages were fixed but their `src/app/(docs)/` mirrors weren't synced. Caught during edge case hardening. **Solution:** The mirror sync step is now mandatory between Phase 4 and Phase 5.

---

*To re-run this audit: send this document to Hermes Agent with the message "Run the bi-weekly docs audit using AUDIT-WORKFLOW.md"*
