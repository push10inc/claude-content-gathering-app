// ---------------------------------------------------------------
// API wrapper for the Apps Script backend.
// Set API_URL to your deployed Web App /exec URL (see README.md).
// ---------------------------------------------------------------

const API_URL = window.CGT_CONFIG && window.CGT_CONFIG.API_URL;

async function apiGet(action, params = {}) {
  if (!API_URL) throw new Error('API_URL is not configured — see config.js');
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${API_URL}?${query}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiPost(action, payload = {}) {
  if (!API_URL) throw new Error('API_URL is not configured — see config.js');
  const res = await fetch(API_URL, {
    method: 'POST',
    // text/plain avoids a CORS preflight OPTIONS request, which Apps Script
    // web apps don't handle. The server still JSON.parses the body.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const Api = {
  bootstrap: () => apiGet('bootstrap'),
  listProjects: () => apiGet('listProjects'),
  getProject: (projectId) => apiGet('getProject', { projectId }),
  getLibrary: () => apiGet('getLibrary'),
  createProject: (name) => apiPost('createProject', { name }),
  addPage: (projectId, pageName) => apiPost('addPage', { projectId, pageName }),
  deletePage: (pageId) => apiPost('deletePage', { pageId }),
  addBlock: (pageId, projectId, blockTypeId) => apiPost('addBlock', { pageId, projectId, blockTypeId }),
  deleteBlock: (blockId) => apiPost('deleteBlock', { blockId }),
  updateField: (fieldInstanceId, value) => apiPost('updateField', { fieldInstanceId, value }),
  reorderBlocks: (pageId, orderedBlockIds) => apiPost('reorderBlocks', { pageId, orderedBlockIds }),
  uploadDesign: (projectId, blockTypeId, base64, mimeType, filename) =>
    apiPost('uploadDesign', { projectId, blockTypeId, base64, mimeType, filename })
};
