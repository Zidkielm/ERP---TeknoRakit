const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('api', {
    login: (credentials) => ipcRenderer.invoke('login-user', credentials),
    fetchVendors: () => ipcRenderer.invoke('get-vendors'),
    fetchProducts: () => ipcRenderer.invoke('get-products'), // <-- BARU
})
