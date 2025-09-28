// Firebase integration for BISTnews
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getDatabase, ref, push, set, get, remove, onValue, child } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Firebase configuration using environment variables
const firebaseConfig = {
    apiKey: window.VITE_FIREBASE_API_KEY,
    authDomain: `${window.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: window.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${window.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
    appId: window.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Auth functions
window.loginAdmin = async function(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User logged in:', user.email);
        window.currentUser = user;
        window.isAdmin = true;
        if (window.currentPage === 'admin') {
            window.checkAdminAuth();
        }
        return true;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error('Credenziali non valide');
    }
};

// Registration removed - admin accounts are managed manually in Firebase Console

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.currentUser = user;
        window.isAdmin = true;
        if (window.currentPage === 'admin') {
            window.checkAdminAuth();
        }
    } else {
        window.currentUser = null;
        window.isAdmin = false;
        if (window.currentPage === 'admin') {
            window.checkAdminAuth();
        }
    }
});

window.logoutAdmin = async function() {
    try {
        await signOut(auth);
        window.currentUser = null;
        window.isAdmin = false;
        window.checkAdminAuth();
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Realtime Database functions
window.saveAnnouncement = async function(announcement) {
    try {
        const announcementsRef = ref(database, 'announcements');
        const newAnnouncementRef = push(announcementsRef);
        await set(newAnnouncementRef, {
            ...announcement,
            createdAt: Date.now(),
            authorId: window.currentUser?.uid
        });
        return newAnnouncementRef.key;
    } catch (error) {
        console.error('Error saving announcement:', error);
        throw error;
    }
};

window.loadAnnouncements = async function() {
    try {
        const announcementsRef = ref(database, 'announcements');
        const snapshot = await get(announcementsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    } catch (error) {
        console.error('Error loading announcements:', error);
        return [];
    }
};

window.deleteAnnouncementFromDB = async function(id) {
    try {
        const announcementRef = ref(database, `announcements/${id}`);
        await remove(announcementRef);
    } catch (error) {
        console.error('Error deleting announcement:', error);
        throw error;
    }
};

// Articles management (PDF folders)
window.saveArticle = async function(articleData) {
    try {
        const articlesRef = ref(database, 'articles');
        const newArticleRef = push(articlesRef);
        await set(newArticleRef, {
            ...articleData,
            createdAt: Date.now(),
            authorId: window.currentUser?.uid
        });
        return newArticleRef.key;
    } catch (error) {
        console.error('Error saving article:', error);
        throw error;
    }
};

window.loadArticles = async function() {
    try {
        const articlesRef = ref(database, 'articles');
        const snapshot = await get(articlesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    } catch (error) {
        console.error('Error loading articles:', error);
        return [];
    }
};

window.deleteArticle = async function(id) {
    try {
        const articleRef = ref(database, `articles/${id}`);
        await remove(articleRef);
    } catch (error) {
        console.error('Error deleting article:', error);
        throw error;
    }
};

window.saveComment = async function(itemType, itemId, comment) {
    try {
        const commentsRef = ref(database, 'comments');
        const newCommentRef = push(commentsRef);
        await set(newCommentRef, {
            itemType: itemType,
            itemId: itemId,
            ...comment,
            createdAt: Date.now()
        });
        return newCommentRef.key;
    } catch (error) {
        console.error('Error saving comment:', error);
        throw error;
    }
};

window.loadComments = async function(itemType, itemId) {
    try {
        const commentsRef = ref(database, 'comments');
        const snapshot = await get(commentsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data)
                .map(key => ({ id: key, ...data[key] }))
                .filter(comment => comment.itemType === itemType && comment.itemId === itemId)
                .sort((a, b) => a.createdAt - b.createdAt);
        }
        return [];
    } catch (error) {
        console.error('Error loading comments:', error);
        return [];
    }
};

window.saveMessage = async function(message) {
    try {
        const messagesRef = ref(database, 'messages');
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, {
            ...message,
            createdAt: Date.now(),
            read: false
        });
        return newMessageRef.key;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
};

// Local file system functions - PDFs stored in magazine folder
window.getMagazineFolders = async function() {
    try {
        // This would normally scan the magazine directory
        // For now, we'll return the structure from database
        const articlesRef = ref(database, 'articles');
        const snapshot = await get(articlesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        }
        return [];
    } catch (error) {
        console.error('Error getting magazine folders:', error);
        return [];
    }
};

window.getArticlePages = function(folderName) {
    // Return pages based on folder structure in magazine directory
    const basePath = `magazine/${folderName}`;
    // This assumes pages are numbered sequentially: page1.pdf, page2.pdf, etc.
    // or page1.jpg, page2.jpg if converted to images
    return [`${basePath}/page1.jpg`, `${basePath}/page2.jpg`, `${basePath}/page3.jpg`];
};

window.publishArticle = async function(articleId) {
    try {
        const articleRef = ref(database, `articles/${articleId}`);
        await set(articleRef, {
            ...articles.find(a => a.id === articleId),
            published: true,
            publishedAt: Date.now()
        });
    } catch (error) {
        console.error('Error publishing article:', error);
        throw error;
    }
};

window.unpublishArticle = async function(articleId) {
    try {
        const articleRef = ref(database, `articles/${articleId}`);
        await set(articleRef, {
            ...articles.find(a => a.id === articleId),
            published: false,
            unpublishedAt: Date.now()
        });
    } catch (error) {
        console.error('Error unpublishing article:', error);
        throw error;
    }
};

window.deleteComment = async function(commentId) {
    try {
        const commentRef = ref(database, `comments/${commentId}`);
        await remove(commentRef);
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

console.log('Firebase integration loaded successfully');
export { app, auth, database, storage };