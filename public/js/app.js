/**
 * OKLOO - Oasis of Hope
 * Main Application JavaScript
 */

// Configuration
const CONFIG = {
    API_BASE: window.location.origin + '/api',
    CLOUDINARY_CLOUD: 'YOUR_CLOUDINARY_CLOUD_NAME',
    CLOUDINARY_UPLOAD_PRESET: 'YOUR_UPLOAD_PRESET'
};

// State
const state = {
    gallery: [],
    currentFilter: 'all',
    lightboxIndex: 0,
    stats: {
        communities: 0,
        donors: 0,
        funds: 0
    },
    logo: null
};

// DOM Elements
const elements = {
    navbar: document.getElementById('navbar'),
    navToggle: document.getElementById('nav-toggle'),
    navMenu: document.getElementById('nav-menu'),
    galleryGrid: document.getElementById('gallery-grid'),
    donationModal: document.getElementById('donation-modal'),
    statusModal: document.getElementById('status-modal'),
    lightbox: document.getElementById('lightbox'),
    contactForm: document.getElementById('contact-form'),
    donationForm: document.getElementById('donation-form')
};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollEffects();
    initGallery();
    initDonationModal();
    initLightbox();
    initContactForm();
    initRealTimeUpdates();
    loadInitialData();
    setCurrentYear();
});

// =====================================================
// NAVIGATION
// =====================================================

function initNavigation() {
    // Mobile menu toggle
    elements.navToggle?.addEventListener('click', () => {
        elements.navToggle.classList.toggle('active');
        elements.navMenu.classList.toggle('active');
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                elements.navToggle?.classList.remove('active');
                elements.navMenu?.classList.remove('active');
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // Donate buttons
    document.querySelectorAll('#donate-btn, #hero-donate').forEach(btn => {
        btn?.addEventListener('click', () => openModal(elements.donationModal));
    });
}

// =====================================================
// SCROLL EFFECTS
// =====================================================

function initScrollEffects() {
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Navbar background
        if (currentScroll > 50) {
            elements.navbar?.classList.add('scrolled');
        } else {
            elements.navbar?.classList.remove('scrolled');
        }
        
        // Update active nav link based on section
        const sections = ['home', 'about', 'programs', 'gallery', 'contact'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 150 && rect.bottom >= 150) {
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            }
        });
        
        lastScroll = currentScroll;
    }, { passive: true });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.program-card, .about-card, .gallery-item').forEach(el => {
        observer.observe(el);
    });
}

// =====================================================
// GALLERY
// =====================================================

function initGallery() {
    // Filter buttons
    document.querySelectorAll('.gallery-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gallery-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            renderGallery();
        });
    });
}

async function loadGallery() {
    try {
        const snapshot = await db.collection('media')
            .orderBy('createdAt', 'desc')
            .get();
        
        state.gallery = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderGallery();
    } catch (error) {
        console.error('Error loading gallery:', error);
        elements.galleryGrid.innerHTML = `
            <div class="gallery-empty">
                <p>Unable to load gallery. Please try again later.</p>
            </div>
        `;
    }
}

function renderGallery() {
    const filtered = state.currentFilter === 'all' 
        ? state.gallery 
        : state.gallery.filter(item => item.type === state.currentFilter);
    
    if (filtered.length === 0) {
        elements.galleryGrid.innerHTML = `
            <div class="gallery-empty">
                <p>No media to display.</p>
            </div>
        `;
        return;
    }
    
    elements.galleryGrid.innerHTML = filtered.map((item, index) => `
        <div class="gallery-item" data-index="${index}" data-type="${item.type}">
            ${item.type === 'video' 
                ? `<video src="${item.url}" muted playsinline></video>
                   <div class="video-badge">
                       <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                   </div>`
                : `<img src="${item.url}" alt="${item.title || 'Gallery image'}" loading="lazy">`
            }
            <div class="gallery-overlay">
                <div class="gallery-info">
                    <h4>${item.title || 'Untitled'}</h4>
                    <span>${formatDate(item.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            openLightbox(index);
        });
    });
}

// =====================================================
// LIGHTBOX
// =====================================================

function initLightbox() {
    const lightbox = elements.lightbox;
    const content = document.getElementById('lightbox-content');
    
    // Close button
    lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    
    // Navigation
    lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => navigateLightbox(-1));
    lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => navigateLightbox(1));
    
    // Close on overlay click
    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox?.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });
}

function openLightbox(index) {
    const filtered = state.currentFilter === 'all' 
        ? state.gallery 
        : state.gallery.filter(item => item.type === state.currentFilter);
    
    if (filtered.length === 0) return;
    
    state.lightboxIndex = index;
    renderLightboxContent(filtered[index]);
    elements.lightbox?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    elements.lightbox?.classList.remove('active');
    document.body.style.overflow = '';
    
    // Pause video if playing
    const video = elements.lightbox?.querySelector('video');
    if (video) video.pause();
}

function navigateLightbox(direction) {
    const filtered = state.currentFilter === 'all' 
        ? state.gallery 
        : state.gallery.filter(item => item.type === state.currentFilter);
    
    state.lightboxIndex = (state.lightboxIndex + direction + filtered.length) % filtered.length;
    renderLightboxContent(filtered[state.lightboxIndex]);
}

function renderLightboxContent(item) {
    const content = document.getElementById('lightbox-content');
    if (!content) return;
    
    if (item.type === 'video') {
        content.innerHTML = `
            <video src="${item.url}" controls autoplay>
                Your browser does not support video playback.
            </video>
        `;
    } else {
        content.innerHTML = `<img src="${item.url}" alt="${item.title || 'Gallery image'}">`;
    }
}

// =====================================================
// DONATION MODAL
// =====================================================

function initDonationModal() {
    const modal = elements.donationModal;
    const form = elements.donationForm;
    
    // Close modal
    modal?.querySelector('.modal-close')?.addEventListener('click', () => closeModal(modal));
    modal?.querySelector('.modal-overlay')?.addEventListener('click', () => closeModal(modal));
    
    // Amount selection
    document.querySelectorAll('input[name="amount"]')?.forEach(input => {
        input.addEventListener('change', () => {
            document.getElementById('custom-amount').value = '';
        });
    });
    
    document.getElementById('custom-amount')?.addEventListener('input', () => {
        document.querySelectorAll('input[name="amount"]').forEach(input => {
            input.checked = false;
        });
    });
    
    // Form submission
    form?.addEventListener('submit', handleDonation);
    
    // Status modal close
    document.getElementById('status-close')?.addEventListener('click', () => {
        closeModal(elements.statusModal);
    });
}

async function handleDonation(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Get amount
    let amount = document.getElementById('custom-amount')?.value;
    if (!amount) {
        const selectedAmount = document.querySelector('input[name="amount"]:checked');
        if (selectedAmount) amount = selectedAmount.value;
    }
    
    amount = parseInt(amount);
    if (!amount || amount < 10) {
        showNotification('Please enter a valid amount (minimum KES 10)', 'error');
        return;
    }
    
    const phone = document.getElementById('phone')?.value;
    const donorName = document.getElementById('donor-name')?.value || 'Anonymous';
    
    if (!phone || !/^0[0-9]{9}$/.test(phone)) {
        showNotification('Please enter a valid phone number (07XXXXXXXX)', 'error');
        return;
    }
    
    // Show loading
    btnText.textContent = 'Processing...';
    btnLoader.classList.remove('hidden');
    submitBtn.disabled = true;
    
    try {
        // Close donation modal and show status modal
        closeModal(elements.donationModal);
        showStatusModal('loading', 'Processing Payment', 'Please wait while we initiate M-Pesa...');
        
        // Call backend API
        const response = await fetch(`${CONFIG.API_BASE}/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                phone: `254${phone.substring(1)}`,
                donorName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusModal('loading', 'Check Your Phone', 
                'An M-Pesa prompt has been sent to your phone. Please enter your PIN to complete the donation.');
            
            // Poll for status (in production, this would be handled by webhook)
            pollPaymentStatus(result.checkoutRequestID);
        } else {
            showStatusModal('error', 'Payment Failed', result.message || 'Unable to process payment. Please try again.');
        }
    } catch (error) {
        console.error('Donation error:', error);
        showStatusModal('error', 'Connection Error', 'Unable to connect to payment service. Please try again.');
    } finally {
        btnText.textContent = 'Donate via M-Pesa';
        btnLoader.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

async function pollPaymentStatus(checkoutRequestID) {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
        attempts++;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/payment-status/${checkoutRequestID}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                showStatusModal('success', 'Thank You!', 
                    `Your donation of KES ${result.amount.toLocaleString()} has been received. May God bless you!`);
                document.getElementById('status-close')?.classList.remove('hidden');
                updateStats();
                return;
            }
            
            if (result.status === 'failed') {
                showStatusModal('error', 'Payment Failed', result.message || 'The transaction could not be completed.');
                document.getElementById('status-close')?.classList.remove('hidden');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(poll, 3000);
            } else {
                showStatusModal('error', 'Timeout', 
                    'Payment verification timed out. If you completed the payment, please contact us.');
                document.getElementById('status-close')?.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Polling error:', error);
            if (attempts < maxAttempts) {
                setTimeout(poll, 3000);
            }
        }
    };
    
    poll();
}

function showStatusModal(type, title, message) {
    const modal = elements.statusModal;
    const icon = document.getElementById('status-icon');
    const titleEl = document.getElementById('status-title');
    const messageEl = document.getElementById('status-message');
    const closeBtn = document.getElementById('status-close');
    
    icon.className = 'status-icon ' + type;
    
    if (type === 'success') {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;
    } else if (type === 'error') {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`;
    } else {
        icon.innerHTML = '';
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    if (type !== 'loading') {
        closeBtn?.classList.remove('hidden');
    } else {
        closeBtn?.classList.add('hidden');
    }
    
    openModal(modal);
}

// =====================================================
// CONTACT FORM
// =====================================================

function initContactForm() {
    elements.contactForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name')?.value,
            email: document.getElementById('email')?.value,
            subject: document.getElementById('subject')?.value,
            message: document.getElementById('message')?.value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            await db.collection('messages').add(formData);
            showNotification('Message sent successfully! We will get back to you soon.', 'success');
            elements.contactForm.reset();
        } catch (error) {
            console.error('Error sending message:', error);
            showNotification('Failed to send message. Please try again.', 'error');
        }
    });
}

// =====================================================
// REAL-TIME UPDATES
// =====================================================

function initRealTimeUpdates() {
    // Stats listener
    db.collection('config').doc('stats').onSnapshot(doc => {
        if (doc.exists) {
            state.stats = doc.data();
            updateStatsDisplay();
        }
    });
    
    // Gallery listener
    db.collection('media')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            state.gallery = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderGallery();
        });
    
    // Logo listener
    db.collection('config').doc('branding').onSnapshot(doc => {
        if (doc.exists && doc.data().logoUrl) {
            state.logo = doc.data().logoUrl;
            updateLogoDisplay();
        }
    });
}

// =====================================================
// DATA LOADING
// =====================================================

async function loadInitialData() {
    try {
        // Load stats
        const statsDoc = await db.collection('config').doc('stats').get();
        if (statsDoc.exists) {
            state.stats = statsDoc.data();
            updateStatsDisplay();
        }
        
        // Load gallery
        await loadGallery();
        
        // Load logo
        const brandingDoc = await db.collection('config').doc('branding').get();
        if (brandingDoc.exists && brandingDoc.data().logoUrl) {
            state.logo = brandingDoc.data().logoUrl;
            updateLogoDisplay();
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

function updateStatsDisplay() {
    animateCounter('stat-communities', state.stats.communities || 0);
    animateCounter('stat-donors', state.stats.donors || 0);
    animateCounter('stat-funds', state.stats.funds || 0, 'KES ');
}

function updateLogoDisplay() {
    if (state.logo) {
        document.getElementById('nav-logo')?.setAttribute('src', state.logo);
        document.getElementById('footer-logo')?.setAttribute('src', state.logo);
    }
}

function animateCounter(elementId, target, prefix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        element.textContent = prefix + Math.floor(current).toLocaleString();
    }, duration / steps);
}

// =====================================================
// UTILITIES
// =====================================================

function openModal(modal) {
    modal?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal?.classList.remove('active');
    document.body.style.overflow = '';
}

function showNotification(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.className = 'toast ' + type;
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function setCurrentYear() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}