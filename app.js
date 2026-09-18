// ---------------------------------------------------------------
// Content Gathering Tool — front end
// ---------------------------------------------------------------

const state = {
  view: 'list',       // 'list' | 'project'
  projects: [],
  library: null,       // { blockTypes, fieldsByType }
  currentProject: null, // full getProject() payload
  currentPageId: null,
  saveTimers: {}        // fieldInstanceId -> timeout handle, for debounced autosave
};

const $app = document.getElementById('app');

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

// ---------------- Boot ----------------

async function boot() {
  renderLoading('Loading projects…');
  try {
    await Api.bootstrap(); // idempotent — safe to call every load
    const [{ projects }, library] = await Promise.all([Api.listProjects(), Api.getLibrary()]);
    state.projects = projects;
    state.library = library;
    renderProjectList();
  } catch (err) {
    renderError(err);
  }
}

function renderLoading(msg) {
  $app.innerHTML = '';
  $app.appendChild(el('div', { class: 'loading' }, msg));
}

function renderError(err) {
  $app.innerHTML = '';
  $app.appendChild(el('div', { class: 'error-banner' }, [
    el('strong', {}, 'Something went wrong: '),
    String(err.message || err)
  ]));
}

// ---------------- Project list view ----------------

function renderProjectList() {
  state.view = 'list';
  $app.innerHTML = '';

  const header = el('header', { class: 'topbar' }, [
    el('h1', {}, 'Content Gathering'),
    el('button', { class: 'btn btn-primary', onclick: onNewClient }, '+ New Client')
  ]);

  const list = el('div', { class: 'project-grid' },
    state.projects.length
      ? state.projects.map(p => el('button', { class: 'project-card', onclick: () => openProject(p.projectId) }, [
          el('div', { class: 'project-card-name' }, p.name),
          el('div', { class: 'project-card-date' }, p.createdDate ? new Date(p.createdDate).toLocaleDateString() : '')
        ]))
      : [el('div', { class: 'empty-state' }, 'No client projects yet — create one to get started.')]
  );

  $app.appendChild(header);
  $app.appendChild(list);
}

async function onNewClient() {
  const name = prompt('Client / project name:');
  if (!name) return;
  renderLoading('Creating project…');
  try {
    await Api.createProject(name);
    const { projects } = await Api.listProjects();
    state.projects = projects;
    renderProjectList();
  } catch (err) {
    renderError(err);
  }
}

// ---------------- Project editor view ----------------

async function openProject(projectId) {
  renderLoading('Loading project…');
  try {
    state.currentProject = await Api.getProject(projectId);
    state.currentPageId = state.currentProject.pages[0]?.pageId || null;
    renderProjectEditor();
  } catch (err) {
    renderError(err);
  }
}

function renderProjectEditor() {
  state.view = 'project';
  $app.innerHTML = '';
  const { project, pages } = state.currentProject;

  const header = el('header', { class: 'topbar' }, [
    el('button', { class: 'btn btn-link', onclick: renderProjectList }, '← All clients'),
    el('h1', {}, project.name)
  ]);

  const tabs = el('div', { class: 'page-tabs' }, [
    ...pages.map(p => el('button', {
      class: 'page-tab' + (p.pageId === state.currentPageId ? ' active' : ''),
      onclick: () => { state.currentPageId = p.pageId; renderProjectEditor(); }
    }, p.pageName)),
    el('button', { class: 'page-tab page-tab-add', onclick: onAddPage }, '+ New page')
  ]);

  const sidebar = renderLibrarySidebar();
  const canvas = renderPageCanvas();

  $app.appendChild(header);
  $app.appendChild(tabs);
  $app.appendChild(el('div', { class: 'editor-layout' }, [sidebar, canvas]));
}

async function onAddPage() {
  const name = prompt('Page name:');
  if (!name) return;
  const { pageId } = await Api.addPage(state.currentProject.project.projectId, name);
  state.currentProject = await Api.getProject(state.currentProject.project.projectId);
  state.currentPageId = pageId;
  renderProjectEditor();
}

// ---------------- Library sidebar ----------------

function renderLibrarySidebar() {
  const { blockTypes } = state.library;
  return el('aside', { class: 'sidebar' }, [
    el('h2', {}, 'Block Library'),
    el('div', { class: 'library-list' }, blockTypes.map(bt =>
      el('div', { class: 'library-item', draggable: 'true',
          ondragstart: (e) => e.dataTransfer.setData('text/block-type-id', bt.blockTypeId),
          onclick: () => onAddBlockToCurrentPage(bt.blockTypeId)
        }, [
        el('div', { class: 'library-item-name' }, bt.name),
        el('div', { class: 'library-item-media' }, bt.media || ''),
        el('div', { class: 'library-item-hint' }, 'Click or drag to add →')
      ])
    ))
  ]);
}

async function onAddBlockToCurrentPage(blockTypeId) {
  if (!state.currentPageId) return;
  await Api.addBlock(state.currentPageId, state.currentProject.project.projectId, blockTypeId);
  state.currentProject = await Api.getProject(state.currentProject.project.projectId);
  renderProjectEditor();
}

// ---------------- Page canvas (blocks + fields) ----------------

function renderPageCanvas() {
  const { blocks, fields, designs } = state.currentProject;
  const pageBlocks = blocks.filter(b => b.pageId === state.currentPageId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const canvas = el('main', {
    class: 'canvas',
    ondragover: (e) => e.preventDefault(),
    ondrop: onDropOnCanvas
  }, [
    pageBlocks.length
      ? pageBlocks.map((block, i) => renderBlockCard(block, i, pageBlocks.length, fields, designs))
      : el('div', { class: 'empty-state' }, 'Drag a block from the library, or click one, to start this page.')
  ]);

  return canvas;
}

async function onDropOnCanvas(e) {
  e.preventDefault();
  const blockTypeId = e.dataTransfer.getData('text/block-type-id');
  if (blockTypeId) await onAddBlockToCurrentPage(blockTypeId);
}

function renderBlockCard(block, index, total, allFields, designs) {
  const blockFields = allFields.filter(f => f.blockId === block.blockId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const design = designs.find(d => d.blockTypeId === block.blockTypeId);

  const fieldRows = blockFields.map(f => renderFieldRow(f));

  const designPanel = el('div', { class: 'design-panel' }, [
    design
      ? el('img', { src: design.imageUrl, class: 'design-thumb', alt: block.blockTypeName + ' design' })
      : el('div', { class: 'design-placeholder' }, 'No design uploaded yet'),
    el('label', { class: 'btn btn-secondary btn-small' }, [
      design ? 'Replace design' : 'Add design',
      el('input', {
        type: 'file', accept: 'image/*', class: 'file-input-hidden',
        onchange: (e) => onUploadDesign(e, block.blockTypeId)
      })
    ]),
    el('div', { class: 'design-note' }, 'Applies to every "' + block.blockTypeName + '" block on any page in this project.')
  ]);

  return el('section', { class: 'block-card' }, [
    el('div', { class: 'block-card-header' }, [
      el('div', { class: 'block-card-title' }, block.blockTypeName),
      el('div', { class: 'block-card-controls' }, [
        el('button', { class: 'icon-btn', title: 'Move up', disabled: index === 0 ? 'true' : null,
          onclick: () => onMoveBlock(block.blockId, index, -1) }, '▲'),
        el('button', { class: 'icon-btn', title: 'Move down', disabled: index === total - 1 ? 'true' : null,
          onclick: () => onMoveBlock(block.blockId, index, 1) }, '▼'),
        el('button', { class: 'icon-btn icon-btn-danger', title: 'Remove block',
          onclick: () => onDeleteBlock(block.blockId) }, '✕')
      ])
    ]),
    el('div', { class: 'block-card-body' }, [
      el('div', { class: 'field-column' }, fieldRows),
      designPanel
    ])
  ]);
}

function renderFieldRow(field) {
  const isTextarea = field.type === 'textarea' || field.type === 'richtext';
  const inputEl = field.type === 'note'
    ? el('div', { class: 'field-note-static' }, field.note || field.value || '')
    : el(isTextarea ? 'textarea' : 'input', {
        class: 'field-input',
        value: isTextarea ? undefined : (field.value || ''),
        oninput: (e) => onFieldInput(field.fieldInstanceId, e.target.value)
      }, isTextarea ? (field.value || '') : []);

  return el('div', { class: 'field-row' }, [
    el('label', { class: 'field-label' }, [
      field.label + (field.optional ? ' (optional)' : ''),
      field.note && field.type !== 'note' ? el('span', { class: 'field-help' }, field.note) : null
    ]),
    inputEl
  ]);
}

function onFieldInput(fieldInstanceId, value) {
  // update local state immediately so re-renders don't lose keystrokes
  const f = state.currentProject.fields.find(f => f.fieldInstanceId === fieldInstanceId);
  if (f) f.value = value;

  clearTimeout(state.saveTimers[fieldInstanceId]);
  state.saveTimers[fieldInstanceId] = setTimeout(async () => {
    try {
      await Api.updateField(fieldInstanceId, value);
      flashSaved();
    } catch (err) {
      console.error('Autosave failed', err);
    }
  }, 600);
}

function flashSaved() {
  let badge = document.getElementById('save-badge');
  if (!badge) {
    badge = el('div', { id: 'save-badge', class: 'save-badge' }, 'Saved');
    document.body.appendChild(badge);
  }
  badge.classList.add('visible');
  clearTimeout(badge._hideTimer);
  badge._hideTimer = setTimeout(() => badge.classList.remove('visible'), 1200);
}

async function onMoveBlock(blockId, index, direction) {
  const pageBlocks = state.currentProject.blocks
    .filter(b => b.pageId === state.currentPageId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= pageBlocks.length) return;
  [pageBlocks[index], pageBlocks[newIndex]] = [pageBlocks[newIndex], pageBlocks[index]];
  const orderedBlockIds = pageBlocks.map(b => b.blockId);
  await Api.reorderBlocks(state.currentPageId, orderedBlockIds);
  state.currentProject = await Api.getProject(state.currentProject.project.projectId);
  renderProjectEditor();
}

async function onDeleteBlock(blockId) {
  if (!confirm('Remove this block and its content? This can\'t be undone.')) return;
  await Api.deleteBlock(blockId);
  state.currentProject = await Api.getProject(state.currentProject.project.projectId);
  renderProjectEditor();
}

async function onUploadDesign(e, blockTypeId) {
  const file = e.target.files[0];
  if (!file) return;
  const base64 = await fileToBase64(file);
  renderLoading('Uploading design…');
  try {
    await Api.uploadDesign(state.currentProject.project.projectId, blockTypeId, base64, file.type, file.name);
    state.currentProject = await Api.getProject(state.currentProject.project.projectId);
    renderProjectEditor();
  } catch (err) {
    renderError(err);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

boot();
