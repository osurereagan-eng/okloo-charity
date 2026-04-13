/**
 * OKLOO Admin Dashboard
 * Administrative Interface JavaScript
 */

// Configuration
const CONFIG = {
    API_BASE: window.location.origin + '/api',
    CLOUDINARY_CLOUD: 'YOUR_CLOUDINARY_CLOUD_NAME'
};

// State
const state = {
    user: null,
    currentSection: 'overview',
    media: [],
    donations: [],
    messages: [],
    stats: { communities: 0, donors: 0, funds: 0 },
    uploadQueue: [],
    deleteTarget: null,
    charts: { donations: null, donors: null }
};

// DOM Elements
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
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initModals();
    initMediaUpload();
    initSettings();
    initCountersForm();
    initExport();
});

// =====================================================
// AUTHENTICATION
// =====================================================

function initAuth() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            state.user = user;
            showDashboard();
            loadDashboardData();
            initRealtimeListeners();
        } else {
            state.user = null;
            showLoginScreen();
        }
    });
    
    elements.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            showLoginError('Please fill in all fields');
            return;
        }
        
        setLoading(submitBtn, true);
        
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Login error:', error);
            showLoginError(getErrorMessage(error.code));
        } finally {
            setLoading(submitBtn, false);
        }
    });
    
    elements.logoutBtn?.addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    });
}

function showLoginScreen() {
    elements.loginScreen?.classList.remove('hidden');
    elements.dashboard?.classList.add('hidden');
}

function showDashboard() {
    elements.loginScreen?.classList.add('hidden');
    elements.dashboard?.classList.remove('hidden');
}

function showLoginError(message) {
    const errorEl = elements.loginError;
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function getErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/too-many-requests': 'Too many attempts. Please try again later'
    };
    return messages[code] || 'Login failed. Please try again.';
}

// =====================================================
// NAVIGATION
// =====================================================

function initNavigation() {
    elements.sidebarNav?.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (!navItem) return;
        const section = navItem.dataset.section;
        if (section) switchSection(section);
    });
}

function switchSection(sectionId) {
    state.currentSection = sectionId;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionId}`);
    });
}

// =====================================================
// REALTIME LISTENERS
// =====================================================

function initRealtimeListeners() {
    // Stats
    db.collection('config').doc('stats').onSnapshot(doc => {
        if (doc.exists) {
            state.stats = doc.data();
            updateStatsDisplay();
        }
    });
    
    // Media
    db.collection('media').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        state.media = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMediaGrid();
    });
    
    // Donations
    db.collection('donations').orderBy('createdAt', 'desc').limit(100).onSnapshot(snapshot => {
        state.donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDonationsTable();
        updateDonationStats();
        updateCharts();
    });
    
    // Messages
    db.collection('messages').orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
        state.messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMessagesList();
    });
    
    // Branding
    db.collection('config').doc('branding').onSnapshot(doc => {
        if (doc.exists && doc.data().logoUrl) {
            document.getElementById('current-logo')?.setAttribute('src', doc.data().logoUrl);
        }
    });
}

// =====================================================
// DATA LOADING
// =====================================================

async function loadDashboardData() {
    try {
        const statsDoc = await db.collection('config').doc('stats').get();
        if (statsDoc.exists) {
            state.stats = statsDoc.data();
            updateStatsDisplay();
        }
        
        const mediaSnapshot = await db.collection('media').orderBy('createdAt', 'desc').get();
        state.media = mediaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMediaGrid();
        
        const donationsSnapshot = await db.collection('donations').orderBy('createdAt', 'desc').limit(100).get();
        state.donations = donationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDonationsTable();
        updateDonationStats();
        
        const messagesSnapshot = await db.collection('messages').orderBy('createdAt', 'desc').limit(50).get();
        state.messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMessagesList();
        
        initCharts();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load some data', 'error');
    }
}

// =====================================================
// STATS MANAGEMENT
// =====================================================

function updateStatsDisplay() {
    document.getElementById('admin-communities').textContent = (state.stats.communities || 0).toLocaleString();
    document.getElementById('admin-donors').textContent = (state.stats.donors || 0).toLocaleString();
    document.getElementById('admin-funds').textContent = `KES ${(state.stats.funds || 0).toLocaleString()}`;
    
    document.getElementById('edit-communities').value = state.stats.communities || 0;
    document.getElementById('edit-donors').value = state.stats.donors || 0;
    document.getElementById('edit-funds').value = state.stats.funds || 0;
}

function initCountersForm() {
    const form = document.getElementById('counters-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const communities = parseInt(document.getElementById('edit-communities')?.value) || 0;
        const donors = parseInt(document.getElementById('edit-donors')?.value) || 0;
        const funds = parseInt(document.getElementById('edit-funds')?.value) || 0;
        
        try {
            await db.collection('config').doc('stats').set({
                communities, donors, funds,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            showToast('Stats updated successfully', 'success');
        } catch (error) {
            showToast('Failed to update stats', 'error');
        }
    });
    
    document.querySelectorAll('.stat-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditStatModal(btn.dataset.stat));
    });
}

function openEditStatModal(stat) {
    const modal = document.getElementById('edit-stat-modal');
    const input = document.getElementById('stat-value');
    if (!modal || !input) return;
    
    input.value = state.stats[stat] || 0;
    input.dataset.stat = stat;
    modal.classList.add('active');
    
    const form = document.getElementById('edit-stat-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const value = parseInt(input.value) || 0;
        try {
            await db.collection('config').doc('stats').set({
                [stat]: value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            modal.classList.remove('active');
            showToast('Stat updated', 'success');
        } catch (error) {
            showToast('Failed to update', 'error');
        }
    };
}

// =====================================================
// MEDIA MANAGEMENT (Cloudinary Integration)
// =====================================================

function initMediaUpload() {
    const uploadBtn = document.getElementById('upload-media-btn');
    const uploadZone = document.getElementById('media-upload-zone');
    const uploadArea = document.getElementById('upload-area');
    const mediaInput = document.getElementById('media-input');
    const cancelBtn = document.getElementById('cancel-upload');
    const confirmBtn = document.getElementById('confirm-upload');
    
    uploadBtn?.addEventListener('click', () => uploadZone?.classList.toggle('hidden'));
    uploadArea?.addEventListener('click', () => mediaInput?.click());
    cancelBtn?.addEventListener('click', () => {
        uploadZone?.classList.add('hidden');
        clearUploadQueue();
    });
    
    confirmBtn?.addEventListener('click', processUploadQueue);
    
    // Drag & Drop
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
    
    mediaInput?.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // Filters
    document.querySelectorAll('.media-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.media-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMediaGrid(btn.dataset.filter);
        });
    });
}

function handleFiles(files) {
    const preview = document.getElementById('upload-preview');
    const confirmBtn = document.getElementById('confirm-upload');
    
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.dataset.name = file.name;
            
            if (file.type.startsWith('video/')) {
                div.innerHTML = `<video src="${e.target.result}" muted></video>`;
            } else {
                div.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = () => {
                state.uploadQueue = state.uploadQueue.filter(f => f.name !== file.name);
                div.remove();
                if (state.uploadQueue.length === 0) confirmBtn.disabled = true;
            };
            div.appendChild(removeBtn);
            
            preview?.appendChild(div);
        };
        reader.readAsDataURL(file);
        state.uploadQueue.push(file);
    });
    
    if (state.uploadQueue.length > 0 && confirmBtn) confirmBtn.disabled = false;
}

function clearUploadQueue() {
    state.uploadQueue = [];
    const preview = document.getElementById('upload-preview');
    if (preview) preview.innerHTML = '';
    document.getElementById('confirm-upload').disabled = true;
}

async function processUploadQueue() {
    const confirmBtn = document.getElementById('confirm-upload');
    setLoading(confirmBtn, true);
    
    const token = await state.user.getIdToken();
    
    try {
        // 1. Get Signature from Backend
        const signRes = await fetch(`${CONFIG.API_BASE}/media/sign`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            }
        });
        const { signature, timestamp, apiKey, cloudName } = await signRes.json();
        
        // 2. Upload each file to Cloudinary
        for (const file of state.uploadQueue) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('folder', 'okloo-gallery');
            
            const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData
            });
            
            const cloudinaryData = await cloudinaryRes.json();
            
            // 3. Save reference to Firestore via Backend
            await fetch(`${CONFIG.API_BASE}/media/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: cloudinaryData.secure_url,
                    publicId: cloudinaryData.public_id,
                    type: cloudinaryData.resource_type,
                    title: file.name
                })
            });
        }
        
        showToast('Media uploaded successfully', 'success');
        clearUploadQueue();
        document.getElementById('media-upload-zone')?.classList.add('hidden');
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Failed to upload media', 'error');
    } finally {
        setLoading(confirmBtn, false);
    }
}

function renderMediaGrid(filter = 'all') {
    const grid = document.getElementById('admin-media-grid');
    if (!grid) return;
    
    const filtered = filter === 'all' ? state.media : state.media.filter(m => m.type === filter);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="media-loading"><p>No media found</p></div>';
        return;
    }
    
    grid.innerHTML = filtered.map(item => `
        <div class="media-item">
            ${item.type === 'video' 
                ? `<video src="${item.url}" muted></video>` 
                : `<img src="${item.url}" alt="${item.title}">`}
            <div class="media-actions">
                <button class="media-action-btn delete" data-id="${item.id}" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add delete listeners
    grid.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

function openDeleteModal(id) {
    state.deleteTarget = id;
    const modal = document.getElementById('delete-modal');
    modal?.classList.add('active');
    
    document.getElementById('cancel-delete').onclick = () => modal.classList.remove('active');
    document.getElementById('confirm-delete').onclick = () => deleteMedia();
}

async function deleteMedia() {
    if (!state.deleteTarget) return;
    
    const token = await state.user.getIdToken();
    
    try {
        await fetch(`${CONFIG.API_BASE}/media/${state.deleteTarget}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        document.getElementById('delete-modal')?.classList.remove('active');
        showToast('Media deleted', 'success');
    } catch (error) {
        showToast('Failed to delete', 'error');
    }
    state.deleteTarget = null;
}

// =====================================================
// SETTINGS (Logo Upload)
// =====================================================

function initSettings() {
    const logoInput = document.getElementById('logo-input');
    const selectBtn = document.getElementById('select-logo');
    const uploadBtn = document.getElementById('upload-logo');
    
    selectBtn?.addEventListener('click', () => logoInput?.click());
    
    logoInput?.addEventListener('change', () => {
        if (logoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('current-logo').src = e.target.result;
            };
            reader.readAsDataURL(logoInput.files[0]);
            uploadBtn?.classList.remove('hidden');
        }
    });
    
    uploadBtn?.addEventListener('click', async () => {
        const file = logoInput.files[0];
        if (!file) return;
        
        setLoading(uploadBtn, true);
        const token = await state.user.getIdToken();
        
        try {
            // Get Signature
            const signRes = await fetch(`${CONFIG.API_BASE}/media/sign`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                }
            });
            const { signature, timestamp, apiKey, cloudName } = await signRes.json();
            
            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            
            const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await cloudinaryRes.json();
            
            // Save Logo URL
            await fetch(`${CONFIG.API_BASE}/media/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: data.secure_url, publicId: data.public_id })
            });
            
            showToast('Logo updated successfully', 'success');
            uploadBtn.classList.add('hidden');
            
        } catch (error) {
            showToast('Failed to upload logo', 'error');
        } finally {
            setLoading(uploadBtn, false);
        }
    });
}

// =====================================================
// CHARTS & DATA VISUALIZATION
// =====================================================

function initCharts() {
    const donationsCtx = document.getElementById('donations-chart')?.getContext('2d');
    const donorsCtx = document.getElementById('donors-chart')?.getContext('2d');
    
    if (donationsCtx) {
        state.charts.donations = new Chart(donationsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Donations (KES)',
                    data: [],
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
    
    if (donorsCtx) {
        state.charts.donors = new Chart(donorsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Donors',
                    data: [],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: { responsive: true }
        });
    }
    
    updateCharts();
}

function updateCharts() {
    if (!state.charts.donations) return;
    
    // Process data for charts (Group by date)
    const donationsByDate = {};
    const donorsByDate = {};
    
    state.donations.forEach(d => {
        const date = new Date(d.createdAt).toLocaleDateString();
        if (!donationsByDate[date]) donationsByDate[date] = 0;
        donationsByDate[date] += d.amount;
        
        if (!donorsByDate[date]) donorsByDate[date] = 0;
        donorsByDate[date]++;
    });
    
    const labels = Object.keys(donationsByDate).slice(-7);
    
    // Update Donations Chart
    state.charts.donations.data.labels = labels;
    state.charts.donations.data.datasets[0].data = labels.map(l => donationsByDate[l]);
    state.charts.donations.update();
    
    // Update Donors Chart
    state.charts.donors.data.labels = labels;
    state.charts.donors.data.datasets[0].data = labels.map(l => donorsByDate[l]);
    state.charts.donors.update();
}

// =====================================================
// DONATIONS & MESSAGES TABLES
// =====================================================

function renderDonationsTable() {
    const tbody = document.getElementById('all-donations-body');
    const recentTbody = document.getElementById('recent-donations-body');
    
    const renderRows = (data) => data.map(d => `
        <tr>
            <td>${new Date(d.createdAt).toLocaleDateString()}</td>
            <td>${d.mpesaReceipt || '-'}</td>
            <td>${d.donorName || 'Anonymous'}</td>
            <td>${d.phone}</td>
            <td>KES ${d.amount.toLocaleString()}</td>
            <td><span class="status-badge status-${d.status}">${d.status}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="empty-state">No donations yet</td></tr>';
    
    if (tbody) tbody.innerHTML = renderRows(state.donations);
    if (recentTbody) recentTbody.innerHTML = renderRows(state.donations.slice(0, 5));
}

function updateDonationStats() {
    const total = state.donations.length;
    const success = state.donations.filter(d => d.status === 'success').length;
    const pending = state.donations.filter(d => d.status === 'pending').length;
    const failed = state.donations.filter(d => d.status === 'failed').length;
    
    document.getElementById('total-donations-count').textContent = total;
    document.getElementById('successful-donations').textContent = success;
    document.getElementById('pending-donations').textContent = pending;
    document.getElementById('failed-donations').textContent = failed;
}

function renderMessagesList() {
    const list = document.getElementById('messages-list');
    if (!list) return;
    
    if (state.messages.length === 0) {
        list.innerHTML = '<div class="messages-loading"><p>No messages yet</p></div>';
        return;
    }
    
    list.innerHTML = state.messages.map(m => `
        <div class="message-card">
            <div class="message-header">
                <div class="message-from">
                    <h4>${m.name}</h4>
                    <span>${m.email}</span>
                </div>
                <span class="message-date">${new Date(m.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="message-subject">${m.subject}</div>
            <p class="message-text">${m.message}</p>
        </div>
    `).join('');
}

// =====================================================
// EXPORT & UTILITIES
// =====================================================

function initExport() {
    document.getElementById('export-csv')?.addEventListener('click', () => {
        const headers = ['Date', 'Name', 'Phone', 'Amount', 'Receipt', 'Status'];
        const rows = state.donations.map(d => [
            new Date(d.createdAt).toLocaleDateString(),
            d.donorName || 'Anonymous',
            d.phone,
            d.amount,
            d.mpesaReceipt || '-',
            d.status
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(r => csv += r.join(',') + '\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `okloo-donations-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    });
}

function initModals() {
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            overlay.closest('.modal')?.classList.remove('active');
        });
    });
    
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal')?.classList.remove('active');
        });
    });
}

function setLoading(btn, isLoading) {
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    
    btn.disabled = isLoading;
    if (text) text.style.visibility = isLoading ? 'hidden' : 'visible';
    if (loader) loader.classList.toggle('hidden', !isLoading);
}

function showToast(message, type = 'success') {
    const toast = elements.toast;
    if (!toast) return;
    
    toast.className = 'toast ' + type;
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => toast.classList.remove('show'), 4000);
}
