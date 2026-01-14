// --- VARIABEL GLOBAL ---
let currentUserRole = ''

// --- ELEMEN HTML ---
const loginView = document.getElementById('login-view')
const dashboardView = document.getElementById('dashboard-view')
const btnLogin = document.getElementById('btn-login')
const inpUser = document.getElementById('inp-username')
const inpPass = document.getElementById('inp-password')
const errorMsg = document.getElementById('login-error')

// ==========================================================
// 1. BAGIAN MANAJEMEN USER (ADMIN)
// ==========================================================

const loadUsers = async () => {
    const tableBody = document.getElementById('table-users-body')
    if (!tableBody) return

    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>'
    try {
        const users = await window.api.fetchUsers()
        if (document.getElementById('stat-user-count')) {
            document.getElementById('stat-user-count').innerText = users.length
        }

        tableBody.innerHTML = ''
        users.forEach((u) => {
            // Encode data user untuk dikirim ke tombol edit
            const userStr = encodeURIComponent(
                JSON.stringify({
                    user_id: u.user_id,
                    username: u.username,
                    fullname: u.fullname,
                    role: u.role,
                })
            )

            tableBody.innerHTML += `
                <tr>
                    <td>${u.user_id}</td>
                    <td><b>${u.username}</b></td>
                    <td>${u.fullname || '-'}</td>
                    <td><span style="padding:3px 8px; background:#ddd; border-radius:4px; font-size:12px;">${u.role}</span></td>
                    <td style="text-align:center;">
                        <button onclick="editUserTrigger('${userStr}')" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️</button>
                        <button onclick="deleteUserTrigger(${u.user_id}, '${u.username}')" style="background:#c0392b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">🗑️</button>
                    </td>
                </tr>
            `
        })
    } catch (e) {
        console.error(e)
    }
}

// --- LOGIKA MODAL USER ---

// 1. Buka Modal Tambah (Create)
window.openUserModal = () => {
    const modal = document.getElementById('modal-user')
    modal.style.display = 'flex'
    document.getElementById('modal-user-title').innerText = 'Tambah User Baru'

    // Reset Form
    document.getElementById('user-id-input').value = '' // ID Kosong = Create
    document.getElementById('user-username').value = ''
    document.getElementById('user-password').value = ''
    document.getElementById('user-fullname').value = ''
    document.getElementById('user-role').value = 'WAREHOUSE'
}

// 2. Buka Modal Edit (Update)
window.editUserTrigger = (userStr) => {
    const u = JSON.parse(decodeURIComponent(userStr))
    const modal = document.getElementById('modal-user')

    modal.style.display = 'flex'
    document.getElementById('modal-user-title').innerText = 'Edit User: ' + u.username

    // Isi Form dengan data lama
    document.getElementById('user-id-input').value = u.user_id
    document.getElementById('user-username').value = u.username
    document.getElementById('user-fullname').value = u.fullname || ''
    document.getElementById('user-role').value = u.role

    // Password dikosongkan (placeholder memberi petunjuk)
    document.getElementById('user-password').value = ''
}

// 3. Tutup Modal
window.closeUserModal = () => {
    document.getElementById('modal-user').style.display = 'none'
}

// 4. Tombol Simpan di Modal
const btnSaveUserModal = document.getElementById('btn-save-user-modal')
if (btnSaveUserModal) {
    btnSaveUserModal.addEventListener('click', async () => {
        const id = document.getElementById('user-id-input').value

        const data = {
            user_id: id,
            username: document.getElementById('user-username').value,
            password: document.getElementById('user-password').value,
            fullName: document.getElementById('user-fullname').value,
            role: document.getElementById('user-role').value,
        }

        if (!data.username) return alert('Username wajib diisi!')

        // Validasi Password: Wajib jika Create, Opsional jika Update
        if (!id && !data.password) return alert('Password wajib diisi untuk user baru!')

        let result
        if (id) {
            // MODE UPDATE
            result = await window.api.updateUser(data)
        } else {
            // MODE CREATE
            result = await window.api.createUser(data)
        }

        if (result.success) {
            alert(id ? 'User berhasil diupdate!' : 'User berhasil dibuat!')
            window.closeUserModal()
            loadUsers() // Refresh tabel
        } else {
            alert('Gagal: ' + result.error)
        }
    })
}

// 5. Hapus User (Tetap Sama)
window.deleteUserTrigger = async (id, name) => {
    if (confirm(`Yakin ingin menghapus user "${name}"?`)) {
        const res = await window.api.deleteUser(id)
        if (res.success) loadUsers()
        else alert('Gagal menghapus: ' + res.error)
    }
}

// ==========================================================
// 2. BAGIAN MASTER DATA (PRODUK & VENDOR)
// ==========================================================

const loadVendors = async () => {
    const tableBody = document.getElementById('table-vendors-body')
    if (!tableBody) return
    try {
        const vendors = await window.api.fetchVendors()
        tableBody.innerHTML = ''
        vendors.forEach((v) => {
            tableBody.innerHTML += `<tr><td>${v.vendor_id}</td><td>${v.name}</td><td>${v.phone}</td><td>${v.email}</td><td>${v.address}</td></tr>`
        })
    } catch (e) {}
}

const loadProducts = async () => {
    const tableBody = document.getElementById('table-products-body')
    const btnAdd = document.getElementById('btn-add-product')
    if (!tableBody) return

    // Logika Tombol Tambah
    if (['ADMIN', 'WAREHOUSE'].includes(currentUserRole)) {
        if (btnAdd) btnAdd.style.display = 'block'
    } else {
        if (btnAdd) btnAdd.style.display = 'none'
    }

    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sedang memuat data...</td></tr>'
    try {
        const products = await window.api.fetchProducts()
        tableBody.innerHTML = ''

        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data produk.</td></tr>'
            return
        }

        products.forEach((p) => {
            const typeLabel =
                p.type === 'FINISHED_GOOD'
                    ? '<span style="color:white; background:#27ae60; padding:2px 6px; border-radius:4px; font-size:11px;">Barang Jadi</span>'
                    : '<span style="color:white; background:#e67e22; padding:2px 6px; border-radius:4px; font-size:11px;">Bahan Baku</span>'

            const price = new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR'}).format(p.price)

            let actionButtons = '<span style="color:#ccc;">-</span>'
            if (['ADMIN', 'WAREHOUSE'].includes(currentUserRole)) {
                const dataStr = encodeURIComponent(JSON.stringify(p))
                actionButtons = `
                    <button onclick="editProduct('${dataStr}')" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️</button>
                    <button onclick="deleteProductReq(${p.product_id})" style="background:#c0392b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
                `
            }

            tableBody.innerHTML += `
                <tr>
                    <td>${p.sku}</td><td><b>${p.name}</b></td><td>${typeLabel}</td>
                    <td>${p.stock_qty} ${p.unit}</td><td>${price}</td>
                    <td style="text-align:center;">${actionButtons}</td>
                </tr>
            `
        })
        const statEl = document.getElementById('stat-product-count')
        if (statEl) statEl.innerText = products.length
    } catch (e) {
        console.error(e)
    }
}

// --- LOGIKA MODAL PRODUK ---
window.openAddModal = () => {
    const modal = document.getElementById('modal-product')
    if (modal) {
        modal.style.display = 'flex'
        document.getElementById('modal-title').innerText = 'Tambah Produk Baru'
        document.getElementById('prod-id').value = ''
        document.getElementById('prod-sku').value = ''
        document.getElementById('prod-name').value = ''
        document.getElementById('prod-type').value = 'RAW_MATERIAL'
        document.getElementById('prod-unit').value = ''
        document.getElementById('prod-min').value = '10'
        document.getElementById('prod-price').value = ''
    }
}

window.editProduct = (dataStr) => {
    const p = JSON.parse(decodeURIComponent(dataStr))
    const modal = document.getElementById('modal-product')
    if (modal) {
        modal.style.display = 'flex'
        document.getElementById('modal-title').innerText = 'Edit Produk'
        document.getElementById('prod-id').value = p.product_id
        document.getElementById('prod-sku').value = p.sku
        document.getElementById('prod-name').value = p.name
        document.getElementById('prod-type').value = p.type
        document.getElementById('prod-unit').value = p.unit
        document.getElementById('prod-min').value = p.min_stock
        document.getElementById('prod-price').value = p.price
    }
}

window.closeProductModal = () => {
    const modal = document.getElementById('modal-product')
    if (modal) modal.style.display = 'none'
}

const btnSaveProduct = document.getElementById('btn-save-product')
if (btnSaveProduct) {
    btnSaveProduct.addEventListener('click', async () => {
        const id = document.getElementById('prod-id').value
        const data = {
            product_id: id,
            sku: document.getElementById('prod-sku').value,
            name: document.getElementById('prod-name').value,
            type: document.getElementById('prod-type').value,
            unit: document.getElementById('prod-unit').value,
            min_stock: document.getElementById('prod-min').value,
            price: document.getElementById('prod-price').value,
        }

        if (!data.sku || !data.name) return alert('SKU dan Nama wajib diisi!')

        let result = id ? await window.api.updateProduct(data) : await window.api.createProduct(data)

        if (result.success) {
            alert('Berhasil disimpan!')
            window.closeProductModal()
            loadProducts()
        } else {
            alert('Gagal: ' + result.error)
        }
    })
}

window.deleteProductReq = async (id) => {
    if (confirm('Hapus produk ini?')) {
        const res = await window.api.deleteProduct(id)
        if (res.success) loadProducts()
        else alert('Gagal menghapus: ' + res.error)
    }
}

// ==========================================================
// 3. BAGIAN DASHBOARD & LOGIN (PENTING JANGAN DIHAPUS)
// ==========================================================

const createWidget = (title, value, color, icon) => {
    return `
    <div style="background:${color}; color:white; padding:20px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); flex:1; min-width: 200px;">
        <h3 style="margin-bottom:10px; font-size:16px; opacity:0.9;">${title} ${icon}</h3>
        <h1 style="font-size:36px; font-weight:bold;">${value}</h1>
    </div>`
}

const loadDashboard = async (role) => {
    const container = document.getElementById('page-home')
    const stats = await window.api.fetchStats()
    if (!stats) return

    let dashboardHTML = `
        <h1>Dashboard ${role}</h1>
        <p style="margin-bottom:20px; color:#7f8c8d;">Ringkasan aktivitas operasional.</p>
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
    `

    switch (role) {
        case 'ADMIN':
            dashboardHTML += createWidget('Total User', stats.users, '#9b59b6', '👥')
            dashboardHTML += createWidget('Total Produk', stats.products, '#2980b9', '📦')
            dashboardHTML += createWidget('Stok Menipis', stats.lowStock, '#c0392b', '⚠️')
            dashboardHTML += createWidget('PO Pending', stats.pendingPO, '#e67e22', '🚚')
            dashboardHTML += createWidget('WO Aktif', stats.activeWO, '#27ae60', '🔧')
            break
        case 'WAREHOUSE':
            dashboardHTML += createWidget('Barang Masuk', stats.pendingPO, '#e67e22', '📥')
            dashboardHTML += createWidget('Barang Keluar', stats.pendingSO, '#8e44ad', '📤')
            dashboardHTML += createWidget('Stok Menipis', stats.lowStock, '#c0392b', '⚠️')
            break
        case 'PURCHASING':
            dashboardHTML += createWidget('Low Stock', stats.lowStock, '#c0392b', '🛒')
            dashboardHTML += createWidget('PO Jalan', stats.pendingPO, '#2980b9', 'truck')
            break
        case 'PRODUCTION':
            dashboardHTML += createWidget('WO Aktif', stats.activeWO, '#27ae60', '🔧')
            break
        case 'SALES':
            dashboardHTML += createWidget('Order Baru', stats.pendingSO, '#8e44ad', '💰')
            break
    }
    dashboardHTML += `</div>`
    container.innerHTML = dashboardHTML
}

// Hak Akses Menu
const rolePermissions = {
    ADMIN: ['btn-menu-dashboard', 'btn-menu-users', 'btn-menu-products', 'btn-menu-vendors', 'btn-menu-po', 'btn-menu-so', 'btn-menu-wo'],
    WAREHOUSE: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-vendors', 'btn-menu-po', 'btn-menu-so'],
    PURCHASING: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-vendors', 'btn-menu-po'],
    SALES: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-so'],
    PRODUCTION: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-wo'],
}

// Event Refresh
document.getElementById('btn-refresh-users').addEventListener('click', loadUsers)
document.getElementById('btn-refresh-vendors').addEventListener('click', loadVendors)
document.getElementById('btn-refresh-products').addEventListener('click', loadProducts)

// --- LOGIKA LOGIN (INI YANG KEMUNGKINAN HILANG TADI) ---
btnLogin.addEventListener('click', async () => {
    const username = inpUser.value
    const password = inpPass.value

    if (!username || !password) return

    btnLogin.innerText = 'Checking...'
    errorMsg.style.display = 'none'

    try {
        const user = await window.api.login({username, password})

        if (user) {
            // === SUKSES ===
            currentUserRole = user.role // SIMPAN ROLE
            loginView.style.display = 'none'
            dashboardView.style.display = 'flex'
            document.getElementById('span-role').innerText = user.role

            // Atur Menu Sidebar
            const allowedMenus = rolePermissions[user.role] || []
            document.querySelectorAll('[id^="btn-menu-"]').forEach((btn) => (btn.style.display = 'none'))
            allowedMenus.forEach((menuId) => {
                const btn = document.getElementById(menuId)
                if (btn) btn.style.display = 'block'
            })

            // Load Data
            loadDashboard(user.role)
            if (user.role === 'ADMIN') loadUsers()
            loadVendors()
            loadProducts()
        } else {
            // === GAGAL ===
            errorMsg.style.display = 'block'
            setTimeout(() => {
                inpUser.value = ''
                inpPass.value = ''
                errorMsg.style.display = 'none'
            }, 2000)
        }
    } catch (err) {
        console.error(err)
        alert('System Error (Cek Console)')
    } finally {
        btnLogin.innerText = 'LOGIN'
    }
})
