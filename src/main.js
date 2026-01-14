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

// --- FUNGSI AMBIL DATA ---
async function getVendors() {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        console.log('Database Terkoneksi!')
        const res = await client.query('SELECT * FROM vendors ORDER BY vendor_id ASC')
        await client.end()
        return res.rows
    } catch (err) {
        console.error('Database Error:', err)
        return []
    }
}

// --- SETUP WINDOW ---
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    // Logika Vite load URL
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
    }

    // Buka DevTools (Opsional, hapus kalau mengganggu)
    // mainWindow.webContents.openDevTools()
}

app.on('ready', () => {
    ipcMain.handle('get-vendors', async () => {
        return await getVendors()
    })
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
