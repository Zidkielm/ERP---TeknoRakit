// 1. Ambil elemen HTML yang mau kita mainkan
const tableBody = document.getElementById('vendor-table-body');
const btnRefresh = document.getElementById('btn-refresh');

// 2. Fungsi untuk mengambil dan menampilkan data
const loadVendors = async () => {
    try {
        // Tampilkan pesan loading
        tableBody.innerHTML = '<tr><td colspan="5">Loading data...</td></tr>';

        // Panggil Backend (lewat jembatan api)
        // Perhatikan: window.api sesuai dengan yang kita buat di preload.js
        const vendors = await window.api.fetchVendors();

        // Bersihkan tabel sebelum diisi data baru
        tableBody.innerHTML = '';

        // Looping data dan buat baris tabel (TR) secara manual
        vendors.forEach(vendor => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${vendor.vendor_id}</td>
                <td>${vendor.name}</td>
                <td>${vendor.phone}</td>
                <td>${vendor.email || '-'}</td>
                <td>${vendor.address || '-'}</td>
            `;
            
            tableBody.appendChild(row);
        });

        if (vendors.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">Tidak ada data vendor.</td></tr>';
        }

    } catch (error) {
        console.error("Error:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${error.message}</td></tr>`;
    }
};

// 3. Pasang Event Listener
// Kalau tombol diklik, jalankan fungsi loadVendors
btnRefresh.addEventListener('click', loadVendors);

// Jalankan sekali saat aplikasi pertama kali jalan
loadVendors();