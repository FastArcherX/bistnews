// The Student Voice Application - Local Database System
let currentPage = 'home';
let articles = [];
let weeklyNews = [];
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
        console.log('Loading data from local database...');
        articles = await loadArticles() || [];
        weeklyNews = await loadWeeklyNews() || [];
        
        console.log('Loaded articles:', articles.length, 'weeklyNews:', weeklyNews.length);
        
        // No demo data - use only real content
        console.log('Using local database data only');
        
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
    
    for (const announcement of weeklyNews) {
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

// No demo data function needed

// Page Navigation
async function showPage(page) {
    window.currentPage = page;
    const content = document.getElementById('content');
    
    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[onclick="showPage('${page}')"]`)?.classList.add('active');
    
    switch(page) {
        case 'home':
            content.innerHTML = await getHomePage();
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
            content.innerHTML = await getHomePage();
    }
}

// Get the most viewed article for trending section
async function getMostViewedArticle() {
    if (articles.length === 0) return null;
    
    let mostViewedArticle = articles.find(a => a.published) || articles[0];
    let maxViews = 0;
    
    // Check views for all published articles
    for (const article of articles.filter(a => a.published)) {
        try {
            const views = await getViews('article', article.id);
            if (views > maxViews) {
                maxViews = views;
                mostViewedArticle = article;
            }
        } catch (error) {
            console.error('Error getting views for article:', article.id, error);
        }
    }
    
    return mostViewedArticle;
}

// Homepage with open article preview
async function getHomePage() {
    const trendingArticle = await getMostViewedArticle();
    const trendingCardHtml = trendingArticle ? await getTrendingCard(trendingArticle) : '';
    
    return `
        <div class="trending-section">
            <div class="container">
                <div class="trending-header">
                    <i class="fas fa-fire trending-icon"></i>
                    <div>
                        <h2 class="trending-title">Trending Now</h2>
                        <p class="trending-subtitle">Most read article this week</p>
                    </div>
                </div>
                
                ${trendingCardHtml}
                
                <div class="category-filters">
                    <div class="category-filter all-articles" onclick="filterByTag('all')" style="background: #771510; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;">All Articles</div>
                    <div class="category-filter" onclick="filterByTag('school-news')" style="background: #e74c3c; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-graduation-cap"></i> School News</div>
                    <div class="category-filter" onclick="filterByTag('features')" style="background: #f39c12; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-star"></i> Features</div>
                    <div class="category-filter" onclick="filterByTag('opinion')" style="background: #9b59b6; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-comment"></i> Opinion</div>
                    <div class="category-filter" onclick="filterByTag('sports')" style="background: #3498db; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-running"></i> Sports</div>
                    <div class="category-filter" onclick="filterByTag('creative')" style="background: #e91e63; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-palette"></i> Creative</div>
                    <div class="category-filter" onclick="filterByTag('humor')" style="background: #ff9800; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-laugh"></i> Humor</div>
                    <div class="category-filter" onclick="filterByTag('tech')" style="background: #2196f3; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-laptop"></i> Tech</div>
                    <div class="category-filter" onclick="filterByTag('lifestyle')" style="background: #4caf50; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-leaf"></i> Lifestyle</div>
                    <div class="category-filter" onclick="filterByTag('music')" style="background: #9c27b0; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-music"></i> Music</div>
                    <div class="category-filter" onclick="filterByTag('reviews')" style="background: #607d8b; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 4px; display: inline-block;"><i class="fas fa-star-half-alt"></i> Reviews</div>
                </div>
            </div>
        </div>

        <div class="container mt-5">
            <div class="row">
                <div class="col-md-8">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="section-title">Latest Articles</h3>
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="sortDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                Newest First
                            </button>
                            <ul class="dropdown-menu" aria-labelledby="sortDropdown">
                                <li><a class="dropdown-item" href="#" onclick="sortArticles('newest')">Newest First</a></li>
                                <li><a class="dropdown-item" href="#" onclick="sortArticles('oldest')">Oldest First</a></li>
                                <li><a class="dropdown-item" href="#" onclick="sortArticles('popular')">Most Popular</a></li>
                                <li><a class="dropdown-item" href="#" onclick="sortArticles('title')">Alphabetical</a></li>
                            </ul>
                        </div>
                    </div>
                    ${getArticlesGrid()}
                </div>
                <div class="col-md-4">
                    <h4 class="section-title">Weekly News</h4>
                    ${getWeeklyNewsList()}
                </div>
            </div>
        </div>
        
        <!-- About The Student Voice Section -->
        <div class="about-section py-5 mt-5" style="background-color: #f0e5cb;">
            <div class="container">
                <div class="text-center mb-5">
                    <h2 class="about-title" style="color: #771510; font-weight: bold; font-size: 2.5rem;">About The Student Voice</h2>
                    <p class="about-subtitle" style="color: #666; font-size: 1.1rem; max-width: 600px; margin: 0 auto;">
                        The official digital newspaper of British International School of Timisoara, 
                        bringing you the latest news, insights, and stories from our vibrant community.
                    </p>
                </div>
                
                <div class="row text-center">
                    <div class="col-md-4 mb-4">
                        <div class="about-feature">
                            <div class="feature-icon mb-3">
                                <i class="fas fa-pencil-alt" style="font-size: 3rem; color: #771510;"></i>
                            </div>
                            <h4 style="color: #771510; font-weight: 600;">Student Journalists</h4>
                            <p style="color: #666;">
                                Our dedicated team of student writers brings diverse perspectives 
                                and authentic voices to every story we tell.
                            </p>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="about-feature">
                            <div class="feature-icon mb-3">
                                <i class="fas fa-bullseye" style="font-size: 3rem; color: #771510;"></i>
                            </div>
                            <h4 style="color: #771510; font-weight: 600;">Quality Content</h4>
                            <p style="color: #666;">
                                From breaking school news to in-depth features, we deliver 
                                well-researched and engaging content for our community.
                            </p>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="about-feature">
                            <div class="feature-icon mb-3">
                                <i class="fas fa-comments" style="font-size: 3rem; color: #771510;"></i>
                            </div>
                            <h4 style="color: #771510; font-weight: 600;">BIST Community</h4>
                            <p style="color: #666;">
                                Connecting students, teachers, and families through shared 
                                stories and experiences that matter to our school community.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getTrendingCard(article) {
    return `
        <div class="trending-card">
            <span class="trending-badge">TRENDING</span>
            <div class="category-badge">SCHOOL NEWS & EVENTS</div>
            <h3 class="trending-card-title">${article.title}</h3>
            <p class="trending-card-text">${getArticleExcerpt(article.content, 120)}</p>
            <div class="trending-meta">
                <div>
                    <small style="color: #ccc;">By Alex Kim • ${formatDate(article.createdAt)}</small>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <span class="trending-views"><i class="fas fa-eye"></i> <span id="views-count-${article.id}">0</span> views</span>
                    <button class="btn btn-light" onclick="openArticle('${article.id}')">
                        Read Full Article
                    </button>
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
                        <span class="preview-badge">Latest Magazine</span>
                        <h2 class="preview-title">${article.title}</h2>
                        <p class="preview-description">${article.description}</p>
                        <button class="btn btn-primary" onclick="openArticle('${article.id}')">
                            <i class="fas fa-book-open"></i> Continue Reading
                        </button>
                    </div>
                </div>
                <div class="col-md-7">
                    <div class="preview-reader">
                        <div class="page-container-large">
                            <img src="${article.pages?.[0] || article.coverImage}" 
                                 alt="Prima pagina" 
                                 class="preview-page-large"
                                 onclick="openArticle('${article.id}')">
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
        return '<p class="text-muted">No articles available at the moment.</p>';
    }
    
    const publishedArticles = articles.filter(a => a.published);
    
    return `
        <div class="row">
            ${publishedArticles.map(article => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="article-card h-100" onclick="openArticle('${article.id}')" style="cursor: pointer;">
                        <div class="article-card-content" style="background: linear-gradient(135deg, #771510 0%, #cc4125 100%); border-radius: 12px; padding: 20px; color: white; height: 280px; position: relative;">
                            <!-- Tag Badge -->
                            <div class="article-tag-badge" style="position: absolute; top: 15px; left: 15px;">
                                ${getTagBadge(article.tags?.[0] || 'general')}
                            </div>
                            
                            <!-- Article Icon -->
                            <div class="article-icon" style="text-align: center; margin: 40px 0 20px;">
                                ${getArticleIcon(article.tags?.[0] || 'general')}
                            </div>
                            
                            <!-- Content -->
                            <div style="position: absolute; bottom: 20px; left: 20px; right: 20px;">
                                <h5 style="color: white; font-weight: 600; margin-bottom: 8px; font-size: 1.1rem;">${article.title}</h5>
                                <p style="color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-bottom: 12px; line-height: 1.4;">${getArticleExcerpt(article.content, 80)}</p>
                                
                                <div class="article-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: rgba(255,255,255,0.8);">
                                    <div>
                                        <div>By ${article.author}</div>
                                        <div>${formatDate(article.createdAt)}</div>
                                    </div>
                                    <div class="article-stats">
                                        <i class="fas fa-eye"></i> ${article.views || 0}
                                        <i class="fas fa-comment ms-2"></i> ${article.comments || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getTagBadge(tag) {
    const tagColors = {
        'school-news': '#e74c3c',
        'features': '#f39c12', 
        'opinion': '#9b59b6',
        'sports': '#3498db',
        'creative': '#e91e63',
        'humor': '#ff9800',
        'tech': '#2196f3',
        'lifestyle': '#4caf50',
        'music': '#9c27b0',
        'reviews': '#607d8b',
        'general': '#95a5a6'
    };
    
    const color = tagColors[tag] || tagColors.general;
    const displayName = tag.replace('-', ' ').toUpperCase();
    
    return `<span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">${displayName}</span>`;
}

function getArticleIcon(tag) {
    const icons = {
        'school-news': '<i class="fas fa-graduation-cap" style="font-size: 2.5rem; color: white;"></i>',
        'features': '<i class="fas fa-star" style="font-size: 2.5rem; color: white;"></i>',
        'opinion': '<i class="fas fa-comment" style="font-size: 2.5rem; color: white;"></i>',
        'sports': '<i class="fas fa-running" style="font-size: 2.5rem; color: white;"></i>',
        'creative': '<i class="fas fa-palette" style="font-size: 2.5rem; color: white;"></i>',
        'humor': '<i class="fas fa-laugh" style="font-size: 2.5rem; color: white;"></i>',
        'tech': '<i class="fas fa-laptop" style="font-size: 2.5rem; color: white;"></i>',
        'lifestyle': '<i class="fas fa-leaf" style="font-size: 2.5rem; color: white;"></i>',
        'music': '<i class="fas fa-music" style="font-size: 2.5rem; color: white;"></i>',
        'reviews': '<i class="fas fa-star-half-alt" style="font-size: 2.5rem; color: white;"></i>',
        'general': '<i class="fas fa-newspaper" style="font-size: 2.5rem; color: white;"></i>'
    };
    
    return icons[tag] || icons.general;
}

function getArticleExcerpt(content, maxLength = 100) {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
}

function sortArticles(sortType) {
    // Update dropdown text
    const sortNames = {
        'newest': 'Newest First',
        'oldest': 'Oldest First', 
        'popular': 'Most Popular',
        'title': 'Alphabetical'
    };
    
    document.getElementById('sortDropdown').textContent = sortNames[sortType];
    
    // Sort articles
    let sortedArticles = [...articles];
    
    switch(sortType) {
        case 'newest':
            sortedArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            sortedArticles.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'popular':
            sortedArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'title':
            sortedArticles.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    articles = sortedArticles;
    
    // Refresh the articles grid
    const articlesContainer = document.querySelector('.col-md-8');
    if (articlesContainer) {
        const gridHtml = getArticlesGrid();
        const gridContainer = articlesContainer.querySelector('.row') || articlesContainer;
        gridContainer.innerHTML = gridHtml;
    }
}

function getWeeklyNewsList() {
    if (!weeklyNews.length) {
        return '<p class="text-muted">Nessun annuncio al momento.</p>';
    }
    
    return weeklyNews.map(announcement => `
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
                        <div class="article-card-full" onclick="openArticle('${article.id}')">
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
                            <h3 class="text-center mb-4">Admin Access</h3>
                            <form onsubmit="handleAdminLogin(event)">
                                <div class="mb-3">
                                    <label for="adminPassword" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="adminPassword" placeholder="Enter admin password" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Login</button>
                            </form>
                            <div class="text-center mt-3">
                                <small class="text-muted">Access restricted to administrators</small>
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
            <h2 class="page-title">Admin Panel</h2>
            <div>
                <span class="me-3">Welcome, ${window.ADMIN_CONFIG?.adminName || 'Admin'}</span>
                <button class="btn btn-outline-danger" onclick="handleLogout()">Logout</button>
            </div>
        </div>
        
        <div class="admin-tabs">
            <ul class="nav nav-tabs" id="adminTabs">
                <li class="nav-item">
                    <a class="nav-link active" href="#submit-article-tab" data-bs-toggle="tab">Submit New Article</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#articoli-tab" data-bs-toggle="tab">Manage Articles</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#weekly-news-tab" data-bs-toggle="tab">Manage Weekly News</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#messaggi-tab" data-bs-toggle="tab">Messages</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#commenti-tab" data-bs-toggle="tab">Comment Moderation</a>
                </li>
            </ul>
            
            <div class="tab-content mt-4">
                <div class="tab-pane fade show active" id="submit-article-tab">
                    ${getSubmitArticleForm()}
                </div>
                <div class="tab-pane fade" id="articoli-tab">
                    ${getArticleManagement()}
                </div>
                <div class="tab-pane fade" id="weekly-news-tab">
                    ${getWeeklyNewsManagement()}
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

function getSubmitArticleForm() {
    return `
        <div class="admin-section">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="card shadow-sm">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h4 class="mb-0">Submit New Article</h4>
                            <button type="button" class="btn-close" onclick="closeSubmitForm()" aria-label="Close"></button>
                        </div>
                        <div class="card-body p-4">
                            <form onsubmit="handleSubmitNewArticle(event)" id="submitArticleForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="newArticleTitle" class="form-label">Article Title <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="newArticleTitle" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="articleTags" class="form-label">Tags <span class="text-danger">*</span></label>
                                            <select class="form-control" id="articleTags" required>
                                                <option value="">Select a tag...</option>
                                                <option value="school-news">School News</option>
                                                <option value="features">Features</option>
                                                <option value="opinion">Opinion</option>
                                                <option value="sports">Sports</option>
                                                <option value="creative">Creative</option>
                                                <option value="humor">Humor</option>
                                                <option value="tech">Tech</option>
                                                <option value="lifestyle">Lifestyle</option>
                                                <option value="music">Music</option>
                                                <option value="reviews">Reviews</option>
                                            </select>
                                            <small class="text-muted">Select the primary tag for this article</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="articleContent" class="form-label">Article Content <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="articleContent" rows="12" placeholder="Write your article here..." required></textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="authorName" class="form-label">Author Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="authorName" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-4">
                                    <label for="articlePhotos" class="form-label">Upload Photos (Optional)</label>
                                    <input type="file" class="form-control" id="articlePhotos" multiple accept="image/*">
                                    <small class="text-muted">You can upload multiple photos for your article</small>
                                </div>
                                
                                <div class="d-flex justify-content-end gap-2">
                                    <button type="button" class="btn btn-outline-secondary" onclick="clearSubmitForm()">
                                        Clear Form
                                    </button>
                                    <button type="submit" class="btn btn-danger">
                                        <i class="fas fa-paper-plane"></i> Post Article Directly
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
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

function getWeeklyNewsManagement() {
    return `
        <div class="admin-section">
            <h4>Gestione Annunci</h4>
            <button class="btn btn-primary mb-3" onclick="showAddWeeklyNewsForm()">
                <i class="fas fa-plus"></i> Nuovo Annuncio
            </button>
            
            <div id="addAnnouncementForm" style="display: none;" class="card mb-4">
                <div class="card-body">
                    <h5>Nuovo Annuncio</h5>
                    <form onsubmit="handleAddWeeklyNews(event)">
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
                            <button type="button" class="btn btn-secondary me-2" onclick="hideAddWeeklyNewsForm()">Annulla</button>
                            <button type="submit" class="btn btn-primary">Salva Annuncio</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="weeklyNews-list">
                ${weeklyNews.map(announcement => `
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
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteWeeklyNews('${announcement.id}')">
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
    const password = document.getElementById('adminPassword').value;
    
    try {
        await loginAdmin(password);
        checkAdminAuth();
    } catch (error) {
        alert('Password incorrect. Please try again.');
    }
}

// Registration function removed - admin accounts managed in Firebase Console

function checkAdminAuth() {
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    
    // Initialize global variables if not set
    if (typeof window.isAdmin === 'undefined') {
        window.isAdmin = false;
    }
    if (typeof window.currentUser === 'undefined') {
        window.currentUser = null;
    }
    
    console.log('checkAdminAuth - isAdmin:', window.isAdmin, 'currentUser:', window.currentUser?.email || 'none');
    
    if (window.isAdmin && window.currentUser) {
        loginSection.style.display = 'none';
        adminPanel.style.display = 'block';
        adminPanel.innerHTML = getAdminPanel();
        
        // Load comments for moderation if on that tab
        setTimeout(() => {
            const commentsTab = document.getElementById('commenti-tab');
            if (commentsTab) {
                loadAllCommentsForModeration();
            }
        }, 500);
    } else {
        loginSection.style.display = 'block';
        adminPanel.style.display = 'none';
    }
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

function showAddWeeklyNewsForm() {
    document.getElementById('addAnnouncementForm').style.display = 'block';
}

function hideAddWeeklyNewsForm() {
    document.getElementById('addAnnouncementForm').style.display = 'none';
}

async function handleAddWeeklyNews(event) {
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

async function deleteWeeklyNews(id) {
    if (confirm('Sei sicuro di voler eliminare questo annuncio?')) {
        try {
            await deleteWeeklyNewsFromDB(id);
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
window.showAddWeeklyNewsForm = showAddWeeklyNewsForm;
window.hideAddWeeklyNewsForm = hideAddWeeklyNewsForm;
window.handleAddWeeklyNews = handleAddWeeklyNews;
window.showComments = showComments;
window.handleAddComment = handleAddComment;
window.handleDeleteComment = handleDeleteComment;
window.loadAllCommentsForModeration = loadAllCommentsForModeration;
window.filterArticles = filterArticles;
window.loadAllCounts = loadAllCounts;
window.openArticle = openArticle;
window.sortArticles = sortArticles;
window.filterByTag = filterByTag;
window.deleteWeeklyNews = deleteWeeklyNews;

// Open article in modal
async function openArticle(articleId) {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;
    
    // Increment view count
    await incrementViews('article', articleId);
    article.views = (article.views || 0) + 1;
    
    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="articleModal" tabindex="-1" aria-labelledby="articleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header border-0">
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body px-4">
                        <div class="mb-3">
                            ${getTagBadge(article.tags?.[0] || 'general')}
                        </div>
                        
                        <h2 class="article-modal-title mb-3" style="color: #771510; font-weight: 700; line-height: 1.3;">${article.title}</h2>
                        
                        <div class="article-meta mb-4" style="color: #666; font-size: 0.9rem;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span>By ${article.author}</span> • 
                                    <span>Published ${formatDate(article.createdAt)}</span>
                                </div>
                                <div>
                                    <i class="fas fa-eye"></i> ${article.views || 0} views
                                    <i class="fas fa-comment ms-3"></i> ${article.comments || 0} comments
                                </div>
                            </div>
                        </div>
                        
                        ${article.photos && article.photos.length > 0 ? getArticleImagesGallery(article.photos) : ''}
                        
                        <div class="article-content" style="line-height: 1.8; font-size: 1.1rem; color: #333;">
                            ${formatArticleContent(article.content)}
                        </div>
                        
                        <hr class="my-5">
                        
                        <div class="comments-section">
                            <h5 class="mb-4">Comments (${article.comments || 0})</h5>
                            
                            <div class="add-comment-form bg-light p-4 rounded mb-4">
                                <h6>Add a Comment</h6>
                                <form onsubmit="handleAddArticleComment(event, '${articleId}')">
                                    <div class="mb-3">
                                        <input type="text" class="form-control" id="commentAuthor" placeholder="Your name" required>
                                    </div>
                                    <div class="mb-3">
                                        <textarea class="form-control" id="commentContent" rows="4" placeholder="Write your comment..." required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-danger">Submit Comment</button>
                                </form>
                                <small class="text-muted mt-2">Comments are reviewed by editors before being published.</small>
                            </div>
                            
                            <div id="article-comments-${articleId}">
                                ${getArticleComments(articleId)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('articleModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('articleModal'));
    modal.show();
}

function getArticleImagesGallery(photos) {
    if (!photos || photos.length === 0) return '';
    
    return `
        <div class="article-images-gallery mb-4">
            <div class="row">
                ${photos.map((photo, index) => `
                    <div class="col-md-6 mb-3">
                        <div class="image-container" style="position: relative; cursor: pointer;" onclick="openImageModal('${photo.id}')">
                            <img src="${getImageDataUrl(photo.id)}" alt="${photo.name}" class="img-fluid rounded" style="width: 100%; height: 200px; object-fit: cover;">
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getImageDataUrl(imageId) {
    const imageData = getImageFromStorage(imageId);
    return imageData ? imageData.data : '/placeholder-image.jpg';
}

function formatArticleContent(content) {
    // Simple paragraph formatting
    return content.split('\n').map(paragraph => 
        paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
    ).join('');
}

function getArticleComments(articleId) {
    // For now return placeholder - will be implemented with comment system
    return '<p class="text-muted">No comments yet. Be the first to comment!</p>';
}

function handleAddArticleComment(event, articleId) {
    event.preventDefault();
    alert('Comment submitted for review. Thank you!');
    // Reset form
    event.target.reset();
}

// Filter articles by tag
function filterByTag(tag) {
    // Update active filter styling
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.style.opacity = '0.7';
    });
    
    if (tag === 'all') {
        document.querySelector('.category-filter.all-articles').style.opacity = '1';
        // Show all articles
        showPage('home');
    } else {
        document.querySelector(`[onclick="filterByTag('${tag}')"]`).style.opacity = '1';
        
        // Filter and redisplay articles
        const filteredArticles = articles.filter(article => 
            article.published && article.tags && article.tags.includes(tag)
        );
        
        // Update the articles grid with filtered results
        const articlesContainer = document.querySelector('.col-md-8 .row');
        if (articlesContainer) {
            const gridHtml = getFilteredArticlesGrid(filteredArticles);
            articlesContainer.innerHTML = gridHtml;
        }
    }
}

function getFilteredArticlesGrid(filteredArticles) {
    if (!filteredArticles.length) {
        return '<div class="col-12"><p class="text-muted text-center">No articles found for this tag.</p></div>';
    }
    
    return filteredArticles.map(article => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="article-card h-100" onclick="openArticle('${article.id}')" style="cursor: pointer;">
                <div class="article-card-content" style="background: linear-gradient(135deg, #771510 0%, #cc4125 100%); border-radius: 12px; padding: 20px; color: white; height: 280px; position: relative;">
                    <!-- Tag Badge -->
                    <div class="article-tag-badge" style="position: absolute; top: 15px; left: 15px;">
                        ${getTagBadge(article.tags?.[0] || 'general')}
                    </div>
                    
                    <!-- Article Icon -->
                    <div class="article-icon" style="text-align: center; margin: 40px 0 20px;">
                        ${getArticleIcon(article.tags?.[0] || 'general')}
                    </div>
                    
                    <!-- Content -->
                    <div style="position: absolute; bottom: 20px; left: 20px; right: 20px;">
                        <h5 style="color: white; font-weight: 600; margin-bottom: 8px; font-size: 1.1rem;">${article.title}</h5>
                        <p style="color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-bottom: 12px; line-height: 1.4;">${getArticleExcerpt(article.content, 80)}</p>
                        
                        <div class="article-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: rgba(255,255,255,0.8);">
                            <div>
                                <div>By ${article.author}</div>
                                <div>${formatDate(article.createdAt)}</div>
                            </div>
                            <div class="article-stats">
                                <i class="fas fa-eye"></i> ${article.views || 0}
                                <i class="fas fa-comment ms-2"></i> ${article.comments || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}