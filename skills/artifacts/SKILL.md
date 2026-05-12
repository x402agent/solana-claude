---
name: artifacts
description: "Use when the user asks to 'add a mobile app', 'create a mobile version', 'add a web version', 'add a slide deck', or any second app alongside the existing project. This creates a separate artifact (e.g. Expo for mobile, React for web). Read this skill before creating or migrating."
---


# Artifacts



**Mockup sandbox:** Call `createArtifact()` with `artifactType: "mockup-sandbox"` as usual. Only use mockup sandbox when the user explicitly asks to design a mockup, prototype a UI, sketch a layout, create a wireframe, or compare design variants. If the user asks to "add", "create", or "build" an app or version, that is NOT a design request — use the migration path below instead.

**Adding a web app, mobile app, or other artifact type:** This project must be migrated first. Read **`.local/secondary_skills/migrate-to-multi-artifact/SKILL.md`** — note: `secondary_skills/`, not `skills/` — and follow its instructions. Do NOT call `createArtifact()` or modify `.replit` before reading that file. Do NOT make the existing site responsive with CSS media queries — the user wants an actual separate artifact.




