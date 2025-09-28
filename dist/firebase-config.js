// Firebase integration for BISTnews
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getDatabase, ref, push, set, get, remove, onValue, child } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Check if Firebase environment variables are configured
const hasFirebaseConfig = window.VITE_FIREBASE_API_KEY && 
                          window.VITE_FIREBASE_PROJECT_ID && 
                          window.VITE_FIREBASE_APP_ID;

let app, auth, database, storage;

if (hasFirebaseConfig) {
    try {
        // Firebase configuration using environment variables
        const firebaseConfig = {
            apiKey: window.VITE_FIREBASE_API_KEY,
            authDomain: `${window.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
            databaseURL: `https://${window.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`,
            projectId: window.VITE_FIREBASE_PROJECT_ID,
            storageBucket: `${window.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
            appId: window.VITE_FIREBASE_APP_ID,
        };

        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        database = getDatabase(app);
        storage = getStorage(app);
        console.log('Firebase inizializzato correttamente');
    } catch (error) {
        console.error('Errore inizializzazione Firebase:', error);
        console.log('Modalità demo attivata - funzionalità Firebase disabilitate');
    }
} else {
    console.log('Configurazione Firebase non trovata - modalità demo attiva');
}

// Auth functions
window.loginAdmin = async function(email, password) {
    if (!hasFirebaseConfig || !auth) {
        // Demo mode - accept demo credentials
        if (email === 'admin@bistnews.com' && password === 'demo123') {
            console.log('Login demo riuscito');
            window.currentUser = { email: 'admin@bistnews.com', uid: 'demo-admin' };
            window.isAdmin = true;
            if (window.currentPage === 'admin') {
                window.checkAdminAuth();
            }
            return true;
        } else {
            throw new Error('Modalità demo: usa admin@bistnews.com / demo123');
        }
    }
    
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

window.registerAdmin = async function(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User registered:', user.email);
        return true;
    } catch (error) {
        console.error('Registration error:', error);
        throw new Error('Errore durante la registrazione: ' + error.message);
    }
};

// Listen for auth state changes
if (hasFirebaseConfig && auth) {
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
}

window.logoutAdmin = async function() {
    try {
        if (hasFirebaseConfig && auth) {
            await signOut(auth);
        }
        window.currentUser = null;
        window.isAdmin = false;
        window.checkAdminAuth();
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Demo storage for when Firebase is not configured
window.demoAnnouncements = [];
window.demoArticles = [];
window.demoComments = [];

// Realtime Database functions
window.saveAnnouncement = async function(announcement) {
    if (!hasFirebaseConfig || !database) {
        // Demo mode - save to local array
        const newAnnouncement = {
            id: 'demo_' + Date.now(),
            ...announcement,
            createdAt: Date.now(),
            authorId: window.currentUser?.uid
        };
        window.demoAnnouncements.unshift(newAnnouncement);
        return newAnnouncement.id;
    }
    
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
    if (!hasFirebaseConfig || !database) {
        // Demo mode - return local array
        return window.demoAnnouncements || [];
    }
    
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
    if (!hasFirebaseConfig || !database) {
        // Demo mode - remove from local array
        window.demoAnnouncements = window.demoAnnouncements.filter(a => a.id !== id);
        return;
    }
    
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
    if (!hasFirebaseConfig || !database) {
        // Demo mode - save to local array
        const newArticle = {
            id: 'demo_' + Date.now(),
            ...articleData,
            createdAt: Date.now(),
            authorId: window.currentUser?.uid
        };
        window.demoArticles.unshift(newArticle);
        return newArticle.id;
    }
    
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
    if (!hasFirebaseConfig || !database) {
        // Demo mode - return local array combined with demo data
        return [...(window.demoArticles || [])];
    }
    
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
    if (!hasFirebaseConfig || !database) {
        // Demo mode - remove from local array and articles array
        window.demoArticles = window.demoArticles.filter(a => a.id !== id);
        // Also remove from main articles array if it's there
        if (window.articles) {
            window.articles = window.articles.filter(a => a.id !== id);
        }
        return;
    }
    
    try {
        const articleRef = ref(database, `articles/${id}`);
        await remove(articleRef);
    } catch (error) {
        console.error('Error deleting article:', error);
        throw error;
    }
};

window.publishArticle = async function(id) {
    if (!hasFirebaseConfig || !database) {
        // Demo mode - update local arrays
        const article = window.demoArticles.find(a => a.id === id) || window.articles.find(a => a.id === id);
        if (article) {
            article.published = true;
        }
        return;
    }
    
    try {
        const articleRef = ref(database, `articles/${id}`);
        await set(child(articleRef, 'published'), true);
    } catch (error) {
        console.error('Error publishing article:', error);
        throw error;
    }
};

window.unpublishArticle = async function(id) {
    if (!hasFirebaseConfig || !database) {
        // Demo mode - update local arrays
        const article = window.demoArticles.find(a => a.id === id) || window.articles.find(a => a.id === id);
        if (article) {
            article.published = false;
        }
        return;
    }
    
    try {
        const articleRef = ref(database, `articles/${id}`);
        await set(child(articleRef, 'published'), false);
    } catch (error) {
        console.error('Error unpublishing article:', error);
        throw error;
    }
};

window.saveComment = async function(itemType, itemId, comment) {
    if (!hasFirebaseConfig || !database) {
        // Demo mode - save to local array
        const newComment = {
            id: 'demo_comment_' + Date.now(),
            itemType: itemType,
            itemId: itemId,
            ...comment,
            createdAt: Date.now()
        };
        window.demoComments.push(newComment);
        return newComment.id;
    }
    
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
    if (!hasFirebaseConfig || !database) {
        // Demo mode - filter local array
        return (window.demoComments || [])
            .filter(comment => comment.itemType === itemType && comment.itemId === itemId)
            .sort((a, b) => a.createdAt - b.createdAt);
    }
    
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

window.deleteComment = async function(id) {
    if (!hasFirebaseConfig || !database) {
        // Demo mode - remove from local array
        window.demoComments = window.demoComments.filter(c => c.id !== id);
        return;
    }
    
    try {
        const commentRef = ref(database, `comments/${id}`);
        await remove(commentRef);
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

window.saveMessage = async function(message) {
    if (!hasFirebaseConfig || !database) {
        // Demo mode - just log the message
        console.log('Messaggio demo salvato:', message);
        alert('Messaggio inviato correttamente! (modalità demo)');
        return 'demo_message_' + Date.now();
    }
    
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

// Storage functions
window.uploadPdfFile = async function(file, folderName, filename) {
    try {
        const pdfStorageRef = storageRef(storage, `articles/${folderName}/${filename}`);
        const snapshot = await uploadBytes(pdfStorageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading PDF:', error);
        throw error;
    }
};

window.uploadCoverImage = async function(file, articleTitle) {
    try {
        const coverStorageRef = storageRef(storage, `covers/${articleTitle}_cover.jpg`);
        const snapshot = await uploadBytes(coverStorageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading cover:', error);
        throw error;
    }
};

// Initialize demo mode notice
if (!hasFirebaseConfig) {
    window.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 BISTnews caricato in modalità DEMO');
        console.log('📋 Credenziali demo: admin@bistnews.com / demo123');
        console.log('⚙️ Per abilitare Firebase, configura le variabili d\'ambiente');
    });
}

console.log('Firebase integration loaded successfully');
export { app, auth, database, storage };