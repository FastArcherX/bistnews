// BISTnews Application - Redesigned with Firebase Realtime Database
let currentPage = 'home';
let articles = [];
let announcements = [];
let comments = {};
let isAdmin = false;
let currentUser = null;
let currentArticleReader = null;
let currentPageIndex = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    showPage('home');
    loadAllData();
});

async function loadAllData() {
    try {
        console.log('Loading data from Firebase...');
        articles = await loadArticles() || [];
        announcements = await loadAnnouncements() || [];
        
        console.log('Loaded articles:', articles.length, 'announcements:', announcements.length);
        
        // Combine Firebase data with demo data for better user experience
        if (articles.length === 0) {
            console.log('No articles from Firebase, loading demo articles...');
            loadDemoData();
        } else {
            console.log('Using Firebase data only');
        }
        
        // Load counts asynchronously after data is loaded
        setTimeout(() => {
            loadAllCounts();
        }, 1000);
        
        // Refresh current page to show new data
        if (window.currentPage) {
            showPage(window.currentPage);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to demo data if Firebase is not available
        loadDemoData();
    }
}

async function loadAllCounts() {
    // Load comments and views counts for all items
    for (const article of articles) {
        try {
            const commentsCount = await getCommentsCount('article', article.id);
            const viewsCount = await getViews('article', article.id);
            
            // Update UI elements
            const commentsEl = document.getElementById(`comments-count-${article.id}`);
            if (commentsEl) commentsEl.textContent = commentsCount;
            
            const commentsReaderEl = document.getElementById(`comments-count-reader-${article.id}`);
            if (commentsReaderEl) commentsReaderEl.textContent = commentsCount;
            
            const viewsEl = document.getElementById(`views-count-${article.id}`);
            if (viewsEl) viewsEl.textContent = viewsCount;
        } catch (error) {
            console.error('Error loading counts for article:', article.id, error);
        }
    }
    
    for (const announcement of announcements) {
        try {
            const commentsCount = await getCommentsCount('announcement', announcement.id);
            const viewsCount = await getViews('announcement', announcement.id);
            
            // Update UI elements
            const commentsEl = document.getElementById(`comments-count-${announcement.id}`);
            if (commentsEl) commentsEl.textContent = commentsCount;
            
            const viewsEl = document.getElementById(`views-count-${announcement.id}`);
            if (viewsEl) viewsEl.textContent = viewsCount;
        } catch (error) {
            console.error('Error loading counts for announcement:', announcement.id, error);
        }
    }
}

function loadDemoData() {
    articles = [
        {
            id: 'demo1',
            title: "Benvenuti al nuovo anno scolastico",
            folderName: "Benvenuti al nuovo anno scolastico",
            description: "Inizia un nuovo entusiasmante anno scolastico al BIST. Scopri tutte le novità e gli eventi in programma.",
            coverImage: "magazine/Benvenuti al nuovo anno scolastico/page1.jpg",
            pages: [
                "magazine/Benvenuti al nuovo anno scolastico/page1.jpg",
                "magazine/Benvenuti al nuovo anno scolastico/page2.jpg",
                "magazine/Benvenuti al nuovo anno scolastico/page3.jpg"
            ],
            createdAt: Date.now() - 86400000,
            published: true
        },
        {
            id: 'demo2',
            title: "Progetto sostenibilità ambientale",
            folderName: "Progetto sostenibilità ambientale",
            description: "La nostra scuola partecipa al progetto di sostenibilità ambientale con nuove iniziative eco-friendly.",
            coverImage: "magazine/Progetto sostenibilità ambientale/page1.jpg",
            pages: [
                "magazine/Progetto sostenibilità ambientale/page1.jpg",
                "magazine/Progetto sostenibilità ambientale/page2.jpg"
            ],
            createdAt: Date.now() - 172800000,
            published: false  // Demo unpublished article
        }
    ];
    
    // Keep Firebase announcements if any, otherwise add demo announcements
    if (announcements.length === 0) {
        announcements = [
            {
                id: 'demo_ann1',
                title: "Nuovi orari mensa",
                content: "A partire dal 1° ottobre, la mensa scolastica adotterà i nuovi orari: Pranzo dalle 12:30 alle 14:00, Merenda dalle 15:00 alle 15:30",
                priority: "high",
                createdAt: Date.now() - 43200000
            }
        ];
    }
    
    console.log('Demo data loaded, refreshing homepage...');
    // Refresh the current page to show new data
    const currentPage = window.currentPage || 'home';
    showPage(currentPage);
}

// Page Navigation
function showPage(page) {
    window.currentPage = page;
    const content = document.getElementById('content');
    
    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[onclick="showPage('${page}')"]`)?.classList.add('active');
    
    switch(page) {
        case 'home':
            content.innerHTML = getHomePage();
            break;
        case 'articoli':
            content.innerHTML = getArticoliPage();
            break;
        case 'contatti':
            content.innerHTML = getContattiPage();
            break;
        case 'admin':
            content.innerHTML = getAdminPage();
            checkAdminAuth();
            break;
        default:
            content.innerHTML = getHomePage();
    }
}

// Homepage with open article preview
function getHomePage() {
    const latestArticle = articles.find(a => a.published) || articles[0];
    
    return `
        <div class="hero-section">
            <div class="container">
                <div class="row">
                    <div class="col-12 text-center">
                        <h1 class="display-1 hero-title">BISTnews</h1>
                        <p class="lead hero-subtitle">Il giornale digitale della nostra scuola</p>
                        <div class="hero-buttons">
                            <button class="btn btn-primary btn-lg me-3" onclick="showPage('articoli')">
                                <i class="fas fa-newspaper"></i> Ultimi Giornalini
                            </button>
                            <button class="btn btn-outline-primary btn-lg" onclick="showPage('articoli')">
                                <i class="fas fa-edit"></i> Leggi Articoli
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="container mt-5">
            ${latestArticle ? getArticlePreviewSection(latestArticle) : ''}
            
            <div class="row mt-5">
                <div class="col-md-8">
                    <h3 class="section-title">Ultimi Articoli</h3>
                    ${getArticlesGrid()}
                </div>
                <div class="col-md-4">
                    <h4 class="section-title">Annunci</h4>
                    ${getAnnouncementsList()}
                </div>
            </div>
        </div>
    `;
}

function getArticlePreviewSection(article) {
    return `
        <div class="article-preview-section">
            <div class="row align-items-center">
                <div class="col-md-5">
                    <div class="preview-info">
                        <span class="preview-badge">Ultimo Giornalino</span>
                        <h2 class="preview-title">${article.title}</h2>
                        <p class="preview-description">${article.description}</p>
                        <button class="btn btn-primary" onclick="continueReading('${article.id}')">
                            <i class="fas fa-book-open"></i> Continua a Leggere
                        </button>
                    </div>
                </div>
                <div class="col-md-7">
                    <div class="preview-reader">
                        <div class="page-container-large">
                            <img src="${article.pages?.[0] || article.coverImage}" 
                                 alt="Prima pagina" 
                                 class="preview-page-large"
                                 onclick="continueReading('${article.id}')">
                            <div class="page-number">1 / ${article.pages?.length || 1}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getArticlesGrid() {
    if (!articles.length) {
        return '<p class="text-muted">Nessun articolo disponibile al momento.</p>';
    }
    
    return articles.filter(a => a.published).map(article => `
        <div class="article-card mb-3" onclick="continueReading('${article.id}')">
            <div class="row">
                <div class="col-md-3">
                    <img src="${article.coverImage}" class="article-thumbnail" alt="${article.title}">
                </div>
                <div class="col-md-9">
                    <div class="card-body ps-4">
                        <h5 class="article-title">${article.title}</h5>
                        <p class="article-excerpt">${article.description}</p>
                        <small class="text-muted">
                            <i class="fas fa-calendar"></i> ${formatDate(article.createdAt)}
                            <i class="fas fa-comment ms-3"></i> ${getCommentsCount('article', article.id)} commenti
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getAnnouncementsList() {
    if (!announcements.length) {
        return '<p class="text-muted">Nessun annuncio al momento.</p>';
    }
    
    return announcements.map(announcement => `
        <div class="announcement ${announcement.priority === 'high' ? 'priority-high' : ''} position-relative">
            <div class="position-absolute top-0 end-0 p-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="incrementViews('announcement', '${announcement.id}')">
                    <i class="fas fa-eye"></i> <span id="views-count-${announcement.id}">0</span>
                </button>
            </div>
            <div class="position-absolute bottom-0 end-0 p-2">
                <button class="btn btn-sm btn-outline-primary" onclick="showComments('announcement', '${announcement.id}')">
                    <i class="fas fa-comment me-1"></i><span id="comments-count-${announcement.id}">0</span>
                </button>
            </div>
            <div class="pe-5">
                <h6>${announcement.title}</h6>
                <p>${announcement.content}</p>
                <small class="text-muted">
                    <i class="fas fa-calendar"></i> ${formatDate(announcement.createdAt)}
                </small>
            </div>
        </div>
    `).join('');
}

// Articles Page
function getArticoliPage() {
    return `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="page-title">Tutti gli Articoli</h2>
                <div class="article-filters">
                    <button class="btn btn-outline-primary active" onclick="filterArticles('all')">Tutti</button>
                    <button class="btn btn-outline-primary" onclick="filterArticles('recent')">Recenti</button>
                </div>
            </div>
            
            <div class="row">
                ${articles.filter(a => a.published).map(article => `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="article-card-full" onclick="continueReading('${article.id}')">
                            <img src="${article.coverImage}" class="article-cover" alt="${article.title}">
                            <div class="card-body">
                                <h5 class="article-title">${article.title}</h5>
                                <p class="article-excerpt">${article.description}</p>
                                <div class="article-meta">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar"></i> ${formatDate(article.createdAt)}
                                    </small>
                                    <div class="d-flex justify-content-end">
                                        <button class="btn btn-sm btn-outline-primary me-2" onclick="event.stopPropagation(); showComments('article', '${article.id}')">
                                            <i class="fas fa-comment"></i> <span id="comments-count-${article.id}">0</span>
                                        </button>
                                        <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation();">
                                            <i class="fas fa-eye"></i> <span id="views-count-${article.id}">0</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Contact Page following the design
function getContattiPage() {
    return `
        <div class="container mt-4">
            <h2 class="page-title text-center mb-5">Contatti</h2>
            
            <div class="contacts-section">
                <!-- Infos -->
                <div class="contact-category mb-5">
                    <h3 class="contact-title">Infos</h3>
                    <div class="contact-grid">
                        <!-- Staff info will be populated here -->
                    </div>
                </div>
                
                <!-- Fondatore -->
                <div class="contact-category mb-5">
                    <h3 class="contact-title">Fondatore</h3>
                    <div class="contact-grid">
                        <div class="contact-card">
                            <div class="contact-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="contact-info">
                                <h6>Demo Fondatore</h6>
                                <p class="contact-role">Fondatore del giornale</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Amministratore -->
                <div class="contact-category mb-5">
                    <h3 class="contact-title">Amministratore</h3>
                    <div class="contact-grid">
                        <div class="contact-card">
                            <div class="contact-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="contact-info">
                                <h6>Demo Admin 1</h6>
                                <p class="contact-role">Amministratore</p>
                            </div>
                        </div>
                        <div class="contact-card">
                            <div class="contact-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="contact-info">
                                <h6>Demo Admin 2</h6>
                                <p class="contact-role">Amministratore</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Moderatore -->
                <div class="contact-category mb-5">
                    <h3 class="contact-title">Moderatore</h3>
                    <div class="contact-grid">
                        <div class="contact-card">
                            <div class="contact-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="contact-info">
                                <h6>Demo Mod 1</h6>
                                <p class="contact-role">Moderatore</p>
                            </div>
                        </div>
                        <div class="contact-card">
                            <div class="contact-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="contact-info">
                                <h6>Demo Mod 2</h6>
                                <p class="contact-role">Moderatore</p>
                            </div>
                        </div>
                        <div class="contact-card">
                            <div class="contact-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="contact-info">
                                <h6>Demo Mod 3</h6>
                                <p class="contact-role">Moderatore</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Contatti diretti -->
                <div class="contact-category">
                    <h3 class="contact-title">Contatti</h3>
                    <div class="contact-direct">
                        <div class="contact-item">
                            <div class="contact-left">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>In caso di emergenze - Contatto Diretto</span>
                            </div>
                            <div class="contact-right">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-left">
                                <span>fastarcher@gmail.com</span>
                            </div>
                            <div class="contact-right">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-left">
                                <i class="fas fa-bug"></i>
                                <span>Report problemi - Bug del sito</span>
                            </div>
                            <div class="contact-right">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-left">
                                <span>baroloscp.contact@gmail.com</span>
                            </div>
                            <div class="contact-right">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Admin Page with email/password authentication
function getAdminPage() {
    return `
        <div class="container mt-4">
            <div id="loginSection" style="display: none;">
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="admin-login-card">
                            <h3 class="text-center mb-4">Accesso Admin</h3>
                            <form onsubmit="handleAdminLogin(event)">
                                <div class="mb-3">
                                    <label for="adminEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="adminEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="adminPassword" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="adminPassword" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Accedi</button>
                            </form>
                            <div class="text-center mt-3">
                                <small class="text-muted">Accesso riservato agli amministratori</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Registration removed - admin accounts managed in Firebase Console -->
            
            <div id="adminPanel" style="display: none;">
                ${getAdminPanel()}
            </div>
        </div>
    `;
}

function getAdminPanel() {
    return `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title">Pannello Admin</h2>
            <div>
                <span class="me-3">Benvenuto, ${currentUser?.email}</span>
                <button class="btn btn-outline-danger" onclick="handleLogout()">Logout</button>
            </div>
        </div>
        
        <div class="admin-tabs">
            <ul class="nav nav-tabs" id="adminTabs">
                <li class="nav-item">
                    <a class="nav-link active" href="#articoli-tab" data-bs-toggle="tab">Gestione Articoli</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#annunci-tab" data-bs-toggle="tab">Gestione Annunci</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#messaggi-tab" data-bs-toggle="tab">Messaggi</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#commenti-tab" data-bs-toggle="tab">Moderazione Commenti</a>
                </li>
            </ul>
            
            <div class="tab-content mt-4">
                <div class="tab-pane fade show active" id="articoli-tab">
                    ${getArticleManagement()}
                </div>
                <div class="tab-pane fade" id="annunci-tab">
                    ${getAnnouncementManagement()}
                </div>
                <div class="tab-pane fade" id="messaggi-tab">
                    ${getMessageManagement()}
                </div>
                <div class="tab-pane fade" id="commenti-tab">
                    ${getCommentModeration()}
                </div>
            </div>
        </div>
    `;
}

function getArticleManagement() {
    return `
        <div class="admin-section">
            <h4>Gestione Articoli PDF</h4>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> 
                <strong>Nota:</strong> I file PDF devono essere caricati manualmente nella cartella <code>magazine/[nome-articolo]/</code> del sito.
                Qui puoi solo gestire la pubblicazione e la visibilità degli articoli.
            </div>
            
            <button class="btn btn-primary mb-3" onclick="showAddArticleForm()">
                <i class="fas fa-plus"></i> Aggiungi Nuovo Articolo
            </button>
            
            <div id="addArticleForm" style="display: none;" class="card mb-4">
                <div class="card-body">
                    <h5>Nuovo Articolo</h5>
                    <form onsubmit="handleAddArticle(event)">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Titolo Articolo</label>
                                    <input type="text" class="form-control" id="articleTitle" required>
                                    <small class="text-muted">Deve corrispondere al nome della cartella in magazine/</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descrizione</label>
                                    <textarea class="form-control" id="articleDescription" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Numero di Pagine</label>
                                    <input type="number" class="form-control" id="articlePages" min="1" value="1" required>
                                    <small class="text-muted">Quante pagine ha questo articolo</small>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="publishNow">
                                        <label class="form-check-label" for="publishNow">Pubblica subito</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            <button type="button" class="btn btn-secondary me-2" onclick="hideAddArticleForm()">Annulla</button>
                            <button type="submit" class="btn btn-primary">Salva Articolo</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="articles-list">
                ${articles.map(article => `
                    <div class="admin-item">
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <img src="${article.coverImage}" class="admin-thumbnail" alt="${article.title}" onerror="this.src='https://via.placeholder.com/80x60?text=PDF'">
                            </div>
                            <div class="col-md-6">
                                <h6>${article.title}</h6>
                                <p class="text-muted">${article.description}</p>
                                <small class="text-muted">
                                    ${formatDate(article.createdAt)} • 
                                    ${article.pages?.length || 1} pagine • 
                                    <span class="badge ${article.published ? 'bg-success' : 'bg-warning'}">${article.published ? 'Pubblicato' : 'Bozza'}</span>
                                </small>
                            </div>
                            <div class="col-md-4 text-end">
                                ${article.published ? `
                                    <button class="btn btn-sm btn-warning me-2" onclick="handleUnpublishArticle('${article.id}')">
                                        <i class="fas fa-eye-slash"></i> Ritira
                                    </button>
                                ` : `
                                    <button class="btn btn-sm btn-success me-2" onclick="handlePublishArticle('${article.id}')">
                                        <i class="fas fa-paper-plane"></i> Pubblica
                                    </button>
                                `}
                                <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteArticle('${article.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getAnnouncementManagement() {
    return `
        <div class="admin-section">
            <h4>Gestione Annunci</h4>
            <button class="btn btn-primary mb-3" onclick="showAddAnnouncementForm()">
                <i class="fas fa-plus"></i> Nuovo Annuncio
            </button>
            
            <div id="addAnnouncementForm" style="display: none;" class="card mb-4">
                <div class="card-body">
                    <h5>Nuovo Annuncio</h5>
                    <form onsubmit="handleAddAnnouncement(event)">
                        <div class="mb-3">
                            <label class="form-label">Titolo</label>
                            <input type="text" class="form-control" id="announcementTitle" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contenuto</label>
                            <textarea class="form-control" id="announcementContent" rows="4" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Priorità</label>
                            <select class="form-control" id="announcementPriority">
                                <option value="normal">Normale</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                        <div class="text-end">
                            <button type="button" class="btn btn-secondary me-2" onclick="hideAddAnnouncementForm()">Annulla</button>
                            <button type="submit" class="btn btn-primary">Salva Annuncio</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="announcements-list">
                ${announcements.map(announcement => `
                    <div class="admin-item ${announcement.priority === 'high' ? 'priority-high' : ''}">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6>${announcement.title}</h6>
                                <p class="text-muted">${announcement.content.substring(0, 100)}...</p>
                                <small class="text-muted">
                                    ${formatDate(announcement.createdAt)} • 
                                    Priorità: ${announcement.priority === 'high' ? 'Alta' : 'Normale'}
                                </small>
                            </div>
                            <div class="col-md-4 text-end">
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement('${announcement.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getMessageManagement() {
    return `
        <div class="admin-section">
            <h4>Messaggi Ricevuti</h4>
            <p class="text-muted">I messaggi di contatto appariranno qui.</p>
        </div>
    `;
}

function getCommentModeration() {
    return `
        <div class="admin-section">
            <h4>Moderazione Commenti</h4>
            <div class="comment-moderation-list">
                <div id="allComments">
                    <p class="text-center">Caricamento commenti...</p>
                </div>
            </div>
        </div>
    `;
}

// PDF Reader with book-like navigation
async function continueReading(articleId) {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;
    
    // Increment views count
    await incrementViews('article', articleId);
    
    currentArticleReader = article;
    currentPageIndex = 0;
    
    const content = document.getElementById('content');
    content.innerHTML = getPdfReader(article);
}

function getPdfReader(article) {
    return `
        <div class="pdf-reader">
            <div class="reader-header">
                <button class="btn btn-outline-secondary" onclick="showPage('${currentPage}')">
                    <i class="fas fa-arrow-left"></i> Torna indietro
                </button>
                <h3 class="reader-title">${article.title}</h3>
                <button class="btn btn-outline-primary" onclick="showComments('article', '${article.id}')">
                    <i class="fas fa-comment"></i> Commenti (<span id="comments-count-reader-${article.id}">0</span>)
                </button>
            </div>
            
            <div class="reader-container">
                <button class="nav-btn nav-prev ${currentPageIndex === 0 ? 'disabled' : ''}" 
                        onclick="previousPage()" ${currentPageIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div class="page-display">
                    <img src="${article.pages?.[currentPageIndex] || article.coverImage}" 
                         alt="Pagina ${currentPageIndex + 1}" 
                         class="reader-page">
                    <div class="page-info">
                        <span class="page-counter">${currentPageIndex + 1} / ${article.pages?.length || 1}</span>
                    </div>
                </div>
                
                <button class="nav-btn nav-next ${currentPageIndex >= (article.pages?.length || 1) - 1 ? 'disabled' : ''}" 
                        onclick="nextPage()" ${currentPageIndex >= (article.pages?.length || 1) - 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="reader-controls">
                <div class="page-selector">
                    ${(article.pages || [article.coverImage]).map((page, index) => `
                        <button class="page-thumb ${index === currentPageIndex ? 'active' : ''}" 
                                onclick="goToPage(${index})">
                            <img src="${page}" alt="Pagina ${index + 1}">
                            <span>${index + 1}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function previousPage() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        updateReaderPage();
    }
}

function nextPage() {
    if (currentPageIndex < (currentArticleReader.pages?.length || 1) - 1) {
        currentPageIndex++;
        updateReaderPage();
    }
}

function goToPage(pageIndex) {
    currentPageIndex = pageIndex;
    updateReaderPage();
}

function updateReaderPage() {
    const pageDisplay = document.querySelector('.page-display img');
    const pageCounter = document.querySelector('.page-counter');
    const prevBtn = document.querySelector('.nav-prev');
    const nextBtn = document.querySelector('.nav-next');
    const thumbs = document.querySelectorAll('.page-thumb');
    
    if (pageDisplay) {
        pageDisplay.src = currentArticleReader.pages?.[currentPageIndex] || currentArticleReader.coverImage;
        pageCounter.textContent = `${currentPageIndex + 1} / ${currentArticleReader.pages?.length || 1}`;
        
        // Update navigation buttons
        prevBtn.classList.toggle('disabled', currentPageIndex === 0);
        prevBtn.disabled = currentPageIndex === 0;
        
        nextBtn.classList.toggle('disabled', currentPageIndex >= (currentArticleReader.pages?.length || 1) - 1);
        nextBtn.disabled = currentPageIndex >= (currentArticleReader.pages?.length || 1) - 1;
        
        // Update thumbnails
        thumbs.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentPageIndex);
        });
    }
}

// Authentication functions
async function handleAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        await loginAdmin(email, password);
        checkAdminAuth();
    } catch (error) {
        alert('Errore di accesso: ' + error.message);
    }
}

// Registration function removed - admin accounts managed in Firebase Console

function checkAdminAuth() {
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    
    // Always reset admin status when accessing admin page - force fresh login
    window.isAdmin = false;
    window.currentUser = null;
    
    console.log('checkAdminAuth - Forced logout for security, requiring fresh login');
    
    // Always show login form first
    loginSection.style.display = 'block';
    adminPanel.style.display = 'none';
}

function showLoginForm() {
    document.getElementById('loginSection').style.display = 'block';
}

async function handleLogout() {
    await logoutAdmin();
    checkAdminAuth();
}

// Article management functions
function showAddArticleForm() {
    document.getElementById('addArticleForm').style.display = 'block';
}

function hideAddArticleForm() {
    document.getElementById('addArticleForm').style.display = 'none';
}

async function handleAddArticle(event) {
    event.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const description = document.getElementById('articleDescription').value;
    const pageCount = parseInt(document.getElementById('articlePages').value);
    const publishNow = document.getElementById('publishNow').checked;
    
    try {
        // Create pages array based on folder structure
        const folderName = title;
        const pages = [];
        for (let i = 1; i <= pageCount; i++) {
            pages.push(`magazine/${folderName}/page${i}.jpg`);
        }
        
        const articleData = {
            title,
            folderName,
            description,
            coverImage: `magazine/${folderName}/page1.jpg`,
            pages: pages,
            published: publishNow
        };
        
        await saveArticle(articleData);
        alert('Articolo salvato con successo! Ricorda di caricare i file PDF nella cartella magazine/' + folderName + '/');
        
        // Reload data and refresh admin panel
        await loadAllData();
        showPage('admin');
        hideAddArticleForm();
        
    } catch (error) {
        alert('Errore durante il salvataggio: ' + error.message);
    }
}

async function handlePublishArticle(articleId) {
    try {
        await publishArticle(articleId);
        alert('Articolo pubblicato con successo!');
        await loadAllData();
        showPage('admin'); // Refresh admin panel
    } catch (error) {
        alert('Errore durante la pubblicazione: ' + error.message);
    }
}

async function handleUnpublishArticle(articleId) {
    if (confirm('Sei sicuro di voler ritirare questo articolo dalla pubblicazione?')) {
        try {
            await unpublishArticle(articleId);
            alert('Articolo ritirato dalla pubblicazione!');
            await loadAllData();
            showPage('admin'); // Refresh admin panel
        } catch (error) {
            alert('Errore durante il ritiro: ' + error.message);
        }
    }
}

async function handleDeleteArticle(articleId) {
    if (confirm('Sei sicuro di voler eliminare questo articolo? Questa azione non può essere annullata.')) {
        try {
            await deleteArticle(articleId);
            alert('Articolo eliminato con successo!');
            await loadAllData();
            showPage('admin'); // Refresh admin panel
        } catch (error) {
            alert('Errore durante l\'eliminazione: ' + error.message);
        }
    }
}

async function loadAllCommentsForModeration() {
    try {
        const commentsContainer = document.getElementById('allComments');
        if (!commentsContainer) {
            console.log('allComments container not found');
            return;
        }
        
        const commentsRef = ref(database, 'comments');
        const snapshot = await get(commentsRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const allComments = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.createdAt - a.createdAt);
            
            if (allComments.length === 0) {
                commentsContainer.innerHTML = '<p class="text-muted">Nessun commento da moderare.</p>';
            } else {
                commentsContainer.innerHTML = allComments.map(comment => `
                    <div class="comment-moderation-item mb-3">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1">${comment.author}</h6>
                                        <small class="text-muted">
                                            ${formatDate(comment.createdAt)} • 
                                            ${comment.itemType === 'article' ? 'Articolo' : 'Annuncio'}
                                        </small>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteComment('${comment.id}')">
                                        <i class="fas fa-trash"></i> Elimina
                                    </button>
                                </div>
                                <p class="mt-2 mb-0">${comment.content}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            commentsContainer.innerHTML = '<p class="text-muted">Nessun commento da moderare.</p>';
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        const container = document.getElementById('allComments');
        if (container) {
            container.innerHTML = '<p class="text-danger">Errore nel caricamento dei commenti.</p>';
        }
    }
}

async function handleDeleteComment(commentId) {
    if (confirm('Sei sicuro di voler eliminare questo commento?')) {
        try {
            await deleteComment(commentId);
            alert('Commento eliminato con successo!');
            loadAllCommentsForModeration(); // Reload comments
        } catch (error) {
            alert('Errore durante l\'eliminazione del commento: ' + error.message);
        }
    }
}

function showAddAnnouncementForm() {
    document.getElementById('addAnnouncementForm').style.display = 'block';
}

function hideAddAnnouncementForm() {
    document.getElementById('addAnnouncementForm').style.display = 'none';
}

async function handleAddAnnouncement(event) {
    event.preventDefault();
    
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    const priority = document.getElementById('announcementPriority').value;
    
    try {
        await saveAnnouncement({ title, content, priority });
        alert('Annuncio salvato con successo!');
        
        // Reload data and refresh admin panel
        await loadAllData();
        showPage('admin');
        
    } catch (error) {
        alert('Errore durante il salvataggio: ' + error.message);
    }
}

async function deleteAnnouncement(id) {
    if (confirm('Sei sicuro di voler eliminare questo annuncio?')) {
        try {
            await deleteAnnouncementFromDB(id);
            alert('Annuncio eliminato con successo!');
            await loadAllData();
            showPage('admin');
        } catch (error) {
            alert('Errore durante l\'eliminazione: ' + error.message);
        }
    }
}

// Comments system
function showComments(itemType, itemId) {
    // Create modal for comments
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Commenti</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="commentsList">
                        <p class="text-center">Caricamento commenti...</p>
                    </div>
                    <div class="comment-form mt-4">
                        <h6>Aggiungi un commento</h6>
                        <form onsubmit="handleAddComment(event, '${itemType}', '${itemId}')">
                            <div class="mb-3">
                                <input type="text" class="form-control" placeholder="Il tuo nome" id="commentAuthor" required>
                            </div>
                            <div class="mb-3">
                                <textarea class="form-control" placeholder="Scrivi il tuo commento..." id="commentContent" rows="3" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Pubblica Commento</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Load comments
    loadCommentsForModal(itemType, itemId);
    
    // Remove modal when closed
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

async function loadCommentsForModal(itemType, itemId) {
    try {
        const itemComments = await loadComments(itemType, itemId);
        const commentsList = document.getElementById('commentsList');
        
        if (itemComments.length === 0) {
            commentsList.innerHTML = '<p class="text-muted">Nessun commento ancora. Sii il primo a commentare!</p>';
        } else {
            commentsList.innerHTML = itemComments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <strong>${comment.author}</strong>
                        <small class="text-muted">${formatDate(comment.createdAt)}</small>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        document.getElementById('commentsList').innerHTML = '<p class="text-danger">Errore nel caricamento dei commenti.</p>';
    }
}

async function handleAddComment(event, itemType, itemId) {
    event.preventDefault();
    
    const author = document.getElementById('commentAuthor').value;
    const content = document.getElementById('commentContent').value;
    
    try {
        await saveComment(itemType, itemId, { author, content });
        
        // Reload comments
        loadCommentsForModal(itemType, itemId);
        
        // Clear form
        document.getElementById('commentAuthor').value = '';
        document.getElementById('commentContent').value = '';
        
    } catch (error) {
        alert('Errore durante il salvataggio del commento: ' + error.message);
    }
}

async function getCommentsCount(itemType, itemId) {
    try {
        const comments = await loadComments(itemType, itemId);
        return comments.length;
    } catch (error) {
        console.error('Error getting comments count:', error);
        return 0;
    }
}

// Utility functions
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function filterArticles(filter) {
    // Update filter buttons
    document.querySelectorAll('.article-filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // This would filter articles based on the filter parameter
    console.log('Filtering articles by:', filter);
}

// Global variables for window functions
window.showPage = showPage;
window.continueReading = continueReading;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.goToPage = goToPage;
window.handleAdminLogin = handleAdminLogin;
window.showLoginForm = showLoginForm;
window.handleLogout = handleLogout;
window.checkAdminAuth = checkAdminAuth;
window.showAddArticleForm = showAddArticleForm;
window.hideAddArticleForm = hideAddArticleForm;
window.handleAddArticle = handleAddArticle;
window.handlePublishArticle = handlePublishArticle;
window.handleUnpublishArticle = handleUnpublishArticle;
window.handleDeleteArticle = handleDeleteArticle;
window.showAddAnnouncementForm = showAddAnnouncementForm;
window.hideAddAnnouncementForm = hideAddAnnouncementForm;
window.handleAddAnnouncement = handleAddAnnouncement;
window.showComments = showComments;
window.handleAddComment = handleAddComment;
window.handleDeleteComment = handleDeleteComment;
window.loadAllCommentsForModeration = loadAllCommentsForModeration;
window.filterArticles = filterArticles;
window.loadAllCounts = loadAllCounts;
window.deleteAnnouncement = deleteAnnouncement;