// Local Database System for The Student Voice
// Replaces Firebase with localStorage for offline functionality

class LocalDatabase {
    constructor() {
        this.isReady = true;
        this.currentUser = null;
        this.initializeDatabase();
    }

    initializeDatabase() {
        // Initialize empty collections if they don't exist
        const collections = ['articles', 'weeklyNews', 'comments', 'messages', 'views', 'users'];
        
        collections.forEach(collection => {
            if (!localStorage.getItem(collection)) {
                localStorage.setItem(collection, JSON.stringify({}));
            }
        });

        // Initialize admin user if it doesn't exist
        const users = this.getCollection('users');
        if (!users['admin']) {
            users['admin'] = {
                id: 'admin',
                email: 'admin@bist.ro',
                password: 'admin123', // In real app, this would be hashed
                role: 'admin',
                createdAt: Date.now()
            };
            this.setCollection('users', users);
        }

        console.log('🔥 Local database initialized and ready for The Student Voice');
    }

    getCollection(name) {
        try {
            return JSON.parse(localStorage.getItem(name)) || {};
        } catch (error) {
            console.error(`Error reading collection ${name}:`, error);
            return {};
        }
    }

    setCollection(name, data) {
        try {
            localStorage.setItem(name, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error writing collection ${name}:`, error);
            return false;
        }
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Auth functions
    async loginAdmin(password) {
        try {
            // Check password against admin configuration
            if (password === window.ADMIN_CONFIG?.password) {
                this.currentUser = { 
                    name: window.ADMIN_CONFIG?.adminName || 'Admin',
                    email: 'admin@studentvoice.com',
                    role: 'admin'
                };
                window.isAdmin = true;
                window.currentUser = this.currentUser;
                console.log('✅ Admin logged in successfully');
                return { user: this.currentUser, success: true };
            } else {
                throw new Error('Password incorrect. Please check your credentials.');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    async logoutAdmin() {
        this.currentUser = null;
        console.log('Admin logged out');
    }

    // Articles management
    async saveArticle(articleData) {
        try {
            const articles = this.getCollection('articles');
            const id = this.generateId();
            
            articles[id] = {
                id: id,
                ...articleData,
                createdAt: Date.now(),
                authorId: this.currentUser?.id
            };
            
            this.setCollection('articles', articles);
            console.log('Article saved:', id);
            return id;
        } catch (error) {
            console.error('Error saving article:', error);
            throw error;
        }
    }

    async loadArticles() {
        try {
            const articles = this.getCollection('articles');
            return Object.values(articles).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error loading articles:', error);
            return [];
        }
    }

    async deleteArticle(id) {
        try {
            const articles = this.getCollection('articles');
            delete articles[id];
            this.setCollection('articles', articles);
            console.log('Article deleted:', id);
        } catch (error) {
            console.error('Error deleting article:', error);
            throw error;
        }
    }

    async publishArticle(id) {
        try {
            const articles = this.getCollection('articles');
            if (articles[id]) {
                articles[id].published = true;
                this.setCollection('articles', articles);
                console.log('Article published:', id);
            }
        } catch (error) {
            console.error('Error publishing article:', error);
            throw error;
        }
    }

    async unpublishArticle(id) {
        try {
            const articles = this.getCollection('articles');
            if (articles[id]) {
                articles[id].published = false;
                this.setCollection('articles', articles);
                console.log('Article unpublished:', id);
            }
        } catch (error) {
            console.error('Error unpublishing article:', error);
            throw error;
        }
    }

    // Announcements management
    async saveWeeklyNews(announcementData) {
        try {
            const weeklyNews = this.getCollection('weeklyNews');
            const id = this.generateId();
            
            weeklyNews[id] = {
                id: id,
                ...announcementData,
                createdAt: Date.now(),
                authorId: this.currentUser?.id
            };
            
            this.setCollection('weeklyNews', weeklyNews);
            console.log('Announcement saved:', id);
            return id;
        } catch (error) {
            console.error('Error saving announcement:', error);
            throw error;
        }
    }

    async loadWeeklyNews() {
        try {
            const weeklyNews = this.getCollection('weeklyNews');
            return Object.values(weeklyNews).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error loading weeklyNews:', error);
            return [];
        }
    }

    async deleteWeeklyNewsFromDB(id) {
        try {
            const weeklyNews = this.getCollection('weeklyNews');
            delete weeklyNews[id];
            this.setCollection('weeklyNews', weeklyNews);
            console.log('Announcement deleted:', id);
        } catch (error) {
            console.error('Error deleting announcement:', error);
            throw error;
        }
    }

    // Comments management
    async saveComment(itemType, itemId, commentData) {
        try {
            const comments = this.getCollection('comments');
            const id = this.generateId();
            
            comments[id] = {
                id: id,
                itemType: itemType,
                itemId: itemId,
                ...commentData,
                createdAt: Date.now()
            };
            
            this.setCollection('comments', comments);
            console.log('Comment saved:', id);
            return id;
        } catch (error) {
            console.error('Error saving comment:', error);
            throw error;
        }
    }

    async loadComments(itemType, itemId) {
        try {
            const comments = this.getCollection('comments');
            return Object.values(comments)
                .filter(comment => comment.itemType === itemType && comment.itemId === itemId)
                .sort((a, b) => a.createdAt - b.createdAt);
        } catch (error) {
            console.error('Error loading comments:', error);
            return [];
        }
    }

    async deleteComment(id) {
        try {
            const comments = this.getCollection('comments');
            delete comments[id];
            this.setCollection('comments', comments);
            console.log('Comment deleted:', id);
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    // Messages management
    async saveMessage(messageData) {
        try {
            const messages = this.getCollection('messages');
            const id = this.generateId();
            
            messages[id] = {
                id: id,
                ...messageData,
                createdAt: Date.now(),
                read: false
            };
            
            this.setCollection('messages', messages);
            console.log('Message saved:', id);
            return id;
        } catch (error) {
            console.error('Error saving message:', error);
            throw error;
        }
    }

    // Views tracking
    async incrementViews(itemType, itemId) {
        try {
            const views = this.getCollection('views');
            const key = `${itemType}_${itemId}`;
            
            if (!views[key]) {
                views[key] = { count: 0, lastViewed: Date.now() };
            }
            
            views[key].count += 1;
            views[key].lastViewed = Date.now();
            
            this.setCollection('views', views);
            console.log(`Views incremented for ${itemType} ${itemId}: ${views[key].count}`);
            return views[key].count;
        } catch (error) {
            console.error('Error incrementing views:', error);
            return 0;
        }
    }

    async getViews(itemType, itemId) {
        try {
            const views = this.getCollection('views');
            const key = `${itemType}_${itemId}`;
            return views[key] ? views[key].count : 0;
        } catch (error) {
            console.error('Error getting views:', error);
            return 0;
        }
    }

    // File upload simulation (for demo purposes)
    async uploadPdfFile(file, folderName, filename) {
        // Since we're using local storage, we'll simulate file uploads
        // In a real implementation, this would handle actual file uploads
        console.log(`Simulating PDF upload: ${filename} to ${folderName}`);
        return `magazine/${folderName}/${filename}`;
    }

    async uploadCoverImage(file, articleTitle) {
        // Simulate cover image upload
        console.log(`Simulating cover upload for: ${articleTitle}`);
        return `covers/${articleTitle}_cover.jpg`;
    }

    // Utility functions
    async getAllData() {
        return {
            articles: await this.loadArticles(),
            weeklyNews: await this.loadWeeklyNews(),
            views: this.getCollection('views'),
            comments: this.getCollection('comments')
        };
    }

    async clearAllData() {
        const collections = ['articles', 'weeklyNews', 'comments', 'messages', 'views'];
        collections.forEach(collection => {
            localStorage.removeItem(collection);
        });
        this.initializeDatabase();
        console.log('All data cleared and database reinitialized');
    }

    // Get comments count for an item
    async getCommentsCount(itemType, itemId) {
        const comments = await this.loadComments(itemType, itemId);
        return comments.length;
    }
}

// Initialize the local database
const localDB = new LocalDatabase();

// Export functions to maintain compatibility with existing Firebase code
window.loginAdmin = (password) => localDB.loginAdmin(password);
window.logoutAdmin = () => localDB.logoutAdmin();
window.saveArticle = (data) => localDB.saveArticle(data);
window.loadArticles = () => localDB.loadArticles();
window.deleteArticle = (id) => localDB.deleteArticle(id);
window.publishArticle = (id) => localDB.publishArticle(id);
window.unpublishArticle = (id) => localDB.unpublishArticle(id);
window.saveWeeklyNews = (data) => localDB.saveWeeklyNews(data);
window.loadWeeklyNews = () => localDB.loadWeeklyNews();
window.deleteWeeklyNewsFromDB = (id) => localDB.deleteWeeklyNewsFromDB(id);
window.saveComment = (itemType, itemId, data) => localDB.saveComment(itemType, itemId, data);
window.loadComments = (itemType, itemId) => localDB.loadComments(itemType, itemId);
window.deleteComment = (id) => localDB.deleteComment(id);
window.saveMessage = (data) => localDB.saveMessage(data);
window.incrementViews = (itemType, itemId) => localDB.incrementViews(itemType, itemId);
window.getViews = (itemType, itemId) => localDB.getViews(itemType, itemId);
window.uploadPdfFile = (file, folder, filename) => localDB.uploadPdfFile(file, folder, filename);
window.uploadCoverImage = (file, title) => localDB.uploadCoverImage(file, title);
window.getCommentsCount = (itemType, itemId) => localDB.getCommentsCount(itemType, itemId);

// Global database reference
window.localDatabase = localDB;

console.log('🚀 The Student Voice - Local database system ready!');