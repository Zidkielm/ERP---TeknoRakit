import {app, BrowserWindow, ipcMain} from 'electron'
import path from 'path'
import {fileURLToPath} from 'url'
// --- PERBAIKAN IMPORT PG ---
import {createRequire} from 'module'
const require = createRequire(import.meta.url)
const {Client} = require('pg')

// --- SETUP PATH ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- KONFIGURASI DATABASE ---
const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'ERP_TeknoRakit',
    password: '123456',
    port: 5432,
}

// --- FUNGSI LOGIN ---
async function loginUser(username, password) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        // Cari user yang username DAN password-nya cocok
        const query = 'SELECT * FROM users WHERE username = $1 AND password = $2'
        const res = await client.query(query, [username, password])

        await client.end()

        // Jika ketemu datanya (res.rows.length > 0), kembalikan data user
        // Jika tidak, kembalikan null
        return res.rows.length > 0 ? res.rows[0] : null
    } catch (err) {
        console.error('Login Error:', err)
        return null
    }
}

// --- FUNGSI ADMIN: AMBIL SEMUA USER ---
async function getAllUsers() {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        // Ambil semua user KECUALI password (privasi)
        const res = await client.query('SELECT user_id, username, full_name, role, created_at FROM users ORDER BY user_id ASC')
        await client.end()
        return res.rows
    } catch (err) {
        console.error('Error Get Users:', err)
        return []
    }
}

// --- FUNGSI ADMIN: BUAT USER BARU ---
async function createUser(userData) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        const query = `
      INSERT INTO users (username, password, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `
        const values = [userData.username, userData.password, userData.fullName, userData.role]
        const res = await client.query(query, values)
        await client.end()
        return {success: true, user: res.rows[0]}
    } catch (err) {
        console.error('Error Create User:', err)
        return {success: false, error: err.message}
    }
}

// --- FUNGSI 1: AMBIL DATA VENDOR ---
async function getVendors() {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        const res = await client.query('SELECT * FROM vendors ORDER BY vendor_id ASC')
        await client.end()
        return res.rows
    } catch (err) {
        console.error('Database Error (Vendors):', err)
        return []
    }
}

// --- FUNGSI 2: AMBIL DATA PRODUK (BARU) ---
async function getProducts() {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        const res = await client.query('SELECT * FROM products ORDER BY type ASC, name ASC')
        await client.end()
        return res.rows
    } catch (err) {
        console.error('Database Error (Products):', err)
        return []
    }
}

// --- SETUP WINDOW ---
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1000, // Sedikit lebih lebar
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
    }
}

app.on('ready', () => {
    // Hapus handler lama jika ada (Tips Pro untuk hindari error handler ganda saat reload)
    ipcMain.removeHandler('login-user')
    ipcMain.removeHandler('get-vendors')
    ipcMain.removeHandler('get-products')
    ipcMain.removeHandler('get-users')
    ipcMain.removeHandler('create-user')

    // Daftarkan Handler Vendor
    ipcMain.handle('get-vendors', async () => {
        return await getVendors()
    })

    // Daftarkan Handler Produk
    ipcMain.handle('get-products', async () => {
        return await getProducts()
    })

    // Daftarkan Handler Login
    ipcMain.handle('login-user', async (event, credentials) => {
        // credentials adalah object { username: '...', password: '...' }
        return await loginUser(credentials.username, credentials.password)
    })

    // ipcMain.handle('get-vendors', async () => await getVendors())
    // ipcMain.handle('get-products', async () => await getProducts())

    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
