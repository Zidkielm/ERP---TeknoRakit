// --- VARIABEL GLOBAL ---
let currentUserRole = '' // [BARU] Untuk menyimpan role user yang sedang login

// --- ELEMEN HTML ---
const loginView = document.getElementById('login-view')
const dashboardView = document.getElementById('dashboard-view')
const btnLogin = document.getElementById('btn-login')
const inpUser = document.getElementById('inp-username')
const inpPass = document.getElementById('inp-password')
const errorMsg = document.getElementById('login-error')

// --- FUNGSI UTAMA: LOAD DATA USER ---
const loadUsers = async () => {
    const tableBody = document.getElementById('table-users-body')
    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>'
    try {
        const users = await window.api.fetchUsers()
        document.getElementById('stat-user-count').innerText = users.length

        tableBody.innerHTML = ''
        users.forEach((u) => {
            tableBody.innerHTML += `
                <tr>
                    <td>${u.user_id}</td>
                    <td><b>${u.username}</b></td>
                    <td>${u.fullname || '-'}</td>
                    <td><span style="padding:3px 8px; background:#ddd; border-radius:4px; font-size:12px;">${u.role}</span></td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
            `
        })
    } catch (e) {
        console.error(e)
    }
}

// --- FUNGSI LOAD VENDOR ---
const loadVendors = async () => {
    const tableBody = document.getElementById('table-vendors-body')
    try {
        const vendors = await window.api.fetchVendors()
        tableBody.innerHTML = ''
        vendors.forEach((v) => {
            tableBody.innerHTML += `<tr><td>${v.vendor_id}</td><td>${v.name}</td><td>${v.phone}</td><td>${v.email}</td><td>${v.address}</td></tr>`
        })
    } catch (e) {}
}

// --- [UPDATE BESAR] FUNGSI LOAD PRODUCTS DENGAN CRUD ---
const loadProducts = async () => {
    const tableBody = document.getElementById('table-products-body')
    const btnAdd = document.getElementById('btn-add-product') // Pastikan tombol ini ada di HTML

    // 1. Logika Tombol Tambah (Hanya Admin & Gudang)
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
            // Label Tipe
            const typeLabel =
                p.type === 'FINISHED_GOOD'
                    ? '<span style="color:white; background:#27ae60; padding:2px 6px; border-radius:4px; font-size:11px;">Barang Jadi</span>'
                    : '<span style="color:white; background:#e67e22; padding:2px 6px; border-radius:4px; font-size:11px;">Bahan Baku</span>'

            const price = new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR'}).format(p.price)

            // 2. Logika Tombol Aksi (Edit/Hapus)
            let actionButtons = '<span style="color:#ccc;">-</span>'

            // HANYA ADMIN & GUDANG YANG BOLEH EDIT/HAPUS
            if (['ADMIN', 'WAREHOUSE'].includes(currentUserRole)) {
                // Kita bungkus data produk jadi string agar bisa dikirim ke fungsi edit
                const dataStr = encodeURIComponent(JSON.stringify(p))

                actionButtons = `
                    <button onclick="editProduct('${dataStr}')" style="background:#ffdf00; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️</button>
                    <button onclick="deleteProductReq(${p.product_id})" style="background:#c0392b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
                `
            }

            const row = `
                <tr>
                    <td>${p.sku}</td>
                    <td><b>${p.name}</b></td>
                    <td>${typeLabel}</td>
                    <td>${p.stock_qty} ${p.unit}</td>
                    <td>${price}</td>
                    <td style="text-align:center;">${actionButtons}</td>
                </tr>
            `
            tableBody.innerHTML += row
        })

        // Update Stats
        const statEl = document.getElementById('stat-product-count')
        if (statEl) statEl.innerText = products.length
    } catch (e) {
        console.error('Gagal load products:', e)
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`
    }
}

// --- [BARU] LOGIKA MODAL & CRUD ---

// 1. Buka Modal Tambah (Create)
window.openAddModal = () => {
    const modal = document.getElementById('modal-product')
    if (modal) {
        modal.style.display = 'flex'
        document.getElementById('modal-title').innerText = 'Tambah Produk Baru'

        // Reset Form
        document.getElementById('prod-id').value = '' // ID Kosong = Create
        document.getElementById('prod-sku').value = ''
        document.getElementById('prod-name').value = ''
        document.getElementById('prod-type').value = 'RAW_MATERIAL'
        document.getElementById('prod-unit').value = ''
        document.getElementById('prod-min').value = '10'
        document.getElementById('prod-price').value = ''
    }
}

// 2. Buka Modal Edit (Update)
window.editProduct = (dataStr) => {
    const p = JSON.parse(decodeURIComponent(dataStr)) // Baca data dari tombol
    const modal = document.getElementById('modal-product')

    if (modal) {
        modal.style.display = 'flex'
        document.getElementById('modal-title').innerText = 'Edit Produk'

        // Isi Form dengan data lama
        document.getElementById('prod-id').value = p.product_id
        document.getElementById('prod-sku').value = p.sku
        document.getElementById('prod-name').value = p.name
        document.getElementById('prod-type').value = p.type
        document.getElementById('prod-unit').value = p.unit
        document.getElementById('prod-min').value = p.min_stock
        document.getElementById('prod-price').value = p.price
        // Catatan: Stok tidak ditampilkan di form edit agar tidak bisa diubah manual
    }
}

// 3. Tutup Modal
window.closeProductModal = () => {
    const modal = document.getElementById('modal-product')
    if (modal) modal.style.display = 'none'
}

// 4. Aksi Simpan (Create / Update)
const btnSave = document.getElementById('btn-save-product')
if (btnSave) {
    btnSave.addEventListener('click', async () => {
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

        let result
        if (id) {
            // Kalau ada ID, berarti UPDATE
            result = await window.api.updateProduct(data)
        } else {
            // Kalau ID kosong, berarti CREATE
            result = await window.api.createProduct(data)
        }

        if (result.success) {
            alert('Berhasil disimpan!')
            window.closeProductModal()
            loadProducts() // Refresh tabel
        } else {
            alert('Gagal: ' + result.error)
        }
    })
}

// 5. Aksi Hapus (Delete)
window.deleteProductReq = async (id) => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        const res = await window.api.deleteProduct(id)
        if (res.success) {
            loadProducts()
        } else {
            alert('Gagal menghapus: ' + res.error)
        }
    }
}

// --- DASHBOARD WIDGET ---
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
        <p style="margin-bottom:20px; color:#7f8c8d;">Ringkasan aktivitas operasional Anda.</p>
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
    `

    switch (role) {
        case 'ADMIN':
            dashboardHTML += createWidget('Total User', stats.users, '#9b59b6', '👥')
            dashboardHTML += createWidget('Total Produk', stats.products, '#2980b9', '📦')
            dashboardHTML += createWidget('Stok Menipis', stats.lowStock, '#c0392b', '⚠️') // Satu widget merah
            dashboardHTML += createWidget('PO Pending', stats.pendingPO, '#e67e22', '🚚')
            dashboardHTML += createWidget('WO Aktif', stats.activeWO, '#27ae60', '🔧')
            break

        case 'WAREHOUSE':
            dashboardHTML += createWidget('Barang Masuk (PO)', stats.pendingPO, '#e67e22', '📥')
            dashboardHTML += createWidget('Barang Keluar (SO)', stats.pendingSO, '#8e44ad', '📤')
            dashboardHTML += createWidget('Stok Menipis', stats.lowStock, '#c0392b', '⚠️')
            dashboardHTML += `</div><div style="margin-top:20px; padding:15px; background:#fff; border-left:5px solid #e67e22;">
                <h3>📢 Reminder Gudang</h3>
                <p>Segera proses penerimaan barang jika truk vendor sudah tiba.</p>
            </div>`
            break

        case 'PURCHASING':
            dashboardHTML += createWidget('Perlu Dibeli (Low Stock)', stats.lowStock, '#c0392b', '🛒')
            dashboardHTML += createWidget('PO Sedang Jalan', stats.pendingPO, '#2980b9', 'truck')
            dashboardHTML += createWidget('Total Vendor', '2', '#16a085', '🏭')
            break

        case 'PRODUCTION':
            dashboardHTML += createWidget('Antrean Rakit (WO)', stats.activeWO, '#27ae60', '🔧')
            dashboardHTML += createWidget('Stok Bahan Baku', 'Aman', '#2980b9', '✅')
            break

        case 'SALES':
            dashboardHTML += createWidget('Order Baru (SO)', stats.pendingSO, '#8e44ad', '💰')
            dashboardHTML += createWidget('Target Bulan Ini', '80%', '#f1c40f', 'chart')
            break
    }

    dashboardHTML += `</div>`
    container.innerHTML = dashboardHTML
}

// --- FUNGSI TAMBAH USER ---
document.getElementById('btn-add-user').addEventListener('click', async () => {
    const username = document.getElementById('new-username').value
    const password = document.getElementById('new-password').value
    const fullName = document.getElementById('new-fullname').value
    const role = document.getElementById('new-role').value

    if (!username || !password) return alert('Username & Password wajib diisi!')

    const result = await window.api.createUser({username, password, fullName, role})

    if (result.success) {
        alert('User berhasil dibuat!')
        loadUsers()
        document.getElementById('new-username').value = ''
        document.getElementById('new-password').value = ''
        document.getElementById('new-fullname').value = ''
    } else {
        alert('Gagal membuat user: ' + result.error)
    }
})

// --- CONFIG HAK AKSES ---
const rolePermissions = {
    ADMIN: ['btn-menu-dashboard', 'btn-menu-users', 'btn-menu-products', 'btn-menu-vendors', 'btn-menu-po', 'btn-menu-so', 'btn-menu-wo'],
    WAREHOUSE: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-vendors', 'btn-menu-po', 'btn-menu-so'],
    PURCHASING: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-vendors', 'btn-menu-po'],
    SALES: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-so'],
    PRODUCTION: ['btn-menu-dashboard', 'btn-menu-products', 'btn-menu-wo'],
}

// --- REFRESH BUTTONS ---
document.getElementById('btn-refresh-users').addEventListener('click', loadUsers)
document.getElementById('btn-refresh-vendors').addEventListener('click', loadVendors)
document.getElementById('btn-refresh-products').addEventListener('click', loadProducts)

// --- LOGIKA LOGIN (UPDATE) ---
btnLogin.addEventListener('click', async () => {
    const username = inpUser.value
    const password = inpPass.value

    if (!username || !password) return

    btnLogin.innerText = 'Checking...'
    errorMsg.style.display = 'none'

    try {
        const user = await window.api.login({username, password})

        if (user) {
            // [UPDATE] SIMPAN ROLE KE GLOBAL VARIABLE
            currentUserRole = user.role

            // === LOGIN SUKSES ===
            loginView.style.display = 'none'
            dashboardView.style.display = 'flex'

            document.getElementById('span-role').innerText = user.role

            const allowedMenus = rolePermissions[user.role] || []
            const allMenus = document.querySelectorAll('[id^="btn-menu-"]')
            allMenus.forEach((btn) => (btn.style.display = 'none'))
            allowedMenus.forEach((menuId) => {
                const btn = document.getElementById(menuId)
                if (btn) btn.style.display = 'block'
            })

            loadDashboard(user.role)
            if (user.role === 'ADMIN') loadUsers()
            loadVendors()
            loadProducts() // [PENTING] Load ulang agar logika tombol muncul
        } else {
            errorMsg.style.display = 'block'
            setTimeout(() => {
                inpUser.value = ''
                inpPass.value = ''
                errorMsg.style.display = 'none'
            }, 2000)
        }
    } catch (err) {
        console.error(err)
        alert('System Error')
    } finally {
        btnLogin.innerText = 'LOGIN'
    }
})
