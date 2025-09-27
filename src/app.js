// BISTnews Application
let currentPage = 'home';
let articles = [];
let announcements = [];
let pdfs = [];
let isAdmin = false;

// Firebase configuration placeholder
const firebaseConfig = {
    apiKey: "AIzaSyDGxqRXRZ8_Q7QY8kJ9YFzJ5_vR2H4nEoE",
    authDomain: "bistnews-demo.firebaseapp.com",
    projectId: "bistnews-demo",
    storageBucket: "bistnews-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Mock data for demonstration
articles = [
    {
        id: 1,
        title: "Benvenuti al nuovo anno scolastico!",
        content: "Inizia un nuovo entusiasmante anno scolastico al BIST. Scopri tutte le novità e gli eventi in programma...",
        author: "Redazione",
        date: "2024-09-27",
        category: "Scuola"
    },
    {
        id: 2,
        title: "Progetto sostenibilità ambientale",
        content: "La nostra scuola partecipa al progetto di sostenibilità ambientale con nuove iniziative eco-friendly...",
        author: "Prof. Verdi",
        date: "2024-09-25",
        category: "Ambiente"
    }
];

announcements = [
    {
        id: 1,
        title: "Importante: Nuovi orari mensa",
        content: "A partire dal 1° ottobre, la mensa scolastica adotterà i nuovi orari. Pranzo dalle 12:30 alle 14:00.",
        priority: "high",
        date: "2024-09-27"
    }
];

pdfs = [
    {
        id: 1,
        title: "BISTnews - Settembre 2024",
        filename: "bistnews-settembre-2024.pdf",
        uploadDate: "2024-09-27",
        url: "#"
    }
];

// Page content templates
const pageTemplates = {
    home: `
        <div class="hero-section">
            <div class="container text-center">
                <h1 class="display-4 mb-4">BISTnews</h1>
                <p class="lead">Il giornale digitale della nostra scuola</p>
            </div>
        </div>
        
        <div class="container my-5">
            <div class="row">
                <div class="col-md-8">
                    <h2>Ultimi Articoli</h2>
                    <div id="recent-articles"></div>
                </div>
                <div class="col-md-4">
                    <h3>Annunci Importanti</h3>
                    <div id="announcements-sidebar"></div>
                </div>
            </div>
        </div>
    `,
    
    articoli: `
        <div class="container my-5">
            <h1>Tutti gli Articoli</h1>
            <div class="row">
                <div class="col-md-12">
                    <div id="all-articles"></div>
                </div>
            </div>
        </div>
    `,
    
    giornalini: `
        <div class="container my-5">
            <h1>Giornalini PDF</h1>
            <p>Scarica e leggi i numeri completi del nostro giornale in formato PDF.</p>
            <div id="pdf-list"></div>
        </div>
    `,
    
    contatti: `
        <div class="container my-5">
            <h1>Contatti</h1>
            <div class="row">
                <div class="col-md-8">
                    <h3>Scrivi alla Redazione</h3>
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
                        <button type="submit" class="btn btn-primary">Invia Messaggio</button>
                    </form>
                </div>
                <div class="col-md-4">
                    <h3>Informazioni</h3>
                    <p><strong>Email:</strong> redazione@bistnews.it</p>
                    <p><strong>Sede:</strong> BIST - Via della Scuola 123</p>
                    <p><strong>Orari redazione:</strong> Lunedì-Venerdì 14:00-16:00</p>
                </div>
            </div>
        </div>
    `,
    
    admin: `
        <div class="container my-5">
            <h1>Area Amministrativa</h1>
            
            <div class="row">
                <div class="col-md-12">
                    <ul class="nav nav-tabs" id="adminTabs">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" onclick="showAdminTab('announcements')">Gestione Annunci</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="showAdminTab('pdf')">Gestione PDF</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="showAdminTab('messages')">Messaggi Ricevuti</a>
                        </li>
                    </ul>
                    
                    <div id="admin-content" class="admin-section">
                        <!-- Admin content will be loaded here -->
                    </div>
                </div>
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
                showAdminTab('announcements');
                break;
        }
    }, 100);
}

// Content loading functions
function loadRecentArticles() {
    const container = document.getElementById('recent-articles');
    if (!container) return;
    
    const recentArticles = articles.slice(0, 3);
    container.innerHTML = recentArticles.map(article => `
        <div class="card mb-3 article-card" onclick="showArticle(${article.id})">
            <div class="card-body">
                <h5 class="card-title">${article.title}</h5>
                <p class="card-text">${article.content.substring(0, 150)}...</p>
                <small class="text-muted">Di ${article.author} - ${formatDate(article.date)}</small>
            </div>
        </div>
    `).join('');
}

function loadAnnouncementsSidebar() {
    const container = document.getElementById('announcements-sidebar');
    if (!container) return;
    
    container.innerHTML = announcements.map(announcement => `
        <div class="announcement ${announcement.priority === 'high' ? 'border-danger' : ''}">
            <h6>${announcement.title}</h6>
            <p>${announcement.content}</p>
            <small class="text-muted">${formatDate(announcement.date)}</small>
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
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Di ${article.author}</small>
                    <small class="text-muted">${formatDate(article.date)}</small>
                </div>
                <span class="badge bg-secondary">${article.category}</span>
            </div>
        </div>
    `).join('');
}

function loadPdfList() {
    const container = document.getElementById('pdf-list');
    if (!container) return;
    
    container.innerHTML = pdfs.map(pdf => `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">${pdf.title}</h5>
                <p class="card-text">Caricato il ${formatDate(pdf.uploadDate)}</p>
                <button class="btn btn-primary" onclick="viewPdf('${pdf.url}')">
                    Visualizza PDF
                </button>
                <button class="btn btn-outline-secondary ms-2" onclick="downloadPdf('${pdf.url}')">
                    Scarica
                </button>
            </div>
        </div>
    `).join('');
}

function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.onsubmit = function(e) {
        e.preventDefault();
        alert('Messaggio inviato con successo! Ti risponderemo presto.');
        form.reset();
    };
}

// Admin functions
function showAdminTab(tabName) {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;
    
    // Update tab active state
    document.querySelectorAll('#adminTabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event?.target?.classList?.add('active');
    
    switch(tabName) {
        case 'announcements':
            adminContent.innerHTML = `
                <h3>Gestione Annunci</h3>
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
                                <textarea class="form-control" id="ann-content" rows="4" required></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="ann-priority" class="form-label">Priorità</label>
                                <select class="form-control" id="ann-priority">
                                    <option value="normal">Normale</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-success">Pubblica Annuncio</button>
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
            break;
            
        case 'pdf':
            adminContent.innerHTML = `
                <h3>Gestione PDF Giornalini</h3>
                <div class="row">
                    <div class="col-md-6">
                        <h4>Carica Nuovo PDF</h4>
                        <div class="upload-area" id="pdf-upload-area">
                            <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                            <p>Trascina il file PDF qui o clicca per selezionare</p>
                            <input type="file" id="pdf-file-input" accept=".pdf" style="display: none;">
                            <button class="btn btn-primary" onclick="document.getElementById('pdf-file-input').click()">
                                Seleziona File PDF
                            </button>
                        </div>
                        <div class="mb-3 mt-3">
                            <label for="pdf-title" class="form-label">Titolo del Giornalino</label>
                            <input type="text" class="form-control" id="pdf-title" placeholder="es. BISTnews - Ottobre 2024">
                        </div>
                        <button class="btn btn-success" onclick="uploadPdf()">Carica PDF</button>
                    </div>
                    <div class="col-md-6">
                        <h4>PDF Pubblicati</h4>
                        <div id="admin-pdfs"></div>
                    </div>
                </div>
            `;
            loadAdminPdfs();
            setupPdfUpload();
            break;
            
        case 'messages':
            adminContent.innerHTML = `
                <h3>Messaggi Ricevuti</h3>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Qui vengono visualizzati tutti i messaggi inviati tramite il modulo contatti.
                </div>
                <div id="admin-messages">
                    <p class="text-muted">Nessun messaggio ricevuto.</p>
                </div>
            `;
            break;
    }
}

// Admin helper functions
function loadAdminAnnouncements() {
    const container = document.getElementById('admin-announcements');
    if (!container) return;
    
    container.innerHTML = announcements.map((announcement, index) => `
        <div class="card mb-2">
            <div class="card-body">
                <h6>${announcement.title}</h6>
                <p class="small">${announcement.content}</p>
                <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${index})">Elimina</button>
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
        const content = document.getElementById('ann-content').value;
        const priority = document.getElementById('ann-priority').value;
        
        announcements.unshift({
            id: announcements.length + 1,
            title: title,
            content: content,
            priority: priority,
            date: new Date().toISOString().split('T')[0]
        });
        
        form.reset();
        loadAdminAnnouncements();
        alert('Annuncio pubblicato con successo!');
    };
}

function loadAdminPdfs() {
    const container = document.getElementById('admin-pdfs');
    if (!container) return;
    
    container.innerHTML = pdfs.map((pdf, index) => `
        <div class="card mb-2">
            <div class="card-body">
                <h6>${pdf.title}</h6>
                <small class="text-muted">Caricato: ${formatDate(pdf.uploadDate)}</small>
                <div class="mt-2">
                    <button class="btn btn-sm btn-danger" onclick="deletePdf(${index})">Elimina</button>
                </div>
            </div>
        </div>
    `).join('');
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
            `;
        }
    };
}

function uploadPdf() {
    const fileInput = document.getElementById('pdf-file-input');
    const titleInput = document.getElementById('pdf-title');
    
    if (!fileInput.files[0]) {
        alert('Seleziona un file PDF da caricare');
        return;
    }
    
    if (!titleInput.value) {
        alert('Inserisci un titolo per il giornalino');
        return;
    }
    
    // Simulate upload
    pdfs.unshift({
        id: pdfs.length + 1,
        title: titleInput.value,
        filename: fileInput.files[0].name,
        uploadDate: new Date().toISOString().split('T')[0],
        url: '#'
    });
    
    alert('PDF caricato con successo!');
    titleInput.value = '';
    fileInput.value = '';
    document.getElementById('pdf-upload-area').innerHTML = `
        <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
        <p>Trascina il file PDF qui o clicca per selezionare</p>
        <button class="btn btn-primary" onclick="document.getElementById('pdf-file-input').click()">
            Seleziona File PDF
        </button>
    `;
    loadAdminPdfs();
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
                        <h5 class="modal-title">${article.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted">Di ${article.author} - ${formatDate(article.date)}</p>
                        <p>${article.content}</p>
                        <span class="badge bg-secondary">${article.category}</span>
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

function viewPdf(url) {
    alert('Funzionalità PDF viewer in arrivo. Per ora usa il pulsante Scarica.');
}

function downloadPdf(url) {
    alert('Download PDF simulato. In una versione completa, il file verrebbe scaricato.');
}

function deleteAnnouncement(index) {
    if (confirm('Sei sicuro di voler eliminare questo annuncio?')) {
        announcements.splice(index, 1);
        loadAdminAnnouncements();
    }
}

function deletePdf(index) {
    if (confirm('Sei sicuro di voler eliminare questo PDF?')) {
        pdfs.splice(index, 1);
        loadAdminPdfs();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    showPage('home');
});

// For debugging in console
window.app = {
    articles,
    announcements,
    pdfs,
    showPage,
    showAdminTab
};