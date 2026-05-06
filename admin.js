// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
    API_BASE: window.location.origin,
    CLOUDINARY_CLOUD: 'YOUR_CLOUDINARY_CLOUD_NAME'
};
document.body.style.display = "block";
// =====================================================
// GLOBAL STATE
// =====================================================
const state = {
    user: null,
    stats: {},
    media: [],
    donations: [],
    messages: [],
    uploadQueue: [],
    deleteTarget: null,
    currentSection: 'overview',
    charts: {}
};

// =====================================================
// DOM ELEMENTS
// =====================================================
const elements = {
    loginScreen: document.getElementById('login-screen'),
    dashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    sidebarNav: document.querySelector('.sidebar-nav'),
    logoutBtn: document.getElementById('logout-btn'),
    toast: document.getElementById('toast')
};

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin JS Loaded ✅");

    initAuth();
    initNavigation();
});

// =====================================================
// AUTH
// =====================================================
function initAuth() {
    firebase.auth().onAuthStateChanged(user => {
        console.log("Auth state:", user);

        if (user) {
            state.user = user;
            showDashboard();
            loadDashboardData();
        } else {
            state.user = null;
            showLoginScreen();
        }
    });

    // LOGIN
    elements.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;

        if (!email || !password) {
            showLoginError("Fill all fields");
            return;
        }

        try {
            console.log("Logging in...");
            await firebase.auth().signInWithEmailAndPassword(email, password);
        } catch (err) {
            console.error(err);
            showLoginError(err.message);
        }
    });

    // LOGOUT
    elements.logoutBtn?.addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
        } catch (err) {
            console.error(err);
            showToast("Logout failed", "error");
        }
    });
}
function showSection(id) {
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });

    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
    } else {
        console.error("Section not found:", id);
    }
}
// =====================================================
// UI CONTROL
// =====================================================
function showLoginScreen() {
    elements.loginScreen?.classList.remove('hidden');
    elements.dashboard?.classList.add('hidden');
}

function showDashboard() {
    elements.loginScreen?.classList.add('hidden');
    elements.dashboard?.classList.remove('hidden');
}

function showLoginError(msg) {
    if (elements.loginError) {
        elements.loginError.textContent = msg;
        elements.loginError.classList.remove('hidden');
    }
}

// =====================================================
// NAVIGATION
// =====================================================
function initNavigation() {
    elements.sidebarNav?.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (!item) return;

        const section = item.dataset.section;
        if (!section) return;

        switchSection(section);
    });
}

function switchSection(sectionId) {
    state.currentSection = sectionId;

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${sectionId}`);
    });
}

// =====================================================
// FIRESTORE LOAD
// =====================================================
async function loadDashboardData() {
    if (!window.db) {
        console.error("Firestore (db) not initialized");
        return;
    }

    try {
        console.log("Loading dashboard data...");

        // STATS
        const statsDoc = await db.collection('config').doc('stats').get();
        if (statsDoc.exists) {
            state.stats = statsDoc.data();
            updateStatsDisplay();
        }

        // DONATIONS
        const donations = await db.collection('donations').get();
        state.donations = donations.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDonations();

        console.log("Data loaded ✅");

    } catch (err) {
        console.error("Load error:", err);
        showToast("Failed to load data", "error");
    }
}

// =====================================================
// UPDATE UI
// =====================================================
function updateStatsDisplay() {
    document.getElementById('admin-communities').textContent =
        state.stats.communities || 0;

    document.getElementById('admin-donors').textContent =
        state.stats.donors || 0;

    document.getElementById('admin-funds').textContent =
        "KES " + (state.stats.funds || 0);
}

// =====================================================
// DONATIONS
// =====================================================
function renderDonations() {
    const tbody = document.getElementById('all-donations-body');
    if (!tbody) return;

    if (state.donations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">No donations</td></tr>`;
        return;
    }

    tbody.innerHTML = state.donations.map(d => `
        <tr>
            <td>${new Date(d.createdAt).toLocaleDateString()}</td>
            <td>${d.mpesaReceipt || '-'}</td>
            <td>${d.donorName || 'Anonymous'}</td>
            <td>${d.phone || '-'}</td>
            <td>KES ${d.amount || 0}</td>
            <td>${d.status || 'pending'}</td>
        </tr>
    `).join('');
}

// =====================================================
// TOAST
// =====================================================
function showToast(message, type = "success") {
    if (!elements.toast) return;

    elements.toast.className = `toast ${type}`;
    elements.toast.querySelector('.toast-message').textContent = message;

    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}
