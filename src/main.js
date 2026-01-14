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
        const res = await client.query('SELECT user_id, username, fullname, role, created_at FROM users ORDER BY user_id ASC')
        await client.end()
        return res.rows
    } catch (err) {
        console.error('Error Get Users:', err)
        return []
    }
}

// --- FUNGSI BARU: DASHBOARD STATS ---
async function getDashboardStats() {
    const client = new Client(dbConfig)
    try {
        await client.connect()

        // Kita jalankan banyak query sekaligus (Parallel) biar cepat
        const [resUsers, resProducts, resLowStock, resPO, resSO, resWO] = await Promise.all([
            client.query('SELECT COUNT(*) AS total FROM users'),
            client.query('SELECT COUNT(*) AS total FROM products'),
            client.query('SELECT COUNT(*) AS total FROM products WHERE stock_qty <= min_stock'),
            client.query("SELECT COUNT(*) AS total FROM purchase_orders WHERE status = 'ORDERED'"),
            client.query("SELECT COUNT(*) AS total FROM sales_orders WHERE status = 'CONFIRMED'"),
            client.query("SELECT COUNT(*) AS total FROM work_orders WHERE status IN ('PLANNED', 'IN_PROGRESS')"),
        ])

        await client.end()
        const parseCount = (res) => {
            return res.rows.length > 0 ? parseInt(res.rows[0].total) : 0
        }
        return {
            users: parseCount(resUsers),
            products: parseCount(resProducts),
            lowStock: parseCount(resLowStock),
            pendingPO: parseCount(resPO),
            pendingSO: parseCount(resSO),
            activeWO: parseCount(resWO),
        }
    } catch (err) {
        console.error('Error Stats:', err)
        return {users: 0, products: 0, lowStock: 0, pendingPO: 0, pendingSO: 0, activeWO: 0}
    }
}

// --- FUNGSI ADMIN: BUAT USER BARU ---
async function createUser(userData) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        const query = `
      INSERT INTO users (username, password, fullname, role)
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

// --- FUNGSI 2: AMBIL DATA PRODUK ---
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

// --- [BARU] UPDATE USER ---
async function updateUser(userData) {
    const client = new Client(dbConfig)
    try {
        await client.connect()

        // Logika Password:
        // Jika admin mengisi password baru, update passwordnya.
        // Jika kosong, pakai password lama (jangan diubah).
        let query, values

        if (userData.password) {
            // Update SEMUA termasuk password
            query = `UPDATE users SET username=$1, password=$2, fullname=$3, role=$4 WHERE user_id=$5`
            values = [userData.username, userData.password, userData.fullName, userData.role, userData.user_id]
        } else {
            // Update data profil saja, PASSWORD TETAP
            query = `UPDATE users SET username=$1, fullname=$2, role=$3 WHERE user_id=$4`
            values = [userData.username, userData.fullName, userData.role, userData.user_id]
        }

        await client.query(query, values)
        await client.end()
        return {success: true}
    } catch (err) {
        console.error('Update User Error:', err)
        return {success: false, error: err.message}
    }
}

// --- [BARU] DELETE USER ---
async function deleteUser(userId) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        // Hapus user berdasarkan ID
        await client.query('DELETE FROM users WHERE user_id = $1', [userId])
        await client.end()
        return {success: true}
    } catch (err) {
        return {success: false, error: 'Gagal hapus user (Mungkin data sedang dipakai).'}
    }
}

// --- CRUD PRODUK ---
// 1. CREATE (Sudah ada, pastikan seperti ini)
async function createProduct(data) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        // Default stok 0 saat buat baru
        const query = `INSERT INTO products (sku, name, type, stock_qty, min_stock, unit, price) VALUES ($1, $2, $3, 0, $4, $5, $6) RETURNING *`
        const values = [data.sku, data.name, data.type, data.min_stock, data.unit, data.price]
        await client.query(query, values)
        await client.end()
        return {success: true}
    } catch (err) {
        console.error(err)
        return {success: false, error: err.message}
    }
}

// 2. UPDATE (Edit Data Barang)
async function updateProduct(data) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        // PERHATIKAN: Kita TIDAK update stock_qty di sini demi keamanan data
        const query = `
      UPDATE products 
      SET sku=$1, name=$2, type=$3, min_stock=$4, unit=$5, price=$6 
      WHERE product_id=$7
    `
        const values = [data.sku, data.name, data.type, data.min_stock, data.unit, data.price, data.product_id]
        await client.query(query, values)
        await client.end()
        return {success: true}
    } catch (err) {
        return {success: false, error: err.message}
    }
}

// 3. DELETE (Hapus Barang)
async function deleteProduct(productId) {
    const client = new Client(dbConfig)
    try {
        await client.connect()
        await client.query('DELETE FROM products WHERE product_id = $1', [productId])
        await client.end()
        return {success: true}
    } catch (err) {
        // Biasanya error karena barang sudah dipakai di transaksi (Foreign Key constraint)
        return {success: false, error: 'Gagal hapus! Barang ini sudah pernah dipakai transaksi.'}
    }
}

app.on('ready', () => {
    // Hapus handler lama jika ada (Tips Pro untuk hindari error handler ganda saat reload)
    ipcMain.removeHandler('login-user')
    ipcMain.removeHandler('get-vendors')
    ipcMain.removeHandler('get-products')
    ipcMain.removeHandler('get-users')
    ipcMain.removeHandler('create-user')
    ipcMain.removeHandler('get-stats')

    // Daftarkan Handler Vendor
    ipcMain.handle('get-vendors', async () => {
        return await getVendors()
    })

    ipcMain.handle('get-stats', async () => await getDashboardStats())

    // Daftarkan Handler Produk
    ipcMain.handle('get-products', async () => {
        return await getProducts()
    })

    // Daftarkan Handler Login
    ipcMain.handle('login-user', async (event, credentials) => {
        // credentials adalah object { username: '...', password: '...' }
        return await loginUser(credentials.username, credentials.password)
    })

    ipcMain.handle('get-users', async () => {
        return await getAllUsers()
    })

    ipcMain.handle('create-user', async (e, userData) => {
        return await createUser(userData)
    })

    //Handler CUD
    ipcMain.handle('create-product', async (e, data) => await createProduct(data))
    ipcMain.handle('update-product', async (e, data) => await updateProduct(data))
    ipcMain.handle('delete-product', async (e, id) => await deleteProduct(id))

    // Handler update & delete user
    ipcMain.handle('update-user', async (e, data) => await updateUser(data)) // BARU
    ipcMain.handle('delete-user', async (e, id) => await deleteUser(id)) // BARU

    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
