// The Student Voice Application - Local Database System
let currentPage = 'home';
let articles = [];
let weeklyNews = [];
let comments = {};
let isAdmin = false;
let currentUser = null;
let currentArticleReader = null;
let currentPageIndex = 0;
let quillEditor;
let bannedWords = null; // cached list from words.json
let bannedWordsLoaded = false;

// ==================== GOOGLE AUTH FRONTEND ====================
let authSession = { token: null, user: null };
function loadSession(){ try { const raw = localStorage.getItem('authSession'); if(raw){ const d=JSON.parse(raw); if(d&&d.token) authSession=d; } } catch{} }
function saveSession(){ try { localStorage.setItem('authSession', JSON.stringify(authSession)); } catch{} }
function clearSession(){ authSession={token:null,user:null}; saveSession(); updateAuthUI(); }
function isLoggedIn(){ return !!authSession.token; }
function getSessionToken(){ return authSession.token; }
window.getSessionToken = getSessionToken;
function updateAuthUI(){ const navAuth=document.getElementById('nav-auth'); if(!navAuth) return; if(isLoggedIn()){ const name=authSession.user.name || authSession.user.email.split('@')[0]; const initials=name.split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase(); navAuth.innerHTML=`<div class="dropdown"><a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="userMenu" data-bs-toggle="dropdown" aria-expanded="false"><span class="rounded-circle bg-secondary text-white d-inline-flex justify-content-center align-items-center me-2" style="width:32px;height:32px;font-size:.8rem;">${initials}</span><span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span></a><ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu"><li><h6 class="dropdown-header">Signed in</h6></li><li><button class="dropdown-item" onclick="logoutUser()"><i class="fas fa-sign-out-alt me-2"></i>Logout</button></li></ul></div>`; } else { navAuth.innerHTML = `<a class="nav-link" href="#" onclick="showPage('login')"><i class="fas fa-sign-in-alt me-1"></i>Login</a>`; } try { refreshVisibleCommentForms(); } catch{} }
function logoutUser(){ clearSession(); }
window.logoutUser = logoutUser;
function onGoogleCredential(resp){ if(!resp||!resp.credential){ alert('Google login failed.'); return; } fetch('http://localhost:3001/api/auth/google',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ idToken: resp.credential }) }).then(r=>r.json().then(j=>({ok:r.ok,data:j}))).then(({ok,data})=>{ if(!ok){ alert(data.error||'Auth failed'); return; } authSession={ token:data.sessionToken, user:data.user }; saveSession(); updateAuthUI(); showPage('home'); }).catch(e=>{ console.error(e); alert('Login error'); }); }
window.onGoogleCredential = onGoogleCredential;
function initAuth(){ loadSession(); updateAuthUI(); if(window.google && window.google.accounts && window.GOOGLE_CLIENT_ID){ try { google.accounts.id.initialize({ client_id: window.GOOGLE_CLIENT_ID, callback:onGoogleCredential }); const btn=document.getElementById('googleBtnContainer'); if(btn){ google.accounts.id.renderButton(btn,{ theme:'outline', size:'large', width:320 }); } } catch(e){ console.warn('Google init failed', e); } } }
document.addEventListener('DOMContentLoaded', ()=> setTimeout(initAuth,0));
function refreshVisibleCommentForms(){ document.querySelectorAll('.comment-form[data-gated="1"]').forEach(cf=>{ if(isLoggedIn()){ cf.querySelectorAll('[data-if-logged-in]').forEach(e=>e.classList.remove('d-none')); cf.querySelectorAll('[data-if-logged-out]').forEach(e=>e.classList.add('d-none')); } else { cf.querySelectorAll('[data-if-logged-in]').forEach(e=>e.classList.add('d-none')); cf.querySelectorAll('[data-if-logged-out]').forEach(e=>e.classList.remove('d-none')); } }); }

async function loadBannedWords() {
    if (bannedWordsLoaded && Array.isArray(bannedWords)) return bannedWords;
    const candidatePaths = [
        'words.json',            // same directory as index-loaded script (dist root when served)
        './words.json',          // explicit relative
        '/words.json',           // root (if server serves dist as root)
        'dist/words.json',       // if app served from project root
        './dist/words.json'
    ];
    let lastError = null;
    for (const p of candidatePaths) {
        try {
            const res = await fetch(p, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + p);
            const data = await res.json();
            if (data && Array.isArray(data.banned_words)) {
                bannedWords = data.banned_words.map(w => (w || '').toString().trim().toLowerCase()).filter(Boolean);
            } else {
                bannedWords = [];
            }
            console.info('[bannedWords] loaded from', p, 'count:', bannedWords.length);
            bannedWordsLoaded = true;
            return bannedWords;
        } catch (err) {
            lastError = err;
        }
    }
    console.warn('[bannedWords] all path attempts failed. Last error:', lastError);
    bannedWords = [];
    bannedWordsLoaded = true;
    return bannedWords;
}

function containsBannedWord(text) {
    if (!text) return false;
    if (!Array.isArray(bannedWords)) return false; // not loaded yet
    const lower = text.toLowerCase();
    // Use word boundary-ish check but also allow multi-word phrases (e.g., "kill yourself")
    return bannedWords.some(w => {
        if (!w) return false;
        if (w.includes(' ')) {
            return lower.includes(w); // phrase match
        }
        // single token: use regex with boundaries; escape regex chars
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('(?<![a-z0-9_])' + escaped + '(?![a-z0-9_])', 'i');
        return re.test(text);
    });
}

// Helper reintroduced (was missing and caused ReferenceError)
function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(Number(timestamp));
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ''; }
}

// Format rich-text article content (Quill HTML + placeholders like [photo-1])
function formatArticleContent(article) {
    if (!article) return '';
    let content = article.content || '';
    if (article.photos && Array.isArray(article.photos) && article.photos.length) {
        // Generate photo placeholders only (front/behind layering deprecated)
        content = content.replace(/\[photo-(\d+)\]/g, (m, n) => {
            const idx = parseInt(n, 10) - 1;
            const ph = article.photos[idx];
            if (!ph) return m;
            const src = typeof ph === 'string' ? ph : (ph.url || ph.absoluteUrl || ph.path || '');
            return `<div class="text-center my-3"><img src="${toAbsoluteUploadsUrl(src)}" class="img-fluid rounded" style="max-width:100%;height:auto;" alt="photo ${idx+1}"></div>`;
        });
    }
    // Normalize any inline <img> tags (pasted via Quill) whose src is relative /uploads/*
    try {
        content = content.replace(/<img([^>]+)src=("|')([^"'>]+)(\2)([^>]*)>/gi, (match, pre, q, src, _q2, post) => {
            if (src.startsWith('/uploads/')) {
                return `<img${pre}src="${toAbsoluteUploadsUrl(src)}"${post}>`;
            }
            return match;
        });
    } catch {}
    return content;
}

// Page Navigation
async function showPage(page) {
    window.currentPage = page;
    const content = document.getElementById('content');

    // Update page icon
    const pageIcon = document.getElementById('page-icon');
    if (pageIcon) {
        const iconMap = {
            'home': 'fas fa-home',
            'weekly-news': 'fas fa-newspaper',
            'giornalini': 'fas fa-images',
            'contatti': 'fas fa-users', // internal key kept for routing (legacy Italian)
            'admin': 'fas fa-user-shield'
        };
        pageIcon.className = iconMap[page] || iconMap['home'];
        // Ensure base classes are always present
        pageIcon.classList.add('fas');
        pageIcon.style.fontSize = '2rem';
        pageIcon.style.marginRight = '15px';
        pageIcon.style.color = 'var(--secondary-color)';
    }

    // Update navigation active state (if using inline onclick on nav links)
    try {
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const active = document.querySelector(`[onclick="showPage('${page}')"]`);
        if (active) active.classList.add('active');
    } catch (e) {
        // non-blocking
    }

    switch (page) {
        case 'home':
            content.innerHTML = await getHomePage();
            // Initialize trending carousel rotation (does not alter base styles)
            setTimeout(()=>{ if (typeof initTrendingCarousel === 'function') initTrendingCarousel(); }, 0);
            break;
    case 'articles':
        content.innerHTML = await getArticlesPage();
        // Ensure counts load and then refresh hero stats after they populate
        try { await loadAllCounts(); } catch(e){ console.warn('Counts load failed (articles):', e); }
        setTimeout(()=>{ try { updateArticlesHeroStats(); } catch(e){} }, 50);
        break;
    case 'login':
        content.innerHTML = getLoginPage();
        setTimeout(()=>{ initAuth(); }, 20);
        break;
        case 'weekly-news':
            content.innerHTML = await getArticlesPage();
            try { await loadAllCounts(); } catch(e){ console.warn('Counts load failed (weekly-news):', e); }
            setTimeout(()=>{ try { updateArticlesHeroStats(); } catch(e){} }, 50);
            break;

// Update hero stats dynamically (views/comments may load async)
function updateArticlesHeroStats(){
    try {
        const publishedArticles = articles.filter(a=>a.published);
        const total = publishedArticles.length;
        const tagsFreq = {};
        publishedArticles.forEach(a=> (a.tags||[]).forEach(t=>{ tagsFreq[t]=(tagsFreq[t]||0)+1; }));
        const topTag = Object.entries(tagsFreq).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
        const statsBar = document.getElementById('articlesHeroStats');
        if(!statsBar) return;
        // Update static stats immediately
        statsBar.querySelector('[data-stat="total"] span').innerHTML = `Total: <strong>${total}</strong>`;
        statsBar.querySelector('[data-stat="topTag"] span').innerHTML = `Top Tag: <strong>${topTag}</strong>`;
        statsBar.querySelector('[data-stat="updated"] span').innerHTML = `Updated: <strong>${new Date().toLocaleDateString('en-US')}</strong>`;
        // Compute engagement asynchronously so UI updates even if counts are delayed
        (async () => {
            let viewsTotal = 0;
            let commentsTotal = 0;
            for (const a of publishedArticles) {
                try {
                    const [v,c] = await Promise.all([
                        getViews('article', a.id),
                        getCommentsCount('article', a.id)
                    ]);
                    viewsTotal += (typeof v === 'number'? v : 0);
                    commentsTotal += (typeof c === 'number'? c : 0);
                } catch(e) { /* ignore individual failures */ }
            }
            // Fallback: if still zero, attempt to parse from any DOM elements already populated
            if (viewsTotal === 0) {
                document.querySelectorAll('[data-views-id]').forEach(el=>{ const n = parseInt(el.textContent||'0',10); if(!isNaN(n)) viewsTotal += n; });
            }
            if (commentsTotal === 0) {
                document.querySelectorAll('[data-comments-id]').forEach(el=>{ const n = parseInt(el.textContent||'0',10); if(!isNaN(n)) commentsTotal += n; });
            }
            if(!statsBar.querySelector('[data-stat="engagement"]')){
                const pill = document.createElement('div');
                pill.className='articles-stat';
                pill.setAttribute('data-stat','engagement');
                pill.innerHTML = `<i class=\"fas fa-chart-line\"></i> <span>Views: <strong>${viewsTotal}</strong> • Comments: <strong>${commentsTotal}</strong></span>`;
                statsBar.appendChild(pill);
            } else {
                statsBar.querySelector('[data-stat="engagement"] span').innerHTML = `Views: <strong>${viewsTotal}</strong> • Comments: <strong>${commentsTotal}</strong>`;
            }
        })();
    } catch(e) { /* silent */ }
}
        case 'giornalini':
            content.innerHTML = await getPhotoGalleryPage();
            break;
        case 'contatti':
            // legacy route key; render contacts page in English
            content.innerHTML = getContactsPage();
            break;
        case 'admin':
            content.innerHTML = getAdminPage();
            // authenticate/admin wiring
            try { checkAdminAuth(); } catch {}
            break;
        case 'giornalini':
            content.innerHTML = await getPhotoGalleryPage();
            loadPhotoAlbums();
            break;
        default:
            content.innerHTML = await getHomePage();
    }

    // Populate counts after DOM update (Articles already load counts per-card)
    // Removed conditional skip: counts already loaded for articles; always background refresh others
    if (page !== 'articles' && page !== 'weekly-news') {
        setTimeout(() => { try { loadAllCounts(); } catch {} }, 0);
    }

    // Specific page initializations
    if (page === 'giornalini') { // legacy Italian key for photo gallery
        loadPhotoAlbums();
    }
}

// Photo Gallery Page
async function getPhotoGalleryPage() {
    return `
        <div class="photo-gallery-page" style="min-height: 100vh; background: linear-gradient(135deg, #faf8f4 0%, #f0e5cb 50%, #faf8f4 100%);">
            <!-- Hero Section -->
            <div class="gallery-hero" style="background: linear-gradient(135deg, #771510 0%, #cc4125 100%); padding: 60px 20px; text-align: center; box-shadow: 0 8px 24px rgba(119, 21, 16, 0.2); position: relative; overflow: hidden;">
                <div class="container" style="position: relative; z-index: 1;">
                    <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 15px 25px; border-radius: 50px; margin-bottom: 20px; backdrop-filter: blur(10px);">
                        <i class="fas fa-camera-retro" style="font-size: 3rem; color: #fff;"></i>
                    </div>
                    <h1 class="page-title" style="color: #fff; font-weight: 800; font-size: 3rem; margin-bottom: 15px; text-shadow: 0 4px 12px rgba(0,0,0,0.3); letter-spacing: -1px;">
                        BIST Photo Gallery
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); font-size: 1.2rem; max-width: 700px; margin: 0 auto; font-weight: 300; letter-spacing: 0.5px;">
                        Capturing the vibrant moments and memories of our school
                    </p>
                    <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 25px; backdrop-filter: blur(10px);">
                            <i class="fas fa-images me-2"></i>
                            <span id="album-count-badge">Loading...</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 25px; backdrop-filter: blur(10px);">
                            <i class="fas fa-calendar me-2"></i>
                            <span>School Year 2024-25</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Albums Grid -->
            <div class="container" style="padding: 60px 15px;">
                <div id="photo-gallery-grid" class="row g-4">
                    <!-- Photo albums will be loaded here -->
                    <div class="col-12 text-center">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted">Loading albums...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadPhotoAlbums() {
    const grid = document.getElementById('photo-gallery-grid');
    if (!grid) return;

    try {
        const albums = await window.loadPhotoAlbumsFromDb();
        
        // Update album count badge
        const countBadge = document.getElementById('album-count-badge');
        if (countBadge) {
            countBadge.textContent = `${albums.length} Album${albums.length !== 1 ? 's' : ''}`;
        }

        if (!albums || albums.length === 0) {
            grid.innerHTML = `
                <div class="col-12">
                    <div style="text-align: center; padding: 80px 20px; background: #fff; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
                        <i class="fas fa-folder-open" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                        <h4 style="color: #771510; margin-bottom: 10px;">No Albums Yet</h4>
                        <p class="text-muted">Photo albums will appear here once they are created.</p>
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = albums.map((album, index) => {
            const coverImage = album.photos && album.photos.length > 0 ? toAbsoluteUploadsUrl(album.photos[0].url) : 'https://via.placeholder.com/400x300.png/771510/FFFFFF?text=No+Image';
            const photoCount = album.photos?.length || 0;
            const animationDelay = (index * 0.1).toFixed(1);
            
            return `
            <div class="col-md-6 col-lg-4" style="animation: fadeInUp 0.6s ease-out ${animationDelay}s both;">
                <div class="gallery-album-card" onclick="viewAlbum('${album.id}')" style="
                    background: #fff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                ">
                    <!-- Photo Count Badge -->
                    <div style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(119, 21, 16, 0.95);
                        color: #fff;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        z-index: 2;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                        <i class="fas fa-images me-1"></i>${photoCount}
                    </div>
                    
                    <!-- Cover Image -->
                    <div style="
                        position: relative;
                        height: 280px;
                        overflow: hidden;
                        background: linear-gradient(135deg, #771510 0%, #cc4125 100%);
                    ">
                        <img src="${coverImage}" alt="${album.title}" style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                        " class="album-cover-img">
                        <div style="
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            height: 100px;
                            background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
                            pointer-events: none;
                        "></div>
                    </div>
                    
                    <!-- Card Body -->
                    <div style="padding: 24px; flex: 1; display: flex; flex-direction: column;">
                        <h5 style="
                            color: #771510;
                            font-weight: 700;
                            font-size: 1.25rem;
                            margin-bottom: 12px;
                            line-height: 1.3;
                        ">${album.title}</h5>
                        
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            margin-top: auto;
                            padding-top: 16px;
                            border-top: 1px solid #f0e5cb;
                        ">
                            <div style="
                                width: 32px;
                                height: 32px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, #771510, #cc4125);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: #fff;
                                font-weight: 600;
                                font-size: 0.85rem;
                            ">
                                ${album.author.charAt(0).toUpperCase()}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.9rem; font-weight: 600; color: #333;">${album.author}</div>
                                <div style="font-size: 0.75rem; color: #999;">${formatDate(album.createdAt)}</div>
                            </div>
                            <i class="fas fa-arrow-right" style="color: #771510; font-size: 1.1rem;"></i>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
        
        // Add hover effects via CSS
        if (!document.getElementById('gallery-hover-styles')) {
            const style = document.createElement('style');
            style.id = 'gallery-hover-styles';
            style.textContent = `
                .gallery-album-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 12px 32px rgba(119, 21, 16, 0.15);
                }
                .gallery-album-card:hover .album-cover-img {
                    transform: scale(1.08);
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }

    } catch (error) {
        console.error('Error loading photo albums:', error);
        grid.innerHTML = `
            <div class="col-12">
                <div style="text-align: center; padding: 60px 20px; background: #fff; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 20px;"></i>
                    <h4 style="color: #771510; margin-bottom: 10px;">Failed to Load Albums</h4>
                    <p class="text-muted">Could not load photo albums. Please try again later.</p>
                </div>
            </div>
        `;
    }
}

async function viewAlbum(albumId) {
    try {
        const albums = await window.loadPhotoAlbumsFromDb();
        const album = albums.find(a => a.id === albumId);
        if (!album) {
            alert('Album not found!');
            return;
        }

        const photoCount = album.photos.length;
        let photoGridClass = '';
        let imageHeight = '200px';

        if (photoCount === 1) {
            photoGridClass = 'col-12';
            imageHeight = '500px';
        } else if (photoCount <= 4) {
            photoGridClass = 'col-md-6';
            imageHeight = '300px';
        } else if (photoCount <= 9) {
            photoGridClass = 'col-md-4 col-lg-4';
            imageHeight = '250px';
        } else { // 10+ photos
            photoGridClass = 'col-sm-6 col-md-4 col-lg-3';
            imageHeight = '200px';
        }

        const modalHtml = `
            <div class="modal fade" id="albumModal" tabindex="-1" aria-labelledby="albumModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content" style="background: linear-gradient(135deg, #faf8f4 0%, #f8f6f2 100%); border: none; border-radius: 20px; overflow: hidden;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #771510 0%, #cc4125 100%); border: none; padding: 24px 30px;">
                            <div>
                                <h5 class="modal-title" id="albumModalLabel" style="color: #fff; font-weight: 700; font-size: 1.5rem; margin-bottom: 5px;">
                                    <i class="fas fa-camera me-2"></i>${album.title}
                                </h5>
                                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 0.9rem;">
                                    <i class="fas fa-user me-1"></i>${album.author} • <i class="fas fa-calendar me-1"></i>${formatDate(album.createdAt)}
                                </p>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="padding: 40px 30px;">
                            <div style="text-align: center; margin-bottom: 40px; padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <i class="fas fa-images" style="color: #771510; font-size: 2rem; margin-bottom: 10px;"></i>
                                <p style="margin: 0; color: #666; font-size: 1.05rem;">
                                    This album contains <strong style="color: #771510;">${photoCount} photo${photoCount > 1 ? 's' : ''}</strong>. Click on any image to view it in full screen.
                                </p>
                            </div>
                            <div class="row justify-content-center g-4">
                                ${album.photos.map(photo => `
                                    <div class="${photoGridClass} mb-4">
                                        <div class="gallery-image-wrapper" style="box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                                            <img src="${toAbsoluteUploadsUrl(photo.url)}" 
                                                 class="img-fluid" 
                                                 alt="Photo in ${album.title}" 
                                                 style="width: 100%; height: ${imageHeight}; object-fit: cover; cursor: pointer; transition: transform 0.2s ease-in-out;"
                                                 onclick="showImageInLightbox('${toAbsoluteUploadsUrl(photo.url)}')"
                                                 onmouseover="this.style.transform='scale(1.05)'"
                                                 onmouseout="this.style.transform='scale(1)'">
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('albumModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('albumModal'));
        modal.show();

    } catch (error) {
        console.error('Error viewing album:', error);
        alert('Could not load the album.');
    }
}

function showImageInLightbox(imageUrl) {
    // If a lightbox is already open, do nothing.
    if (document.getElementById('imageLightbox')) {
        return;
    }

    const lightboxHtml = `
        <div id="imageLightbox" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2000;" onclick="closeImageLightbox()">
            <img src="${imageUrl}" style="max-width: 90%; max-height: 90%; object-fit: contain; box-shadow: 0 0 25px rgba(0,0,0,0.5);">
            <button style="position: absolute; top: 20px; right: 30px; font-size: 2rem; color: white; background: none; border: none;">&times;</button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', lightboxHtml);
}

function closeImageLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.remove();
    }
}


// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    showPage('home');
    loadAllData();
    // Initialize real-time view updates if socket.io available
    if (typeof io !== 'undefined') {
        try {
            const socket = io();
            socket.on('viewUpdated', payload => {
                if (!payload || payload.itemType !== 'article') return;
                const el = document.querySelector(`[data-views-id="${payload.itemId}"]`);
                if (el) el.textContent = payload.count;
                const el2 = document.getElementById(`views-count-${payload.itemId}`);
                if (el2) el2.textContent = payload.count;
            });
        } catch (e) { console.warn('Socket init failed', e); }
    }
});

async function loadAllData() {
    try {
        console.log('Loading data from local database...');
        articles = await loadArticles() || [];
        weeklyNews = await loadWeeklyNews() || [];

        console.log('Loaded articles:', articles.length, 'weeklyNews:', weeklyNews.length);

        // Load counts immediately after data is loaded
        await loadAllCounts();

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

            // Update UI elements (support multiple instances on page)
            const commentsEl = document.getElementById(`comments-count-${article.id}`);
            if (commentsEl) commentsEl.textContent = commentsCount;

            const commentsReaderEl = document.getElementById(`comments-count-reader-${article.id}`);
            if (commentsReaderEl) commentsReaderEl.textContent = commentsCount;

            const viewsEl = document.getElementById(`views-count-${article.id}`);
            if (viewsEl) viewsEl.textContent = viewsCount;

            // Also update any elements marked with data attributes (to avoid duplicate-ID issues)
            document.querySelectorAll(`[data-views-id="${article.id}"]`).forEach(el => el.textContent = viewsCount);
            document.querySelectorAll(`[data-comments-id="${article.id}"]`).forEach(el => el.textContent = commentsCount);
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

// Homepage with search and category filters (restored from old version)
async function getHomePage() {
    const trendingArticle = await getMostViewedArticle();
    const trendingCardHtml = trendingArticle ? await getTrendingCard(trendingArticle) : '';
    // Prepare placeholder container for rotation (will be replaced after insertion)
    
    return `
        <div class="trending-section">
            <div class="container">
                <div id="trendingCarouselShell" style="position:relative;">
                    <div class="trending-header static-header" style="margin-bottom:12px;">
                        <i class="fas fa-fire trending-icon"></i>
                        <div>
                            <h2 class="trending-title">Trending Now</h2>
                            <p class="trending-subtitle">Most read article this week</p>
                        </div>
                    </div>
                    <div id="trendingDynamicSlot">${trendingCardHtml}</div>
                </div>
            </div>
        </div>

        <div class="container mt-5">
            <div class="row">
                <div class="col-md-8">
                    <!-- Moved Search + Filters here for tighter proximity to articles -->
                    <div class="article-filter-panel" style="background:#ffffff; border:1px solid #f0e4d8; padding:18px 20px 10px; border-radius:18px; box-shadow:0 6px 18px -4px rgba(0,0,0,0.08); margin-bottom:24px; position:relative;">
                        <div class="search-bar-container" style="margin:0 0 14px;">
                            <div class="input-group" style="background:#f8f6f2; border-radius:12px; padding:4px 10px;">
                                <span class="input-group-text bg-transparent border-0 pe-2" style="color:#771510;">
                                    <i class="fas fa-search"></i>
                                </span>
                                <input type="text" id="articleSearchInput" class="form-control border-0" placeholder="Search articles by title or content..." onkeyup="searchArticles()" onfocus="activateSearchBar()" onblur="deactivateSearchBar()" style="box-shadow:none; background:transparent; color:#333;">
                            </div>
                            <div id="searchMeta" class="search-meta-collapsed" style="margin-top:4px; font-size:0.65rem; letter-spacing:.5px; text-transform:uppercase; color:#aa6a33; overflow:hidden; padding-left:10px; padding-top:2px; padding-bottom:4px;">
                                <span class="search-meta-inner"></span>
                            </div>
                        </div>
                        <div class="category-filters" style="margin:0 -4px 6px;">
                            <div class="category-filter all-articles active" data-tag="all" onclick="filterByTag('all')" style="background:#771510; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;">All Articles</div>
                            <div class="category-filter" data-tag="school-news" onclick="filterByTag('school-news')" style="background:#e74c3c; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-graduation-cap"></i> School News</div>
                            <div class="category-filter" data-tag="features" onclick="filterByTag('features')" style="background:#f39c12; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-star"></i> Features</div>
                            <div class="category-filter" data-tag="opinion" onclick="filterByTag('opinion')" style="background:#9b59b6; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-comment"></i> Opinion</div>
                            <div class="category-filter" data-tag="sports" onclick="filterByTag('sports')" style="background:#3498db; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-running"></i> Sports</div>
                            <div class="category-filter" data-tag="creative" onclick="filterByTag('creative')" style="background:#e91e63; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-palette"></i> Creative</div>
                            <div class="category-filter" data-tag="humor" onclick="filterByTag('humor')" style="background:#ff9800; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-laugh"></i> Humor</div>
                            <div class="category-filter" data-tag="assembly" onclick="filterByTag('assembly')" style="background:#8d6e63; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-university"></i> Assembly</div>
                            <div class="category-filter" data-tag="tech" onclick="filterByTag('tech')" style="background:#2196f3; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-laptop"></i> Tech</div>
                            <div class="category-filter" data-tag="lifestyle" onclick="filterByTag('lifestyle')" style="background:#4caf50; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-leaf"></i> Lifestyle</div>
                            <div class="category-filter" data-tag="music" onclick="filterByTag('music')" style="background:#9c27b0; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-music"></i> Music</div>
                            <div class="category-filter" data-tag="reviews" onclick="filterByTag('reviews')" style="background:#607d8b; color:#fff; padding:6px 14px; border-radius:18px; cursor:pointer; margin:4px; display:inline-block; font-size:0.72rem;"><i class="fas fa-star-half-alt"></i> Reviews</div>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="section-title" id="homeSectionTitle">Latest Articles</h3>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="sortDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="border-radius:8px;">
                                    <i class="fas fa-sort me-1"></i>Date
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="sortDropdown">
                                    <li><a class="dropdown-item" href="#" onclick="changeSortType('date')"><i class="fas fa-calendar me-2"></i>Date</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="changeSortType('popular')"><i class="fas fa-eye me-2"></i>Popularity</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="changeSortType('comments')"><i class="fas fa-comment me-2"></i>Comments</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="changeSortType('title')"><i class="fas fa-font me-2"></i>Title</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="changeSortType('author')"><i class="fas fa-user me-2"></i>Author</a></li>
                                </ul>
                            </div>
                            <button class="btn btn-outline-secondary" id="sortDirectionBtn" onclick="toggleSortDirection()" style="border-radius:8px; width:42px; padding:0.375rem 0;" title="Toggle sort direction">
                                <i class="fas fa-arrow-down" id="sortArrowIcon"></i>
                            </button>
                        </div>
                    </div>
                    ${getArticlesGrid(6)}
                    <div class="text-end mt-2 mb-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="showPage('articles')">View All Articles</button>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="weekly-news-panel" style="position:relative; background:#faf8f4; border:1px solid #f0e4d8; border-radius:18px; padding:18px 18px 12px 26px; box-shadow:0 4px 14px -4px rgba(0,0,0,0.07);">
                        <span class="weekly-accent" style="position:absolute; left:10px; top:14px; bottom:14px; width:4px; background:linear-gradient(180deg,#771510,#cc6d30); border-radius:3px; box-shadow:0 0 0 1px rgba(255,255,255,0.4) inset, 0 2px 6px -1px rgba(119,21,16,0.4);"></span>
                        <h4 class="section-title" style="margin-top:2px;">Annuncements</h4>
                        <div class="weekly-news-list">${getWeeklyNewsList()}</div>
                    </div>
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
    // Try to find the author's full name, default to the stored author
    const authorInfo = window.teamMembers?.find(m => m.id === article.author);
    const authorName = authorInfo ? authorInfo.name : article.author;

    return `
        <div class="trending-card">
            <span class="trending-badge">TRENDING</span>
            <div class="category-badge">SCHOOL NEWS & EVENTS</div>
            <h3 class="trending-card-title">${article.title}</h3>
            <p class="trending-card-text">${getArticleExcerpt(article.content, 120)}</p>
            <div class="trending-meta">
                <div>
                    <small style="color: #ccc;">By ${authorName} • ${formatDate(article.createdAt)}</small>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <span class="trending-views"><i class="fas fa-eye"></i> <span data-views-id="${article.id}">0</span> views</span>
                    <button class="btn btn-light" onclick="openArticle('${article.id}')">
                        Read Full Article
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- Trending Carousel Extensions (non intrusive) ---
// Build a card variant but reuse exact inner markup style by swapping badge + subtitle texts only via small overlay wrappers.
async function buildTrendingPanels(){
    const panels = [];
    const published = articles.filter(a=>a.published);
    if(!published.length) return panels;

    // 1. Most Viewed (existing)
    try { const mv = await getMostViewedArticle(); if (mv) panels.push({ key:'trending', labelTitle:'Trending Now', labelSubtitle:'Most read article this week', article: mv }); } catch {}

    // 2. Most Commented
    try {
        // naive aggregation (can be optimized caching comment counts if large)
        let top = null, max= -1;
        for(const a of published){
            try { const c = await getCommentsCount('article', a.id); if(c>max){ max=c; top=a; } } catch {}
        }
        if(top) panels.push({ key:'commented', labelTitle:'Most Commented', labelSubtitle:'Article sparking the most discussion', article: top });
    } catch {}

    // 3. Latest Article
    try {
        const latest = [...published].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))[0];
        if(latest) panels.push({ key:'latest', labelTitle:'Latest Article', labelSubtitle:'Freshly published article', article: latest });
    } catch {}

    // 4. Featured (chosen manually -> article.featured === true)
    try { const feat = published.find(a=>a.featured === true); if (feat) panels.push({ key:'featured', labelTitle:'Now in Evidence', labelSubtitle:'Highlighted by the editorial team', article: feat }); } catch {}

    return panels;
}

async function initTrendingCarousel(){
    const slot = document.getElementById('trendingDynamicSlot');
    if(!slot) return;
    const shell = document.getElementById('trendingCarouselShell');
    const panels = await buildTrendingPanels();
    if(!panels.length) return;
    let idx = 0;

    // Prepare container for sliding (wrapping existing slot content)
    shell.style.position = 'relative';
    slot.style.position = 'relative';
    shell.style.overflow = 'hidden';

    // Inner track for slides
    const track = document.createElement('div');
    track.style.display = 'flex';
    track.style.width = `${panels.length * 100}%`;
    track.style.transition = 'transform 0.65s ease';
    track.style.willChange = 'transform';
    track.style.height = '100%';
    track.setAttribute('data-trending-track','1');

    // Build slides
    panels.forEach((p, i) => {
        const slide = document.createElement('div');
        // Maintain dynamic width for transform math, then also enforce requested base flex style (0 0 25%) for internal content sizing.
        slide.style.flex = '0 0 ' + (100 / panels.length) + '%';
        // Apply requested style additions
        slide.style.padding = '1px';
        slide.style.boxSizing = 'border-box';
        // Each slide contains its own header + card so title/subtitle slide together
        slide.innerHTML = `
            <div class="trending-header" style="margin-bottom:12px; display:flex; align-items:flex-start; gap:12px;">
                <i class="fas fa-fire trending-icon"></i>
                <div>
                    <h2 class="trending-title" style="margin:0;">${p.labelTitle}</h2>
                    <p class="trending-subtitle" style="margin:0;">${p.labelSubtitle}</p>
                </div>
            </div>
            ${getTrendingCard(p.article)}
        `;
        track.appendChild(slide);
    });

    // Clear and append track
    slot.innerHTML = '';
    slot.appendChild(track);

    // Remove static header (now integrated per slide)
    const staticHeader = shell.querySelector('.static-header');
    if(staticHeader) staticHeader.remove();

    // Navigation dots
    let dotsWrapper = document.createElement('div');
    dotsWrapper.style.position = 'absolute';
    dotsWrapper.style.bottom = '8px';
    dotsWrapper.style.left = '50%';
    dotsWrapper.style.transform = 'translateX(-50%)';
    dotsWrapper.style.display = 'flex';
    dotsWrapper.style.gap = '8px';
    dotsWrapper.style.zIndex = '5';
    dotsWrapper.setAttribute('data-trending-dots','1');

    function buildDots(){
        dotsWrapper.innerHTML = '';
        panels.forEach((p,i)=>{
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', `Show panel ${i+1}: ${p.labelTitle}`);
            dot.style.width='10px';
            dot.style.height='10px';
            dot.style.borderRadius='50%';
            dot.style.border='none';
            dot.style.padding='0';
            dot.style.cursor='pointer';
            dot.style.background = i===idx ? '#0075c4ff' : '#00253d';
            dot.style.boxShadow = '0 0 0 2px #00253d';
            dot.addEventListener('click', ()=>{
                goTo(i, true);
            });
            dotsWrapper.appendChild(dot);
        });
    }

    slot.appendChild(dotsWrapper);

    // Update external title/subtitle + badge of active slide only
    function syncMeta(){
        // Only need to update badge texts of slides (titles already baked into each slide)
        const slides = track.children;
        for(let i=0;i<slides.length;i++){
            const badge = slides[i].querySelector('.trending-badge');
            if(badge) badge.textContent = panels[i].labelTitle.toUpperCase();
        }
    }

    function goTo(newIndex, manual=false){
        idx = (newIndex + panels.length) % panels.length;
        const offset = -(idx * (100 / panels.length));
        track.style.transform = `translateX(${offset}%)`;
        syncMeta();
        buildDots();
        if(manual){
            // restart autoplay timer
            restartAuto();
        }
    }

    // Autoplay logic
    let autoTimer = null;
    function startAuto(){
        autoTimer = setInterval(()=>{
            goTo(idx+1);
        }, 8000);
    }
    function restartAuto(){
        if(autoTimer) clearInterval(autoTimer);
        startAuto();
    }

    buildDots();
    syncMeta();
    startAuto();
}
window.initTrendingCarousel = initTrendingCarousel;

// Utility: dynamically change paragraph bottom margin in articles & preview
window.setArticleParagraphMargin = function(px){
    const val = (typeof px === 'number' && !isNaN(px)) ? px + 'px' : px;
    document.documentElement.style.setProperty('--article-p-margin-bottom', val);
};

// Get the most viewed article for trending section
async function getMostViewedArticle() {
    if (articles.length === 0) return null;

    let mostViewedArticle = articles.find(a => a.published) || articles[0];
    let maxViews = -1; // Initialize to -1 to handle articles with 0 views

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

// Ensure image URLs under /uploads are fully-qualified to backend origin (global helper)
function toAbsoluteUploadsUrl(src) {
    if (typeof src !== 'string' || !src) return '';
    if (/^https?:\/\//i.test(src) || src.startsWith('data:image')) return src;
    if (src.startsWith('/uploads/')) {
        try {
            let baseOrigin;
            if (window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) {
                baseOrigin = new URL(window.enhancedDatabase.apiBaseUrl).origin;
            } else {
                // Force backend port 3001 if frontend served elsewhere
                const loc = window.location;
                baseOrigin = `${loc.protocol}//${loc.hostname}:3001`;
            }
            // Normalize accidental duplicated /uploads/uploads
            const cleanPath = src.replace(/\/uploads\/uploads\//g,'/uploads/');
            return `${baseOrigin}${cleanPath}`;
        } catch (e) {
            return src;
        }
    }
    return src;
}

function getArticlesGrid(limit){
    if (!articles.length) return '<p class="text-muted">No articles available at the moment.</p>';
    let publishedArticles = articles.filter(a=>a.published);
    if (typeof limit === 'number') publishedArticles = publishedArticles.slice(0, limit);
    const html = publishedArticles.map(article => {
        const authorInfo = window.teamMembers?.find(m => m.id === article.author);
        const authorName = authorInfo ? authorInfo.name : article.author;
        const safeContent = (article.content || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
        const safeTitle = (article.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const tagsAttr = (article.tags||[]).join(',').toLowerCase();
        const tagList = article.tags || [];
        const primaryTag = tagList[0] || 'general';
        const extraCount = tagList.length > 1 ? tagList.length - 1 : 0;
        const extraRawList = tagList.slice(1);
        const extraList = extraCount > 0 ? extraRawList.join(',') : '';
        const extraBadge = extraCount > 0 ? `<span class="extra-tags-indicator" data-extra-tags="${extraList}" style="background:#00253d; color:#fff; padding:4px 8px; border-radius:12px; font-size:0.6rem; font-weight:600; margin-left:4px; position:relative; cursor:pointer;">+${extraCount}</span>` : '';
        const tagBadgesHtml = `<span class="multi-tag-badges">${getTagBadge(primaryTag)}${extraBadge}</span>`;
        return `<div class="col-md-6 col-xl-4 mb-4 article-item" data-title="${safeTitle.toLowerCase()}" data-content="${safeContent}" data-tags="${tagsAttr}">
            <div class="article-card h-100" onclick="openArticle('${article.id}')" style="cursor:pointer;">
                <div class="article-card-content" style="background:linear-gradient(135deg,#771510 0%, #cc4125 100%); border-radius:12px; padding:20px; color:#fff; min-height:280px; position:relative; display:flex; flex-direction:column; justify-content:space-between;">
                    <div class="article-tag-badge" style="position:absolute; top:15px; left:15px; display:flex; align-items:center;">${tagBadgesHtml}</div>
                    <div class="article-icon" style="text-align:center; margin:40px 0 20px;">${getArticleIcon(primaryTag)}</div>
                    <div style="position:absolute; bottom:20px; left:20px; right:20px;">
                        <h5 style="color:#fff; font-weight:600; margin-bottom:8px; font-size:1.1rem;">${article.title}</h5>
                        <p style="color:rgba(255,255,255,0.9); font-size:0.9rem; margin-bottom:12px; line-height:1.4;">${getArticleExcerpt(article.content, 80)}</p>
                        <div class="article-meta" style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:rgba(255,255,255,0.8);">
                            <div><div>By ${authorName}</div><div>${formatDate(article.createdAt)}</div></div>
                            <div class="article-stats"><i class="fas fa-eye"></i> <span data-views-id="${article.id}">0</span><i class="fas fa-comment ms-2"></i> <span data-comments-id="${article.id}">0</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
    return `<div class="row">${html}</div>`;
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
    const tagIcons = {
        'school-news': 'fa-graduation-cap',
        'features': 'fa-star',
        'opinion': 'fa-comment',
        'sports': 'fa-running',
        'creative': 'fa-palette',
        'humor': 'fa-laugh',
        'tech': 'fa-laptop',
        'lifestyle': 'fa-leaf',
        'music': 'fa-music',
        'reviews': 'fa-star-half-alt',
        'general': 'fa-tag'
    };
    
    const color = tagColors[tag] || tagColors.general;
    const displayName = tag.replace('-', ' ').toUpperCase();
    const icon = tagIcons[tag] || tagIcons.general;
    
    return `<span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; display:inline-flex; align-items:center; gap:4px;"><i class="fas ${icon}" style="font-size:0.75rem;"></i>${displayName}</span>`;
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
    // Remove scripts/styles, then strip tags, collapse whitespace
    let cleaned = content
        .replace(/<script[\s\S]*?<\/script>/gi,'')
        .replace(/<style[\s\S]*?<\/style>/gi,'')
        .replace(/<!--.*?-->/g,' ')
        .replace(/<[^>]+>/g,' ')
        .replace(/&nbsp;/gi,' ') // basic entity
        .replace(/&amp;/gi,'&')
        .replace(/&lt;/gi,'<')
        .replace(/&gt;/gi,'>')
        .replace(/\s+/g,' ') // collapse
        .trim();
    if (!cleaned) return '';
    if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength).trim() + '...';
    return cleaned;
}

// Text search over articles (title, content, tags)
function searchArticles() {
    if (!input) return;
    const container = document.querySelector('.search-bar-container');
    if (container){
        if (input.value.trim()) container.classList.add('search-has-value');
        else container.classList.remove('search-has-value');
    }
    applyArticleFilters();
}

// Tag filtering (stores active tag in window for combined search)
function filterByTag(tag) {
    window.__activeTagFilter = tag === 'all' ? null : tag;
    // Update active class on filter buttons using data-tag
    document.querySelectorAll('.category-filter').forEach(btn => {
        const btnTag = btn.getAttribute('data-tag');
        const isActive = (tag === 'all' && btnTag === 'all') || (btnTag === tag);
        if (isActive) {
            btn.classList.add('active');
            btn.style.outline = 'none';
            btn.style.filter = 'none';
            btn.style.transform = 'scale(1.1)';
            btn.style.opacity = '1';
        } else {
            btn.classList.remove('active');
            if (tag === 'all') {
                btn.style.transform = 'scale(1)';
                btn.style.opacity = '1';
            } else {
                btn.style.transform = 'scale(0.92)';
                btn.style.opacity = '0.55';
            }
        }
    });
    applyArticleFilters();
}

// Unified filtering logic (tag AND text)
function applyArticleFilters(){
    const q = (document.getElementById('articleSearchInput')?.value || '').trim().toLowerCase();
    const activeTag = window.__activeTagFilter; // null or tag
    const items = document.querySelectorAll('.article-item');

    // Clear old highlights first
    document.querySelectorAll('.article-item h5, .article-item p').forEach(node => {
        node.innerHTML = node.innerHTML.replace(/<span class="search-highlight">(.*?)<\/span>/gi, '$1');
    });

    let visible = 0;
    items.forEach(el => {
        const tagsAttr = (el.getAttribute('data-tags') || '').split(',').map(t=>t.trim()).filter(Boolean);
        const title = el.getAttribute('data-title') || '';
        const content = el.getAttribute('data-content') || '';
        const tagString = el.getAttribute('data-tags') || '';
        // Match if no active tag OR any tag equals OR contains (for future compound tags)
        const matchesTag = !activeTag || tagsAttr.some(t => t === activeTag || t.indexOf(activeTag) !== -1);
        const matchesQuery = !q || title.includes(q) || content.includes(q) || tagString.includes(q);
        const shouldShow = matchesTag && matchesQuery;
        el.style.display = shouldShow ? '' : 'none';
        if (shouldShow){
            if (q){
                const titleEl = el.querySelector('h5');
                const excerptEl = el.querySelector('p');
                if (titleEl) titleEl.innerHTML = highlightTerm(titleEl.textContent, q);
                if (excerptEl) excerptEl.innerHTML = highlightTerm(excerptEl.textContent, q);
            }
            visible++;
        }
    });
    updateSearchMeta(q, visible);
}

// Inject minimal CSS once for smooth transitions
if (!document.getElementById('tag-filter-style')) {
    const style = document.createElement('style');
    style.id = 'tag-filter-style';
    style.textContent = `
    .category-filter { transition: transform 0.25s ease, opacity 0.25s ease; }
    .category-filter.active { box-shadow: 0 0 0 3px rgba(255,255,255,0.35) inset; }
    /* Articles page tag filters (mirror animation behavior) */
    .category-filter-page { transition: transform 0.25s ease, opacity 0.25s ease; }
    .category-filter-page.active { box-shadow: 0 0 0 3px rgba(255,255,255,0.35) inset; }
        .search-highlight { background: #ffe45c; color: #4a2c00; padding: 0 3px; border-radius: 3px; }
        /* Quill alignment support (ensure everywhere) */
        .ql-align-center { text-align: center; }
        .ql-align-right { text-align: right; }
        .ql-align-justify { text-align: justify; }
        /* Ensure images or videos inside aligned blocks inherit center visually */
        .ql-align-center img, .ql-align-center iframe, .ql-align-center video { margin-left: auto; margin-right: auto; display: block; }
        .article-modal-content .ql-align-center { text-align:center; }
        .article-modal-content .ql-align-right { text-align:right; }
        .article-modal-content .ql-align-justify { text-align:justify; }
        /* Paragraph spacing control for articles & preview */
        :root { --article-p-margin-bottom: -2px; }
        .article-content p, .article-modal-content p { margin:0 0 var(--article-p-margin-bottom) 0; }
        .article-content p:last-child, .article-modal-content p:last-child { margin-bottom:0; }
        .article-content p.tight-para, .article-modal-content p.tight-para { margin-bottom:4px !important; }
        /* Extra tag tooltip styling */
        .extra-tag-tooltip { position:absolute; left:50%; top:100%; transform:translate(-50%,8px); background:linear-gradient(135deg,#022c3f,#004764); color:#f2f8fb; padding:10px 14px; border-radius:14px; font-size:0.65rem; line-height:1.2; letter-spacing:0.5px; white-space:nowrap; box-shadow:0 8px 22px -6px rgba(0,0,0,0.45), 0 2px 6px -2px rgba(0,0,0,0.4) inset; opacity:0; pointer-events:none; transition:opacity .18s ease, transform .25s cubic-bezier(.4,.14,.3,1.4); font-weight:600; z-index:30; }
        .extra-tag-tooltip::after { content:""; position:absolute; top:-6px; left:50%; transform:translateX(-50%); border-width:6px; border-style:solid; border-color:transparent transparent #022c3f transparent; }
        .extra-tags-indicator { position:relative; }
        .extra-tags-indicator:hover .extra-tag-tooltip { opacity:1; transform:translate(-50%,4px) scale(1.02); }
        /* Sort direction button animation */
        #sortDirectionBtn i, #sortDirectionBtnPage i { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        #sortDirectionBtn:hover, #sortDirectionBtnPage:hover { background-color: #f8f9fa; }
        #sortDirectionBtn:active i, #sortDirectionBtnPage:active i { transform: scale(0.9); }
    `;
    document.head.appendChild(style);
}

// Tooltip activation for extra tags (+N)
if (typeof window.__extraTagTooltipInit === 'undefined') {
    window.__extraTagTooltipInit = true;
    document.addEventListener('mouseover', (e)=>{
        const target = e.target.closest('.extra-tags-indicator');
        if(!target) return;
        if (target.querySelector('.extra-tag-tooltip')) return; // already built
        const data = target.getAttribute('data-extra-tags');
        if(!data) return;
        const tags = data.split(',').map(t=>t.trim()).filter(Boolean);
        if(!tags.length) return;
        const tip = document.createElement('div');
        tip.className = 'extra-tag-tooltip';
    const colorMap = { 'school-news':'#e74c3c','features':'#f39c12','opinion':'#9b59b6','sports':'#3498db','creative':'#e91e63','humor':'#ff9800','tech':'#2196f3','lifestyle':'#4caf50','music':'#9c27b0','reviews':'#607d8b','general':'#95a5a6' };
    const iconMap = { 'school-news':'fa-graduation-cap','features':'fa-star','opinion':'fa-comment','sports':'fa-running','creative':'fa-palette','humor':'fa-laugh','tech':'fa-laptop','lifestyle':'fa-leaf','music':'fa-music','reviews':'fa-star-half-alt','general':'fa-tag' };
        tip.innerHTML = tags.map(t=>{
            const base = t;
            const color = colorMap[base] || '#546e7a';
            const label = base.replace(/-/g,' ').toUpperCase();
            const icon = iconMap[base] || iconMap.general;
            return `<span style="background:${color}; color:#fff; padding:4px 6px; border-radius:10px; font-size:0.55rem; font-weight:600; margin:2px; display:inline-inline-flex; align-items:center; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.3);"><i class=\"fas ${icon}\" style=\"font-size:0.6rem;\"></i>${label}</span>`;
        }).join('');
        target.appendChild(tip);
        requestAnimationFrame(()=>{ tip.style.opacity='1'; tip.style.transform='translate(-50%,4px) scale(1.02)'; });
    });
    document.addEventListener('mouseout', (e)=>{
        const target = e.target.closest('.extra-tags-indicator');
        if(!target) return;
        const tip = target.querySelector('.extra-tag-tooltip');
        if(tip){
            tip.style.opacity='0';
            tip.style.transform='translate(-50%,8px) scale(0.98)';
            setTimeout(()=>{ if(tip.parentNode) tip.parentNode.removeChild(tip); }, 220);
        }
    });
}

function highlightTerm(text, term) {
    if (!term) return text;
    try {
        const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(esc, 'gi');
        return text.replace(re, match => `<span class="search-highlight">${match}</span>`);
    } catch { return text; }
}

function updateSearchMeta(q, count){
    const meta = document.getElementById('searchMeta');
    if (!meta) return;
    const activeTag = window.__activeTagFilter;
    const inner = meta.querySelector('.search-meta-inner') || meta;
    if (!q && !activeTag){ 
        meta.classList.remove('search-meta-expanded');
        inner.innerHTML='';
        return; 
    }
    const parts = [];
    if (q) parts.push(`<strong>${count}</strong> match${count===1?'':'es'}`);
    if (activeTag) parts.push(`tag: <span style="background:#771510;color:#fff;padding:2px 6px;border-radius:10px;font-weight:600;">${activeTag}</span>`);
    inner.innerHTML = parts.join(' • ');
    meta.classList.add('search-meta-expanded');
}

function activateSearchBar(){
    const container = document.querySelector('.search-bar-container');
    if (container){
        container.classList.add('search-active'); // new style relies on gradient underline
    }
}
function deactivateSearchBar(){
    const input = document.getElementById('articleSearchInput');
    if (input && input.value.trim()) return; // keep active if text present
    const container = document.querySelector('.search-bar-container');
    if (container){
        container.classList.remove('search-active');
    }
}

// Add style for search-active state if not already
if (!document.getElementById('search-bar-style')){
    const s = document.createElement('style');
    s.id='search-bar-style';
    s.textContent = `
    .search-bar-container{position:relative; transition: background .35s ease; border-radius:14px;}
    .search-bar-container.search-active{background:linear-gradient(135deg,#faf7f2,#f4eee7);} 
    .search-bar-container .input-group{position:relative;}
    .search-bar-container .input-group::after{content:""; position:absolute; left:8px; right:8px; bottom:2px; height:2px; border-radius:2px; background:linear-gradient(90deg,#771510,#d58f4b,#771510); opacity:0; transform:scaleX(.25); transform-origin:left center; transition:opacity .45s ease, transform .45s cubic-bezier(.4,0,.2,1);} 
    .search-bar-container.search-active .input-group::after{opacity:1; transform:scaleX(1);} 
    .search-bar-container.search-has-value .input-group::after{opacity:.9; transform:scaleX(1);} 
    .search-bar-container.search-active input{color:#2d1a18;} 
            #searchMeta{transition: max-height .35s cubic-bezier(.4,0,.2,1), opacity .35s ease, margin-top .35s ease; max-height:0; opacity:0;}
            #searchMeta.search-meta-expanded{max-height:60px; opacity:1; margin-top:8px;}
            #searchMeta .search-meta-inner{display:inline-block; transform:translateY(4px); transition: transform .35s ease;}
            #searchMeta.search-meta-expanded .search-meta-inner{transform:translateY(0);} 
    `;
    document.head.appendChild(s);
}

// Global sort state for home page
if (typeof window.__homeSortType === 'undefined') {
    window.__homeSortType = 'date';
    window.__homeSortDirection = 'desc'; // 'desc' or 'asc'
}

function changeSortType(type) {
    window.__homeSortType = type;
    const typeNames = {
        'date': 'Date',
        'popular': 'Popularity',
        'comments': 'Comments',
        'title': 'Title',
        'author': 'Author'
    };
    const typeIcons = {
        'date': 'fa-calendar',
        'popular': 'fa-eye',
        'comments': 'fa-comment',
        'title': 'fa-font',
        'author': 'fa-user'
    };
    const btn = document.getElementById('sortDropdown');
    if (btn) {
        btn.innerHTML = `<i class="fas fa-sort me-1"></i>${typeNames[type]}`;
    }
    sortArticles();
}

function toggleSortDirection() {
    window.__homeSortDirection = window.__homeSortDirection === 'desc' ? 'asc' : 'desc';
    const arrow = document.getElementById('sortArrowIcon');
    if (arrow) {
        arrow.className = window.__homeSortDirection === 'desc' ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
    }
    sortArticles();
}

async function sortArticles() {
    const sortType = window.__homeSortType || 'date';
    const direction = window.__homeSortDirection || 'desc';
    
    // Update section title based on sort type and direction
    const sectionTitles = {
        'date': direction === 'desc' ? 'Latest Articles' : 'Oldest Articles',
        'popular': direction === 'desc' ? 'Most Popular Articles' : 'Least Popular Articles',
        'comments': direction === 'desc' ? 'Most Discussed Articles' : 'Least Discussed Articles',
        'title': direction === 'desc' ? 'Articles Z-A' : 'Articles A-Z',
        'author': direction === 'desc' ? 'Authors Z-A' : 'Authors A-Z'
    };
    
    const sectionTitle = document.getElementById('homeSectionTitle');
    if (sectionTitle) {
        sectionTitle.textContent = sectionTitles[sortType];
    }
    
    // Preserve original order once (for future reset if needed)
    if (!window.__originalArticlesOrder) {
        window.__originalArticlesOrder = [...articles];
    }
    let sortedArticles = [...articles];
    
    // Load views and comments counts if needed for sorting
    if (sortType === 'popular' || sortType === 'comments') {
        for (const article of sortedArticles) {
            try {
                if (sortType === 'popular') {
                    article._sortViews = await getViews('article', article.id);
                }
                if (sortType === 'comments') {
                    article._sortComments = await getCommentsCount('article', article.id);
                }
            } catch (e) {
                article._sortViews = 0;
                article._sortComments = 0;
            }
        }
    }
    
    switch(sortType) {
        case 'date':
            sortedArticles.sort((a, b) => {
                const diff = new Date(b.createdAt) - new Date(a.createdAt);
                return direction === 'desc' ? diff : -diff;
            });
            break;
        case 'popular':
            sortedArticles.sort((a, b) => {
                const diff = (b._sortViews || 0) - (a._sortViews || 0);
                return direction === 'desc' ? diff : -diff;
            });
            break;
        case 'comments':
            sortedArticles.sort((a, b) => {
                const diff = (b._sortComments || 0) - (a._sortComments || 0);
                return direction === 'desc' ? diff : -diff;
            });
            break;
        case 'title':
            sortedArticles.sort((a, b) => {
                const comp = a.title.localeCompare(b.title);
                return direction === 'desc' ? -comp : comp;
            });
            break;
        case 'author':
            sortedArticles.sort((a, b) => {
                const authorA = (window.teamMembers?.find(m => m.id === a.author)?.name || a.author).toLowerCase();
                const authorB = (window.teamMembers?.find(m => m.id === b.author)?.name || b.author).toLowerCase();
                const comp = authorA.localeCompare(authorB);
                return direction === 'desc' ? -comp : comp;
            });
            break;
    }
    
    articles = sortedArticles;

    // Refresh the articles grid and then reapply current filters (tag + search) to avoid reset conflicts
    const articlesContainer = document.querySelector('.col-md-8');
    if (articlesContainer) {
    const gridHtml = getArticlesGrid(6);
        const gridContainer = articlesContainer.querySelector('.row') || articlesContainer;
        gridContainer.innerHTML = gridHtml;
        setTimeout(() => { 
            loadAllCounts();
            if (typeof applyArticleFilters === 'function') applyArticleFilters();
        }, 0);
    }
}

// Articles Page specific search/filter/sort functions
function searchArticlesPage() {
    const input = document.getElementById('articleSearchInputPage');
    if (!input) return;
    const container = document.querySelector('.search-bar-container');
    if (container){
        if (input.value.trim()) container.classList.add('search-has-value');
        else container.classList.remove('search-has-value');
    }
    applyArticleFiltersPage();
}

function filterByTagPage(tag) {
    window.__activeTagFilterPage = tag === 'all' ? null : tag;
    document.querySelectorAll('.category-filter-page').forEach(btn => {
        const btnTag = btn.getAttribute('data-tag');
        const isActive = (tag === 'all' && btnTag === 'all') || (btnTag === tag);
        if (isActive) {
            btn.classList.add('active');
            btn.style.outline = 'none';
            btn.style.filter = 'none';
            btn.style.transform = 'scale(1.1)';
            btn.style.opacity = '1';
        } else {
            btn.classList.remove('active');
            if (tag === 'all') {
                btn.style.transform = 'scale(1)';
                btn.style.opacity = '1';
            } else {
                btn.style.transform = 'scale(0.92)';
                btn.style.opacity = '0.55';
            }
        }
    });
    applyArticleFiltersPage();
}

function applyArticleFiltersPage(){
    const q = (document.getElementById('articleSearchInputPage')?.value || '').trim().toLowerCase();
    const activeTag = window.__activeTagFilterPage;
    const items = document.querySelectorAll('.article-item-page');

    // Clear old highlights first
    document.querySelectorAll('.article-item-page h5').forEach(node => {
        node.innerHTML = node.innerHTML.replace(/<span class="search-highlight">(.*?)<\/span>/gi, '$1');
    });

    let visible = 0;
    items.forEach(el => {
        const tagsAttr = (el.getAttribute('data-tags') || '').split(',').map(t=>t.trim()).filter(Boolean);
        const title = el.getAttribute('data-title') || '';
        const content = el.getAttribute('data-content') || '';
        const tagString = el.getAttribute('data-tags') || '';
        const matchesTag = !activeTag || tagsAttr.some(t => t === activeTag || t.indexOf(activeTag) !== -1);
        const matchesQuery = !q || title.includes(q) || content.includes(q) || tagString.includes(q);
        const shouldShow = matchesTag && matchesQuery;
        el.style.display = shouldShow ? '' : 'none';
        if (shouldShow){
            if (q){
                const titleEl = el.querySelector('h5');
                if (titleEl) titleEl.innerHTML = highlightTerm(titleEl.textContent, q);
            }
            visible++;
        }
    });
    updateSearchMetaPage(q, visible);
}

function updateSearchMetaPage(query, count) {
    const meta = document.getElementById('searchMetaPage');
    if (!meta) return;
    const inner = meta.querySelector('.search-meta-inner');
    if (!inner) return;
    
    if (query) {
        inner.textContent = `Found ${count} article${count !== 1 ? 's' : ''} matching "${query}"`;
        meta.style.maxHeight = '40px';
        meta.style.opacity = '1';
    } else {
        meta.style.maxHeight = '0';
        meta.style.opacity = '0';
    }
}

// Global sort state for Articles page
if (typeof window.__pageSortType === 'undefined') {
    window.__pageSortType = 'date';
    window.__pageSortDirection = 'desc'; // 'desc' or 'asc'
}

function changeSortTypePage(type) {
    window.__pageSortType = type;
    const typeNames = {
        'date': 'Date',
        'popular': 'Popularity',
        'comments': 'Comments',
        'title': 'Title',
        'author': 'Author'
    };
    const btn = document.getElementById('sortDropdownPage');
    if (btn) {
        btn.innerHTML = `<i class="fas fa-sort me-1"></i>${typeNames[type]}`;
    }
    sortArticlesPage();
}

function toggleSortDirectionPage() {
    window.__pageSortDirection = window.__pageSortDirection === 'desc' ? 'asc' : 'desc';
    const arrow = document.getElementById('sortArrowIconPage');
    if (arrow) {
        arrow.className = window.__pageSortDirection === 'desc' ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
    }
    sortArticlesPage();
}

async function sortArticlesPage() {
    const sortType = window.__pageSortType || 'date';
    const direction = window.__pageSortDirection || 'desc';
    
    // Update section title based on sort type and direction
    const sectionTitles = {
        'date': direction === 'desc' ? 'Latest Articles' : 'Oldest Articles',
        'popular': direction === 'desc' ? 'Most Popular Articles' : 'Least Popular Articles',
        'comments': direction === 'desc' ? 'Most Discussed Articles' : 'Least Discussed Articles',
        'title': direction === 'desc' ? 'Articles Z-A' : 'Articles A-Z',
        'author': direction === 'desc' ? 'Authors Z-A' : 'Authors A-Z'
    };
    
    const sectionTitle = document.getElementById('pageSectionTitle');
    if (sectionTitle) {
        sectionTitle.textContent = sectionTitles[sortType];
    }
    
    if (!window.__originalArticlesOrderPage) {
        window.__originalArticlesOrderPage = [...articles];
    }
    let sortedArticles = [...articles].filter(a => a.published);
    
    // Load views and comments counts if needed for sorting
    if (sortType === 'popular' || sortType === 'comments') {
        for (const article of sortedArticles) {
            try {
                if (sortType === 'popular') {
                    article._sortViews = await getViews('article', article.id);
                }
                if (sortType === 'comments') {
                    article._sortComments = await getCommentsCount('article', article.id);
                }
            } catch (e) {
                article._sortViews = 0;
                article._sortComments = 0;
            }
        }
    }
    
    switch(sortType) {
        case 'date':
            sortedArticles.sort((a, b) => {
                const diff = new Date(b.createdAt) - new Date(a.createdAt);
                return direction === 'desc' ? diff : -diff;
            });
            break;
        case 'popular':
            sortedArticles.sort((a, b) => {
                const diff = (b._sortViews || 0) - (a._sortViews || 0);
                return direction === 'desc' ? diff : -diff;
            });
            break;
        case 'comments':
            sortedArticles.sort((a, b) => {
                const diff = (b._sortComments || 0) - (a._sortComments || 0);
                return direction === 'desc' ? diff : -diff;
            });
            break;
        case 'title':
            sortedArticles.sort((a, b) => {
                const comp = a.title.localeCompare(b.title);
                return direction === 'desc' ? -comp : comp;
            });
            break;
        case 'author':
            sortedArticles.sort((a, b) => {
                const authorA = (window.teamMembers?.find(m => m.id === a.author)?.name || a.author).toLowerCase();
                const authorB = (window.teamMembers?.find(m => m.id === b.author)?.name || b.author).toLowerCase();
                const comp = authorA.localeCompare(authorB);
                return direction === 'desc' ? -comp : comp;
            });
            break;
    }
    
    const gridContainer = document.getElementById('articlesPageGrid');
    if (gridContainer) {
        gridContainer.innerHTML = sortedArticles.map(article => {
            const authorInfo = window.teamMembers?.find(m => m.id === article.author);
            const authorName = authorInfo ? authorInfo.name : article.author;
            const tagList = article.tags || [];
            const primaryTag = tagList[0] || 'general';
            const extraCount = tagList.length > 1 ? tagList.length - 1 : 0;
            const extraRawList = tagList.slice(1);
            const extraList = extraCount > 0 ? extraRawList.join(',') : '';
            const extraBadge = extraCount > 0 ? `<span class="extra-tags-indicator" data-extra-tags="${extraList}" style="background:#00253d; color:#fff; padding:4px 8px; border-radius:12px; font-size:0.6rem; font-weight:600; margin-left:4px; position:relative; cursor:pointer;">+${extraCount}</span>` : '';
            const tagBadgesHtml = `<span class="multi-tag-badges">${getTagBadge(primaryTag)}${extraBadge}</span>`;
            const tagsStr = tagList.join(',');
            const excerpt = article.content?.replace(/<[^>]*>/g, '').substring(0, 200) || '';
            return `
            <div class="col-md-6 col-xl-4 mb-4 article-item-page" data-tags="${tagsStr}" data-title="${article.title.toLowerCase()}" data-content="${excerpt.toLowerCase()}">
                <div class="article-card h-100" onclick="openArticle('${article.id}')" style="cursor: pointer;">
                    <div class="article-card-content" style="background: linear-gradient(135deg, #771510 0%, #cc4125 100%); border-radius: 12px; padding: 20px; color: white; min-height: 280px; position: relative; display: flex; flex-direction: column; justify-content: space-between;">
                        <div class="article-tag-badge" style="position: absolute; top: 15px; left: 15px; display:flex; align-items:center;">${tagBadgesHtml}</div>
                        <div class="article-icon" style="text-align: center; margin: 40px 0 20px;">
                            ${getArticleIcon(primaryTag)}
                        </div>
                        <div>
                            <h5 class="mb-3" style="font-weight: 700; font-size: 1.1rem;">${article.title}</h5>
                            <div class="article-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: rgba(255,255,255,0.8);">
                                <div>
                                    <div>By ${authorName}</div>
                                    <div>${formatDate(article.createdAt)}</div>
                                </div>
                                <div class="article-stats">
                                    <i class="fas fa-eye"></i> <span data-views-id="${article.id}">0</span>
                                    <i class="fas fa-comment ms-2"></i> <span data-comments-id="${article.id}">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
        setTimeout(() => { 
            loadAllCounts();
            if (typeof applyArticleFiltersPage === 'function') applyArticleFiltersPage();
        }, 0);
    }
}

function getWeeklyNewsList() {
    if (!weeklyNews.length) {
        return `
            <div class="empty-state text-center py-4">
                <i class="fas fa-bullhorn" style="font-size: 2.5rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h6 class="text-muted">No announcements</h6>
                <p class="text-muted small">There are no weekly announcements right now.</p>
            </div>
        `;
    }
    
    return weeklyNews.map(announcement => `
        <div class="announcement-card mb-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge ${announcement.type==='assembly' ? 'bg-secondary' : (announcement.type==='updates' ? 'bg-purple-ann' : 'bg-primary')}" style="display:inline-flex; align-items:center; gap:4px;">
                    <i class="fas ${announcement.type==='assembly' ? 'fa-university' : (announcement.type==='updates' ? 'fa-star' : 'fa-bullhorn')}" ></i>${announcement.type==='assembly' ? 'Assembly' : (announcement.type==='updates' ? 'Updates' : 'Weekly News')}
                </span>
                ${announcement.priority === 'high' ? '<span class="badge bg-danger">Important</span>' : ''}
            </div>
            <h6 class="fw-bold">${announcement.title}</h6>
            <p class="mb-2">${announcement.content}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted d-flex align-items-center gap-2">
                    <span><i class="fas fa-calendar"></i> ${formatDate(announcement.createdAt)}</span>
                </small>
                <button class="btn btn-sm btn-outline-primary" onclick="showComments('announcement', '${announcement.id}')">
                    <i class="fas fa-comment"></i> <span id="comments-count-${announcement.id}">0</span>
                </button>
            </div>
        </div>
    `).join('');
}

// (Deprecated getArticoliPage removed; unified to getArticlesPage)

// Articles Page
function getLoginPage(){
    return `
    <div class="container py-5" style="max-width:720px;">
        <div class="card shadow-sm border-0">
            <div class="card-body p-4 p-md-5">
                <h1 class="h3 mb-3 fw-bold d-flex align-items-center"><i class="fas fa-sign-in-alt me-2 text-primary"></i> Login</h1>
                <p class="text-muted">Sign in with your school Google account (<code>@britishschool-timisoara.ro</code>) to post comments.</p>
                <div id="googleBtnContainer" class="my-4 d-flex justify-content-start"></div>
                <div class="alert alert-info small d-flex align-items-center" style="gap:8px;">
                    <i class="fas fa-info-circle fa-lg"></i>
                    <div>
                        We never store your Google password. Google provides a secure one-time token which we verify.
                    </div>
                </div>
                <div class="mt-4">
                    <button class="btn btn-outline-secondary btn-sm" onclick="showPage('home')"><i class="fas fa-arrow-left me-1"></i> Back</button>
                </div>
            </div>
        </div>
    </div>`;
}
async function getArticlesPage() {
    const publishedArticles = articles.filter(a => a.published);
    // Inject scoped style once
    if(!document.getElementById('articles-page-style')){
        const st = document.createElement('style');
        st.id='articles-page-style';
    st.textContent = `
    .badge.bg-purple-ann{background:#6f42c1 !important;}
        .articles-hero{position:relative; padding:70px 0 60px; background: linear-gradient(135deg, #690500 20%, #841600ff 30%, #e0b089 100%); border-radius:32px; overflow:hidden; box-shadow:0 18px 40px -18px rgba(119,21,16,.55);} 
        .articles-hero:before{content:""; position:absolute; inset:0; background:radial-gradient(circle at 20% 25%,rgba(255,255,255,.22),transparent 60%), radial-gradient(circle at 85% 70%,rgba(255,255,255,.18),transparent 65%), linear-gradient(120deg, rgba(255,255,255,.08), transparent);} 
        .articles-hero h1{color:#fff; font-weight:800; letter-spacing:-1px; font-size:3rem; margin:0 0 14px; text-shadow:0 4px 12px rgba(0,0,0,.35);} 
        .articles-hero .hero-icon{display:inline-flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.18); padding:18px 26px; border-radius:56px; margin-bottom:26px; backdrop-filter:blur(10px);}
        .articles-hero p.hero-sub{color:rgba(255,255,255,0.93); font-size:1.05rem; max-width:760px; margin:0 auto 0; line-height:1.5; font-weight:300; letter-spacing:.5px;}
        .articles-stats-bar{display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-top:38px;} 
        .articles-stat{background:rgba(255,255,255,.20); backdrop-filter:blur(12px); padding:14px 26px; border-radius:28px; color:#fff; font-size:.8rem; font-weight:600; letter-spacing:.5px; display:flex; align-items:center; gap:10px; box-shadow:0 6px 18px -8px rgba(0,0,0,.45);} 
    .articles-toolbelt{position:sticky; top:70px; z-index:12; margin-top:-32px; padding:10px 18px 4px; background:rgba(255,255,255,0.82); backdrop-filter:blur(10px); border:1px solid #f0e4d8; border-radius:18px; box-shadow:0 10px 28px -10px rgba(0,0,0,0.15);} 
        .articles-grid{margin-top:28px;} 
        #articlesPageGrid .article-item-page{transition:transform .35s ease, box-shadow .35s ease; border-radius:10px;} 
        #articlesPageGrid .article-item-page:hover{transform:translateY(-6px); box-shadow:0 14px 32px -14px rgba(0,0,0,.35);} 
    #articlesPageGrid .article-card-content{background:linear-gradient(135deg,#771510 0%, #cc4125 100%); box-shadow:0 8px 26px -12px rgba(119,21,16,0.55);} 
        @media (max-width: 768px){ .articles-hero{padding:60px 0 42px;} .articles-hero h1{font-size:2.3rem;} .articles-toolbelt{top:60px;} .articles-stat{padding:10px 18px; border-radius:22px;} }
        `;
        document.head.appendChild(st);
    }
    const total = publishedArticles.length;
    const tagsFreq = {};
    publishedArticles.forEach(a=> (a.tags||[]).forEach(t=>{ tagsFreq[t]=(tagsFreq[t]||0)+1; }));
    const topTag = Object.entries(tagsFreq).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    return `
    <div class="articles-page-bg" style="min-height:100vh; background:linear-gradient(135deg,#faf8f4 0%, #f4e9d9 55%, #faf8f4 100%); padding-top:30px; padding-bottom:60px;">
    <div class="articles-page-wrapper container my-4">
        <section class="articles-hero text-center">
            <div class="hero-icon"><i class="fas fa-newspaper" style="font-size:3.2rem; color:#fff;"></i></div>
            <h1>All Articles</h1>
            <p class="hero-sub">Explore every published story. Use search, tags and sorting to locate exactly what you want.</p>
            <div class="articles-stats-bar" id="articlesHeroStats">
                <div class="articles-stat" data-stat="total"><i class="fas fa-layer-group"></i> <span>Total: <strong>${total}</strong></span></div>
                <div class="articles-stat" data-stat="topTag"><i class="fas fa-tags"></i> <span>Top Tag: <strong>${topTag}</strong></span></div>
                <div class="articles-stat" data-stat="updated"><i class="fas fa-clock"></i> <span>Updated: <strong>${new Date().toLocaleDateString('en-US')}</strong></span></div>
            </div>
        </section>
        ${total===0 ? `
            <div class="text-center py-5">
                <i class="fas fa-newspaper fa-4x text-muted mb-3"></i>
                <p class="text-muted fs-5">No articles available yet.</p>
                <p class="text-muted">Check back soon for the latest stories!</p>
            </div>
        ` : `
        <section class="articles-toolbelt mt-4" aria-label="Articles filters and sorting">
            <div class="article-filter-panel border-0 shadow-0 p-0" style="background:transparent; box-shadow:none; margin:0;">
                <div class="search-bar-container" style="margin:0 0 12px;">
                    <div class="input-group" style="background:#f8f6f2; border-radius:12px; padding:4px 10px;">
                        <span class="input-group-text bg-transparent border-0 pe-2" style="color:#771510;">
                            <i class="fas fa-search"></i>
                        </span>
                        <input type="text" id="articleSearchInputPage" class="form-control border-0" placeholder="Search articles by title or content..." onkeyup="searchArticlesPage()" onfocus="activateSearchBar()" onblur="deactivateSearchBar()" style="box-shadow:none; background:transparent; color:#333;">
                    </div>
                    <div id="searchMetaPage" class="search-meta-collapsed" style="margin-top:4px; font-size:0.65rem; letter-spacing:.5px; text-transform:uppercase; color:#aa6a33; overflow:hidden; padding-left:10px; padding-top:2px; padding-bottom:4px;">
                        <span class="search-meta-inner"></span>
                    </div>
                </div>
                <div class="category-filters dual" style="margin:0 -4px 8px; display:flex; flex-direction:column; gap:6px;">
                    ${(()=>{
                        const tagsTop = ['all','school-news','features','opinion','sports','creative','humor']; // 7 (~60%)
                        const tagsBottom = ['assembly','tech','lifestyle','music','reviews']; // 5 (~40%)
                        const meta = { 'all':'#771510','school-news':'#e74c3c','features':'#f39c12','opinion':'#9b59b6','sports':'#3498db','creative':'#e91e63','humor':'#ff9800','assembly':'#8d6e63','tech':'#2196f3','lifestyle':'#4caf50','music':'#9c27b0','reviews':'#607d8b'};
                        const icons = {
                            'school-news':'fa-graduation-cap','features':'fa-star','opinion':'fa-comment','sports':'fa-running','creative':'fa-palette','humor':'fa-laugh','assembly':'fa-university','tech':'fa-laptop','lifestyle':'fa-leaf','music':'fa-music','reviews':'fa-star-half-alt'
                        };
                        function renderRow(arr){
                            return `<div class='filters-row' style="display:flex; justify-content:center; flex-wrap:wrap;">` + arr.map(tag=>{
                                const label = tag==='all'? 'All Articles' : tag.replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
                                const iconHtml = tag==='all' ? '' : `<i class='fas ${icons[tag] || 'fa-tag'}'></i> `;
                                return `<div class=\"category-filter-page ${tag==='all'?'all-articles active':''}\" data-tag=\"${tag}\" onclick=\"filterByTagPage('${tag}')\" style=\"background:${meta[tag]}; color:#fff; padding:8px 20px; border-radius:24px; cursor:pointer; margin:6px; display:inline-block; font-size:1rem; line-height:1; font-weight:600;\">${tag==='all'?label:`${iconHtml}${label}`}</div>`;
                            }).join('') + `</div>`;
                        }
                        return renderRow(tagsTop) + renderRow(tagsBottom);
                    })()}
                </div>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-2 border-top pt-3" style="border-color:#f0e4d8 !important;">
                    <h3 class="section-title m-0" id="pageSectionTitle">All Articles</h3>
                    <div class="d-flex gap-2 align-items-center">
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="sortDropdownPage" data-bs-toggle="dropdown" aria-expanded="false" style="border-radius:8px;">
                                <i class="fas fa-sort me-1"></i>Date
                            </button>
                            <ul class="dropdown-menu" aria-labelledby="sortDropdownPage">
                                <li><a class="dropdown-item" href="#" onclick="changeSortTypePage('date')"><i class="fas fa-calendar me-2"></i>Date</a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeSortTypePage('popular')"><i class="fas fa-eye me-2"></i>Popularity</a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeSortTypePage('comments')"><i class="fas fa-comment me-2"></i>Comments</a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeSortTypePage('title')"><i class="fas fa-font me-2"></i>Title</a></li>
                                <li><a class="dropdown-item" href="#" onclick="changeSortTypePage('author')"><i class="fas fa-user me-2"></i>Author</a></li>
                            </ul>
                        </div>
                        <button class="btn btn-outline-secondary" id="sortDirectionBtnPage" onclick="toggleSortDirectionPage()" style="border-radius:8px; width:42px; padding:0.375rem 0;" title="Toggle sort direction">
                            <i class="fas fa-arrow-down" id="sortArrowIconPage"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section>
        <section class="articles-grid">
            <div class="row" id="articlesPageGrid">
            ${publishedArticles.map(article => {
                const authorInfo = window.teamMembers?.find(m => m.id === article.author);
                const authorName = authorInfo ? authorInfo.name : article.author;
                const tagList = article.tags || [];
                const primaryTag = tagList[0] || 'general';
                const extraCount = tagList.length > 1 ? tagList.length - 1 : 0;
                const extraRawList = tagList.slice(1);
                const extraList = extraCount > 0 ? extraRawList.join(',') : '';
                const extraBadge = extraCount > 0 ? `<span class=\"extra-tags-indicator\" data-extra-tags=\"${extraList}\" style=\"background:#00253d; color:#fff; padding:4px 8px; border-radius:12px; font-size:0.6rem; font-weight:600; margin-left:4px; position:relative; cursor:pointer;\">+${extraCount}</span>` : '';
                const tagBadgesHtml = `<span class=\"multi-tag-badges\">${getTagBadge(primaryTag)}${extraBadge}</span>`;
                const tagsStr = tagList.join(',');
                const excerpt = article.content?.replace(/<[^>]*>/g, '').substring(0, 200) || '';
                return `
                <div class=\"col-md-6 col-xl-4 mb-4 article-item-page\" data-tags=\"${tagsStr}\" data-title=\"${article.title.toLowerCase()}\" data-content=\"${excerpt.toLowerCase()}\">
                    <div class=\"article-card h-100\" onclick=\"openArticle('${article.id}')\" style=\"cursor:pointer;\">
                        <div class=\"article-card-content\" style=\"border-radius:14px; padding:22px 20px 18px; color:#fff; min-height:290px; position:relative; display:flex; flex-direction:column; justify-content:space-between;\">
                            <div class=\"article-tag-badge\" style=\"position:absolute; top:14px; left:14px; display:flex; align-items:center;\">${tagBadgesHtml}</div>
                            <div class=\"article-icon\" style=\"text-align:center; margin:34px 0 18px;\">${getArticleIcon(primaryTag)}</div>
                            <div>
                                <h5 class=\"mb-3\" style=\"font-weight:700; font-size:1.05rem; line-height:1.2;\">${article.title}</h5>
                                <div class=\"article-meta\" style=\"display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:rgba(255,255,255,0.8);\">
                                    <div><div>By ${authorName}</div><div>${formatDate(article.createdAt)}</div></div>
                                    <div class=\"article-stats\"><i class=\"fas fa-eye\"></i> <span data-views-id=\"${article.id}\">0</span><i class=\"fas fa-comment ms-2\"></i> <span data-comments-id=\"${article.id}\">0</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
            </div>
        </section>`}
    </div>
    </div>`;
}

// Contact Page following the design
// Contacts/About Page (previously getContattiPage)
function getContactsPage() {
    return `
        <div class="container mt-4">
            <!-- Meet Our Team Header -->
            <div class="text-center mb-5">
                <h2 class="team-title" style="color: #5a5a5a; font-weight: 600; font-size: 2.5rem; margin-bottom: 15px;">Meet Our Team</h2>
                <p class="team-subtitle" style="color: #888; font-size: 1.1rem; max-width: 600px; margin: 0 auto;">
                    The Student Voice is powered by dedicated BIST students and supportive teachers.
                </p>
            </div>

            <!-- Editor-in-Chief (Ioana) - Featured Position -->
            <div class="row justify-content-center mb-5">
                <div class="col-md-4">
                    <div class="team-card" style="border-left: 5px solid #9b59b6; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); height: 100%;">
                        <div class="team-icon mb-3" style="text-align: center;">
                            <i class="fas fa-crown" style="font-size: 3rem; color: #9b59b6;"></i>
                        </div>
                        <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px; font-size: 1.3rem;">Ioana</h5>
                        <p style="color: #9b59b6; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 1rem;">Editor-in-Chief</p>
                        <p style="color: #888; font-size: 0.9rem; text-align: center; line-height: 1.5;">
                            Leads the editorial team and oversees all content for The Student Voice
                        </p>
                    </div>
                </div>
            </div>

            <!-- Editorial Team -->
            <div class="team-section mb-5">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-pencil-alt" style="color: #ff6b6b; font-size: 1.5rem; margin-right: 15px;"></i>
                    <h3 style="color: #5a5a5a; font-weight: 600; font-size: 1.8rem; margin: 0;">Editorial Team</h3>
                </div>
                
                <div class="row">
                    <!-- Nicole - Chief Managing Editor -->
                    <div class="col-md-4 mb-4">
                        <div class="team-card" style="border-left: 5px solid #3498db; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); height: 100%;">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-clipboard-list" style="font-size: 2.5rem; color: #3498db;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">Nicole</h5>
                            <p style="color: #3498db; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 0.9rem;">Chief Managing Editor</p>
                            <p style="color: #888; font-size: 0.85rem; text-align: center; line-height: 1.4;">
                                Organizes & helps others and edits the final outcome
                            </p>
                        </div>
                    </div>

                    <!-- Anna & Team - Y10 & 11 Editors -->
                    <div class="col-md-4 mb-4">
                        <div class="team-card" style="border-left: 5px solid #e74c3c; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); height: 100%;">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-users" style="font-size: 2.5rem; color: #e74c3c;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">Anna & Team</h5>
                            <p style="color: #e74c3c; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 0.9rem;">Y10 & 11 Editors</p>
                            <p style="color: #888; font-size: 0.85rem; text-align: center; line-height: 1.4;">
                                Year 10 & 11 students who help others write & edit
                            </p>
                        </div>
                    </div>

                    <!-- Writers & Reporters -->
                    <div class="col-md-4 mb-4">
                        <div class="team-card" style="border-left: 5px solid #95a5a6; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); height: 100%;">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-newspaper" style="font-size: 2.5rem; color: #95a5a6;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">Writers & Reporters</h5>
                            <p style="color: #95a5a6; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 0.9rem;">Y7, Y8, Y9 Students</p>
                            <p style="color: #888; font-size: 0.85rem; text-align: center; line-height: 1.4;">
                                Create articles for our digital newspaper
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Creative & Digital Team -->
            <div class="team-section mb-5">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-palette" style="color: #e91e63; font-size: 1.5rem; margin-right: 15px;"></i>
                    <h3 style="color: #5a5a5a; font-weight: 600; font-size: 1.8rem; margin: 0;">Creative & Digital Team</h3>
                </div>
                
                <div class="row">
                    <!-- Horea - Photo Journalist -->
                    <div class="col-md-4 mb-4">
                        <div class="team-card" style="border-left: 5px solid #e74c3c; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); height: 100%;">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-camera" style="font-size: 2.5rem; color: #e74c3c;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">Horea</h5>
                            <p style="color: #e74c3c; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 0.9rem;">Photo Journalist & Co-Editor</p>
                            <p style="color: #888; font-size: 0.85rem; text-align: center; line-height: 1.4;">
                                Captures BIST life through photography
                            </p>
                        </div>
                    </div>

                    <!-- Samuele - Digital Creator -->
                    <div class="col-md-4 mb-4">
                        <div class="team-card" style="border-left: 5px solid #3498db; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); height: 100%;">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-laptop-code" style="font-size: 2.5rem; color: #3498db;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">FastArcherX</h5>
                            <p style="color: #3498db; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 0.9rem;">Digital Creator & Web Developer</p>
                            <p style="color: #888; font-size: 0.85rem; text-align: center; line-height: 1.4;">
                                Creates our online platform and digital content
                            </p>
                        </div>
                    </div>

                    <!-- Designer & Layout Editor -->
                    <div class="col-md-4 mb-4">
                        <div class="team-card" style="border-left: 5px solid #e91e63; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); height: 100%;">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-paint-brush" style="font-size: 2.5rem; color: #e91e63;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">Designer & Layout Editor</h5>
                            <p style="color: #e91e63; font-weight: 600; text-align: center; margin-bottom: 15px; font-size: 0.9rem;">Position Open</p>
                            <p style="color: #888; font-size: 0.85rem; text-align: center; line-height: 1.4;">
                                For magazine design and layout
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Support Team -->
            <div class="team-section mb-5">
                <div class="d-flex align-items-center mb-4">
                    <i class="fas fa-graduation-cap" style="color: #f39c12; font-size: 1.5rem; margin-right: 15px;"></i>
                    <h3 style="color: #5a5a5a; font-weight: 600; font-size: 1.8rem; margin: 0;">Support Team</h3>
                </div>
                
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="team-card" style="border-left: 5px solid #27ae60; background: white; border-radius: 15px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                            <div class="team-icon mb-3" style="text-align: center;">
                                <i class="fas fa-chalkboard-teacher" style="font-size: 3rem; color: #27ae60;"></i>
                            </div>
                            <h5 style="color: #5a5a5a; font-weight: 600; text-align: center; margin-bottom: 5px;">English Teachers</h5>
                            <p style="color: #27ae60; font-weight: 600; text-align: center; margin-bottom: 15px;">Support Team & Proofreaders</p>
                            <p style="color: #888; text-align: center; line-height: 1.5;">
                                Our amazing English teachers who guide us, proofread our work, and help us become better writers!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
// Backward compatibility (legacy Italian function name)
const getContattiPage = getContactsPage;

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
                                <input type="text" name="username" autocomplete="username" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;" tabindex="-1" aria-hidden="true">
                                <div class="mb-3">
                                    <label for="adminPassword" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="adminPassword" placeholder="Enter admin password" required autocomplete="new-password">
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
                    <a class="nav-link active" href="#submit-article-tab" data-bs-toggle="tab" style="color: #d5a32d !important">Submit New Article</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#articles-tab" data-bs-toggle="tab" style="color: #d5a32d !important">Manage Articles</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#weekly-news-tab" data-bs-toggle="tab" style="color: #d5a32d !important">Manage Weekly News</a>
                </li>
                
                <li class="nav-item">
                    <a class="nav-link" href="#messages-tab" data-bs-toggle="tab" style="color: #d5a32d !important">Messages</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#comments-tab" data-bs-toggle="tab" style="color: #d5a32d !important">Comment Moderation</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#gallery-tab" data-bs-toggle="tab" style="color: #d5a32d !important">Photo Gallery</a>
                </li>
            </ul>
            
            <div class="tab-content mt-4">
                <div class="tab-pane fade show active" id="submit-article-tab">
                    ${getSubmitArticleForm()}
                </div>
                <div class="tab-pane fade" id="articles-tab">
                    ${getArticleManagement()}
                </div>
                <div class="tab-pane fade" id="weekly-news-tab">
                    ${getWeeklyNewsManagement()}
                </div>
                
                <div class="tab-pane fade" id="messages-tab">
                    ${getMessageManagement()}
                </div>
                <div class="tab-pane fade" id="comments-tab">
                    ${getCommentModeration()}
                </div>
                <div class="tab-pane fade" id="gallery-tab">
                    ${getPhotoGalleryManagement()}
                </div>
            </div>
        </div>
    `;
}

function getSubmitArticleForm() {
    // Initialize Quill editor after the form is rendered
    setTimeout(() => {
        if (document.getElementById('editor-container')) {
            initializeQuillEditor('#editor-container');
        }
    }, 100);

    return `
        <div class="admin-section">
            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h4 class="mb-0">Submit New Article</h4>
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
                                            <label for="articleTagsInput" class="form-label">Tags <span class="text-danger">*</span></label>
                                            <div id="multiTagSelector" class="multi-tag-selector" style="border:1px solid #d9c9b5; border-radius:8px; padding:8px; background:#fcfbf9;">
                                                <div class="selected-tags" id="selectedTags" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;"></div>
                                                <div class="d-flex" style="gap:6px; flex-wrap:wrap;">
                                                    <select id="articleTagsInput" class="form-select" style="flex:1; min-width:180px;">
                                                        <option value="">Add tag...</option>
                                                        <option value="school-news">School News</option>
                                                        <option value="features">Features</option>
                                                        <option value="opinion">Opinion</option>
                                                        <option value="sports">Sports</option>
                                                        <option value="creative">Creative</option>
                                                        <option value="humor">Humor</option>
                                                        <option value="assembly">Assembly</option>
                                                        <option value="tech">Tech</option>
                                                        <option value="lifestyle">Lifestyle</option>
                                                        <option value="music">Music</option>
                                                        <option value="reviews">Reviews</option>
                                                    </select>
                                                    <button type="button" class="btn btn-outline-primary" onclick="clearSelectedTags()" style="white-space:nowrap;">Clear</button>
                                                </div>
                                                <input type="hidden" id="articleTagsHidden" required>
                                                <small class="text-muted">Select multiple tags if needed. The first becomes the primary.</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Article Content <span class="text-danger">*</span></label>
                                    <div id="editor-container" style="height: 350px; border-radius: 10px; border: 2px solid #e8ecef;"></div>
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
                                    <small class="text-muted">You can upload multiple photos for your article.</small>
                                </div>
                                
                                <div class="d-flex justify-content-end gap-2">
                                    <button type="button" class="btn btn-outline-secondary" onclick="clearSubmitForm()">
                                        Clear Form
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-paper-plane"></i> Post Article
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

function clearSubmitForm() {
    const form = document.getElementById('submitArticleForm');
    if (form) form.reset();
    if (quillEditor) quillEditor.setContents([]);
}

function closeSubmitForm() {
    // Navigate back or simply clear
    clearSubmitForm();
    // Could switch tabs or hide section if needed
}

function getArticleManagement(){
        const total = articles.length;
        const published = articles.filter(a=>a.published).length;
        const drafts = total - published;
        const featured = articles.filter(a=>a.featured).length;
        const tagCounts = {};
        articles.forEach(a=> (a.tags||[]).forEach(t=> tagCounts[t]=(tagCounts[t]||0)+1));
        const topTag = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
        const allTags = Object.keys(tagCounts).sort();
        return `
        <style id="admin-article-manager-style">
            .article-manager-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px;background:#faf8f5;padding:12px 14px;border:1px solid #e4d6c5;border-radius:12px;}
            .article-manager-stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;}
            .article-stat-pill{background:linear-gradient(135deg,#771510,#c53c23);color:#fff;padding:10px 16px;border-radius:30px;font-size:.75rem;letter-spacing:.5px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px -6px rgba(0,0,0,.3)}
            #articlesAdminTable th{white-space:nowrap;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px;background:#f3ece5;}
            #articlesAdminTable td{vertical-align:middle;font-size:.85rem;}
            #articlesAdminTable tbody tr.draft{background:#fff8e6;}
            #articlesAdminTable tbody tr:hover{background:#f9f5f2;}
            .actions-col button{margin:0 2px 4px;}
            .tag-badge-sm{display:inline-block;padding:3px 8px;border-radius:12px;font-size:.6rem;font-weight:600;background:#00253d;color:#fff;}
            .quick-edit-modal .form-label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
        </style>
        <div class="admin-section" id="articleManagerRoot">
            <h4 class="mb-3 d-flex align-items-center gap-2"><i class="fas fa-folder-open text-primary"></i> Articles Management</h4>
            <div class="article-manager-stats">
                <div class="article-stat-pill"><i class="fas fa-database"></i>Total <strong>${total}</strong></div>
                <div class="article-stat-pill"><i class="fas fa-check-circle"></i>Published <strong>${published}</strong></div>
                <div class="article-stat-pill"><i class="fas fa-pencil-alt"></i>Drafts <strong>${drafts}</strong></div>
                <div class="article-stat-pill"><i class="fas fa-star"></i>Featured <strong>${featured}</strong></div>
                <div class="article-stat-pill"><i class="fas fa-tag"></i>Top Tag <strong>${topTag}</strong></div>
            </div>
            <div class="article-manager-toolbar">
                <div class="flex-grow-1">
                    <input type="text" class="form-control" id="amSearch" placeholder="Search title or content..." />
                </div>
                <div>
                    <select id="amStatus" class="form-select form-select-sm">
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>
                <div>
                    <select id="amTag" class="form-select form-select-sm">
                        <option value="">All Tags</option>
                        ${allTags.map(t=>`<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <select id="amSort" class="form-select form-select-sm">
                        <option value="date_desc">Date ↓</option>
                        <option value="date_asc">Date ↑</option>
                        <option value="title_asc">Title A-Z</option>
                        <option value="title_desc">Title Z-A</option>
                        <option value="views_desc">Views ↓</option>
                        <option value="comments_desc">Comments ↓</option>
                    </select>
                </div>
                <button class="btn btn-outline-secondary btn-sm" id="amRefresh"><i class="fas fa-sync-alt"></i></button>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle" id="articlesAdminTable">
                    <thead><tr>
                        <th style="width:30px;"></th>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Tags</th>
                        <th>Status</th>
                        <th>Views</th>
                        <th>Comm.</th>
                        <th>Created</th>
                        <th style="min-width:170px;">Actions</th>
                    </tr></thead>
                    <tbody id="amTbody">${renderArticleAdminRows(articles)}</tbody>
                </table>
            </div>
            <div class="text-muted small" id="amCountFooter"></div>
        </div>`;
}

function renderArticleAdminRows(list){
        return list.map(a=>{
                const primary = (a.tags||[])[0] || 'general';
                const extra = (a.tags||[]).length>1 ? `<span class=\"badge bg-dark ms-1\">+${(a.tags||[]).length-1}</span>` : '';
                return `<tr data-id='${a.id}' class='${a.published? '' : 'draft'}'>
                        <td><input type='checkbox' class='form-check-input am-row-check'></td>
                        <td><span class='fw-semibold'>${escapeHtml(a.title)}</span><br><span class='text-muted small'>${getArticleExcerpt(a.content,70)}</span></td>
                        <td>${escapeHtml(a.author||'—')}</td>
                        <td><span class='tag-badge-sm'>${primary}</span>${extra}</td>
                        <td>${a.featured? '<span class="badge bg-info me-1">★</span>':''}<span class='badge ${a.published? 'bg-success':'bg-warning'}'>${a.published? 'Published':'Draft'}</span></td>
                        <td data-views='${a.id}' class='text-center text-muted'>—</td>
                        <td data-comments='${a.id}' class='text-center text-muted'>—</td>
                        <td><span class='small'>${formatDate(a.createdAt)}</span></td>
                        <td class='actions-col'>
                            <button class='btn btn-sm btn-outline-primary' title='View' onclick="openArticle('${a.id}')"><i class='fas fa-eye'></i></button>
                            <button class='btn btn-sm btn-outline-secondary' title='Quick Edit' onclick="openQuickEditArticle('${a.id}')"><i class='fas fa-edit'></i></button>
                            ${a.published? `<button class='btn btn-sm btn-warning' title='Unpublish' onclick="handleUnpublishArticle('${a.id}')"><i class='fas fa-eye-slash'></i></button>`:`<button class='btn btn-sm btn-success' title='Publish' onclick="handlePublishArticle('${a.id}')"><i class='fas fa-paper-plane'></i></button>`}
                            ${a.featured? `<button class='btn btn-sm btn-outline-secondary' title='Unfeature' onclick="handleUnfeatureArticle('${a.id}')"><i class='fas fa-star-half-alt'></i></button>`:`<button class='btn btn-sm btn-outline-info' title='Feature' onclick="handleFeatureArticle('${a.id}')"><i class='fas fa-star'></i></button>`}
                            <button class='btn btn-sm btn-outline-danger' title='Delete' onclick="handleDeleteArticle('${a.id}')"><i class='fas fa-trash'></i></button>
                        </td>
                </tr>`;
        }).join('');
}

// After admin panel loads, we must enhance the table (events, filtering, metrics)
window.addEventListener('load', ()=>{ setTimeout(initArticleManagerEnhancements, 500); });
function initArticleManagerEnhancements(){
        const root = document.getElementById('articleManagerRoot');
        if(!root) return; // not on admin page
        const searchEl = document.getElementById('amSearch');
        const statusEl = document.getElementById('amStatus');
        const tagEl = document.getElementById('amTag');
        const sortEl = document.getElementById('amSort');
        const refreshBtn = document.getElementById('amRefresh');
        const tbody = document.getElementById('amTbody');
        const footer = document.getElementById('amCountFooter');
        let debounceTimer = null;
        function recompute(){
                const filtered = filterSortArticles({
                        term: searchEl.value.trim().toLowerCase(),
                        status: statusEl.value,
                        tag: tagEl.value,
                        sort: sortEl.value
                });
                tbody.innerHTML = renderArticleAdminRows(filtered);
                footer.textContent = `${filtered.length} article(s) shown`;
                lazyLoadMetrics(filtered.map(a=>a.id));
        }
        function debounced(){ clearTimeout(debounceTimer); debounceTimer=setTimeout(recompute, 180); }
        [searchEl,statusEl,tagEl,sortEl].forEach(el=> el && el.addEventListener('input', debounced));
        refreshBtn && refreshBtn.addEventListener('click', async ()=>{ await loadAllData(); recompute(); });
        recompute();
}

function filterSortArticles(opts){
        let list = [...articles];
        if(opts.status==='published') list = list.filter(a=>a.published);
        else if(opts.status==='draft') list = list.filter(a=>!a.published);
        if(opts.tag) list = list.filter(a=> (a.tags||[]).includes(opts.tag));
        if(opts.term){
                list = list.filter(a=> (a.title||'').toLowerCase().includes(opts.term) || (a.content||'').toLowerCase().includes(opts.term));
        }
        switch(opts.sort){
                case 'date_asc': list.sort((a,b)=>a.createdAt-b.createdAt); break;
                case 'title_asc': list.sort((a,b)=>(a.title||'').localeCompare(b.title||'')); break;
                case 'title_desc': list.sort((a,b)=>(b.title||'').localeCompare(a.title||'')); break;
                case 'views_desc': list.sort((a,b)=> (b._views||0)-(a._views||0)); break; // will update after metrics loaded
                case 'comments_desc': list.sort((a,b)=> (b._comments||0)-(a._comments||0)); break;
                default: list.sort((a,b)=>b.createdAt-a.createdAt); // date_desc
        }
        return list;
}

async function lazyLoadMetrics(ids){
        for(const id of ids){
                try {
                        const v = await getViews('article', id);
                        const c = await getCommentsCount('article', id);
                        const rowViews = document.querySelector(`[data-views='${id}']`);
                        const rowComments = document.querySelector(`[data-comments='${id}']`);
                        const a = articles.find(a=>a.id===id);
                        if(a){ a._views = v; a._comments = c; }
                        if(rowViews) rowViews.textContent = v;
                        if(rowComments) rowComments.textContent = c;
                } catch{}
        }
}

function escapeHtml(str){
        return (str||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}

// Quick Edit Modal
function openQuickEditArticle(id){
        const article = articles.find(a=>a.id===id); if(!article){ alert('Article not found'); return; }
        const modalId='quickEditArticleModal';
        const existing=document.getElementById(modalId); if(existing) existing.remove();
        const tagOptions = ['school-news','features','opinion','sports','creative','humor','assembly','tech','lifestyle','music','reviews'];
        const html = `<div class='modal fade quick-edit-modal' id='${modalId}' tabindex='-1'>
            <div class='modal-dialog modal-lg'>
                <div class='modal-content'>
                    <div class='modal-header'><h5 class='modal-title'>Quick Edit</h5><button class='btn-close' data-bs-dismiss='modal'></button></div>
                    <div class='modal-body'>
                        <form id='quickEditForm'>
                            <div class='mb-3'>
                                <label class='form-label'>Title</label>
                                <input type='text' class='form-control' id='qeTitle' value="${escapeHtml(article.title)}" required>
                            </div>
                            <div class='mb-3'>
                                <label class='form-label'>Primary Tag</label>
                                <select id='qePrimaryTag' class='form-select'>
                                    ${tagOptions.map(t=>`<option value='${t}' ${ (article.tags||[])[0]===t? 'selected':''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class='mb-3 form-check'>
                                <input type='checkbox' class='form-check-input' id='qeFeatured' ${article.featured? 'checked':''}>
                                <label class='form-check-label' for='qeFeatured'>Featured</label>
                            </div>
                            <div class='mb-3 form-check'>
                                <input type='checkbox' class='form-check-input' id='qePublished' ${article.published? 'checked':''}>
                                <label class='form-check-label' for='qePublished'>Published</label>
                            </div>
                            <div class='mb-3'>
                                <label class='form-label'>Excerpt (auto from content)</label>
                                <div class='small text-muted'>${escapeHtml(getArticleExcerpt(article.content,160))}</div>
                            </div>
                        </form>
                    </div>
                    <div class='modal-footer'>
                        <button class='btn btn-outline-secondary' data-bs-dismiss='modal'>Close</button>
                        <button class='btn btn-primary' onclick="saveQuickEditArticle('${article.id}')"><i class='fas fa-save me-1'></i>Save Changes</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const m = new bootstrap.Modal(document.getElementById(modalId)); m.show();
}

async function saveQuickEditArticle(id){
        const article = articles.find(a=>a.id===id); if(!article){ alert('Article not found'); return; }
        const updated = { ...article };
        updated.title = document.getElementById('qeTitle').value.trim();
        const primary = document.getElementById('qePrimaryTag').value;
        const existingTags = [...(article.tags||[])];
        if(existingTags.length){ existingTags[0]=primary; } else { existingTags.push(primary); }
        updated.tags = existingTags;
        updated.featured = document.getElementById('qeFeatured').checked;
        updated.published = document.getElementById('qePublished').checked;
        try {
                // Send update to backend if online
                if(window.enhancedDatabase?.isOnline){
                        const base = (window.enhancedDatabase.apiBaseUrl||'http://localhost:3001');
                        const res = await fetch(base + '/articles/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updated) });
                        if(!res.ok) throw new Error('Server responded ' + res.status);
                }
                // Update local cache
                const idx = articles.findIndex(a=>a.id===id); if(idx>=0) articles[idx]=updated;
                await loadAllData();
                showPage('admin');
                setTimeout(()=>{ const tab = document.querySelector('[href="#articles-tab"]'); if(tab){ new bootstrap.Tab(tab).show(); } }, 150);
        } catch(e){ console.error(e); alert('Save failed: ' + e.message); }
}

function getWeeklyNewsManagement() {
    return `
        <div class="admin-section">
            <h4>Announcements Management</h4>
            <button class="btn btn-primary mb-3" onclick="showAddWeeklyNewsForm()">
                <i class="fas fa-plus"></i> New Announcement
            </button>
            
            <div id="addAnnouncementForm" style="display: none;" class="card mb-4">
                <div class="card-body">
                    <h5>New Announcement</h5>
                    <form onsubmit="handleAddWeeklyNews(event)">
                        <div class="mb-3">
                            <label class="form-label">Title</label>
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
                        <div class="mb-3">
                            <label class="form-label">Tipo</label>
                            <select class="form-control" id="announcementType">
                                <option value="weekly">Weekly News</option>
                                <option value="assembly">Assembly</option>
                                <option value="updates">Updates</option>
                            </select>
                            <small class="text-muted">Scegli la categoria dell'annuncio</small>
                        </div>
                        <div class="text-end">
                            <button type="button" class="btn btn-secondary me-2" onclick="hideAddWeeklyNewsForm()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Announcement</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="weeklyNews-list">
                ${weeklyNews.map(announcement => `
                    <div class="admin-item ${announcement.priority === 'high' ? 'priority-high' : ''}">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6 class="d-flex align-items-center gap-2" style="flex-wrap:wrap;">
                                    ${announcement.type ? `<span class="badge ${announcement.type==='assembly' ? 'bg-secondary' : (announcement.type==='updates' ? 'bg-purple-ann' : 'bg-primary')}" style="font-size:0.65rem; letter-spacing:.5px; display:inline-flex; align-items:center; gap:4px;"><i class="fas ${announcement.type==='assembly' ? 'fa-university' : (announcement.type==='updates' ? 'fa-star' : 'fa-bullhorn')}"></i>${announcement.type==='assembly' ? 'Assembly' : (announcement.type==='updates' ? 'Updates' : 'Weekly News')}</span>` : ''}
                                    <span>${announcement.title}</span>
                                </h6>
                                <p class="text-muted">${announcement.content.substring(0, 100)}...</p>
                                <small class="text-muted">
                                    ${formatDate(announcement.createdAt)} • Priorità: ${announcement.priority === 'high' ? 'Alta' : 'Normale'}
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
            <h4>Received Messages</h4>
            <p class="text-muted">Contact form submissions will appear here.</p>
        </div>
    `;
}

function getDataManagementTab() {
    return `
        <div class="admin-section">
            <h4 class="mb-4">Data Management & Backup</h4>
            
            <!-- Export Section -->
            <div class="row mb-5">
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="fas fa-download me-2"></i>Export Data</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">Download your data as JSON files to backup or share with other administrators.</p>
                            
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary" onclick="handleExportData('articles')">
                                    <i class="fas fa-newspaper me-2"></i>Export Articles Only
                                </button>
                                <button class="btn btn-outline-success" onclick="handleExportData('weeklyNews')">
                                    <i class="fas fa-bullhorn me-2"></i>Export Announcements Only
                                </button>
                                <button class="btn btn-primary" onclick="handleExportData('all')">
                                    <i class="fas fa-archive me-2"></i>Export Complete Backup
                                </button>
                            </div>
                            
                            <div class="mt-3">
                                <small class="text-muted">
                                    <i class="fas fa-info-circle"></i> 
                                    Exported files can be imported on any BIST News site to restore content.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Import Section -->
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0"><i class="fas fa-upload me-2"></i>Import Data</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">Upload JSON files to restore or add content from backups.</p>
                            
                            <div class="mb-3">
                                <label for="importFile" class="form-label">Select JSON File</label>
                                <input type="file" class="form-control" id="importFile" accept=".json" onchange="handleFileSelect(this)">
                            </div>
                            
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" onclick="handleImportData()" id="importBtn" disabled>
                                    <i class="fas fa-upload me-2"></i>Import Selected File
                                </button>
                            </div>
                            
                            <div class="mt-3">
                                <small class="text-muted">
                                    <i class="fas fa-exclamation-triangle"></i> 
                                    Importing will merge with existing data. Create a backup first!
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Section -->
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Database Statistics</h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-md-3">
                                    <div class="stat-item">
                                        <h3 class="text-primary" id="articleCount">0</h3>
                                        <p class="mb-0">Total Articles</p>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-item">
                                        <h3 class="text-success" id="publishedCount">0</h3>
                                        <p class="mb-0">Published Articles</p>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-item">
                                        <h3 class="text-warning" id="announcementCount">0</h3>
                                        <p class="mb-0">Announcements</p>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-item">
                                        <h3 class="text-info" id="commentCount">0</h3>
                                        <p class="mb-0">Total Comments</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Danger Zone -->
            <div class="row">
                <div class="col-md-12">
                    <div class="card border-danger">
                        <div class="card-header bg-danger text-white">
                            <h5 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Danger Zone</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-danger">
                                <strong>Warning:</strong> These actions cannot be undone. Make sure to export your data before proceeding.
                            </p>
                            
                            <button class="btn btn-outline-danger" onclick="handleClearAllData()">
                                <i class="fas fa-trash-alt me-2"></i>Clear All Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getCommentModeration() {
    return `
        <div class="admin-section">
            <h4>Comment Moderation</h4>
            <div class="comment-moderation-list">
                <div id="allComments">
                    <p class="text-center">Loading comments...</p>
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
                    <i class="fas fa-comment"></i> Comments (<span id="comments-count-reader-${article.id}">0</span>)
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
            const commentsTab = document.querySelector('a[href="#comments-tab"]');
            if (commentsTab) {
                // Initial load
                loadAllCommentsForModeration();
                // Reload when tab is clicked
                commentsTab.addEventListener('shown.bs.tab', function () {
                    loadAllCommentsForModeration();
                });
            }

            const galleryTab = document.querySelector('a[href="#gallery-tab"]');
            if (galleryTab) {
                galleryTab.addEventListener('shown.bs.tab', function () {
                    loadAdminAlbums();
                });
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
    alert('Article saved successfully! Remember to upload the PDF files into folder magazine/' + folderName + '/');
        
        // Reload data and refresh admin panel
        await loadAllData();
        showPage('admin');
        hideAddArticleForm();
        
    } catch (error) {
    alert('Error while saving: ' + error.message);
    }
}

async function handlePublishArticle(articleId) {
    try {
        const article = articles.find(a => a.id === articleId);
    if (!article) throw new Error('Article not found');
        const base = ((window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001')
            .replace(/\/$/, '')
            .replace(/\/api$/, '');
        const res = await fetch(`${base}/api/articles/${articleId}/publish`, { method: 'POST' });
    if (!res.ok) throw new Error('Server error ' + res.status);
        const data = await res.json();
        // Update local cache
        const idx = articles.findIndex(a => a.id === articleId);
        if (idx >= 0) articles[idx] = { ...articles[idx], ...data.article };
    alert('Article published successfully!');
        await loadAllData();
        showPage('admin');
    } catch (e) {
        console.error(e);
    alert('Error during publish: ' + e.message);
    }
}

async function handleUnpublishArticle(articleId) {
    if (!confirm('Are you sure you want to unpublish this article?')) return;
    try {
        const article = articles.find(a => a.id === articleId);
    if (!article) throw new Error('Article not found');
        const base = ((window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001')
            .replace(/\/$/, '')
            .replace(/\/api$/, '');
        const res = await fetch(`${base}/api/articles/${articleId}/unpublish`, { method: 'POST' });
    if (!res.ok) throw new Error('Server error ' + res.status);
        const data = await res.json();
        const idx = articles.findIndex(a => a.id === articleId);
        if (idx >= 0) articles[idx] = { ...articles[idx], ...data.article };
    alert('Article unpublished successfully!');
        await loadAllData();
        showPage('admin');
    } catch (e) {
        console.error(e);
    alert('Error while unpublishing: ' + e.message);
    }
}

async function handleFeatureArticle(articleId){
    try {
        const base = ((window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001').replace(/\/$/, '').replace(/\/api$/, '');
        const res = await fetch(`${base}/api/articles/${articleId}/feature`, { method:'POST' });
        if(!res.ok) throw new Error('Server error '+res.status);
        await loadAllData();
        showPage('admin');
    } catch(e){
        alert('Error featuring article: '+ e.message);
    }
}
async function handleUnfeatureArticle(articleId){
    try {
        const base = ((window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001').replace(/\/$/, '').replace(/\/api$/, '');
        const res = await fetch(`${base}/api/articles/${articleId}/unfeature`, { method:'POST' });
        if(!res.ok) throw new Error('Server error '+res.status);
        await loadAllData();
        showPage('admin');
    } catch(e){
        alert('Error unfeaturing article: '+ e.message);
    }
}
window.handleFeatureArticle = handleFeatureArticle;
window.handleUnfeatureArticle = handleUnfeatureArticle;

async function handleDeleteArticle(articleId) {
    if (confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
        try {
            await deleteArticle(articleId);
            alert('Article deleted successfully!');
            await loadAllData();
            showPage('admin'); // Refresh admin panel
        } catch (error) {
            alert('Error during deletion: ' + error.message);
        }
    }
}

async function loadAllCommentsForModeration() {
    try {
        const commentsContainer = document.getElementById('allComments');
    if (!commentsContainer) { if (window.DEBUG_COMMENTS) console.log('allComments container not found'); return; }
        
        const allComments = await loadAllComments();
        
        if (allComments.length === 0) {
            commentsContainer.innerHTML = '<p class="text-muted">No comments to moderate yet.</p>';
        } else {
            commentsContainer.innerHTML = allComments.map(comment => {
                // Find the article title, if it's an article comment
                let itemTitle = 'N/A';
                if (comment.itemType === 'article') {
                    const article = articles.find(a => a.id === comment.itemId);
                    itemTitle = article ? `Article: "${article.title}"` : 'Article: (Not Found)';
                } else if (comment.itemType === 'announcement') {
                    const announcement = weeklyNews.find(w => w.id === comment.itemId);
                    itemTitle = announcement ? `Announcement: "${announcement.title}"` : 'Announcement: (Not Found)';
                }

                return `
                <div class="comment-moderation-item mb-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${comment.author}</h6>
                                    <small class="text-muted">
                                        ${formatDate(comment.createdAt)} • 
                                        On: ${itemTitle}
                                        ${comment.editedByAdmin ? '<span class="text-muted fst-italic">(edited by admin)</span>' : ''}
                                    </small>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary me-2" onclick="handleEditComment('${comment.id}', \`${comment.content}\`)">
                                                                               <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteComment('${comment.id}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                            <p class="mt-2 mb-0">${comment.content}</p>
                        </div>
                    </div>
                </div>
            `}).join('');
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        const container = document.getElementById('allComments');
        if (container) {
            container.innerHTML = '<p class="text-danger">Error loading comments.</p>';
        }
    }
}

async function handleDeleteComment(commentId) {
    if (confirm('Are you sure you want to delete this comment?')) {
        try {
            await deleteComment(commentId);
            alert('Comment deleted successfully!');
            loadAllCommentsForModeration(); // Reload comments
        } catch (error) {
            alert('Error deleting comment: ' + error.message);
        }
    }
}

async function handleEditComment(commentId, currentContent) {
    const newContent = prompt('Enter the new content for the comment:', currentContent);
    if (newContent !== null && newContent.trim() !== '') {
        try {
            await updateComment(commentId, newContent);
            alert('Comment updated successfully!');
            loadAllCommentsForModeration(); // Reload comments
        } catch (error) {
            alert('Error updating comment: ' + error.message);
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
    const type = document.getElementById('announcementType')?.value || 'weekly';
    
    try {
    await saveWeeklyNews({ title, content, priority, type });
        alert('Weekly news saved successfully!');
        
        // Reload data and refresh admin panel
        await loadAllData();
        showPage('admin');
        
    } catch (error) {
    alert('Error while saving: ' + error.message);
    }
}

async function deleteWeeklyNews(id) {
    if (confirm('Are you sure you want to delete this announcement?')) {
        try {
            await deleteWeeklyNewsFromDB(id);
            alert('Announcement deleted successfully!');
            await loadAllData();
            showPage('admin');
        } catch (error) {
            alert('Error during deletion: ' + error.message);
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
                    <h5 class="modal-title">Comments</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="commentsList">
                        <p class="text-center">Loading comments...</p>
                    </div>
                    <div class="comment-form mt-4" data-gated="1">
                        <h6 class="mb-3">Add a comment</h6>
                        <div data-if-logged-out>
                            <div class="alert alert-warning py-2 small mb-3"><i class="fas fa-lock me-1"></i> Please <a href="#" onclick="showPage('login')">login</a> with your school account to comment.</div>
                        </div>
                        <form data-if-logged-in class="d-none" onsubmit="handleAddComment(event, '${itemType}', '${itemId}')">
                            <div class="mb-3">
                                <textarea class="form-control" placeholder="Write your comment..." id="commentContent" rows="3" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-paper-plane me-1"></i> Publish Comment</button>
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
            commentsList.innerHTML = '<p class="text-muted">No comments yet. Be the first to comment!</p>';
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
    document.getElementById('commentsList').innerHTML = '<p class="text-danger">Error loading comments.</p>';
    }
}

async function handleAddComment(event, itemType, itemId) {
    event.preventDefault();
    if(!isLoggedIn()) { alert('Please login first.'); showPage('login'); return; }
    const content = document.getElementById('commentContent').value;
    
    // Ensure banned words list loaded (fire and wait once)
    if (!bannedWordsLoaded) {
        await loadBannedWords();
    }
    
    if (containsBannedWord(content)) {
        alert('Your comment contains banned words and cannot be published. Please edit the text.');
        const ta = document.getElementById('commentContent');
        if (ta) ta.focus();
        return false;
    }
    
    try {
        await saveComment(itemType, itemId, { content });
        
        // Reload comments
    loadCommentsForModal(itemType, itemId);
        // Refresh hero engagement stats if on articles page
        if (window.currentPage === 'articles' || window.currentPage === 'weekly-news') {
            setTimeout(()=>{ try { updateArticlesHeroStats(); } catch(e){} }, 50);
        }
        
        // Clear form
        document.getElementById('commentContent').value = '';
        
    } catch (error) {
    if(/401|auth/i.test(error.message)){
        alert('Authentication required. Please login.');
        showPage('login');
    } else {
        alert('Error while saving the comment: ' + error.message);
    }
    }
}

// Smooth scroll to embedded add comment form inside article modal
// scrollToAddComment removed (buttons eliminated)

// Admin Photo Gallery Management (missing earlier)
function getPhotoGalleryManagement() {
    return `
        <div class="card shadow-sm mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class=\"fas fa-images me-2\"></i>Photo Gallery Admin</h5>
                <button class="btn btn-sm btn-primary" onclick="showCreateAlbumForm()"><i class=\"fas fa-plus\"></i> New Album</button>
            </div>
            <div class="card-body">
                <div id="admin-albums-list" class="row g-3"><div class='col-12 text-muted small'>Loading...</div></div>
                <div id="create-album-container" class="mt-4" style="display:none;">
                    <form onsubmit="handleCreateAlbum(event)" class="border rounded p-3 bg-light">
                        <div class="row">
                            <div class="col-md-6 mb-3"><label class="form-label">Title *</label><input id="albumTitle" class="form-control" required></div>
                            <div class="col-md-6 mb-3"><label class="form-label">Author *</label><input id="albumAuthor" class="form-control" required></div>
                        </div>
                        <div class="mb-3"><label class="form-label">Photos *</label><input type="file" id="albumPhotos" class="form-control" multiple accept="image/*" required></div>
                        <div class="d-flex gap-2 justify-content-end">
                            <button type="button" class="btn btn-outline-secondary" onclick="hideCreateAlbumForm()">Cancel</button>
                            <button type="submit" class="btn btn-success"><i class='fas fa-save'></i> Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
}

// Reinserted Quill initializer (missing after refactor)
function initializeQuillEditor(selector) {
    if (typeof Quill === 'undefined') { console.warn('Quill library not loaded'); return; }
    if (quillEditor && document.querySelector(selector)?.contains(quillEditor.root)) return; // avoid duplicate init
    // Build custom toolbar container if not present
    const targetEl = document.querySelector(selector);
    if (!targetEl) return;
    let toolbarId = 'custom-quill-toolbar';
    if (!document.getElementById(toolbarId)) {
        const toolbar = document.createElement('div');
        toolbar.id = toolbarId;
        toolbar.className = 'quill-custom-toolbar';
        toolbar.style.marginBottom = '6px';
        toolbar.innerHTML = `
            <span class="ql-formats">
                <select class="ql-header">
                    <option selected></option>
                    <option value="1">H1</option>
                    <option value="2">H2</option>
                    <option value="3">H3</option>
                    <option value="4">H4</option>
                </select>
                <select class="ql-font"></select>
                <select class="ql-size"></select>
            </span>
            <span class="ql-formats">
                <button class="ql-bold" title="Bold (Ctrl+B)"></button>
                <button class="ql-italic" title="Italic (Ctrl+I)"></button>
                <button class="ql-underline" title="Underline (Ctrl+U)"></button>
                <button class="ql-strike" title="Strikethrough"></button>
            </span>
            <span class="ql-formats">
                <button class="ql-list" value="ordered" title="Ordered List"></button>
                <button class="ql-list" value="bullet" title="Bullet List"></button>
                <button class="ql-indent" value="-1" title="Decrease Indent"></button>
                <button class="ql-indent" value="+1" title="Increase Indent"></button>
            </span>
            <span class="ql-formats">
                <select class="ql-align"></select>
                <select class="ql-color"></select>
                <select class="ql-background"></select>
            </span>
            <span class="ql-formats">
                <button class="ql-link" title="Insert Link"></button>
                <button class="ql-image" title="Insert Image"></button>
                <button class="ql-video" title="Embed Video"></button>
                <button class="ql-clean" title="Clear Formatting"></button>
            </span>
            <span class="ql-formats">
                <!-- Custom preview button (avoid ql-* class to prevent Quill warning) -->
                <button type="button" class="qlx-preview-btn" id="quillPreviewBtn" title="Preview (Ctrl+P)"><i class="fas fa-eye"></i></button>
            </span>
            <span class="ql-formats">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="quillUndoBtn" title="Undo (Ctrl+Z)" style="padding:2px 6px;">⮪</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="quillRedoBtn" title="Redo (Ctrl+Y)" style="padding:2px 6px;">⮫</button>
            </span>
            <span class="ql-formats" style="margin-left:auto; display:flex; align-items:center; gap:10px;">
                <small id="quillWordCount" class="text-muted" style="font-size:12px;">0 words</small>
                <small id="quillAutoSaveStatus" class="text-muted" style="font-size:12px;">Idle</small>
            </span>
        `;
        targetEl.parentElement.insertBefore(toolbar, targetEl);
    }

    quillEditor = new Quill(selector, { theme: 'snow', modules: { toolbar: '#' + toolbarId, history: { delay: 1000, maxStack: 100, userOnly: true } }, placeholder: 'Write your article here...' });

    // Inject CSS for tight paragraphs (reduced vertical spacing)
    if (!document.getElementById('quill-tight-paragraph-style')) {
        const style = document.createElement('style');
        style.id = 'quill-tight-paragraph-style';
        style.textContent = `
            .ql-editor p { margin: 0 0 14px 0; }
            .ql-editor p.tight-para { margin-top:2px !important; margin-bottom:4px !important; }
            .ql-editor p.tight-para + p.tight-para { margin-top:2px !important; }
        `;
        document.head.appendChild(style);
    }

    // Shortcut: Shift+Enter -> compact paragraph with reduced margins
    quillEditor.root.addEventListener('keydown', (e)=> {
        if (e.key === 'Enter' && e.shiftKey) { // Shift+Enter
            // Prevent the normal space insertion
            e.preventDefault();
            const range = quillEditor.getSelection();
            if (!range) return;
            // End current block and start a compact one
            // Strategy: insert a newline, then apply tight class to the new paragraph
            quillEditor.insertText(range.index, '\n', 'user');
            quillEditor.setSelection(range.index + 1, 0, 'silent');
            // Find the paragraph node at the cursor and add tight-para class
            try {
                const blot = quillEditor.getLeaf(range.index + 1)[0];
                if (blot) {
                    let node = blot.domNode;
                    while (node && node !== quillEditor.root && node.tagName !== 'P') node = node.parentNode;
                    if (node && node.tagName === 'P') {
                        node.classList.add('tight-para');
                    }
                }
            } catch {}
            return;
        }
    });

    // Word count updater
    function updateWordCount() {
        const text = quillEditor.getText().trim();
        const words = text.length ? text.split(/\s+/).filter(Boolean).length : 0;
        const el = document.getElementById('quillWordCount');
        if (el) el.textContent = words + (words === 1 ? ' word' : ' words');
    }
    quillEditor.on('text-change', updateWordCount);
    updateWordCount();

    // Undo / Redo buttons
    const undoBtn = document.getElementById('quillUndoBtn');
    const redoBtn = document.getElementById('quillRedoBtn');
    if (undoBtn) undoBtn.addEventListener('click', ()=> quillEditor.history.undo());
    if (redoBtn) redoBtn.addEventListener('click', ()=> quillEditor.history.redo());

    // Keyboard shortcuts for preview
    document.addEventListener('keydown', (e)=> {
        if (e.ctrlKey && (e.key.toLowerCase() === 'p')) {
            if (document.getElementById('quillPreviewBtn')) {
                e.preventDefault();
                openQuillPreview();
            }
        }
    });

    // Preview button
    const prevBtn = document.getElementById('quillPreviewBtn');
    if (prevBtn) prevBtn.addEventListener('click', openQuillPreview);

    // Autosave implementation (localStorage)
    const AUTOSAVE_KEY = 'quillDraftContent';
    let autosaveTimer = null;
    let lastSavedHtml = '';
    const statusEl = document.getElementById('quillAutoSaveStatus');

    // Load previous draft if empty
    try {
        const existing = localStorage.getItem(AUTOSAVE_KEY);
        if (existing && quillEditor.getLength() <= 1) {
            quillEditor.root.innerHTML = existing;
            lastSavedHtml = existing;
            if (statusEl) statusEl.textContent = 'Draft restored';
        }
    } catch {}

    function scheduleAutosave() {
        if (statusEl) statusEl.textContent = 'Typing…';
        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(()=> {
            const html = quillEditor.root.innerHTML.trim();
            if (html && html !== lastSavedHtml) {
                try { localStorage.setItem(AUTOSAVE_KEY, html); lastSavedHtml = html; if (statusEl) statusEl.textContent = 'Saved ' + new Date().toLocaleTimeString(); } catch {}
            } else {
                if (statusEl) statusEl.textContent = 'Up to date';
            }
        }, 2000); // 2s after user stops typing
    }
    quillEditor.on('text-change', scheduleAutosave);

    // Expose a manual clear draft helper
    window.clearQuillDraft = function() { try { localStorage.removeItem(AUTOSAVE_KEY); lastSavedHtml=''; if (statusEl) statusEl.textContent='Draft cleared'; } catch {} };

    // Preview function
    function openQuillPreview() {
        const html = quillEditor.root.innerHTML;
        let modal = document.getElementById('quillPreviewModal');
        if (!modal) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <div class="modal fade" id="quillPreviewModal" tabindex="-1" aria-hidden="true">
                  <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                      <div class="modal-header" style="background: linear-gradient(135deg,#771510,#cc4125); color:#fff;">
                        <h5 class="modal-title"><i class="fas fa-eye me-2"></i>Article Preview</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div class="modal-body" id="quillPreviewBody" style="background:#faf8f4;">
                      </div>
                      <div class="modal-footer">
                        <small class="text-muted me-auto">Preview may differ slightly from final published layout.</small>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                      </div>
                    </div>
                  </div>
                </div>`;
            document.body.appendChild(wrapper.firstElementChild);
            modal = document.getElementById('quillPreviewModal');
        }
        const body = document.getElementById('quillPreviewBody');
        if (body) body.innerHTML = html || '<p class="text-muted">(Empty article)</p>';
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}
window.initializeQuillEditor = initializeQuillEditor;

// --- Quill Media Enhancement (images & videos float, resize, center, drag) ---
if (!window.__quillMediaEnhancerAdded) {
    window.__quillMediaEnhancerAdded = true;
    (function(){
        const styleId = 'quill-media-enhancer-styles';
        if (!document.getElementById(styleId)) {
            const st = document.createElement('style');
            st.id = styleId;
            st.textContent = `
                .quill-editor-wrapper img, .quill-editor-wrapper iframe, .quill-editor-wrapper video { max-width:100%; }
                .quill-media-selected { outline: 3px solid rgba(119,21,16,0.6); outline-offset: 2px; box-shadow:0 0 0 4px rgba(204,65,37,0.25); }
                .quill-media-toolbar { position: absolute; background:#fff; border:1px solid #d9c9b5; border-radius:8px; padding:6px 10px; display:flex; gap:6px; align-items:center; box-shadow:0 4px 18px rgba(0,0,0,0.15); z-index:9999; font-family: system-ui, sans-serif; }
                .quill-media-toolbar button { border:1px solid #c9b9a5; background:#faf8f4; padding:4px 8px; font-size:12px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:4px; }
                .quill-media-toolbar button:hover { background:#f0e5cb; }
            .quill-media-toolbar button.active { background:#771510; color:#fff; border-color:#771510; }
                .quill-media-toolbar input[type=range] { width:120px; }
                        .media-float-left { float:left; margin:4px 16px 8px 0; display:inline-block !important; }
                        .media-float-right { float:right; margin:4px 0 8px 16px; display:inline-block !important; }
                .media-center { display:block; margin:12px auto; float:none !important; }
                .media-wide { width:100% !important; }
                @media (max-width: 768px){ .media-float-left, .media-float-right { float:none; margin: 8px auto; display:block; } }
                        /* Display context (article view) */
                        .article-content img.media-float-left { float:left; margin:4px 16px 12px 0; display:inline-block; }
                        .article-content img.media-float-right { float:right; margin:4px 0 12px 16px; display:inline-block; }
                        .article-content::after { content:""; display:block; clear:both; }
                        /* Advanced layout modes */
                        .img-layout-inline { position:static !important; float:none !important; display:inline-block; vertical-align:middle; }
                        .img-layout-wrap { display:inline-block; }
                        .img-layout-block { display:block; float:none !important; clear:both; margin:16px auto; }
                        /* Removed img-layout-front / img-layout-behind absolute layering modes */
                        .quill-editor-wrapper .image-free-layer { position:relative; }
                        .quill-free-anchor { position:relative; display:inline-block; width:0; height:0; }
                        .quill-editor-wrapper .layered-text-container { position:relative; }
                        /* Removed legacy layered display classes in article view */
            `;
            document.head.appendChild(st);
        }

        window.setupQuillMediaEnhancements = function(editor){
            if (!editor || editor.__mediaEnhancerReady) return; // avoid duplicate
            editor.__mediaEnhancerReady = true;

            const root = editor.root;
            root.classList.add('quill-editor-wrapper');

            let selectedEl = null;
            let toolbarEl = null;
            let dragEl = null;

            function createToolbar(){
                if (toolbarEl) return toolbarEl;
                toolbarEl = document.createElement('div');
                toolbarEl.id = 'quillMediaToolbar';
                toolbarEl.className = 'quill-media-toolbar';
                toolbarEl.style.display = 'none';
                toolbarEl.innerHTML = `
                    <button data-action="layout-inline" title="Inline with text"><i class="fas fa-align-center"></i></button>
                    <button data-action="layout-wrap" title="Text wrap left" style="min-width:32px"><i class="fas fa-text-width"></i></button>
                    <button data-action="layout-block" title="Text above & below"><i class="fas fa-grip-lines"></i></button>
                    <button data-action="layout-free" title="Free position (drag anywhere)"><i class="fas fa-arrows-alt"></i></button>
                    <!-- Removed front/behind layout buttons -->
                    <span style="width:1px;height:24px;background:#d9c9b5;margin:0 4px;display:inline-block"></span>
                    <button data-action="float-left" title="Legacy Float Left"><i class="fas fa-indent"></i></button>
                    <button data-action="float-right" title="Legacy Float Right"><i class="fas fa-outdent"></i></button>
                    <button data-action="center" title="Center"><i class="fas fa-align-center"></i></button>
                    <button data-action="wide" title="Full Width"><i class="fas fa-arrows-alt-h"></i></button>
                    <button data-action="caption" title="Add / Remove Caption"><i class="fas fa-closed-captioning"></i></button>
                    <!-- Removed layer up/down controls tied to front/behind modes -->
                    <button data-action="reset" title="Reset Formatting"><i class="fas fa-undo"></i></button>
                    <input type="range" min="10" max="100" value="50" title="Width %" />
                `;
                document.body.appendChild(toolbarEl);
                toolbarEl.addEventListener('click', (e)=>{
                    const btn = e.target.closest('button');
                    if (!btn || !selectedEl) return;
                    const action = btn.getAttribute('data-action');
                    applyAction(action);
                    highlightActiveLayout(btn, action);
                });
                const rangeInput = toolbarEl.querySelector('input[type=range]');
                rangeInput.addEventListener('input', ()=>{
                    if (selectedEl){ selectedEl.style.width = rangeInput.value + '%'; selectedEl.classList.remove('media-wide'); }
                });
                return toolbarEl;
            }

            function positionToolbar(){
                if (!selectedEl || !toolbarEl) return;
                const rect = selectedEl.getBoundingClientRect();
                const tRect = toolbarEl.getBoundingClientRect();
                const top = window.scrollY + rect.top - tRect.height - 8;
                const left = window.scrollX + rect.left + (rect.width/2) - (tRect.width/2);
                toolbarEl.style.top = Math.max(8, top) + 'px';
                toolbarEl.style.left = Math.max(8, left) + 'px';
            }

            function clearSelection(){
                if (selectedEl){ selectedEl.classList.remove('quill-media-selected'); }
                selectedEl = null;
                if (toolbarEl) toolbarEl.style.display = 'none';
            }

            function applyAction(action){
                if (!selectedEl) return;
                selectedEl.classList.remove('media-float-left','media-float-right','media-center','media-wide');
                selectedEl.style.width = selectedEl.style.width || '';
                    // Keep image inside paragraph so multiline wrapping works; ensure paragraph has a text node
                    try {
                        const p = selectedEl.parentElement;
                        if (p && p.tagName === 'P') {
                            if ((action === 'float-left' || action === 'float-right') && /text-align\s*:\s*center/i.test(p.getAttribute('style')||'')) {
                                // Remove center align to allow natural left/right wrap
                                const newStyle = p.getAttribute('style').replace(/text-align\s*:\s*center;?/i,'').trim();
                                if (newStyle) p.setAttribute('style', newStyle); else p.removeAttribute('style');
                            }
                            // Ensure there's at least one text node for cursor placement
                            const hasText = Array.from(p.childNodes).some(n=> n.nodeType===3 && n.textContent.trim().length>0);
                            if (!hasText) {
                                p.appendChild(document.createTextNode(' '));
                            }
                        }
                    } catch {}
                if (action === 'float-left') { clearLayoutClasses(selectedEl); selectedEl.classList.add('media-float-left'); if (!selectedEl.style.width) selectedEl.style.width = '40%'; selectedEl.dataset.layout='wrap'; }
                else if (action === 'float-right') { selectedEl.classList.add('media-float-right'); if (!selectedEl.style.width) selectedEl.style.width = '40%'; }
                else if (action === 'center') { selectedEl.classList.add('media-center'); if (!selectedEl.style.width) selectedEl.style.width = '60%'; }
                else if (action === 'wide') { selectedEl.classList.add('media-center','media-wide'); selectedEl.style.width='100%'; }
                else if (action === 'reset') { resetImageFormatting(selectedEl); }
                else if (action === 'caption') { toggleCaption(selectedEl); }
                // layer-up / layer-down removed (deprecated front/behind feature)
                else if (action.startsWith('layout-')) {
                    // Clear previous layout classes
                    clearLayoutClasses(selectedEl);
                    const parentP = selectedEl.closest('p');
                    if (parentP) { parentP.style.position=''; }
                    if (action === 'layout-inline') {
                        selectedEl.classList.add('img-layout-inline');
                        selectedEl.dataset.layout='inline';
                        selectedEl.style.position='';
                        selectedEl.style.float='none';
                        selectedEl.style.margin='0 6px';
                    } else if (action === 'layout-wrap') { // wrap left default
                        selectedEl.classList.add('img-layout-wrap','media-float-left');
                        selectedEl.dataset.layout='wrap';
                        if (!selectedEl.style.width) selectedEl.style.width='33%';
                        selectedEl.style.margin='4px 16px 8px 0';
                        selectedEl.style.position='';
                    } else if (action === 'layout-block') {
                        selectedEl.classList.add('img-layout-block');
                        selectedEl.dataset.layout='block';
                        selectedEl.style.float='none';
                        selectedEl.style.position='';
                        selectedEl.style.margin='16px auto';
                        if (!selectedEl.style.width) selectedEl.style.width='70%';
                    } else if (action === 'layout-free') {
                        const container = root; container.style.position = container.style.position || 'relative';
                        selectedEl.classList.add('img-layout-front');
                        selectedEl.dataset.layout='free';
                        const r = selectedEl.getBoundingClientRect(); const rootRect = root.getBoundingClientRect();
                        selectedEl.style.position='absolute';
                        selectedEl.style.top=(r.top-rootRect.top+root.scrollTop)+ 'px';
                        selectedEl.style.left=(r.left-rootRect.left+root.scrollLeft)+ 'px';
                        selectedEl.style.margin='0'; selectedEl.style.float='none';
                    }
                }
                    // Ensure there is a trailing space node inside the paragraph for continuous typing
                    if ((action === 'float-left' || action === 'float-right')) {
                        const p = selectedEl.parentElement;
                        if (p && p.tagName === 'P' && (p.lastChild === selectedEl || (p.lastChild.nodeType===3 && p.lastChild.textContent.trim()===''))) {
                            p.appendChild(document.createTextNode(' '));
                        }
                    }
                positionToolbar();
            }

            function clearLayoutClasses(el){
                el.classList.remove('img-layout-inline','img-layout-wrap','img-layout-block');
                el.classList.remove('media-float-left','media-float-right','media-center','media-wide');
                el.removeAttribute('data-layout');
                el.style.zIndex='';
            }
            function resetImageFormatting(el){
                clearLayoutClasses(el);
                el.style.position=''; el.style.top=''; el.style.left=''; el.style.width=''; el.style.margin=''; el.style.float='';
                const fig = el.closest('figure.quill-captioned'); if (fig){ const parent=fig.parentNode; parent.insertBefore(el, fig); fig.remove(); }
            }
            function toggleCaption(el){
                const existing = el.closest('figure.quill-captioned');
                if (existing){ // remove
                    const parent = existing.parentNode; parent.insertBefore(el, existing); existing.remove(); return;
                }
                const fig = document.createElement('figure');
                fig.className='quill-captioned';
                fig.style.textAlign='center';
                fig.style.display = el.dataset.layout==='inline'?'inline-block':'block';
                fig.style.maxWidth = el.style.width || el.width+'px';
                const cap = document.createElement('figcaption'); cap.contentEditable='true'; cap.innerText='Caption'; cap.style.fontSize='0.8rem'; cap.style.color='#555'; cap.style.marginTop='4px';
                el.parentNode.insertBefore(fig, el); fig.appendChild(el); fig.appendChild(cap);
            }
            // adjustLayer removed with deprecated front/behind feature
            function highlightActiveLayout(clickedBtn, action){
                const layoutActions = ['layout-inline','layout-wrap','layout-block','layout-free','float-left','float-right','center','wide'];
                toolbarEl.querySelectorAll('button.active').forEach(b=>{ if (layoutActions.includes(b.getAttribute('data-action'))) b.classList.remove('active'); });
                if (layoutActions.includes(action)) clickedBtn.classList.add('active');
            }

            function selectEl(el){
                if (selectedEl === el) { positionToolbar(); return; }
                clearSelection();
                selectedEl = el;
                selectedEl.classList.add('quill-media-selected');
                createToolbar();
                const rangeInput = toolbarEl.querySelector('input[type=range]');
                // derive width percent
                const currentWidth = selectedEl.style.width ? parseInt(selectedEl.style.width) : 50;
                rangeInput.value = Math.min(100, Math.max(10, currentWidth));
                toolbarEl.style.display = 'flex';
                positionToolbar();
            }

            // Click to select media
            root.addEventListener('click', (e)=>{
                const media = e.target.closest('img, iframe, video');
                if (media && root.contains(media)) {
                    selectEl(media);
                } else if (!e.target.closest('#quillMediaToolbar')) {
                    clearSelection();
                }
            });

            // Reposition toolbar on scroll/resize
            window.addEventListener('scroll', ()=> selectedEl && positionToolbar(), { passive:true });
            window.addEventListener('resize', ()=> selectedEl && positionToolbar());

            // Drag & drop reorder
            root.addEventListener('dragstart', (e)=>{
                const media = e.target.closest('img, iframe, video');
                if (media) { dragEl = media; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain','media'); }
            });
            root.addEventListener('dragover', (e)=>{ if (dragEl) { e.preventDefault(); e.dataTransfer.dropEffect='move'; }});
            root.addEventListener('drop', (e)=>{
                if (!dragEl) return;
                e.preventDefault();
                const blocks = Array.from(root.childNodes).filter(n=> n.nodeType===1);
                const y = e.clientY;
                let insertBefore = null;
                for (const b of blocks){ const r = b.getBoundingClientRect(); if (y < r.top + r.height/2){ insertBefore = b; break; } }
                if (insertBefore){ root.insertBefore(dragEl.parentElement === root ? dragEl : dragEl, insertBefore); }
                else { root.appendChild(dragEl); }
                dragEl = null;
                positionToolbar();
            });

            // Free-move drag for front/behind modes
            let freeMove = null;
            root.addEventListener('mousedown', (e)=>{
                const m = e.target.closest('img');
                if (m && (m.dataset.layout==='front' || m.dataset.layout==='behind' || m.dataset.layout==='free')) {
                    e.preventDefault();
                    const rect = m.getBoundingClientRect();
                    const rootRect = root.getBoundingClientRect();
                    freeMove = {
                        el: m,
                        offsetX: e.clientX - rect.left,
                        offsetY: e.clientY - rect.top,
                        rootRect
                    };
                    document.body.style.userSelect='none';
                }
            });
            window.addEventListener('mousemove', (e)=>{
                if (!freeMove) return;
                let y = e.clientY - freeMove.rootRect.top + root.scrollTop - freeMove.offsetY;
                let x = e.clientX - freeMove.rootRect.left + root.scrollLeft - freeMove.offsetX;
                // Snap to 8px unless Shift pressed
                if (!e.shiftKey){ x = Math.round(x/8)*8; y = Math.round(y/8)*8; }
                // Clamp within editor
                x = Math.max(0, Math.min(x, root.scrollWidth - freeMove.el.offsetWidth));
                y = Math.max(0, Math.min(y, root.scrollHeight - freeMove.el.offsetHeight));
                freeMove.el.style.top = y + 'px';
                freeMove.el.style.left = x + 'px';
            });
            window.addEventListener('mouseup', ()=>{
                if (freeMove) { freeMove=null; document.body.style.userSelect=''; }
            });

            // Make media draggable when selected
            root.addEventListener('mousedown', (e)=>{
                const media = e.target.closest('img, iframe, video');
                if (media) media.setAttribute('draggable','true');
            });
            document.addEventListener('mousedown', (e)=>{
                if (!e.target.closest('.quill-media-toolbar') && !root.contains(e.target)) clearSelection();
            });
        };
    })();
}

// Hook enhancement after Quill init if available later
const __origInit = window.initializeQuillEditor;
window.initializeQuillEditor = function(sel){
    __origInit(sel);
    if (quillEditor && window.setupQuillMediaEnhancements) {
        window.setupQuillMediaEnhancements(quillEditor);
    }
};

// Reattach gallery admin helpers if missing
if (typeof loadAdminAlbums === 'undefined') {
    async function loadAdminAlbums() { try { const list = document.getElementById('admin-albums-list'); if (!list) return; const albums = await window.loadPhotoAlbumsFromDb(); if (!albums.length) { list.innerHTML = '<div class="col-12 text-muted">No albums</div>'; return;} list.innerHTML = albums.map(a=>`<div class='col-md-4'><div class='card h-100'><div style='height:150px;overflow:hidden'><img src="${a.photos?.[0]? toAbsoluteUploadsUrl(a.photos[0].url):'https://via.placeholder.com/300x150?text=No+Image'}" style='width:100%;height:100%;object-fit:cover'></div><div class='card-body d-flex flex-column'><h6 class='fw-bold mb-1'>${a.title}</h6><small class='text-muted mb-2'>${a.author}</small><small class='text-muted mb-3'>${a.photos?.length||0} photos</small><div class='mt-auto d-flex gap-2'><button class='btn btn-outline-primary btn-sm flex-grow-1' onclick="viewAlbum('${a.id}')"><i class='fas fa-eye'></i></button><button class='btn btn-outline-danger btn-sm' onclick="deleteAlbum('${a.id}')"><i class='fas fa-trash'></i></button></div></div></div></div>`).join(''); } catch(e){ console.error('loadAdminAlbums error', e);} }
    window.loadAdminAlbums = loadAdminAlbums;
}

// Show create album form
function showCreateAlbumForm() {
    const container = document.getElementById('create-album-container');
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
window.showCreateAlbumForm = showCreateAlbumForm;

// Hide create album form
function hideCreateAlbumForm() {
    const container = document.getElementById('create-album-container');
    if (container) {
        container.style.display = 'none';
        // Reset form
        document.getElementById('albumTitle').value = '';
        document.getElementById('albumAuthor').value = '';
        document.getElementById('albumPhotos').value = '';
    }
}
window.hideCreateAlbumForm = hideCreateAlbumForm;

// Handle create album form submission
async function handleCreateAlbum(event) {
    event.preventDefault();
    
    const title = document.getElementById('albumTitle').value.trim();
    const author = document.getElementById('albumAuthor').value.trim();
    const photosInput = document.getElementById('albumPhotos');
    
    if (!title || !author || !photosInput.files.length) {
        alert('Please fill all required fields and select at least one photo');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        
        // Append all selected photos
        for (let i = 0; i < photosInput.files.length; i++) {
            formData.append('photos', photosInput.files[i]);
        }
        
        // Get the correct API base URL
        const apiBase = (window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001/api';
        const apiUrl = apiBase.replace(/\/api$/, '') + '/api/gallery';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to create album');
        }
        
        alert('Album created successfully!');
        hideCreateAlbumForm();
        
        // Reload albums list
        if (typeof loadAdminAlbums === 'function') {
            loadAdminAlbums();
        }
        
    } catch (error) {
        console.error('Error creating album:', error);
        alert('Error creating album: ' + error.message);
    }
}
window.handleCreateAlbum = handleCreateAlbum;

// Delete album
async function deleteAlbum(albumId) {
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Get the correct API base URL
        const apiBase = (window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001/api';
        const apiUrl = apiBase.replace(/\/api$/, '') + `/api/gallery/${albumId}`;
        
        const response = await fetch(apiUrl, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete album');
        }
        
        alert('Album deleted successfully!');
        
        // Reload albums list
        if (typeof loadAdminAlbums === 'function') {
            loadAdminAlbums();
        }
        
    } catch (error) {
        console.error('Error deleting album:', error);
        alert('Error deleting album: ' + error.message);
    }
}
window.deleteAlbum = deleteAlbum;

// Ensure openArticle exists (modal rich text reader)
if (typeof window.openArticle === 'undefined') {
    window.openArticle = function(articleId){
        const article = articles.find(a=>a.id===articleId);
        if(!article){ alert('Article not found'); return; }
        // Increment views before showing modal
        try { incrementViews('article', articleId).then(()=>{ /* count will update via socket or later refresh */ }).catch(()=>{}); } catch {}
        const photosCarousel = (article.photos && article.photos.length) ? `
        <div id="articlePhotosCarousel" class="carousel slide mb-4" data-bs-ride="carousel">
            <div class="carousel-inner">
                ${article.photos.map((p,i)=>`<div class="carousel-item ${i===0?'active':''}"><img src="${toAbsoluteUploadsUrl(p.url||p)}" class="d-block w-100" style="max-height:420px;object-fit:cover"></div>`).join('')}
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#articlePhotosCarousel" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
            <button class="carousel-control-next" type="button" data-bs-target="#articlePhotosCarousel" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
        </div>` : '';
        const modalHtml = `
            <div class="modal fade" id="articleModal" tabindex="-1">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header flex-column align-items-start">
                            <h5 class="modal-title mb-1">${article.title}</h5>
                            <div class="text-muted small" style="letter-spacing:.3px;">By ${article.author} • ${formatDate(article.createdAt)}</div>
                            <button type="button" class="btn-close position-absolute" style="top:10px; right:12px;" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body pt-3">
                            ${photosCarousel}
                            <div class="article-content">${formatArticleContent(article)}</div>
                            <hr class="my-4" />
                            <section id="embeddedComments" class="pt-1">
                                <div class="d-flex align-items-center mb-2">
                                    <h6 class="mb-0"><i class="fas fa-comments me-1"></i> Comments</h6>
                                </div>
                                <div id="commentsList" class="mb-3">
                                    <p class="text-center text-muted small">Loading comments...</p>
                                </div>
                                <div class="comment-form border rounded p-3 bg-light" id="addCommentForm" data-gated="1">
                                    <h6 class="fw-bold mb-2">New Comment</h6>
                                    <div data-if-logged-out>
                                        <div class="alert alert-warning py-2 small mb-2"><i class="fas fa-lock me-1"></i> Login with your school Google account to comment. <a href="#" onclick="showPage('login')">Go to login</a></div>
                                    </div>
                                    <form data-if-logged-in class="d-none" onsubmit="handleAddComment(event, 'article', '${article.id}')">
                                        <div class="mb-2">
                                            <textarea class="form-control" placeholder="Write your comment..." id="commentContent" rows="3" required></textarea>
                                        </div>
                                        <div class="d-flex justify-content-end">
                                            <button type="submit" class="btn btn-success btn-sm"><i class="fas fa-paper-plane me-1"></i> Publish</button>
                                        </div>
                                    </form>
                                </div>
                            </section>
                        </div>
                        <div class="modal-footer d-none"></div>
                    </div>
                </div>
            </div>`;
        const existing = document.getElementById('articleModal'); if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('articleModal')); modal.show();
        // Load comments directly into embedded section
        loadCommentsForModal('article', article.id);
    }
}

// Passive event listener audit shim: convert direct window/document touch/wheel listeners we add to passive if safe
// (Currently we do not add custom touch listeners; Quill and embedded iframes cause the console warnings. Leaving hook for future.)
;(function ensurePassiveListeners(){
    const _add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options){
        try {
            if ((type === 'touchstart' || type === 'touchmove' || type === 'wheel') && typeof options === 'object') {
                if (!('passive' in options)) options.passive = true; // safe default for our usage (no preventDefault in our code)
            }
        } catch(_){}
        return _add.call(this, type, listener, options);
    };
})();

// NOTE: Quill v1 uses deprecated DOMNodeInserted internally → harmless warning. To fully remove: upgrade to Quill 2 when feasible.

// =============================================
// NEW: Handle Submit New Article (Quill based)
// =============================================
if (typeof handleSubmitNewArticle === 'undefined') {
    async function handleSubmitNewArticle(event) {
        event.preventDefault();
        try {
            const submitBtn = event.submitter || event.target.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.innerHTML; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

            const titleEl = document.getElementById('newArticleTitle');
            const tagEl = document.getElementById('articleTagsHidden');
            const authorEl = document.getElementById('authorName');
            const photosInput = document.getElementById('articlePhotos');

            const title = titleEl?.value.trim();
            const tag = tagEl?.value.trim(); // comma-separated tags
            const author = authorEl?.value.trim();
            const contentHtml = quillEditor ? quillEditor.root.innerHTML.trim() : '';

            // Helper to detect empty Quill content (just <p><br></p> etc.)
            const isContentEmpty = !contentHtml || /^<(p|div)>\s*(<br\s*\/?>)?\s*<\/(p|div)>$/i.test(contentHtml);

            if (!title || !tag || !author || isContentEmpty) {
                alert('Please fill in all required fields (Title, Tags, Author, Content).');
                return;
            }

            // Determine backend base (strip trailing /) and avoid duplicating /api
            function getApiBase() {
                let base = (window.enhancedDatabase && window.enhancedDatabase.apiBaseUrl) || 'http://localhost:3001';
                base = base.replace(/\/$/, '');
                // If base already ends with /api remove it (we will append explicitly)
                if (/\/api$/i.test(base)) base = base.replace(/\/api$/i, '');
                return base + '/api';
            }
            const apiBase = getApiBase();
            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', contentHtml);
            formData.append('tags', tag); // backend splits by comma; multi-tag supported
            formData.append('author', author);
            // (Optional) allow future immediate publish flag
            // formData.append('published', 'true'); // Uncomment if backend updated to honor this

            if (photosInput && photosInput.files && photosInput.files.length) {
                Array.from(photosInput.files).forEach(file => formData.append('photos', file));
            }

            console.log('[ArticleSubmit] Sending new article to backend...', { title, tag, author, photos: photosInput?.files?.length || 0 });
            const res = await fetch(`${apiBase}/articles`, { method: 'POST', body: formData });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server responded ${res.status}: ${errText}`);
            }
            const saved = await res.json();
            console.log('[ArticleSubmit] Saved article:', saved);

            // Update in-memory list & refresh
            try { if (Array.isArray(articles)) { articles.unshift(saved); } } catch {}
            // Clear form & editor
            if (event.target) event.target.reset();
            if (quillEditor) quillEditor.setContents([]);

            alert('Article created! (Warning: it remains in Draft until you publish it)');
            // Reload from backend to stay in sync
            await loadAllData();
            // Switch to Manage Articles tab so user can publish
            const manageTabLink = document.querySelector('a[href="#articles-tab"]');
            if (manageTabLink) {
                const tab = new bootstrap.Tab(manageTabLink);
                tab.show();
            }
        } catch (error) {
            console.error('Error creating article:', error);
            alert('Error creating article: ' + (error.message || 'Unknown'));
        } finally {
            const submitBtn = event.submitter || event.target.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = submitBtn.dataset.originalText || '<i class="fas fa-paper-plane"></i> Post Article'; }
        }
    }
    window.handleSubmitNewArticle = handleSubmitNewArticle;
}

// ==============================
// Multi-tag select logic helpers
// ==============================
if (typeof window.__multiTagInit === 'undefined') {
    window.__multiTagInit = true;
    window.selectedTags = [];

    window.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'articleTagsInput') {
            const val = e.target.value;
            if (val && !window.selectedTags.includes(val)) {
                window.selectedTags.push(val);
                renderSelectedTags();
                // Remove chosen option from select to prevent re-selection
                const optToRemove = [...e.target.options].find(o=>o.value===val);
                if (optToRemove) optToRemove.remove();
            }
            e.target.value = '';
            syncHiddenTags();
        }
    });

    window.clearSelectedTags = function() {
        window.selectedTags = [];
        renderSelectedTags();
        syncHiddenTags();
    };

    function syncHiddenTags(){
        const hidden = document.getElementById('articleTagsHidden');
        if (hidden) hidden.value = window.selectedTags.join(',');
    }
    function renderSelectedTags(){
        const wrap = document.getElementById('selectedTags');
        if (!wrap) return;
        if (!window.selectedTags.length){
            wrap.innerHTML = '<span class="text-muted" style="font-size:0.75rem;">No tags selected</span>';
            return;
        }
        wrap.innerHTML = window.selectedTags.map((t,i)=>{
            return `<span class="badge" style="background:${tagColorFor(t)}; display:flex; align-items:center; gap:4px;">${t.replace('-', ' ')}${i===0 ? ' <span style=\"background:rgba(255,255,255,0.25); padding:0 4px; border-radius:4px; font-size:0.6rem;\">main</span>' : ''}<button type="button" onclick="removeTag('${t}')" style="border:none; background:transparent; color:#fff; font-weight:bold; line-height:1; padding:0 2px;">×</button></span>`;
        }).join('');
    }
    window.removeTag = function(tag){
        window.selectedTags = window.selectedTags.filter(t=>t!==tag);
        renderSelectedTags();
        syncHiddenTags();
        // Restore option to select
        const select = document.getElementById('articleTagsInput');
        if (select) {
            const existing = [...select.options].some(o=>o.value===tag);
            if (!existing) {
                const labelMap = { 'school-news':'School News','features':'Features','opinion':'Opinion','sports':'Sports','creative':'Creative','humor':'Humor','assembly':'Assembly','tech':'Tech','lifestyle':'Lifestyle','music':'Music','reviews':'Reviews'};
                const opt = document.createElement('option');
                opt.value = tag;
                opt.textContent = labelMap[tag] || tag.replace('-', ' ');
                // Insert before the blank 'Add tag...' (index 0) or at end if not present
                if (select.options.length) select.appendChild(opt); else select.appendChild(opt);
            }
        }
    };
    function tagColorFor(tag){
    const map = { 'school-news':'#e74c3c','features':'#f39c12','opinion':'#9b59b6','sports':'#3498db','creative':'#e91e63','humor':'#ff9800','assembly':'#8d6e63','tech':'#2196f3','lifestyle':'#4caf50','music':'#9c27b0','reviews':'#607d8b','general':'#95a5a6'};
        return map[tag] || '#555';
    }
}