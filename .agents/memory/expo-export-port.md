---
name: Expo export port
description: Environment constraint for static Expo exports in this workspace.
---

The production Expo export starts a temporary Metro server on its default port, so another preview service using that port must be stopped before running the export.

**Why:** The workspace can run multiple artifact previews at once, and a competing service can make the export fail before bundling starts.

**How to apply:** Keep the VerseKeep Expo workflow available for preview, but stop unrelated preview servers while running its production export; restart the mobile workflow afterward.