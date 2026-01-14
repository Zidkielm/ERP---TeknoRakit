const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('api', {
    login: (credentials) => ipcRenderer.invoke('login-user', credentials),
    fetchVendors: () => ipcRenderer.invoke('get-vendors'),
    fetchProducts: () => ipcRenderer.invoke('get-products'),
    fetchUsers: () => ipcRenderer.invoke('get-users'),
    createUser: (data) => ipcRenderer.invoke('create-user', data),
    fetchStats: () => ipcRenderer.invoke('get-stats'),
    fetchProducts: () => ipcRenderer.invoke('get-products'),
    createProduct: (data) => ipcRenderer.invoke('create-product', data),
    updateProduct: (data) => ipcRenderer.invoke('update-product', data),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
})
