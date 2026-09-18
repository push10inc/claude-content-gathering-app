# Content Gathering Tool (standalone)

A client-content-gathering app: projects → pages → blocks (pulled from a shared
block-type library) → content fields, with a design image per block type per
project. Data lives in a Google Sheet; images live in Google Drive; the front
end is static HTML/CSS/JS meant for GitHub Pages.

## How it fits together

```
GitHub Pages (index.html, css/, js/)
        |
        | fetch() calls
        v
Google Apps Script Web App  (apps-script/Code.gs)
        |
        v
Your Google Sheet  +  a Drive folder it creates automatically
```

GitHub Pages can only serve static files — it can't talk to a Google Sheet
directly with write access. The Apps Script Web App is the small "backend"
that does that talking; your front end just calls its URL.

## 1. Set up the Google Sheet + Apps Script

1. Open your Sheet: https://docs.google.com/spreadsheets/d/1C1WSNgRfWcXMW87u6TCmnGEmNUWPl2h3rZUqlOplRwI/edit
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete whatever's in the default `Code.gs` and paste in the contents of
   `apps-script/Code.gs` from this repo.
4. In the Apps Script editor toolbar, select the function `bootstrapNow` from
   the dropdown and click **Run**. The first run will ask you to authorize
   the script (it needs access to this Sheet and to Drive, to create the
   uploads folder). This creates all the tabs, headers, and seeds the block
   type library with your CB3–CB23 definitions. It's safe to re-run — it
   won't duplicate the seed data.
5. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize again if prompted, and copy the **Web app
   URL** (it ends in `/exec`).

Whenever you edit `Code.gs` later, you'll need **Deploy → Manage deployments
→ Edit (pencil) → New version** for the change to take effect — saving alone
doesn't update a live deployment.

## 2. Point the front end at your deployment

Open `js/config.js` and paste your Web App URL:

```js
window.CGT_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec'
};
```

## 3. Push to GitHub and turn on Pages

```bash
git init
git add .
git commit -m "Initial content gathering tool"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/YOUR-REPO.git
git push -u origin main
```

Then in the repo on GitHub: **Settings → Pages → Source: Deploy from a
branch → Branch: main / (root)**. GitHub gives you a URL like
`https://your-org.github.io/your-repo/` a minute or two later.

## Using the tool

- **+ New Client** on the home screen creates a new project (a fresh
  Homepage page, ready for blocks).
- Inside a project, drag a block from the **Block Library** sidebar onto the
  page, or just click it, to add it.
- Every block you add starts with the standard field set for that block
  type (from the CB definitions). Fields autosave about half a second after
  you stop typing — watch for the "Saved" confirmation in the corner.
- **Add design** on a block uploads an image to Drive and links it to that
  block *type* for this project — it'll show up on every instance of that
  same block type on any page, automatically.
- Use the ▲ / ▼ buttons to reorder blocks on a page.

## What's intentionally not built yet

To keep v1 focused, these were left out as clean extension points rather
than built partially:

- **Editing the block library itself** (renaming block types, adding/
  removing default fields) — right now the library is fixed to what's
  seeded in `Code.gs`. To change it, edit `BLOCK_LIBRARY_SEED` in
  `Code.gs` before running `bootstrapNow`, or edit the `BlockTypeLibrary`
  / `BlockTypeFields` tabs directly in the Sheet.
- **Read-only / viewer permissions** — anyone with the GitHub Pages link
  and the API URL can currently edit anything. If you need to hand a
  read-only or client-safe view to someone, that needs to be added
  (e.g. a `?readonly=1` URL flag that disables inputs, or a separate
  lightweight view).
- **Accessibility polish beyond basics** — keyboard focus states and
  semantic labels are in place, but this hasn't had a full screen-reader
  pass or contrast audit.

## Notes on the data model

Tabs created in your Sheet:

| Tab | Purpose |
|---|---|
| `Projects` | One row per client project (plus a hidden `template` row) |
| `Pages` | Pages within a project |
| `Blocks` | Block instances placed on a page |
| `BlockFields` | The actual content fields for each block instance (this is what autosaves) |
| `BlockTypeLibrary` | The master list of block types (CB3–CB23) |
| `BlockTypeFields` | The default field set per block type — cloned into `BlockFields` whenever a block is added, so later library edits don't retroactively change content already gathered |
| `BlockDesigns` | The one shared design image per (project, block type) |

Uploaded design images land in a Drive folder named **"Content Gathering
Tool - Design Uploads"**, created automatically on first upload.
