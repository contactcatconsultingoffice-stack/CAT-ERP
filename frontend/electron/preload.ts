import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose some API to the Renderer process ---------
// We isolate contexts to ensure security. 
// Features requiring Node.js core modules or Electron IPC
// must be exposed here.

contextBridge.exposeInMainWorld('electronPlatform', {
  isDesktop: true,
  platform: process.platform,
  // Example of IPC call to main process:
  // ping: () => ipcRenderer.invoke('ping'),
});
