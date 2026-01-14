const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  fetchVendors: () => ipcRenderer.invoke('get-vendors')
})