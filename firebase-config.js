// Firebase integration for BISTnews
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

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
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Auth functions
window.loginAdmin = async function() {
    try {
        await signInWithRedirect(auth, provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Errore durante l\'accesso: ' + error.message);
    }
};

// Handle redirect result
getRedirectResult(auth).then((result) => {
    if (result) {
        const user = result.user;
        console.log('User logged in:', user.displayName);
        window.currentUser = user;
        window.isAdmin = true;
        if (window.currentPage === 'admin') {
            window.checkAdminAuth();
        }
    }
}).catch((error) => {
    console.error('Redirect error:', error);
});

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
        await auth.signOut();
        window.currentUser = null;
        window.isAdmin = false;
        window.checkAdminAuth();
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Firestore functions
window.saveAnnouncement = async function(announcement) {
    try {
        const docRef = await addDoc(collection(db, "announcements"), {
            ...announcement,
            createdAt: new Date(),
            authorId: window.currentUser?.uid
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving announcement:', error);
        throw error;
    }
};

window.loadAnnouncements = async function() {
    try {
        const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading announcements:', error);
        return [];
    }
};

window.deleteAnnouncementFromDB = async function(id) {
    try {
        await deleteDoc(doc(db, "announcements", id));
    } catch (error) {
        console.error('Error deleting announcement:', error);
        throw error;
    }
};

window.savePdf = async function(pdfData) {
    try {
        const docRef = await addDoc(collection(db, "pdfs"), {
            ...pdfData,
            createdAt: new Date(),
            authorId: window.currentUser?.uid
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving PDF:', error);
        throw error;
    }
};

window.loadPdfs = async function() {
    try {
        const q = query(collection(db, "pdfs"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading PDFs:', error);
        return [];
    }
};

window.saveComment = async function(itemType, itemId, comment) {
    try {
        const docRef = await addDoc(collection(db, "comments"), {
            itemType: itemType,
            itemId: itemId,
            ...comment,
            createdAt: new Date()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving comment:', error);
        throw error;
    }
};

window.loadComments = async function(itemType, itemId) {
    try {
        const q = query(
            collection(db, "comments"),
            orderBy("createdAt", "asc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(comment => comment.itemType === itemType && comment.itemId === itemId);
    } catch (error) {
        console.error('Error loading comments:', error);
        return [];
    }
};

window.saveMessage = async function(message) {
    try {
        const docRef = await addDoc(collection(db, "messages"), {
            ...message,
            createdAt: new Date(),
            read: false
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
};

// Storage functions
window.uploadPdfFile = async function(file, filename) {
    try {
        const storageRef = ref(storage, `pdfs/${filename}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading PDF:', error);
        throw error;
    }
};

window.uploadCoverImage = async function(file, filename) {
    try {
        const storageRef = ref(storage, `covers/${filename}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading cover:', error);
        throw error;
    }
};

console.log('Firebase integration loaded successfully');
export { app, auth, db, storage };