/**
 * Content Gathering Tool — Apps Script backend
 * ------------------------------------------------
 * Deploy this as a Web App (Execute as: Me, Who has access: Anyone).
 * The deployed /exec URL is what your GitHub Pages front end calls.
 *
 * One-time setup: run `bootstrapNow` once from the Apps Script editor
 * (Run > bootstrapNow) before deploying, or just call the web app once
 * with ?action=bootstrap — either creates all tabs, headers, and seeds
 * the block type library from the CB3–CB23 definitions.
 */

var DRIVE_FOLDER_NAME = 'Content Gathering Tool - Design Uploads';

var SHEETS = {
  Projects: ['ProjectID', 'ProjectName', 'CreatedDate', 'IsTemplate'],
  Pages: ['PageID', 'ProjectID', 'PageName', 'SortOrder'],
  Blocks: ['BlockID', 'PageID', 'ProjectID', 'BlockTypeID', 'BlockTypeName', 'SortOrder'],
  BlockFields: ['FieldInstanceID', 'BlockID', 'FieldLabel', 'FieldType', 'FieldNote', 'IsOptional', 'Value', 'SortOrder'],
  BlockTypeLibrary: ['BlockTypeID', 'BlockTypeName', 'MediaRequirements', 'SortOrder'],
  BlockTypeFields: ['FieldID', 'BlockTypeID', 'FieldLabel', 'FieldType', 'FieldNote', 'IsOptional', 'SortOrder'],
  BlockDesigns: ['ProjectID', 'BlockTypeID', 'DriveFileID', 'ImageURL']
};

// ---- Seed data, transcribed from the CB3–CB23 content-gathering doc ----
var BLOCK_LIBRARY_SEED = [
  { name: 'Homepage Banner', media: 'One image or video', fields: [
    ['Title', 'text', "Last word can have a script text option", false],
    ['Sub-text', 'textarea', '', false],
    ['CTA button label', 'text', 'Optional', true],
    ['CTA link', 'text', 'Where should this button link to?', true]
  ]},
  { name: 'Essential Repeater', media: 'Each slide requires one image or video', fields: [
    ['Title', 'text', '', false],
    ['Sub-text', 'textarea', '', false],
    ['CTA button label', 'text', 'Optional', true],
    ['CTA link', 'text', '', true]
  ]},
  { name: 'Grid Teasers', media: 'Each slide requires one image, min. of 3 images', fields: [
    ['Video & floral accent?', 'text', 'Yes/No — include a video in the media drive if yes', false],
    ['Small text title', 'text', '', false],
    ['Large text title', 'text', '', false],
    ['Caption — image slot 1', 'text', 'Optional', true],
    ['Caption — image slot 2', 'text', 'Optional', true],
    ['Caption — image slot 3', 'text', 'Optional', true],
    ['CTA button', 'text', 'Optional', true]
  ]},
  { name: 'Tall Slider', media: 'Min. of three images and/or videos', fields: [
    ['Title', 'text', 'Last word can have a script text option', false],
    ['Title — image slot 1', 'text', '', false],
    ['Caption — image slot 1', 'text', 'Optional', true],
    ['Title — image slot 2', 'text', '', false],
    ['Caption — image slot 2', 'text', 'Optional', true],
    ['Title — image slot 3', 'text', '', false],
    ['Caption — image slot 3', 'text', 'Optional', true],
    ['CTA button', 'text', 'Optional', true]
  ]},
  { name: 'Story Gallery', media: 'Min. of three images/videos, max of 4', fields: [
    ['Title', 'text', 'Last word can have a script text option', false],
    ['Text — image slot 1', 'textarea', '', false],
    ['Name/title — image slot 1', 'text', 'Optional', true],
    ['CTA — image slot 1', 'text', 'Optional', true],
    ['Text — image slot 2', 'textarea', '', false],
    ['Name/title — image slot 2', 'text', 'Optional', true],
    ['CTA — image slot 2', 'text', 'Optional', true],
    ['Text — image slot 3', 'textarea', '', false],
    ['Name/title — image slot 3', 'text', 'Optional', true],
    ['CTA — image slot 3', 'text', 'Optional', true],
    ['CTA button', 'text', 'Optional', true]
  ]},
  { name: 'Featured Post', media: 'No media requirements', fields: [
    ['Title', 'text', '', false],
    ['CTA button', 'text', 'Optional', true],
    ['Auto-populated note', 'note', 'This block auto-pulls the most recent CPT; client can update after Beta', false]
  ]},
  { name: 'Essential Archive', media: 'No media requirements', fields: [
    ['Auto-populated note', 'note', 'Content pulls from the Notable DGs CPT, most recent first. Client can pin a post after Beta.', false]
  ]},
  { name: 'Essential Banner', media: 'One image or video', fields: [
    ['Floral accent?', 'text', 'Yes/No', false],
    ['Background color', 'text', 'Dark blue, green, or loyal blue', false],
    ['Title', 'text', '', false],
    ['Sub-text', 'textarea', 'Optional', true],
    ['CTA button', 'text', 'Optional', true]
  ]},
  { name: 'Bio Grid', media: 'Add images to the media drive named to match; will populate 3 Bio CPTs', fields: [
    ['Headline', 'text', '', false],
    ['Name 1 / Title / Location / Bio', 'textarea', '', false],
    ['Name 2 / Title / Location / Bio', 'textarea', '', false],
    ['Name 3 / Title / Location / Bio', 'textarea', '', false]
  ]},
  { name: 'Essential WYSIWYG', media: 'No media requirements', fields: [
    ['Content', 'richtext', 'Indicate styles: [H2], [H3], [Image], [Bulleted list], [Quote], etc.', false]
  ]},
  { name: 'Events Archive', media: 'Each event should have an image', fields: [
    ['Auto-populated note', 'note', 'Content pulls from the Events CPT, soonest first', false],
    ['Filters', 'text', 'Which filters should be available?', false],
    ['Event date', 'text', 'Month, Day, Year', false],
    ['Event time + time zone', 'text', '', false],
    ['Event location', 'text', '', false],
    ['Event title', 'text', '', false],
    ['Event teaser text', 'textarea', 'Appears on the events list', false]
  ]},
  { name: 'Drawers', media: 'Min. of one drawer; include one overarching image/video (fallback image used if none given per drawer)', fields: [
    ['Title', 'text', '', false],
    ['CTA button', 'text', 'Optional', true],
    ['Drawer 1 — title / body / caption', 'textarea', '', false],
    ['Drawer 2 — title / body / caption', 'textarea', 'Optional', true],
    ['Drawer 3 — title / body / caption', 'textarea', 'Optional', true]
  ]},
  { name: 'Testimonial', media: 'One image', fields: [
    ['Quote', 'textarea', '', false],
    ['Name', 'text', '', false],
    ['Title/Class', 'text', '', false]
  ]},
  { name: 'Timeline', media: 'Each slide requires at least one image', fields: [
    ['Top left text', 'text', 'Static — does not change with each slide', false],
    ['Year 1 / body / caption', 'textarea', '', false],
    ['Year 2 / body / caption', 'textarea', 'Optional', true],
    ['Year 3 / body / caption', 'textarea', 'Optional', true],
    ['Year 4 / body / caption', 'textarea', 'Optional', true],
    ['Year 5 / body / caption', 'textarea', 'Optional', true],
    ['Year 6 / body / caption', 'textarea', 'Optional', true]
  ]},
  { name: 'Teaser Slider', media: 'Min. of three', fields: [
    ['Small upper-left title', 'text', 'Static — does not change with the slider', false],
    ['Auto-populated note', 'note', 'Cards pull from the Notable DGs CPT', false]
  ]},
  { name: 'Footer CTA', media: 'Min. of 3 images; center image is the only one shown on mobile', fields: [
    ['Small text title', 'text', '', false],
    ['Large text title', 'text', '', false],
    ['Sub-text', 'textarea', '', false],
    ['CTA button', 'text', '', false]
  ]},
  { name: 'Text and Image Grid', media: 'None. Min 2 slots, max 4 slots', fields: [
    ['Headline', 'text', 'Last word can have a script text option', false],
    ['Sub-text', 'textarea', '', false],
    ['Slot 1 — title / sub-text / CTA', 'textarea', '', false],
    ['Slot 2 — title / sub-text / CTA', 'textarea', '', false],
    ['Slot 3 — title / sub-text / CTA', 'textarea', 'Optional', true],
    ['Slot 4 — title / sub-text / CTA', 'textarea', 'Optional', true]
  ]},
  { name: 'Essential Form', media: 'None', fields: [
    ['Title', 'text', '', false],
    ['Sub-text', 'richtext', 'Limited WYSIWYG: bold, underline, paragraph breaks, in-line links, multiple headers', false],
    ['Form fields', 'textarea', '', false]
  ]},
  { name: 'Curator', media: 'No media requirements', fields: [
    ['Title', 'text', 'Last word can have a script text option', false],
    ['Auto-populated note', 'note', 'Content pulls in via Curator.io', false]
  ]}
];

// ---------------- HTTP entry points ----------------

function doGet(e) {
  return handle(e.parameter || {});
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: 'Bad JSON body' });
  }
  return handle(body);
}

function handle(params) {
  var action = params.action;
  try {
    switch (action) {
      case 'bootstrap': return jsonOut(bootstrap());
      case 'listProjects': return jsonOut(listProjects());
      case 'getProject': return jsonOut(getProject(params.projectId));
      case 'getLibrary': return jsonOut(getLibrary());
      case 'createProject': return jsonOut(createProject(params.name));
      case 'addPage': return jsonOut(addPage(params.projectId, params.pageName));
      case 'deletePage': return jsonOut(deletePage(params.pageId));
      case 'addBlock': return jsonOut(addBlock(params.pageId, params.projectId, params.blockTypeId));
      case 'deleteBlock': return jsonOut(deleteBlock(params.blockId));
      case 'updateField': return jsonOut(updateField(params.fieldInstanceId, params.value));
      case 'reorderBlocks': return jsonOut(reorderBlocks(params.pageId, params.orderedBlockIds));
      case 'uploadDesign': return jsonOut(uploadDesign(params.projectId, params.blockTypeId, params.base64, params.mimeType, params.filename));
      default: return jsonOut({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------- Setup / bootstrap ----------------

function bootstrapNow() { bootstrap(); } // convenience for running from the editor

function bootstrap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = SHEETS[name];
    var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (existing.join('') !== headers.join('')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
  // remove the default empty "Sheet1" if it's still around and unused
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  seedLibraryIfEmpty();
  ensureTemplateProject();
  return { ok: true, message: 'Bootstrap complete' };
}

function seedLibraryIfEmpty() {
  var libSheet = sheetByName('BlockTypeLibrary');
  if (libSheet.getLastRow() > 1) return; // already seeded

  var fieldSheet = sheetByName('BlockTypeFields');
  var libRows = [];
  var fieldRows = [];
  BLOCK_LIBRARY_SEED.forEach(function (block, i) {
    var typeId = 'bt_' + (i + 1);
    libRows.push([typeId, block.name, block.media, i + 1]);
    block.fields.forEach(function (f, j) {
      fieldRows.push(['bf_' + typeId + '_' + (j + 1), typeId, f[0], f[1], f[2], f[3], j + 1]);
    });
  });
  appendRows(libSheet, libRows);
  appendRows(fieldSheet, fieldRows);
}

function ensureTemplateProject() {
  var projSheet = sheetByName('Projects');
  var rows = getRows(projSheet);
  var hasTemplate = rows.some(function (r) { return r.IsTemplate === true || r.IsTemplate === 'TRUE'; });
  if (hasTemplate) return;

  appendRows(projSheet, [['template', 'TEMPLATE', new Date().toISOString(), true]]);
  var pageSheet = sheetByName('Pages');
  appendRows(pageSheet, [[newId('pg'), 'template', 'Homepage', 1]]);
}

// ---------------- Sheet helpers ----------------

function sheetByName(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name + ' — run bootstrap first');
  return sheet;
}

function getRows(sheet) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    headers.forEach(function (h, idx) { row[h] = values[i][idx]; });
    row._rowIndex = i + 1; // 1-based sheet row
    rows.push(row);
  }
  return rows;
}

function appendRows(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function newId(prefix) {
  return prefix + '_' + Utilities.getUuid().split('-')[0];
}

function findRowIndexById(sheet, idColName, idValue) {
  var rows = getRows(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][idColName] === idValue) return rows[i]._rowIndex;
  }
  return -1;
}

// ---------------- Projects ----------------

function listProjects() {
  var rows = getRows(sheetByName('Projects')).filter(function (r) { return r.IsTemplate !== true && r.IsTemplate !== 'TRUE'; });
  return { ok: true, projects: rows.map(function (r) {
    return { projectId: r.ProjectID, name: r.ProjectName, createdDate: r.CreatedDate };
  })};
}

function createProject(name) {
  var id = newId('proj');
  appendRows(sheetByName('Projects'), [[id, name || 'Untitled Client', new Date().toISOString(), false]]);

  // duplicate template's pages (currently just an empty Homepage) — no blocks to copy yet
  var templatePages = getRows(sheetByName('Pages')).filter(function (r) { return r.ProjectID === 'template'; });
  var pageSheet = sheetByName('Pages');
  templatePages.forEach(function (p) {
    appendRows(pageSheet, [[newId('pg'), id, p.PageName, p.SortOrder]]);
  });

  return { ok: true, projectId: id, name: name };
}

function getProject(projectId) {
  var project = getRows(sheetByName('Projects')).find(function (r) { return r.ProjectID === projectId; });
  if (!project) return { ok: false, error: 'Project not found' };

  var pages = getRows(sheetByName('Pages')).filter(function (r) { return r.ProjectID === projectId; })
    .sort(function (a, b) { return a.SortOrder - b.SortOrder; });
  var blocks = getRows(sheetByName('Blocks')).filter(function (r) { return r.ProjectID === projectId; })
    .sort(function (a, b) { return a.SortOrder - b.SortOrder; });
  var blockIds = blocks.map(function (b) { return b.BlockID; });
  var fields = getRows(sheetByName('BlockFields')).filter(function (r) { return blockIds.indexOf(r.BlockID) !== -1; })
    .sort(function (a, b) { return a.SortOrder - b.SortOrder; });
  var designs = getRows(sheetByName('BlockDesigns')).filter(function (r) { return r.ProjectID === projectId; });

  return {
    ok: true,
    project: { projectId: project.ProjectID, name: project.ProjectName },
    pages: pages.map(function (p) { return { pageId: p.PageID, pageName: p.PageName, sortOrder: p.SortOrder }; }),
    blocks: blocks.map(function (b) {
      return { blockId: b.BlockID, pageId: b.PageID, blockTypeId: b.BlockTypeID, blockTypeName: b.BlockTypeName, sortOrder: b.SortOrder };
    }),
    fields: fields.map(function (f) {
      return { fieldInstanceId: f.FieldInstanceID, blockId: f.BlockID, label: f.FieldLabel, type: f.FieldType, note: f.FieldNote, optional: f.IsOptional, value: f.Value, sortOrder: f.SortOrder };
    }),
    designs: designs.map(function (d) { return { blockTypeId: d.BlockTypeID, imageUrl: d.ImageURL }; })
  };
}

// ---------------- Pages ----------------

function addPage(projectId, pageName) {
  var pageSheet = sheetByName('Pages');
  var existing = getRows(pageSheet).filter(function (r) { return r.ProjectID === projectId; });
  var sortOrder = existing.length ? Math.max.apply(null, existing.map(function (r) { return r.SortOrder; })) + 1 : 1;
  var id = newId('pg');
  appendRows(pageSheet, [[id, projectId, pageName || 'New Page', sortOrder]]);
  return { ok: true, pageId: id, pageName: pageName, sortOrder: sortOrder };
}

function deletePage(pageId) {
  var pageSheet = sheetByName('Pages');
  var idx = findRowIndexById(pageSheet, 'PageID', pageId);
  if (idx > 0) pageSheet.deleteRow(idx);

  // cascade delete blocks + fields on that page
  var blockSheet = sheetByName('Blocks');
  var fieldSheet = sheetByName('BlockFields');
  var blocksToRemove = getRows(blockSheet).filter(function (r) { return r.PageID === pageId; });
  blocksToRemove.forEach(function (b) { deleteBlock(b.BlockID); });
  return { ok: true };
}

// ---------------- Blocks ----------------

function addBlock(pageId, projectId, blockTypeId) {
  var libRow = getRows(sheetByName('BlockTypeLibrary')).find(function (r) { return r.BlockTypeID === blockTypeId; });
  if (!libRow) return { ok: false, error: 'Unknown block type' };

  var blockSheet = sheetByName('Blocks');
  var existing = getRows(blockSheet).filter(function (r) { return r.PageID === pageId; });
  var sortOrder = existing.length ? Math.max.apply(null, existing.map(function (r) { return r.SortOrder; })) + 1 : 1;

  var blockId = newId('blk');
  appendRows(blockSheet, [[blockId, pageId, projectId, blockTypeId, libRow.BlockTypeName, sortOrder]]);

  // clone default fields as this block instance's fields (snapshot — library edits won't retroactively change this)
  var defaultFields = getRows(sheetByName('BlockTypeFields')).filter(function (r) { return r.BlockTypeID === blockTypeId; })
    .sort(function (a, b) { return a.SortOrder - b.SortOrder; });
  var fieldRows = defaultFields.map(function (f) {
    return [newId('fi'), blockId, f.FieldLabel, f.FieldType, f.FieldNote, f.IsOptional, '', f.SortOrder];
  });
  appendRows(sheetByName('BlockFields'), fieldRows);

  return { ok: true, blockId: blockId, sortOrder: sortOrder };
}

function deleteBlock(blockId) {
  var blockSheet = sheetByName('Blocks');
  var idx = findRowIndexById(blockSheet, 'BlockID', blockId);
  if (idx > 0) blockSheet.deleteRow(idx);

  var fieldSheet = sheetByName('BlockFields');
  var rows = getRows(fieldSheet).filter(function (r) { return r.BlockID === blockId; });
  // delete from bottom up so row indices don't shift under us
  rows.sort(function (a, b) { return b._rowIndex - a._rowIndex; })
    .forEach(function (r) { fieldSheet.deleteRow(r._rowIndex); });

  return { ok: true };
}

function reorderBlocks(pageId, orderedBlockIds) {
  var blockSheet = sheetByName('Blocks');
  var rows = getRows(blockSheet).filter(function (r) { return r.PageID === pageId; });
  var sortColIndex = SHEETS.Blocks.indexOf('SortOrder') + 1;
  orderedBlockIds.forEach(function (id, i) {
    var row = rows.find(function (r) { return r.BlockID === id; });
    if (row) blockSheet.getRange(row._rowIndex, sortColIndex).setValue(i + 1);
  });
  return { ok: true };
}

// ---------------- Fields ----------------

function updateField(fieldInstanceId, value) {
  var fieldSheet = sheetByName('BlockFields');
  var idx = findRowIndexById(fieldSheet, 'FieldInstanceID', fieldInstanceId);
  if (idx < 0) return { ok: false, error: 'Field not found' };
  var valueColIndex = SHEETS.BlockFields.indexOf('Value') + 1;
  fieldSheet.getRange(idx, valueColIndex).setValue(value);
  return { ok: true };
}

// ---------------- Library ----------------

function getLibrary() {
  var types = getRows(sheetByName('BlockTypeLibrary')).sort(function (a, b) { return a.SortOrder - b.SortOrder; });
  var fields = getRows(sheetByName('BlockTypeFields'));
  return {
    ok: true,
    blockTypes: types.map(function (t) {
      return { blockTypeId: t.BlockTypeID, name: t.BlockTypeName, media: t.MediaRequirements };
    }),
    fieldsByType: fields.reduce(function (acc, f) {
      (acc[f.BlockTypeID] = acc[f.BlockTypeID] || []).push({ label: f.FieldLabel, type: f.FieldType, note: f.FieldNote, optional: f.IsOptional });
      return acc;
    }, {})
  };
}

// ---------------- Designs (Drive upload) ----------------

function getOrCreateDriveFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function uploadDesign(projectId, blockTypeId, base64, mimeType, filename) {
  var folder = getOrCreateDriveFolder();
  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mimeType, filename || 'design.png');
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var imageUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

  var designSheet = sheetByName('BlockDesigns');
  var rows = getRows(designSheet);
  var existing = rows.find(function (r) { return r.ProjectID === projectId && r.BlockTypeID === blockTypeId; });
  if (existing) {
    designSheet.getRange(existing._rowIndex, SHEETS.BlockDesigns.indexOf('DriveFileID') + 1).setValue(fileId);
    designSheet.getRange(existing._rowIndex, SHEETS.BlockDesigns.indexOf('ImageURL') + 1).setValue(imageUrl);
  } else {
    appendRows(designSheet, [[projectId, blockTypeId, fileId, imageUrl]]);
  }

  return { ok: true, imageUrl: imageUrl };
}
