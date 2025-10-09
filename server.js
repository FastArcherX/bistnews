import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const corsOriginsEnv = (process.env.CORS_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
const defaultOrigins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3001"
];
const allowedOrigins = corsOriginsEnv.length ? corsOriginsEnv : defaultOrigins;
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.join(__dirname, 'server-data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
// Google OAuth Client ID fallback (public identifier). Prefer setting process.env.GOOGLE_CLIENT_ID in production.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '427696701817-g0ucnndo8htf3dhg5m8sd99ud4i9vfvd.apps.googleusercontent.com';
const ALLOWED_DOMAIN = 'britishschool-timisoara.ro';
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Early interceptor: silence any request path containing 'placeholder'
const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
function sendTransparent(res) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('png');
    res.send(Buffer.from(TRANSPARENT_PNG_BASE64, 'base64'));
}

app.use((req, res, next) => {
    if (/placeholder/i.test(req.path)) {
        return sendTransparent(res);
    }
    next();
});

// Fallback for missing uploads: if an image under /uploads/* is missing, return transparent PNG instead of 404
app.get('/uploads/*', (req, res, next) => {
    try {
        const relRaw = req.path.replace(/^\/uploads\//, '');
        const rel = decodeURIComponent(relRaw);
        const target = path.join(UPLOADS_DIR, rel);
        if (fs.existsSync(target)) {
            return res.sendFile(target, (err) => {
                if (err) return sendTransparent(res);
            });
        }
        return sendTransparent(res);
    } catch (e) {
        return sendTransparent(res);
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Ensure directories exist
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(path.join(UPLOADS_DIR, 'articles'));
fs.ensureDirSync(path.join(UPLOADS_DIR, 'announcements'));
fs.ensureDirSync(path.join(UPLOADS_DIR, 'gallery'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = req.body.type === 'announcement' ? 
            path.join(UPLOADS_DIR, 'announcements') : 
            req.body.type === 'gallery' ?
            path.join(UPLOADS_DIR, 'gallery') :
            path.join(UPLOADS_DIR, 'articles');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        fieldSize: 5 * 1024 * 1024, // raise to 5MB for rich HTML with embeds
        fields: 40 // allow more text fields safely
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Utility functions
function readJSONFile(filename) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        if (!fs.existsSync(filePath)) return {};
        // Read as raw buffer to detect encoding issues (UTF-16 LE/BE) and strip BOM/garbage
        const rawBuf = fs.readFileSync(filePath);
        let text;
        if (rawBuf.length >= 2 && rawBuf[0] === 0xFF && rawBuf[1] === 0xFE) {
            // UTF-16 LE
            text = rawBuf.toString('utf16le');
        } else if (rawBuf.length >= 2 && rawBuf[0] === 0xFE && rawBuf[1] === 0xFF) {
            // UTF-16 BE -> swap to LE then decode
            const swapped = Buffer.from(rawBuf); // copy
            if (typeof swapped.swap16 === 'function') swapped.swap16();
            text = swapped.toString('utf16le');
        } else {
            // Default UTF-8
            text = rawBuf.toString('utf8');
        }

        // Remove BOM characters and nulls, then trim
        let sanitized = text.replace(/\uFEFF/g, '').replace(/[\u0000]/g, '').trim();

        if (!sanitized) return {};

        // If there is garbage before the first JSON token, slice from first { or [
        const startIdx = sanitized.search(/[\[{]/);
        if (startIdx > 0) {
            sanitized = sanitized.slice(startIdx);
        }
        // If there is garbage after JSON, cut at last } or ]
        const lastObj = sanitized.lastIndexOf('}');
        const lastArr = sanitized.lastIndexOf(']');
        const endIdx = Math.max(lastObj, lastArr);
        if (endIdx > 0 && endIdx < sanitized.length - 1) {
            sanitized = sanitized.slice(0, endIdx + 1);
        }

        try {
            const obj = JSON.parse(sanitized);
            return obj && typeof obj === 'object' ? obj : {};
        } catch (e) {
            // As a last resort, return empty object quietly
            return {};
        }
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return {};
    }
}

function writeJSONFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        fs.writeJsonSync(filePath, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
}

// API Routes
// ---------------------------------------------
// Auth: Verify Google ID token and issue simple session token
// ---------------------------------------------
const inMemorySessions = new Map(); // sessionToken -> user

app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
        const ticket = await oauthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid token payload' });
        const email = payload.email.toLowerCase();
        if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
            return res.status(403).json({ error: `Email domain not allowed. Use an @${ALLOWED_DOMAIN} email.` });
        }
        const name = payload.name || email.split('@')[0].replace(/\./g,' ');
        const sessionToken = uuidv4();
        inMemorySessions.set(sessionToken, { email, name, picture: payload.picture || '', at: Date.now() });
        res.json({ sessionToken, user: { email, name, picture: payload.picture || '' } });
    } catch (e) {
        console.error('Auth error:', e);
        res.status(401).json({ error: 'Authentication failed' });
    }
});

// Middleware to enforce auth for protected mutations
function requireAuth(req, res, next){
    const token = req.headers['x-session-token'] || req.query.sessionToken || req.body.sessionToken;
    if (!token || !inMemorySessions.has(token)) {
        return res.status(401).json({ error: 'Auth required' });
    }
    req.user = inMemorySessions.get(token);
    next();
}

// Articles endpoints
app.get('/api/articles', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const articlesArray = Object.values(articles).sort((a, b) => b.createdAt - a.createdAt);
        res.json(articlesArray);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

app.post('/api/articles', (req, res, next) => {
    // Use upload middleware manually to capture MulterError and respond JSON
    upload.array('photos', 10)(req, res, function(err){
        if (err) {
            if (err.code === 'LIMIT_FIELD_VALUE') {
                return res.status(413).json({ error: 'Article content too large. Please reduce or remove large inline images.' });
            }
            if (err.code === 'LIMIT_FIELD_SIZE') {
                return res.status(413).json({ error: 'Field size exceeded. Consider removing very large embeds.' });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'One of the images exceeds 10MB limit.' });
            }
            return res.status(400).json({ error: err.message || 'Upload error' });
        }
        next();
    });
}, (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const id = uuidv4();
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Extract data URI images BEFORE size guard (so base64 doesn't inflate size check)
        if (req.body.content && /data:image\//i.test(req.body.content)) {
            try {
                let idx = 0;
                req.body.content = req.body.content.replace(/<img[^>]+src=("|')(data:image\/[^"]+?)("|')[^>]*>/gi, (match, _q, dataUri) => {
                    const m = dataUri.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/i);
                    if (!m) return match;
                    const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
                    const buffer = Buffer.from(m[3], 'base64');
                    const filename = `${Date.now()}_${uuidv4()}_${idx++}.${ext}`;
                    const filePath = path.join(UPLOADS_DIR, 'articles', filename);
                    fs.writeFileSync(filePath, buffer);
                    const rel = `/uploads/articles/${filename}`;
                    return match.replace(dataUri, rel);
                });
            } catch (e) {
                console.warn('Failed extracting inline images:', e.message);
            }
        }

        // Lightweight HTML compression: remove excessive whitespace & empty tags produced by editor
        if (req.body.content) {
            try {
                let compressed = req.body.content
                    .replace(/\s{2,}/g, ' ')             // collapse multiple spaces
                    .replace(/>\s+</g, '><')             // trim between tags
                    .replace(/<(p|div)[^>]*>\s*<\/\1>/g, '') // remove empty p/div
                    .replace(/style=""/g, '');
                req.body.content = compressed.trim();
            } catch {}
        }

        // Size guard AFTER transforms
        const MAX_HTML = 1_000_000; // 1MB raw HTML (post-cleanup)
        if (req.body.content && req.body.content.length > MAX_HTML) {
            return res.status(413).json({ error: `Content too large after processing (${(req.body.content.length/1024).toFixed(1)}KB). Please split the article.` });
        }

        const newArticle = {
            id,
            title: req.body.title,
            content: req.body.content,
            tags: req.body.tags ? req.body.tags.split(',') : [],
            author: req.body.author,
            createdAt: Date.now(),
            published: false, // Articles are unpublished by default
            featured: false, // Explicit default so frontend logic always has boolean
            photos: req.files ? req.files.map(file => `/uploads/articles/${file.filename}`) : []
        };
        
        articles[id] = newArticle;
        
        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleAdded', newArticle);
            res.status(201).json(newArticle);
        } else {
            res.status(500).json({ error: 'Failed to save article' });
        }
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

app.put('/api/articles/:id', upload.array('photos', 10), (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        
        if (!articles[id]) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const updatedArticle = {
            ...articles[id],
            title: req.body.title,
            content: req.body.content,
            tags: req.body.tags ? req.body.tags.split(',') : [],
            author: req.body.author,
            updatedAt: Date.now()
        };

        // Optional published toggle
        if (typeof req.body.published !== 'undefined') {
            updatedArticle.published = (req.body.published === 'true' || req.body.published === true);
        }

        // Optional featured toggle (normally managed by dedicated endpoints, but keep for completeness)
        if (typeof req.body.featured !== 'undefined') {
            updatedArticle.featured = (req.body.featured === 'true' || req.body.featured === true);
        } else if (typeof updatedArticle.featured === 'undefined') {
            // Backfill older articles without the flag
            updatedArticle.featured = false;
        }

        // Handle photo updates
        let existingPhotos = [];
        if (req.body.existingPhotos) {
            try {
                existingPhotos = JSON.parse(req.body.existingPhotos);
            } catch (e) {
                return res.status(400).json({ message: 'Invalid format for existingPhotos.' });
            }
        }

        const newPhotos = req.files ? req.files.map(file => `/uploads/articles/${file.filename}`) : [];
        
        // Combine and update photo list
        updatedArticle.photos = [...existingPhotos, ...newPhotos];

        articles[id] = updatedArticle;
        
        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleUpdated', updatedArticle);
            res.json(updatedArticle);
        } else {
            res.status(500).json({ error: 'Failed to update article' });
        }
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// Dedicated publish/unpublish endpoints for clarity
app.post('/api/articles/:id/publish', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        if (!articles[id]) return res.status(404).json({ error: 'Article not found' });
        articles[id].published = true;
        articles[id].updatedAt = Date.now();
        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleUpdated', articles[id]);
            return res.json({ message: 'Published', article: articles[id] });
        }
        return res.status(500).json({ error: 'Failed to publish article' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to publish article' });
    }
});

app.post('/api/articles/:id/unpublish', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        if (!articles[id]) return res.status(404).json({ error: 'Article not found' });
        articles[id].published = false;
        articles[id].updatedAt = Date.now();
        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleUpdated', articles[id]);
            return res.json({ message: 'Unpublished', article: articles[id] });
        }
        return res.status(500).json({ error: 'Failed to unpublish article' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to unpublish article' });
    }
});

// Feature / Unfeature endpoints (highlighted article for hero carousel)
// Enforces a single featured article policy.
app.post('/api/articles/:id/feature', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        if (!articles[id]) return res.status(404).json({ error: 'Article not found' });

        // Unfeature all others to keep single-feature invariant
        Object.keys(articles).forEach(aid => {
            if (articles[aid].featured) articles[aid].featured = false;
        });

        articles[id].featured = true;
        articles[id].updatedAt = Date.now();

        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleUpdated', articles[id]);
            return res.json({ message: 'Featured', article: articles[id] });
        }
        return res.status(500).json({ error: 'Failed to feature article' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to feature article' });
    }
});

app.post('/api/articles/:id/unfeature', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        if (!articles[id]) return res.status(404).json({ error: 'Article not found' });

        articles[id].featured = false;
        articles[id].updatedAt = Date.now();

        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleUpdated', articles[id]);
            return res.json({ message: 'Unfeatured', article: articles[id] });
        }
        return res.status(500).json({ error: 'Failed to unfeature article' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to unfeature article' });
    }
});

app.delete('/api/articles/:id', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        
        if (!articles[id]) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        delete articles[id];
        
        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleDeleted', id);
            res.json({ message: 'Article deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete article' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// Announcements endpoints
app.get('/api/announcements', (req, res) => {
    try {
        const announcements = readJSONFile('announcements.json');
        const announcementsArray = Object.values(announcements).sort((a, b) => b.createdAt - a.createdAt);
        res.json(announcementsArray);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

app.post('/api/announcements', (req, res) => {
    try {
        const announcements = readJSONFile('announcements.json');
        const id = uuidv4();
        
        const newAnnouncement = {
            id,
            ...req.body,
            createdAt: Date.now()
        };
        
        announcements[id] = newAnnouncement;
        
        if (writeJSONFile('announcements.json', announcements)) {
            io.emit('announcementAdded', newAnnouncement);
            res.json({ id, ...newAnnouncement });
        } else {
            res.status(500).json({ error: 'Failed to save announcement' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

app.put('/api/announcements/:id', (req, res) => {
    try {
        const announcements = readJSONFile('announcements.json');
        const { id } = req.params;
        
        if (!announcements[id]) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        announcements[id] = { ...announcements[id], ...req.body };
        
        if (writeJSONFile('announcements.json', announcements)) {
            io.emit('announcementUpdated', announcements[id]);
            res.json(announcements[id]);
        } else {
            res.status(500).json({ error: 'Failed to update announcement' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

app.delete('/api/announcements/:id', (req, res) => {
    try {
        const announcements = readJSONFile('announcements.json');
        const { id } = req.params;
        
        if (!announcements[id]) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        delete announcements[id];
        
        if (writeJSONFile('announcements.json', announcements)) {
            io.emit('announcementDeleted', id);
            res.json({ message: 'Announcement deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete announcement' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// Photo Gallery Endpoints
const galleryUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const galleryDir = path.join(UPLOADS_DIR, 'gallery');
            fs.ensureDirSync(galleryDir);
            cb(null, galleryDir);
        },
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

app.get('/api/gallery', (req, res) => {
    try {
        const albums = readJSONFile('gallery.json');
        const albumsArray = Object.values(albums).sort((a, b) => b.createdAt - a.createdAt);
        res.json(albumsArray);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch gallery albums' });
    }
});

app.post('/api/gallery', galleryUpload.array('photos', 20), (req, res) => {
    console.log('📸 POST /api/gallery - Received request');
    console.log('📸 Body:', req.body);
    console.log('📸 Files:', req.files?.length || 0);
    
    try {
        if (!req.files || req.files.length === 0) {
            console.error('❌ No photos uploaded');
            return res.status(400).json({ error: 'No photos uploaded.' });
        }

        const albums = readJSONFile('gallery.json');
        const id = uuidv4();
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const newAlbum = {
            id,
            title: req.body.title,
            author: req.body.author,
            createdAt: Date.now(),
            photos: req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                url: `/uploads/gallery/${file.filename}`,
                absoluteUrl: `${baseUrl}/uploads/gallery/${file.filename}`
            })),
            coverImage: `${baseUrl}/uploads/gallery/${req.files[0].filename}`
        };

        albums[id] = newAlbum;

        if (writeJSONFile('gallery.json', albums)) {
            console.log('✅ Album created successfully:', id);
            io.emit('galleryUpdated');
            res.status(201).json(newAlbum);
        } else {
            console.error('❌ Failed to write gallery.json');
            res.status(500).json({ error: 'Failed to save gallery album.' });
        }
    } catch (error) {
        console.error('❌ Error creating gallery album:', error);
        res.status(500).json({ error: 'Failed to create gallery album.' });
    }
});

app.delete('/api/gallery/:id', (req, res) => {
    try {
        const albums = readJSONFile('gallery.json');
        const { id } = req.params;

        if (!albums[id]) {
            return res.status(404).json({ error: 'Album not found.' });
        }

        // Delete associated photos from disk
        albums[id].photos.forEach(photo => {
            const photoPath = path.join(UPLOADS_DIR, 'gallery', photo.filename);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        });

        delete albums[id];

        if (writeJSONFile('gallery.json', albums)) {
            io.emit('galleryUpdated');
            res.json({ message: 'Album deleted successfully.' });
        } else {
            res.status(500).json({ error: 'Failed to delete album.' });
        }
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ error: 'Failed to delete album.' });
    }
});

// File upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const fileUrl = `/uploads/${req.body.type === 'announcement' ? 'announcements' : 'articles'}/${req.file.filename}`;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        res.json({
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: fileUrl,
            absoluteUrl: `${baseUrl}${fileUrl}`,
            size: req.file.size,
            type: req.file.mimetype
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Comments endpoints
app.get('/api/comments', (req, res) => {
    try {
        const comments = readJSONFile('comments.json');
        const commentsArray = Object.values(comments).sort((a, b) => b.createdAt - a.createdAt);
        res.json(commentsArray);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all comments' });
    }
});

app.get('/api/comments/:itemType/:itemId', (req, res) => {
    try {
        const comments = readJSONFile('comments.json');
        const { itemType, itemId } = req.params;
        
        const itemComments = Object.values(comments)
            .filter(comment => comment.itemType === itemType && comment.itemId === itemId)
            .sort((a, b) => a.createdAt - b.createdAt);
            
        res.json(itemComments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', requireAuth, (req, res) => {
    try {
        const comments = readJSONFile('comments.json');
        const id = uuidv4();
        const author = req.user?.name || 'Unknown';
        const newComment = {
            id,
            itemType: req.body.itemType,
            itemId: req.body.itemId,
            author,
            content: req.body.content,
            email: req.user?.email,
            createdAt: Date.now()
        };
        
        comments[id] = newComment;
        
        if (writeJSONFile('comments.json', comments)) {
            io.emit('commentAdded', newComment);
            res.json(newComment);
        } else {
            res.status(500).json({ error: 'Failed to save comment' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

app.delete('/api/comments/:id', (req, res) => {
    try {
        const comments = readJSONFile('comments.json');
        const { id } = req.params;

        if (!comments[id]) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        delete comments[id];

        if (writeJSONFile('comments.json', comments)) {
            io.emit('commentDeleted', id);
            res.json({ message: 'Comment deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete comment' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

app.put('/api/comments/:id', (req, res) => {
    try {
        const comments = readJSONFile('comments.json');
        const { id } = req.params;

        if (!comments[id]) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Update content and add edited flag
        comments[id].content = req.body.content;
        comments[id].editedByAdmin = true;
        comments[id].editedAt = Date.now();

        if (writeJSONFile('comments.json', comments)) {
            io.emit('commentUpdated', comments[id]);
            res.json(comments[id]);
        } else {
            res.status(500).json({ error: 'Failed to update comment' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

// Views tracking
app.post('/api/views/:itemType/:itemId', (req, res) => {
    try {
        const views = readJSONFile('views.json');
        const { itemType, itemId } = req.params;
        const key = `${itemType}_${itemId}`;
        
        if (!views[key]) {
            views[key] = { count: 0, lastViewed: Date.now() };
        }
        
        views[key].count += 1;
        views[key].lastViewed = Date.now();
        
        if (writeJSONFile('views.json', views)) {
            // Emit real-time update for view count
            io.emit('viewUpdated', {
                itemType,
                itemId,
                count: views[key].count
            });
            res.json({ count: views[key].count });
        } else {
            res.status(500).json({ error: 'Failed to update views' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update views' });
    }
});

app.get('/api/views/:itemType/:itemId', (req, res) => {
    try {
        const views = readJSONFile('views.json');
        const { itemType, itemId } = req.params;
        const key = `${itemType}_${itemId}`;
        
        const count = views[key] ? views[key].count : 0;
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch views' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        server: 'BIST News Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Note: placeholder interception is handled by the early middleware above

// Socket.IO for real-time updates
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
    
    // Optional: Room-based updates for different content types
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`📡 Client ${socket.id} joined room: ${room}`);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 BIST News Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 Real-time updates enabled via Socket.IO`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`📸 Uploads directory: ${UPLOADS_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

export default app;