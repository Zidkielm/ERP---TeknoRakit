// --- ELEMEN HTML ---
const loginView = document.getElementById('login-view')
const dashboardView = document.getElementById('dashboard-view')
const btnLogin = document.getElementById('btn-login')
const inpUser = document.getElementById('inp-username')
const inpPass = document.getElementById('inp-password')
const errorMsg = document.getElementById('login-error')
const roleDisplay = document.getElementById('user-role-display')

// --- FUNGSI RESET FORM (Membersihkan inputan) ---
function resetForm() {
    inpUser.value = ''
    inpPass.value = ''
    errorMsg.style.display = 'none'
    inpUser.focus()
}

// --- FUNGSI LOGIN ---
btnLogin.addEventListener('click', async () => {
    const username = inpUser.value
    const password = inpPass.value

    // Jangan proses kalau kosong
    if (!username || !password) return

    btnLogin.innerText = 'Checking...'
    errorMsg.style.display = 'none'

    try {
        // 1. Panggil API Login
        const user = await window.api.login({username, password})

        if (user) {
            // --- JIKA LOGIN SUKSES ---
            console.log('Login Berhasil:', user)

            // A. Sembunyikan Login Form
            loginView.style.display = 'none'

            // B. Tampilkan Dashboard
            dashboardView.style.display = 'block'

            // C. Ubah Tulisan sesuai Role
            // user.role berasal dari database (WAREHOUSE, PURCHASING, dll)
            roleDisplay.innerText = `Anda masuk sebagai ${user.role}`
        } else {
            // === LOGIN GAGAL ===
            errorMsg.style.display = 'block'
            errorMsg.innerText = 'Username atau Password Salah!'

            // Efek Getar (Opsional, biar keren dikit)
            const box = document.querySelector('.login-box')
            box.style.transform = 'translateX(5px)'
            setTimeout(() => (box.style.transform = 'translateX(0)'), 100)
            setTimeout(() => {
                // Cek dulu, kalau user belum mulai ngetik ulang, baru dihapus
                // (Biar kalau user cepet ngetik ulang, gak keganggu/kehapus tiba2)
                if (errorMsg.style.display === 'block') {
                    resetForm()
                }
            }, 2000)
        }
    } catch (err) {
        console.error('System Error:', err)
        alert('Terjadi kesalahan sistem')
    } finally {
        btnLogin.innerText = 'LOGIN'
    }
})
