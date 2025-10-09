// Enhanced Database System for The Student Voice
// Now uses Node.js backend APIs with localStorage fallback and real-time updates

class EnhancedDatabase {
    constructor() {
        // Prefer same-origin (works behind Nginx on port 80); fall back to localhost:3001 in dev
        this.apiBaseUrl = `${window.location.origin}/api`;
        this.devFallbackBase = 'http://localhost:3001/api';
        this.isOnline = false;
        this.currentUser = null;
        this.socket = null;
        this.initPromise = this.initializeDatabase();
        this.connectWebSocket();
    }

    async initializeDatabase() {
        // Try same-origin first; if it fails, try dev fallback
        const tryConnect = async (base) => {
            let attempts = 0; const max = 3;
            while (attempts < max) {
                try {
                    console.log(`🔗 Checking backend at ${base} (attempt ${attempts + 1}/${max})...`);
                    const response = await fetch(`${base}/health`);
                    if (response.ok) return true;
                } catch (e) {
                    // ignore
                }
                attempts++;
                await new Promise(r=>setTimeout(r, 1000));
            }
            return false;
        };

        // Attempt same-origin
        let ok = await tryConnect(this.apiBaseUrl);
        if (!ok) {
            // Attempt dev fallback
            console.log('⚠️ Same-origin backend not reachable, trying dev fallback at localhost:3001');
            if (await tryConnect(this.devFallbackBase)) {
                this.apiBaseUrl = this.devFallbackBase;
                ok = true;
            }
        }

        this.isOnline = !!ok;
        console.log(this.isOnline ? '🌐 Connected to BIST News Backend Server' : '💾 Backend unavailable, using localStorage fallback');

        // Initialize localStorage collections as fallback
        const collections = ['articles', 'weeklyNews', 'comments', 'messages', 'views', 'users'];
        collections.forEach(collection => {
            if (!localStorage.getItem(collection)) {
                localStorage.setItem(collection, JSON.stringify({}));
            }
        });

        // Initialize admin user
        const users = this.getLocalCollection('users');
        if (!users['admin']) {
            users['admin'] = {
                id: 'admin',
                email: 'admin@bist.ro',
                password: 'mrshortenthebest2025',
                role: 'admin',
                createdAt: Date.now()
            };
            this.setLocalCollection('users', users);
        }

        console.log('🔥 Enhanced database initialized for The Student Voice');
        
        // Load static files if available and using localStorage
        if (!this.isOnline) {
            this.loadFromStaticFiles();
        }
    }

    connectWebSocket() {
        if (typeof io !== 'undefined') {
            try {
                const socketOrigin = (new URL(this.apiBaseUrl)).origin;
                this.socket = io(socketOrigin);
                
                this.socket.on('connect', () => {
                    console.log('📡 Real-time updates connected');
                });

                // Listen for real-time updates
                this.socket.on('articleAdded', (article) => {
                    console.log('📰 New article added:', article.title);
                    this.triggerUpdateEvent('articleAdded', article);
                });

                this.socket.on('articleUpdated', (article) => {
                    console.log('📝 Article updated:', article.title);
                    this.triggerUpdateEvent('articleUpdated', article);
                });

                this.socket.on('articleDeleted', (id) => {
                    console.log('🗑️ Article deleted:', id);
                    this.triggerUpdateEvent('articleDeleted', id);
                });

                this.socket.on('announcementAdded', (announcement) => {
                    console.log('📢 New announcement:', announcement.title);
                    this.triggerUpdateEvent('announcementAdded', announcement);
                });

                this.socket.on('commentAdded', (comment) => {
                    console.log('💬 New comment added');
                    this.triggerUpdateEvent('commentAdded', comment);
                });

                this.socket.on('viewUpdated', (data) => {
                    console.log('👁️ View count updated via Socket.IO:', data);
                    // Update local view count immediately in main page
                    const viewsEl = document.getElementById(`views-count-${data.itemId}`);
                    if (viewsEl) {
                        viewsEl.textContent = data.count;
                    }
                    // Update any grid counts using data attributes
                    document.querySelectorAll(`[data-views-id="${data.itemId}"]`).forEach(el => {
                        el.textContent = data.count;
                    });
                    // Update modal view count if modal is open
                    const modalViewsEl = document.getElementById(`modal-views-count-${data.itemId}`);
                    if (modalViewsEl) {
                        modalViewsEl.textContent = data.count;
                    }
                    // Also update local storage
                    const views = this.getLocalCollection('views');
                    const key = `${data.itemType}_${data.itemId}`;
                    views[key] = { count: data.count, lastViewed: Date.now() };
                    this.setLocalCollection('views', views);
                });
            } catch (error) {
                console.log('WebSocket connection failed, continuing without real-time updates');
            }
        }
    }

    triggerUpdateEvent(eventType, data) {
        // Trigger page refresh or specific updates
        if (window.loadAllData && typeof window.loadAllData === 'function') {
            window.loadAllData();
        }
        
        // Custom event for components that want to listen
        window.dispatchEvent(new CustomEvent('databaseUpdate', {
            detail: { type: eventType, data: data }
        }));
    }

    // API Methods (with localStorage fallback)
    async saveArticle(articleData) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/articles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(articleData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Article saved to server:', result.id);
                    return result.id;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        // Fallback to localStorage
        return this.saveArticleLocal(articleData);
    }

    async loadArticles() {
        // Wait for database initialization to complete
        await this.initPromise;
        
        console.log('📰 loadArticles called, isOnline:', this.isOnline);
        
        if (this.isOnline) {
            try {
                console.log('🌐 Fetching articles from server...');
                const response = await fetch(`${this.apiBaseUrl}/articles`);
                console.log('📡 Server response status:', response.status, response.ok);
                
                if (response.ok) {
                    const articles = await response.json();
                    console.log('📰 Loaded articles from server:', articles.length);
                    console.log('📰 Article titles:', articles.map(a => a.title));
                    return articles;
                } else {
                    console.error('❌ Server returned error status:', response.status);
                }
            } catch (error) {
                console.error('❌ API error, falling back to localStorage:', error);
            }
        } else {
            console.log('💾 Backend offline, using localStorage fallback');
        }
        
        // Fallback to localStorage
        const localArticles = this.loadArticlesLocal();
        console.log('💾 Loaded articles from localStorage:', localArticles.length);
        return localArticles;
    }

    async deleteArticle(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/articles/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    console.log('🗑️ Article deleted from server:', id);
                    return;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        // Fallback to localStorage
        return this.deleteArticleLocal(id);
    }

    async publishArticle(id) {
        return this.updateArticle(id, { published: true });
    }

    async unpublishArticle(id) {
        return this.updateArticle(id, { published: false });
    }

    async updateArticle(id, updates) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/articles/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                
                if (response.ok) {
                    console.log('📝 Article updated on server:', id);
                    return;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        // Fallback to localStorage
        return this.updateArticleLocal(id, updates);
    }

    // Weekly News / Announcements
    async saveWeeklyNews(announcementData) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/announcements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(announcementData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Announcement saved to server:', result.id);
                    return result.id;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        return this.saveWeeklyNewsLocal(announcementData);
    }

    async loadWeeklyNews() {
        // Wait for database initialization to complete
        await this.initPromise;
        
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/announcements`);
                if (response.ok) {
                    const announcements = await response.json();
                    console.log('📢 Loaded announcements from server:', announcements.length);
                    return announcements;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        return this.loadWeeklyNewsLocal();
    }

    async deleteWeeklyNewsFromDB(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/announcements/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    console.log('🗑️ Announcement deleted from server:', id);
                    return;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        return this.deleteWeeklyNewsLocal(id);
    }

    // Image Upload
    async saveUploadedImage(file, articleId = null) {
        if (this.isOnline) {
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('type', articleId ? 'article' : 'general');
                formData.append('articleId', articleId || '');

                const response = await fetch(`${this.apiBaseUrl}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('📸 Image uploaded to server:', result.filename);
                    // Prefer absoluteUrl to avoid mixed-origin/path issues; fallback to relative url
                    return result.absoluteUrl || result.url;
                }
            } catch (error) {
                console.error('Upload error, falling back to local storage:', error);
            }
        }
        
        // Fallback to base64 storage in localStorage
        return this.saveImageLocal(file, articleId);
    }

    // Views tracking
    async incrementViews(itemType, itemId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/views/${itemType}/${itemId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                // Update local UI immediately
                const viewsEl = document.getElementById(`views-count-${itemId}`);
                if (viewsEl) {
                    viewsEl.textContent = result.count;
                }
                document.querySelectorAll(`[data-views-id="${itemId}"]`).forEach(el => {
                    el.textContent = result.count;
                });
                return result.count;
            } else {
                console.error('Failed to increment views on server');
                return 0;
            }
        } catch (error) {
            console.error('Error incrementing views:', error);
            return 0;
        }
    }

    async getViews(itemType, itemId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/views/${itemType}/${itemId}`);
            if (response.ok) {
                const result = await response.json();
                return result.count;
            } else {
                console.error(`Failed to fetch views: ${response.status}`);
                return 0;
            }
        } catch (error) {
            console.error('Error fetching views from server:', error);
            return 0;
        }
    }

    // Comments
    async saveComment(itemType, itemId, commentData) {
        // Ensure backend connectivity check completed
        try { await this.initPromise; } catch {}
        if (this.isOnline) {
            try {
                const sessionToken = (window.getSessionToken && window.getSessionToken()) || null;
                const response = await fetch(`${this.apiBaseUrl}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(sessionToken? { 'x-session-token': sessionToken } : {}) },
                    body: JSON.stringify({
                        itemType,
                        itemId,
                        ...commentData
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('💬 Comment saved to server');
                    return result.id;
                } else {
                    // Surface auth errors so UI can redirect to login
                    if (response.status === 401) {
                        throw new Error('401 Unauthorized');
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.error('API error saving comment:', error);
                // Do not fallback on auth errors; let UI handle re-login
                if (String(error).includes('401')) {
                    throw error;
                }
            }
        }
        
        return this.saveCommentLocal(itemType, itemId, commentData);
    }

    async loadComments(itemType, itemId) {
        // Ensure backend connectivity check completed
        try { await this.initPromise; } catch {}
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/comments/${itemType}/${itemId}`);
                if (response.ok) {
                    const comments = await response.json();
                    return comments;
                }
            } catch (error) {
                console.error('API error, falling back to localStorage:', error);
            }
        }
        
        return this.loadCommentsLocal(itemType, itemId);
    }

    async loadAllComments() {
        try { await this.initPromise; } catch {}
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/comments`);
                if (response.ok) {
                    const comments = await response.json();
                    return comments;
                }
            } catch (error) {
                console.error('API error loading all comments, falling back to localStorage:', error);
            }
        }
        // Fallback for offline or API error
        try {
            const comments = this.getLocalCollection('comments');
            return Object.values(comments).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error loading all comments from localStorage:', error);
            return [];
        }
    }

    async deleteComment(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/comments/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    console.log('🗑️ Comment deleted from server:', id);
                    return;
                }
            } catch (error) {
                console.error('API error deleting comment, falling back to localStorage:', error);
            }
        }
        // Fallback
        try {
            const comments = this.getLocalCollection('comments');
            delete comments[id];
            this.setLocalCollection('comments', comments);
            console.log('🗑️ Comment deleted locally:', id);
        } catch (error) {
            console.error('Error deleting comment locally:', error);
            throw error;
        }
    }

    async updateComment(id, newContent) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/comments/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: newContent })
                });
                if (response.ok) {
                    console.log('📝 Comment updated on server:', id);
                    return await response.json();
                }
            } catch (error) {
                console.error('API error updating comment, falling back to localStorage:', error);
            }
        }
        // Fallback
        try {
            const comments = this.getLocalCollection('comments');
            if (comments[id]) {
                comments[id].content = newContent;
                comments[id].editedByAdmin = true;
                comments[id].editedAt = Date.now();
                this.setLocalCollection('comments', comments);
                console.log('📝 Comment updated locally:', id);
                return comments[id];
            }
        } catch (error) {
            console.error('Error updating comment locally:', error);
            throw error;
        }
    }

    // Photo Gallery
    async savePhotoAlbum(albumData, files) {
        if (this.isOnline) {
            try {
                const formData = new FormData();
                formData.append('title', albumData.title);
                formData.append('author', albumData.author);
                for (const file of files) {
                    formData.append('photos', file);
                }

                const response = await fetch(`${this.apiBaseUrl}/gallery`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('🖼️ Album saved to server:', result.id);
                    return result.id;
                }
            } catch (error) {
                console.error('API error saving album:', error);
                throw error; // Re-throw to be caught by the UI
            }
        }
        // No local storage fallback for file uploads
        throw new Error('Cannot upload albums in offline mode.');
    }

    async loadPhotoAlbumsFromDb() {
        await this.initPromise;
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/gallery`);
                if (response.ok) {
                    const albums = await response.json();
                    console.log('🖼️ Loaded albums from server:', albums.length);
                    return albums;
                }
            } catch (error) {
                console.error('API error loading albums:', error);
            }
        }
        // Return empty array if offline
        return [];
    }

    async deletePhotoAlbum(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/gallery/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    console.log('🗑️ Album deleted from server:', id);
                    return;
                }
            } catch (error) {
                console.error('API error deleting album:', error);
                throw error;
            }
        }
        throw new Error('Cannot delete albums in offline mode.');
    }


    // Authentication
    async loginAdmin(password) {
        const users = this.getLocalCollection('users');
        const admin = users['admin'];
        
        if (admin && admin.password === password) {
            this.currentUser = admin;
            window.isAdmin = true;
            window.currentUser = admin;
            console.log('🔐 Admin logged in successfully');
            return admin;
        } else {
            throw new Error('Invalid password');
        }
    }

    async logoutAdmin() {
        this.currentUser = null;
        window.isAdmin = false;
        window.currentUser = null;
        console.log('🔐 Admin logged out');
    }

    // Local Storage Methods (fallback implementations)
    saveArticleLocal(articleData) {
        try {
            const articles = this.getLocalCollection('articles');
            const id = this.generateId();
            
            articles[id] = {
                id: id,
                ...articleData,
                createdAt: Date.now(),
                authorId: this.currentUser?.id
            };
            
            this.setLocalCollection('articles', articles);
            console.log('💾 Article saved locally:', id);
            return id;
        } catch (error) {
            console.error('Error saving article locally:', error);
            throw error;
        }
    }

    loadArticlesLocal() {
        try {
            const articles = this.getLocalCollection('articles');
            return Object.values(articles).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error loading articles locally:', error);
            return [];
        }
    }

    deleteArticleLocal(id) {
        try {
            const articles = this.getLocalCollection('articles');
            delete articles[id];
            this.setLocalCollection('articles', articles);
            console.log('🗑️ Article deleted locally:', id);
        } catch (error) {
            console.error('Error deleting article locally:', error);
            throw error;
        }
    }

    updateArticleLocal(id, updates) {
        try {
            const articles = this.getLocalCollection('articles');
            if (articles[id]) {
                articles[id] = { ...articles[id], ...updates };
                this.setLocalCollection('articles', articles);
                console.log('📝 Article updated locally:', id);
            }
        } catch (error) {
            console.error('Error updating article locally:', error);
            throw error;
        }
    }

    saveWeeklyNewsLocal(announcementData) {
        try {
            const weeklyNews = this.getLocalCollection('weeklyNews');
            const id = this.generateId();
            
            weeklyNews[id] = {
                id: id,
                ...announcementData,
                createdAt: Date.now(),
                authorId: this.currentUser?.id
            };
            
            this.setLocalCollection('weeklyNews', weeklyNews);
            console.log('💾 Announcement saved locally:', id);
            return id;
        } catch (error) {
            console.error('Error saving announcement locally:', error);
            throw error;
        }
    }

    loadWeeklyNewsLocal() {
        try {
            const weeklyNews = this.getLocalCollection('weeklyNews');
            return Object.values(weeklyNews).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error loading announcements locally:', error);
            return [];
        }
    }

    deleteWeeklyNewsLocal(id) {
        try {
            const weeklyNews = this.getLocalCollection('weeklyNews');
            delete weeklyNews[id];
            this.setLocalCollection('weeklyNews', weeklyNews);
            console.log('🗑️ Announcement deleted locally:', id);
        } catch (error) {
            console.error('Error deleting announcement locally:', error);
            throw error;
        }
    }

    saveImageLocal(file, articleId) {
        try {
            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = function(e) {
                    const imageData = e.target.result;
                    const timestamp = Date.now();
                    const extension = file.name.split('.').pop();
                    const filename = articleId ? 
                        `article_${articleId}_${timestamp}.${extension}` : 
                        `image_${timestamp}.${extension}`;
                    
                    const images = JSON.parse(localStorage.getItem('uploadedImages') || '{}');
                    images[filename] = {
                        data: imageData,
                        originalName: file.name,
                        size: file.size,
                        type: file.type,
                        uploadDate: timestamp
                    };
                    localStorage.setItem('uploadedImages', JSON.stringify(images));
                    
                    console.log(`📸 Image saved locally: ${filename}`);
                    resolve(`./images/${filename}`);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('Error saving image locally:', error);
            throw error;
        }
    }

    incrementViewsLocal(itemType, itemId) {
        try {
            const views = this.getLocalCollection('views');
            const key = `${itemType}_${itemId}`;
            
            if (!views[key]) {
                views[key] = { count: 0, lastViewed: Date.now() };
            }
            
            views[key].count += 1;
            views[key].lastViewed = Date.now();
            
            this.setLocalCollection('views', views);
            
            // Update local UI immediately
            const viewsEl = document.getElementById(`views-count-${itemId}`);
            if (viewsEl) {
                viewsEl.textContent = views[key].count;
            }
            
            return views[key].count;
        } catch (error) {
            console.error('Error incrementing views locally:', error);
            return 0;
        }
    }

    getViewsLocal(itemType, itemId) {
        try {
            const views = this.getLocalCollection('views');
            const key = `${itemType}_${itemId}`;
            return views[key] ? views[key].count : 0;
        } catch (error) {
            console.error('Error getting views locally:', error);
            return 0;
        }
    }

    saveCommentLocal(itemType, itemId, commentData) {
        try {
            const comments = this.getLocalCollection('comments');
            const id = this.generateId();
            
            comments[id] = {
                id: id,
                itemType,
                itemId,
                ...commentData,
                createdAt: Date.now()
            };
            
            this.setLocalCollection('comments', comments);
            console.log('💬 Comment saved locally');
            return id;
        } catch (error) {
            console.error('Error saving comment locally:', error);
            throw error;
        }
    }

    loadCommentsLocal(itemType, itemId) {
        try {
            const comments = this.getLocalCollection('comments');
            return Object.values(comments)
                .filter(comment => comment.itemType === itemType && comment.itemId === itemId)
                .sort((a, b) => a.createdAt - b.createdAt);
        } catch (error) {
            console.error('Error loading comments locally:', error);
            return [];
        }
    }

    async getCommentsCount(itemType, itemId) {
        try { await this.initPromise; } catch {}
        const comments = await this.loadComments(itemType, itemId);
        return comments.length;
    }

    // Utility methods
    getLocalCollection(name) {
        try {
            return JSON.parse(localStorage.getItem(name)) || {};
        } catch (error) {
            console.error(`Error reading local collection ${name}:`, error);
            return {};
        }
    }

    setLocalCollection(name, data) {
        try {
            localStorage.setItem(name, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error writing local collection ${name}:`, error);
            return false;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async loadFromStaticFiles() {
        try {
            // Try to load articles from static file
            try {
                const response = await fetch('./data/articles.json');
                if (response.ok) {
                    const articles = await response.json();
                    const existingArticles = this.getLocalCollection('articles');
                    if (Object.keys(existingArticles).length === 0) {
                        this.setLocalCollection('articles', articles);
                        console.log('📰 Loaded articles from static file');
                    }
                }
            } catch (e) {
                // File doesn't exist, continue
            }

            // Try to load announcements from static file
            try {
                const response = await fetch('./data/announcements.json');
                if (response.ok) {
                    const announcements = await response.json();
                    const existingNews = this.getLocalCollection('weeklyNews');
                    if (Object.keys(existingNews).length === 0) {
                        this.setLocalCollection('weeklyNews', announcements);
                        console.log('📢 Loaded announcements from static file');
                    }
                }
            } catch (e) {
                // File doesn't exist, continue
            }
        } catch (error) {
            console.log('No static data files found, using localStorage only');
        }
    }

    // Export/Import functionality (unchanged)
    async exportToFile(type) {
        try {
            let data, filename;
            
            if (type === 'articles') {
                if (this.isOnline) {
                    const articles = await this.loadArticles();
                    data = articles.reduce((acc, article) => {
                        acc[article.id] = article;
                        return acc;
                    }, {});
                } else {
                    data = this.getLocalCollection('articles');
                }
                filename = 'articles.json';
            } else if (type === 'weeklyNews') {
                if (this.isOnline) {
                    const announcements = await this.loadWeeklyNews();
                    data = announcements.reduce((acc, announcement) => {
                        acc[announcement.id] = announcement;
                        return acc;
                    }, {});
                } else {
                    data = this.getLocalCollection('weeklyNews');
                }
                filename = 'announcements.json';
            } else if (type === 'all') {
                const articlesData = this.isOnline ? await this.loadArticles() : Object.values(this.getLocalCollection('articles'));
                const weeklyNewsData = this.isOnline ? await this.loadWeeklyNews() : Object.values(this.getLocalCollection('weeklyNews'));
                
                data = {
                    articles: articlesData.reduce((acc, article) => {
                        acc[article.id] = article;
                        return acc;
                    }, {}),
                    weeklyNews: weeklyNewsData.reduce((acc, announcement) => {
                        acc[announcement.id] = announcement;
                        return acc;
                    }, {}),
                    comments: this.getLocalCollection('comments'),
                    views: this.getLocalCollection('views'),
                    exportDate: new Date().toISOString(),
                    exportSource: this.isOnline ? 'server' : 'localStorage'
                };
                filename = 'bistnews-backup.json';
            }
            
            // Create downloadable file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`✅ Exported ${type} to ${filename}`);
            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    async importFromFile(file, type = 'auto') {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (type === 'auto') {
                // Auto-detect file type
                if (data.articles && data.weeklyNews) {
                    // Full backup file
                    if (this.isOnline) {
                        // Import to server
                        for (const article of Object.values(data.articles)) {
                            await this.saveArticle(article);
                        }
                        for (const announcement of Object.values(data.weeklyNews)) {
                            await this.saveWeeklyNews(announcement);
                        }
                    } else {
                        // Import to localStorage
                        this.setLocalCollection('articles', data.articles);
                        this.setLocalCollection('weeklyNews', data.weeklyNews);
                        if (data.comments) this.setLocalCollection('comments', data.comments);
                        if (data.views) this.setLocalCollection('views', data.views);
                    }
                } else if (Array.isArray(Object.values(data)[0]) || typeof Object.values(data)[0] === 'object') {
                    // Single collection
                    if (file.name.includes('article')) {
                        if (this.isOnline) {
                            for (const article of Object.values(data)) {
                                await this.saveArticle(article);
                            }
                        } else {
                            this.setLocalCollection('articles', data);
                        }
                    } else if (file.name.includes('announcement') || file.name.includes('weekly')) {
                        if (this.isOnline) {
                            for (const announcement of Object.values(data)) {
                                await this.saveWeeklyNews(announcement);
                            }
                        } else {
                            this.setLocalCollection('weeklyNews', data);
                        }
                    }
                }
            } else {
                if (this.isOnline) {
                    // Import single type to server
                    for (const item of Object.values(data)) {
                        if (type === 'articles') {
                            await this.saveArticle(item);
                        } else if (type === 'weeklyNews') {
                            await this.saveWeeklyNews(item);
                        }
                    }
                } else {
                    this.setLocalCollection(type, data);
                }
            }
            
            console.log(`✅ Imported data from ${file.name} to ${this.isOnline ? 'server' : 'localStorage'}`);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    clearAllData() {
        const collections = ['articles', 'weeklyNews', 'comments', 'messages', 'views'];
        collections.forEach(collection => {
            localStorage.removeItem(collection);
            localStorage.setItem(collection, JSON.stringify({}));
        });
        console.log('🗑️ All local data cleared');
        
        if (this.isOnline) {
            console.log('⚠️ Server data not cleared - use server admin panel for server data management');
        }
    }

    // Status methods
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            hasWebSocket: !!this.socket?.connected,
            apiUrl: this.apiBaseUrl,
            fallbackMode: !this.isOnline
        };
    }
}

// Initialize the enhanced database
const enhancedDB = new EnhancedDatabase();

// Export functions to maintain compatibility with existing code
window.loginAdmin = (password) => enhancedDB.loginAdmin(password);
window.logoutAdmin = () => enhancedDB.logoutAdmin();
window.saveArticle = (data) => enhancedDB.saveArticle(data);
window.loadArticles = () => enhancedDB.loadArticles();
window.deleteArticle = (id) => enhancedDB.deleteArticle(id);
window.publishArticle = (id) => enhancedDB.publishArticle(id);
window.unpublishArticle = (id) => enhancedDB.unpublishArticle(id);
window.saveWeeklyNews = (data) => enhancedDB.saveWeeklyNews(data);
window.loadWeeklyNews = () => enhancedDB.loadWeeklyNews();
window.deleteWeeklyNewsFromDB = (id) => enhancedDB.deleteWeeklyNewsFromDB(id);
window.saveComment = (itemType, itemId, data) => enhancedDB.saveComment(itemType, itemId, data);
window.loadComments = (itemType, itemId) => enhancedDB.loadComments(itemType, itemId);
window.loadAllComments = () => enhancedDB.loadAllComments();
window.deleteComment = (id) => enhancedDB.deleteComment(id);
window.updateComment = (id, content) => enhancedDB.updateComment(id, content);
window.saveMessage = (data) => enhancedDB.saveMessage(data);
window.incrementViews = (itemType, itemId) => enhancedDB.incrementViews(itemType, itemId);
window.getViews = (itemType, itemId) => enhancedDB.getViews(itemType, itemId);
window.saveUploadedImage = (file, articleId) => enhancedDB.saveUploadedImage(file, articleId);
window.getCommentsCount = (itemType, itemId) => enhancedDB.getCommentsCount(itemType, itemId);
window.savePhotoAlbum = (albumData, files) => enhancedDB.savePhotoAlbum(albumData, files);
window.loadPhotoAlbumsFromDb = () => enhancedDB.loadPhotoAlbumsFromDb();
window.deletePhotoAlbum = (id) => enhancedDB.deletePhotoAlbum(id);


// Enhanced functions
window.exportData = (type) => enhancedDB.exportToFile(type);
window.importData = (file, type) => enhancedDB.importFromFile(file, type);
window.clearAllData = () => enhancedDB.clearAllData();
window.getConnectionStatus = () => enhancedDB.getConnectionStatus();

// Global database reference
window.enhancedDatabase = enhancedDB;

console.log('🚀 The Student Voice - Enhanced Database System Ready!');
console.log('🔗 Connection Status:', enhancedDB.getConnectionStatus());