// BISTnews Application - Redesigned with Firebase Integration
let currentPage = 'home';
let articles = [];
let announcements = [];
let pdfs = [];
let comments = {};
let isAdmin = false;
let currentUser = null;
let richTextEditors = {};

// Firebase configuration - will be loaded from environment
const firebaseConfig = {
    apiKey: window.VITE_FIREBASE_API_KEY || "demo-key",
    authDomain: `${window.VITE_FIREBASE_PROJECT_ID || "bistnews-demo"}.firebaseapp.com`,
    projectId: window.VITE_FIREBASE_PROJECT_ID || "bistnews-demo",
    storageBucket: `${window.VITE_FIREBASE_PROJECT_ID || "bistnews-demo"}.appspot.com`,
    messagingSenderId: "123456789",
    appId: window.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Enhanced mock data with comments support
articles = [
    {
        id: 1,
        title: "Benvenuti al nuovo anno scolastico!",
        content: "Inizia un nuovo entusiasmante anno scolastico al BIST. Scopri tutte le novità e gli eventi in programma per quest'anno ricco di opportunità di crescita e apprendimento.",
        author: "Redazione",
        date: "2024-09-27",
        category: "Scuola",
        commentsEnabled: true
    },
    {
        id: 2,
        title: "Progetto sostenibilità ambientale",
        content: "La nostra scuola partecipa al progetto di sostenibilità ambientale con nuove iniziative eco-friendly. Saranno installati pannelli solari e implementate nuove politiche di riciclo.",
        author: "Prof. Verdi",
        date: "2024-09-25",
        category: "Ambiente",
        commentsEnabled: true
    }
];

announcements = [
    {
        id: 1,
        title: "Importante: Nuovi orari mensa",
        content: "<p>A partire dal <strong>1° ottobre</strong>, la mensa scolastica adotterà i nuovi orari:</p><ul><li>Pranzo: dalle 12:30 alle 14:00</li><li>Merenda: dalle 15:00 alle 15:30</li></ul>",
        priority: "high",
        date: "2024-09-27",
        commentsEnabled: true,
        richText: true
    }
];

pdfs = [
    {
        id: 1,
        title: "BISTnews - Settembre 2024",
        filename: "bistnews-settembre-2024.pdf",
        uploadDate: "2024-09-27",
        url: "#",
        coverImage: null,
        description: "Primo numero dell'anno scolastico 2024-2025",
        commentsEnabled: true,
        scheduledPublish: null,
        isPublished: true
    }
];

// Initialize comments
comments = {
    article_1: [
        { id: 1, author: "Studente Marco", content: "Ottimo articolo! Non vedo l'ora di iniziare!", date: "2024-09-27", time: "14:30" }
    ],
    announcement_1: [
        { id: 1, author: "Genitore Anna", content: "Perfetto, finalmente orari più chiari!", date: "2024-09-27", time: "15:45" }
    ],
    pdf_1: [
        { id: 1, author: "Prof. Rossi", content: "Bellissimo lavoro della redazione!", date: "2024-09-27", time: "16:20" }
    ]
};

// Page content templates with new design
const pageTemplates = {
    home: `
        <div class="hero-section">
            <div class="container text-center position-relative">
                <h1 class="hero-title">BISTnews</h1>
                <p class="hero-subtitle">Il giornale digitale della nostra scuola</p>
                <div class="mt-4">
                    <button class="btn btn-primary btn-lg me-3" onclick="showPage('giornalini')">
                        <i class="fas fa-newspaper me-2"></i>Ultimi Giornalini
                    </button>
                    <button class="btn btn-outline-primary btn-lg" onclick="showPage('articoli')">
                        <i class="fas fa-pen-fancy me-2"></i>Leggi Articoli
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Preview Ultimo Giornalino -->
        <div class="container my-5">
            <div id="latest-pdf-preview"></div>
        </div>
        
        <div class="container my-5">
            <div class="row">
                <div class="col-md-8">
                    <h2 class="section-title">Ultimi Articoli</h2>
                    <div id="recent-articles"></div>
                </div>
                <div class="col-md-4">
                    <h3 class="section-title">Annunci Importanti</h3>
                    <div id="announcements-sidebar"></div>
                </div>
            </div>
        </div>
        
        <!-- Decorazioni e Informazioni -->
        <div class="container my-5">
            <div class="row">
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h4 class="card-title" style="color: var(--primary-color); font-family: var(--font-main);">Chi Siamo</h4>
                            <p class="card-text">BISTnews è il giornale digitale ufficiale della nostra scuola. Qui trovi tutte le notizie, gli eventi e gli approfondimenti della vita scolastica.</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h4 class="card-title" style="color: var(--primary-color); font-family: var(--font-main);">Partecipa</h4>
                            <p class="card-text">Vuoi scrivere per il giornale? Contattaci attraverso il modulo nella sezione contatti e unisciti alla nostra redazione!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    
    articoli: `
        <div class="container my-5">
            <h1 class="section-title">Tutti gli Articoli</h1>
            <div class="row">
                <div class="col-md-12">
                    <div id="all-articles"></div>
                </div>
            </div>
        </div>
    `,
    
    giornalini: `
        <div class="container my-5">
            <h1 class="section-title">Giornalini Ufficiali</h1>
            <p class="lead">Scarica e leggi i numeri completi del nostro giornale scolastico in formato PDF.</p>
            <div id="pdf-list"></div>
        </div>
    `,
    
    contatti: `
        <div class="container my-5">
            <h1 class="section-title">Contatti</h1>
            <div class="row">
                <div class="col-md-8">
                    <div class="admin-section">
                        <h3 style="color: var(--tertiary-color); font-family: var(--font-secondary);">Scrivi alla Redazione</h3>
                        <form id="contact-form">
                            <div class="mb-3">
                                <label for="name" class="form-label">Nome</label>
                                <input type="text" class="form-control" id="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="subject" class="form-label">Oggetto</label>
                                <input type="text" class="form-control" id="subject" required>
                            </div>
                            <div class="mb-3">
                                <label for="message" class="form-label">Messaggio</label>
                                <textarea class="form-control" id="message" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane me-2"></i>Invia Messaggio
                            </button>
                        </form>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="admin-section">
                        <h3 style="color: var(--tertiary-color); font-family: var(--font-secondary);">Informazioni</h3>
                        <div class="mb-3">
                            <i class="fas fa-envelope text-primary me-2"></i>
                            <strong>Email:</strong> redazione@bistnews.it
                        </div>
                        <div class="mb-3">
                            <i class="fas fa-map-marker-alt text-primary me-2"></i>
                            <strong>Sede:</strong> BIST - Via della Scuola 123
                        </div>
                        <div class="mb-3">
                            <i class="fas fa-clock text-primary me-2"></i>
                            <strong>Orari redazione:</strong> Lunedì-Venerdì 14:00-16:00
                        </div>
                        <div class="mt-4">
                            <button class="btn btn-outline-primary" onclick="showPage('crediti')">
                                <i class="fas fa-users me-2"></i>Crediti del Sito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    
    admin: `
        <div class="container my-5">
            <div class="row mb-4">
                <div class="col-md-8">
                    <h1 class="section-title">Area Amministrativa</h1>
                </div>
                <div class="col-md-4 text-end">
                    <div id="admin-user-info"></div>
                </div>
            </div>
            
            <div id="admin-login-section" class="admin-section text-center" style="display: none;">
                <h3 style="color: var(--tertiary-color); font-family: var(--font-secondary);">Accesso Richiesto</h3>
                <p>Per accedere all'area amministrativa è necessario autenticarsi.</p>
                <button class="btn btn-primary" onclick="loginAdmin()">
                    <i class="fab fa-google me-2"></i>Accedi con Google
                </button>
            </div>
            
            <div id="admin-dashboard" class="row">
                <div class="col-md-12">
                    <ul class="nav nav-tabs" id="adminTabs">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" onclick="showAdminTab('announcements')">
                                <i class="fas fa-bullhorn me-2"></i>Gestione Annunci
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="showAdminTab('pdf')">
                                <i class="fas fa-file-pdf me-2"></i>Gestione Giornalini
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="showAdminTab('schedule')">
                                <i class="fas fa-calendar me-2"></i>Programmazione
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="showAdminTab('messages')">
                                <i class="fas fa-envelope me-2"></i>Messaggi Ricevuti
                            </a>
                        </li>
                    </ul>
                    
                    <div id="admin-content" class="admin-section">
                        <!-- Admin content will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `,
    
    crediti: `
        <div class="container my-5">
            <h1 class="section-title">Crediti del Sito</h1>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="admin-section">
                        <h3 style="color: var(--tertiary-color); font-family: var(--font-secondary);">Team di Sviluppo</h3>
                        <div class="mb-3">
                            <h5 style="color: var(--primary-color);">Sviluppo Tecnico</h5>
                            <p>Realizzato con tecnologie moderne per garantire prestazioni ottimali e sicurezza.</p>
                        </div>
                        <div class="mb-3">
                            <h5 style="color: var(--primary-color);">Design & UX</h5>
                            <p>Interfaccia progettata per essere intuitiva e accessibile a tutti gli utenti.</p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="admin-section">
                        <h3 style="color: var(--tertiary-color); font-family: var(--font-secondary);">Tecnologie Utilizzate</h3>
                        <div class="mb-2">
                            <span class="badge" style="background: var(--quinary-color);">HTML5</span>
                            <span class="badge" style="background: var(--quinary-color);">JavaScript ES6+</span>
                            <span class="badge" style="background: var(--quinary-color);">Bootstrap 5</span>
                        </div>
                        <div class="mb-2">
                            <span class="badge" style="background: var(--tertiary-color);">Firebase</span>
                            <span class="badge" style="background: var(--tertiary-color);">Google Fonts</span>
                            <span class="badge" style="background: var(--tertiary-color);">Font Awesome</span>
                        </div>
                        
                        <div class="mt-4">
                            <h5 style="color: var(--primary-color);">Ringraziamenti</h5>
                            <p class="small">Un ringraziamento speciale a tutti i contributori e alla comunità open source.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="text-center mt-4">
                <button class="btn btn-outline-primary" onclick="showPage('home')">
                    <i class="fas fa-home me-2"></i>Torna alla Home
                </button>
            </div>
        </div>
    `
};

// Navigation function
function showPage(pageName) {
    currentPage = pageName;
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = pageTemplates[pageName] || '<div class="container"><h1>Pagina non trovata</h1></div>';
    
    // Load page-specific content
    setTimeout(() => {
        switch(pageName) {
            case 'home':
                loadLatestPdfPreview();
                loadRecentArticles();
                loadAnnouncementsSidebar();
                break;
            case 'articoli':
                loadAllArticles();
                break;
            case 'giornalini':
                loadPdfList();
                break;
            case 'contatti':
                setupContactForm();
                break;
            case 'admin':
                checkAdminAuth();
                break;
        }
    }, 100);
}

// Content loading functions
function loadLatestPdfPreview() {
    const container = document.getElementById('latest-pdf-preview');
    if (!container) return;
    
    const latestPdf = pdfs.find(pdf => pdf.isPublished) || pdfs[0];
    if (!latestPdf) return;
    
    container.innerHTML = `
        <div class="pdf-preview">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h3 style="font-family: var(--font-main); margin-bottom: 1rem;">Ultimo Giornalino</h3>
                    <h4>${latestPdf.title}</h4>
                    <p>${latestPdf.description || 'Leggi l\'ultimo numero del nostro giornale scolastico.'}</p>
                    <div class="mt-3">
                        <button class="btn btn-light btn-lg" onclick="viewPdf('${latestPdf.url}')">
                            <i class="fas fa-eye me-2"></i>Sfoglia Online
                        </button>
                        <button class="btn btn-outline-light btn-lg ms-2" onclick="downloadPdf('${latestPdf.url}')">
                            <i class="fas fa-download me-2"></i>Scarica PDF
                        </button>
                    </div>
                </div>
                <div class="col-md-4 text-center">
                    <div style="background: rgba(255,255,255,0.2); border-radius: 15px; padding: 20px;">
                        <i class="fas fa-file-pdf fa-5x mb-3" style="opacity: 0.8;"></i>
                        <p class="small">Pubblicato il ${formatDate(latestPdf.uploadDate)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadRecentArticles() {
    const container = document.getElementById('recent-articles');
    if (!container) return;
    
    const recentArticles = articles.slice(0, 3);
    container.innerHTML = recentArticles.map(article => `
        <div class="card mb-3 article-card" onclick="showArticle(${article.id})">
            <div class="card-body">
                <h5 class="card-title">${article.title}</h5>
                <p class="card-text">${article.content.substring(0, 150)}...</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Di ${article.author} - ${formatDate(article.date)}</small>
                    <span class="badge" style="background: var(--quinary-color);">${article.category}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function loadAnnouncementsSidebar() {
    const container = document.getElementById('announcements-sidebar');
    if (!container) return;
    
    container.innerHTML = announcements.map(announcement => `
        <div class="announcement ${announcement.priority === 'high' ? 'priority-high' : ''}" onclick="showAnnouncement(${announcement.id})">
            <h6>${announcement.title}</h6>
            <div>${announcement.richText ? announcement.content : '<p>' + announcement.content + '</p>'}</div>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">${formatDate(announcement.date)}</small>
                <small class="text-muted">
                    <i class="fas fa-comments me-1"></i>${getCommentsCount('announcement_' + announcement.id)}
                </small>
            </div>
        </div>
    `).join('');
}

function loadAllArticles() {
    const container = document.getElementById('all-articles');
    if (!container) return;
    
    container.innerHTML = articles.map(article => `
        <div class="card mb-4 article-card" onclick="showArticle(${article.id})">
            <div class="card-body">
                <h4 class="card-title">${article.title}</h4>
                <p class="card-text">${article.content}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Di ${article.author} - ${formatDate(article.date)}</small>
                        <span class="badge ms-2" style="background: var(--quinary-color);">${article.category}</span>
                    </div>
                    <small class="text-muted">
                        <i class="fas fa-comments me-1"></i>${getCommentsCount('article_' + article.id)} commenti
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

function loadPdfList() {
    const container = document.getElementById('pdf-list');
    if (!container) return;
    
    container.innerHTML = pdfs.filter(pdf => pdf.isPublished).map(pdf => `
        <div class="card mb-4">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5 class="card-title">${pdf.title}</h5>
                        <p class="card-text">${pdf.description || 'Numero completo del giornale scolastico'}</p>
                        <small class="text-muted">Pubblicato il ${formatDate(pdf.uploadDate)}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-primary me-2" onclick="viewPdf('${pdf.url}')">
                            <i class="fas fa-eye me-2"></i>Visualizza
                        </button>
                        <button class="btn btn-outline-primary" onclick="downloadPdf('${pdf.url}')">
                            <i class="fas fa-download me-2"></i>Scarica
                        </button>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-outline-secondary btn-sm" onclick="showComments('pdf_${pdf.id}', '${pdf.title}')">
                        <i class="fas fa-comments me-2"></i>Commenti (${getCommentsCount('pdf_' + pdf.id)})
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Comments system
function getCommentsCount(itemId) {
    return comments[itemId] ? comments[itemId].length : 0;
}

function showComments(itemId, itemTitle) {
    const itemComments = comments[itemId] || [];
    
    const modal = `
        <div class="modal fade" id="commentsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Commenti - ${itemTitle}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="comment-section">
                            <div id="comments-list">
                                ${itemComments.map(comment => `
                                    <div class="comment">
                                        <strong>${comment.author}</strong>
                                        <small class="text-muted ms-2">${formatDate(comment.date)} alle ${comment.time}</small>
                                        <p class="mt-2 mb-0">${comment.content}</p>
                                    </div>
                                `).join('')}
                                ${itemComments.length === 0 ? '<p class="text-muted">Nessun commento ancora. Scrivi il primo!</p>' : ''}
                            </div>
                            
                            <div class="mt-4">
                                <h6>Aggiungi un commento</h6>
                                <form id="comment-form" data-item-id="${itemId}">
                                    <div class="mb-3">
                                        <input type="text" class="form-control" id="comment-author" placeholder="Il tuo nome" required>
                                    </div>
                                    <div class="mb-3">
                                        <textarea class="form-control" id="comment-content" rows="3" placeholder="Scrivi il tuo commento..." required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-paper-plane me-2"></i>Pubblica Commento
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    const modalElement = new bootstrap.Modal(document.getElementById('commentsModal'));
    modalElement.show();
    
    // Setup comment form
    document.getElementById('comment-form').onsubmit = function(e) {
        e.preventDefault();
        addComment(itemId);
    };
    
    document.getElementById('commentsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function addComment(itemId) {
    const author = document.getElementById('comment-author').value;
    const content = document.getElementById('comment-content').value;
    
    if (!author || !content) return;
    
    if (!comments[itemId]) {
        comments[itemId] = [];
    }
    
    const newComment = {
        id: Date.now(),
        author: author,
        content: content,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };
    
    comments[itemId].push(newComment);
    
    // Refresh comments display
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = comments[itemId].map(comment => `
        <div class="comment">
            <strong>${comment.author}</strong>
            <small class="text-muted ms-2">${formatDate(comment.date)} alle ${comment.time}</small>
            <p class="mt-2 mb-0">${comment.content}</p>
        </div>
    `).join('');
    
    // Clear form
    document.getElementById('comment-form').reset();
    
    // Refresh page content to update comment counts
    setTimeout(() => {
        if (currentPage === 'home') {
            loadAnnouncementsSidebar();
        }
    }, 100);
}

// Firebase authentication functions
function checkAdminAuth() {
    const loginSection = document.getElementById('admin-login-section');
    const dashboard = document.getElementById('admin-dashboard');
    
    if (isAdmin) {
        loginSection.style.display = 'none';
        dashboard.style.display = 'block';
        showAdminTab('announcements');
        updateAdminUserInfo();
    } else {
        loginSection.style.display = 'block';
        dashboard.style.display = 'none';
    }
}

function loginAdmin() {
    // Simulate Firebase authentication
    alert('Integrazione Firebase in corso. Per ora usare modalità demo.');
    isAdmin = true;
    currentUser = { displayName: 'Admin Demo', email: 'admin@bistnews.it' };
    checkAdminAuth();
}

function updateAdminUserInfo() {
    const container = document.getElementById('admin-user-info');
    if (container && currentUser) {
        container.innerHTML = `
            <div class="text-end">
                <small class="text-muted">Connesso come</small><br>
                <strong>${currentUser.displayName}</strong>
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="logoutAdmin()">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
    }
}

function logoutAdmin() {
    isAdmin = false;
    currentUser = null;
    checkAdminAuth();
}

function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.onsubmit = function(e) {
        e.preventDefault();
        
        // TODO: Save to Firebase
        alert('Messaggio inviato con successo! Ti risponderemo presto.');
        form.reset();
    };
}

// Admin functions with enhanced features
function showAdminTab(tabName) {
    if (!isAdmin) return;
    
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;
    
    // Update tab active state
    document.querySelectorAll('#adminTabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and activate current tab
    const currentTab = Array.from(document.querySelectorAll('#adminTabs .nav-link')).find(link => 
        link.onclick.toString().includes(tabName)
    );
    if (currentTab) currentTab.classList.add('active');
    
    switch(tabName) {
        case 'announcements':
            showAnnouncementsAdmin();
            break;
        case 'pdf':
            showPdfAdmin();
            break;
        case 'schedule':
            showScheduleAdmin();
            break;
        case 'messages':
            showMessagesAdmin();
            break;
    }
}

function showAnnouncementsAdmin() {
    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = `
        <h3 style="color: var(--tertiary-color);">Gestione Annunci</h3>
        <div class="row">
            <div class="col-md-6">
                <h4>Crea Nuovo Annuncio</h4>
                <form id="announcement-form">
                    <div class="mb-3">
                        <label for="ann-title" class="form-label">Titolo</label>
                        <input type="text" class="form-control" id="ann-title" required>
                    </div>
                    <div class="mb-3">
                        <label for="ann-content" class="form-label">Contenuto</label>
                        <div id="rich-editor" style="min-height: 200px; border: 1px solid #ddd; border-radius: 5px;">
                            <div id="rich-content" contenteditable="true" style="padding: 15px; min-height: 180px;">
                                Scrivi qui il contenuto dell'annuncio...
                            </div>
                        </div>
                        <div class="mt-2">
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="formatText('bold')">
                                <i class="fas fa-bold"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="formatText('italic')">
                                <i class="fas fa-italic"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="formatText('insertUnorderedList')">
                                <i class="fas fa-list-ul"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="ann-priority" class="form-label">Priorità</label>
                        <select class="form-control" id="ann-priority">
                            <option value="normal">Normale</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="ann-comments" checked>
                        <label class="form-check-label" for="ann-comments">
                            Abilita commenti
                        </label>
                    </div>
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-plus me-2"></i>Pubblica Annuncio
                    </button>
                </form>
            </div>
            <div class="col-md-6">
                <h4>Annunci Pubblicati</h4>
                <div id="admin-announcements"></div>
            </div>
        </div>
    `;
    
    loadAdminAnnouncements();
    setupAnnouncementForm();
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('rich-content').focus();
}

function showPdfAdmin() {
    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = `
        <h3 style="color: var(--tertiary-color);">Gestione Giornalini PDF</h3>
        <div class="row">
            <div class="col-md-6">
                <h4>Carica Nuovo Giornalino</h4>
                <div class="upload-area" id="pdf-upload-area">
                    <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                    <p>Trascina il file PDF qui o clicca per selezionare</p>
                    <input type="file" id="pdf-file-input" accept=".pdf" style="display: none;">
                    <button class="btn btn-primary" onclick="document.getElementById('pdf-file-input').click()">
                        <i class="fas fa-file-pdf me-2"></i>Seleziona File PDF
                    </button>
                </div>
                
                <div class="mb-3 mt-3">
                    <label for="pdf-title" class="form-label">Titolo del Giornalino</label>
                    <input type="text" class="form-control" id="pdf-title" placeholder="es. BISTnews - Ottobre 2024">
                </div>
                
                <div class="mb-3">
                    <label for="pdf-description" class="form-label">Descrizione</label>
                    <textarea class="form-control" id="pdf-description" rows="3" placeholder="Breve descrizione del contenuto..."></textarea>
                </div>
                
                <div class="mb-3">
                    <label for="pdf-cover" class="form-label">Immagine di Copertina (opzionale)</label>
                    <input type="file" class="form-control" id="pdf-cover" accept="image/*">
                </div>
                
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="pdf-publish-now" checked>
                    <label class="form-check-label" for="pdf-publish-now">
                        Pubblica immediatamente
                    </label>
                </div>
                
                <div class="mb-3" id="schedule-section" style="display: none;">
                    <label for="pdf-schedule" class="form-label">Data di pubblicazione programmata</label>
                    <input type="datetime-local" class="form-control" id="pdf-schedule">
                </div>
                
                <button class="btn btn-success" onclick="uploadPdf()">
                    <i class="fas fa-upload me-2"></i>Carica Giornalino
                </button>
            </div>
            
            <div class="col-md-6">
                <h4>Giornalini Gestiti</h4>
                <div id="admin-pdfs"></div>
            </div>
        </div>
    `;
    
    // Toggle schedule section
    document.getElementById('pdf-publish-now').onchange = function() {
        const scheduleSection = document.getElementById('schedule-section');
        scheduleSection.style.display = this.checked ? 'none' : 'block';
    };
    
    loadAdminPdfs();
    setupPdfUpload();
}

function showScheduleAdmin() {
    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = `
        <h3 style="color: var(--tertiary-color);">Programmazione Pubblicazioni</h3>
        
        <div class="row">
            <div class="col-md-12">
                <div class="alert alert-info">
                    <i class="fas fa-calendar-alt me-2"></i>
                    Qui puoi gestire le pubblicazioni programmate di giornalini e annunci.
                </div>
                
                <h4>Pubblicazioni Programmate</h4>
                <div id="scheduled-content">
                    <p class="text-muted">Nessuna pubblicazione programmata al momento.</p>
                </div>
            </div>
        </div>
    `;
}

function showMessagesAdmin() {
    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = `
        <h3 style="color: var(--tertiary-color);">Messaggi Ricevuti</h3>
        <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            Qui vengono visualizzati tutti i messaggi inviati tramite il modulo contatti.
        </div>
        <div id="admin-messages">
            <p class="text-muted">Nessun messaggio ricevuto. I messaggi verranno salvati nel database Firebase.</p>
        </div>
    `;
}

// Admin helper functions
function loadAdminAnnouncements() {
    const container = document.getElementById('admin-announcements');
    if (!container) return;
    
    container.innerHTML = announcements.map((announcement, index) => `
        <div class="card mb-3">
            <div class="card-body">
                <h6>${announcement.title}</h6>
                <div class="small mb-2">${announcement.richText ? announcement.content : '<p>' + announcement.content + '</p>'}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        ${announcement.priority === 'high' ? '<span class="badge bg-danger">Alta Priorità</span>' : '<span class="badge bg-secondary">Normale</span>'}
                        <i class="fas fa-comments ms-2"></i> ${getCommentsCount('announcement_' + announcement.id)}
                    </small>
                    <div>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="showComments('announcement_${announcement.id}', '${announcement.title}')">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function setupAnnouncementForm() {
    const form = document.getElementById('announcement-form');
    if (!form) return;
    
    form.onsubmit = function(e) {
        e.preventDefault();
        
        const title = document.getElementById('ann-title').value;
        const content = document.getElementById('rich-content').innerHTML;
        const priority = document.getElementById('ann-priority').value;
        const commentsEnabled = document.getElementById('ann-comments').checked;
        
        const newAnnouncement = {
            id: announcements.length + 1,
            title: title,
            content: content,
            priority: priority,
            date: new Date().toISOString().split('T')[0],
            commentsEnabled: commentsEnabled,
            richText: true
        };
        
        announcements.unshift(newAnnouncement);
        
        form.reset();
        document.getElementById('rich-content').innerHTML = 'Scrivi qui il contenuto dell\'annuncio...';
        loadAdminAnnouncements();
        
        alert('Annuncio pubblicato con successo!');
    };
}

function loadAdminPdfs() {
    const container = document.getElementById('admin-pdfs');
    if (!container) return;
    
    container.innerHTML = pdfs.map((pdf, index) => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6>${pdf.title}</h6>
                        <small class="text-muted">Caricato: ${formatDate(pdf.uploadDate)}</small>
                        <br>
                        <span class="badge ${pdf.isPublished ? 'bg-success' : 'bg-warning'}">
                            ${pdf.isPublished ? 'Pubblicato' : 'Bozza'}
                        </span>
                        ${pdf.scheduledPublish ? `<br><small class="text-info">Programmato: ${formatDate(pdf.scheduledPublish)}</small>` : ''}
                    </div>
                    <div class="btn-group-vertical">
                        <button class="btn btn-sm btn-outline-primary" onclick="showComments('pdf_${pdf.id}', '${pdf.title}')">
                            <i class="fas fa-comments"></i> ${getCommentsCount('pdf_' + pdf.id)}
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="togglePdfStatus(${index})">
                            <i class="fas fa-eye${pdf.isPublished ? '-slash' : ''}"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletePdf(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function togglePdfStatus(index) {
    pdfs[index].isPublished = !pdfs[index].isPublished;
    loadAdminPdfs();
    alert(`Giornalino ${pdfs[index].isPublished ? 'pubblicato' : 'nascosto'} con successo!`);
}

function setupPdfUpload() {
    const fileInput = document.getElementById('pdf-file-input');
    const uploadArea = document.getElementById('pdf-upload-area');
    
    if (!fileInput || !uploadArea) return;
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            uploadArea.innerHTML = `
                <i class="fas fa-file-pdf fa-3x mb-3 text-success"></i>
                <p>File selezionato: ${file.name}</p>
                <small class="text-muted">Dimensione: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            `;
        }
    };
}

function uploadPdf() {
    const fileInput = document.getElementById('pdf-file-input');
    const titleInput = document.getElementById('pdf-title');
    const descriptionInput = document.getElementById('pdf-description');
    const publishNow = document.getElementById('pdf-publish-now').checked;
    const scheduleInput = document.getElementById('pdf-schedule');
    
    if (!fileInput.files[0]) {
        alert('Seleziona un file PDF da caricare');
        return;
    }
    
    if (!titleInput.value) {
        alert('Inserisci un titolo per il giornalino');
        return;
    }
    
    const newPdf = {
        id: pdfs.length + 1,
        title: titleInput.value,
        filename: fileInput.files[0].name,
        description: descriptionInput.value,
        uploadDate: new Date().toISOString().split('T')[0],
        url: '#',
        coverImage: null,
        commentsEnabled: true,
        isPublished: publishNow,
        scheduledPublish: publishNow ? null : scheduleInput.value
    };
    
    pdfs.unshift(newPdf);
    
    // Reset form
    titleInput.value = '';
    descriptionInput.value = '';
    fileInput.value = '';
    scheduleInput.value = '';
    document.getElementById('pdf-publish-now').checked = true;
    document.getElementById('schedule-section').style.display = 'none';
    
    document.getElementById('pdf-upload-area').innerHTML = `
        <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
        <p>Trascina il file PDF qui o clicca per selezionare</p>
        <button class="btn btn-primary" onclick="document.getElementById('pdf-file-input').click()">
            <i class="fas fa-file-pdf me-2"></i>Seleziona File PDF
        </button>
    `;
    
    loadAdminPdfs();
    alert('Giornalino caricato con successo!');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

function showArticle(id) {
    const article = articles.find(a => a.id === id);
    if (!article) return;
    
    const modal = `
        <div class="modal fade" id="articleModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" style="font-family: var(--font-main);">${article.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted">Di ${article.author} - ${formatDate(article.date)}</p>
                        <p style="line-height: 1.7;">${article.content}</p>
                        <span class="badge" style="background: var(--quinary-color);">${article.category}</span>
                        
                        <hr class="my-4">
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <h6>Commenti (${getCommentsCount('article_' + article.id)})</h6>
                            <button class="btn btn-outline-primary btn-sm" onclick="showComments('article_${article.id}', '${article.title}')">
                                <i class="fas fa-comments me-2"></i>Visualizza/Aggiungi Commenti
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    const modalElement = new bootstrap.Modal(document.getElementById('articleModal'));
    modalElement.show();
    
    document.getElementById('articleModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function showAnnouncement(id) {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;
    
    const modal = `
        <div class="modal fade" id="announcementModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" style="font-family: var(--font-main);">${announcement.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            ${announcement.priority === 'high' ? '<span class="badge bg-danger">Alta Priorità</span>' : '<span class="badge bg-secondary">Normale</span>'}
                            <small class="text-muted ms-2">${formatDate(announcement.date)}</small>
                        </div>
                        <div style="line-height: 1.7;">
                            ${announcement.richText ? announcement.content : '<p>' + announcement.content + '</p>'}
                        </div>
                        
                        <hr class="my-4">
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <h6>Commenti (${getCommentsCount('announcement_' + announcement.id)})</h6>
                            <button class="btn btn-outline-primary btn-sm" onclick="showComments('announcement_${announcement.id}', '${announcement.title}')">
                                <i class="fas fa-comments me-2"></i>Visualizza/Aggiungi Commenti
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    const modalElement = new bootstrap.Modal(document.getElementById('announcementModal'));
    modalElement.show();
    
    document.getElementById('announcementModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function viewPdf(url) {
    alert('Funzionalità PDF viewer in corso di sviluppo. Sarà integrata con Firebase Storage.');
}

function downloadPdf(url) {
    alert('Download PDF simulato. In produzione il file verrà scaricato da Firebase Storage.');
}

function deleteAnnouncement(index) {
    if (confirm('Sei sicuro di voler eliminare questo annuncio?')) {
        const announcementId = announcements[index].id;
        delete comments['announcement_' + announcementId];
        announcements.splice(index, 1);
        loadAdminAnnouncements();
        if (currentPage === 'home') {
            loadAnnouncementsSidebar();
        }
    }
}

function deletePdf(index) {
    if (confirm('Sei sicuro di voler eliminare questo giornalino?')) {
        const pdfId = pdfs[index].id;
        delete comments['pdf_' + pdfId];
        pdfs.splice(index, 1);
        loadAdminPdfs();
        if (currentPage === 'home') {
            loadLatestPdfPreview();
        }
        if (currentPage === 'giornalini') {
            loadPdfList();
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase if available
    if (window.VITE_FIREBASE_API_KEY) {
        console.log('Firebase configuration detected');
        // TODO: Initialize Firebase here
    }
    
    showPage('home');
});

// For debugging in console
window.app = {
    articles,
    announcements,
    pdfs,
    comments,
    showPage,
    showAdminTab,
    isAdmin,
    currentUser
};