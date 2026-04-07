const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('codexVideoAnalyzer', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  getEnvironmentStatus: () => ipcRenderer.invoke('environment:get'),
  pickRootFolder: () => ipcRenderer.invoke('dialog:pick-root-folder'),
  scanFolders: (rootPath) => ipcRenderer.invoke('folders:scan', rootPath),
  loadFolderTree: (rootPath) => ipcRenderer.invoke('folders:tree', rootPath),
  loadFolderVideos: (rootPath, folderPath) =>
    ipcRenderer.invoke('folders:videos', rootPath, folderPath),
  loadAnalysis: (folderPath) => ipcRenderer.invoke('analysis:load', folderPath),
  loadAnalysisProgress: (folderPath) =>
    ipcRenderer.invoke('analysis:load-progress', folderPath),
  startAnalysis: (folderPath) => ipcRenderer.invoke('analysis:start', folderPath),
  cancelAnalysis: () => ipcRenderer.invoke('analysis:cancel'),
  showItemInFolder: (targetPath) => ipcRenderer.invoke('shell:show-item', targetPath),
  openPath: (targetPath) => ipcRenderer.invoke('shell:open-path', targetPath),
  onAppEvent: (listener) => {
    const wrapped = (_event, payload) => listener(payload)
    ipcRenderer.on('app:event', wrapped)
    return () => ipcRenderer.removeListener('app:event', wrapped)
  },
  onAnalysisEvent: (listener) => {
    const wrapped = (_event, payload) => listener(payload)
    ipcRenderer.on('analysis:event', wrapped)
    return () => ipcRenderer.removeListener('analysis:event', wrapped)
  },
})
