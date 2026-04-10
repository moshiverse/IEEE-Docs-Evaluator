'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open a Google/Supabase OAuth URL in the system browser
  startOAuth: (oauthUrl) => ipcRenderer.invoke('oauth:start', oauthUrl),

  // Save an array of { name, dataUrl } PDF files to a user-chosen folder
  savePdfsToFolder: (files) => ipcRenderer.invoke('pdfs:save', files),
});
