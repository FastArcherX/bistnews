import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5000", "http://127.0.0.1:5000"],
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'server-data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// Ensure directories exist
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(path.join(UPLOADS_DIR, 'articles'));
fs.ensureDirSync(path.join(UPLOADS_DIR, 'announcements'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = req.body.type === 'announcement' ? 
            path.join(UPLOADS_DIR, 'announcements') : 
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
        fileSize: 10 * 1024 * 1024 // 10MB limit
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
        if (fs.existsSync(filePath)) {
            return fs.readJsonSync(filePath);
        }
        return {};
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

app.post('/api/articles', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const id = uuidv4();
        
        const newArticle = {
            id,
            ...req.body,
            createdAt: Date.now()
        };
        
        articles[id] = newArticle;
        
        if (writeJSONFile('articles.json', articles)) {
            // Notify all connected clients
            io.emit('articleAdded', newArticle);
            res.json({ id, ...newArticle });
        } else {
            res.status(500).json({ error: 'Failed to save article' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create article' });
    }
});

app.put('/api/articles/:id', (req, res) => {
    try {
        const articles = readJSONFile('articles.json');
        const { id } = req.params;
        
        if (!articles[id]) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        articles[id] = { ...articles[id], ...req.body };
        
        if (writeJSONFile('articles.json', articles)) {
            io.emit('articleUpdated', articles[id]);
            res.json(articles[id]);
        } else {
            res.status(500).json({ error: 'Failed to update article' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update article' });
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

// File upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const fileUrl = `/uploads/${req.body.type === 'announcement' ? 'announcements' : 'articles'}/${req.file.filename}`;
        
        res.json({
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: fileUrl,
            size: req.file.size,
            type: req.file.mimetype
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Comments endpoints
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

app.post('/api/comments', (req, res) => {
    try {
        const comments = readJSONFile('comments.json');
        const id = uuidv4();
        
        const newComment = {
            id,
            ...req.body,
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