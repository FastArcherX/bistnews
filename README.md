# 🌟 The Student Voice - BIST News Website

**Enhanced Real-time News Platform for British International School of Timisoara**

## 🚀 What's New - Real-time Synchronization!

Il sito ora include un sistema di sincronizzazione automatica in tempo reale che permette a più utenti di vedere aggiornamenti istantanei senza dover ricaricare la pagina.

### ✨ Nuove Funzionalità

- **🔄 Sincronizzazione Automatica**: Gli aggiornamenti appaiono immediatamente su tutte le pagine aperte
- **📡 Backend Node.js**: Server potente con API REST complete
- **💬 Aggiornamenti Real-time**: Socket.IO per comunicazione bidirezionale
- **📸 Upload Immagini**: Sistema completo per caricare e gestire immagini
- **💾 Doppio Storage**: Utilizza server backend con fallback su localStorage
- **🎯 Multi-utente**: Supporta connessioni simultanee con sincronizzazione

## 🎯 Funzionalità Principali

### 📰 Gestione Articoli
- ✏️ Editor avanzato per creare e modificare articoli
- 🏷️ Sistema di categorie e tag
- 📊 Tracking delle visualizzazioni
- 🔄 Pubblicazione e bozze
- 📸 Upload immagini per articoli

### 📢 Gestione Annunci
- 📋 Annunci settimanali e comunicazioni
- 🎨 Tipi diversi di annunci (info, warning, success)
- ⭐ Sistema di priorità
- 🔄 Aggiornamenti in tempo reale

### 👥 Sezione Team
- 🎨 Design completamente rinnovato
- 👤 Profili team con ruoli e descrizioni
- 📧 Informazioni di contatto
- 🎯 Layout responsive e professionale

### 🔧 Pannello Admin
- 🔐 Accesso sicuro con password
- 📊 Dashboard completa per gestione contenuti
- 📤📥 Export/Import dati completo
- 🗑️ Gestione e cancellazione contenuti
- 📈 Statistiche e analytics

### 💬 Sistema Commenti
- 💭 Commenti su articoli e annunci
- 👤 Gestione autori e moderazione
- 🔄 Aggiornamenti real-time dei nuovi commenti

## 🛠️ Installazione e Avvio

### 📋 Prerequisiti
- Node.js 18+ installato
- npm o yarn package manager
- Browser moderno (Chrome, Firefox, Safari, Edge)

### 🔧 Setup Completo

1. **Installa le dipendenze:**
```bash
cd bistnews-29-09-25
npm install
```

2. **Avvia il sistema completo:**
```bash
# Opzione 1: Avvia tutto insieme (consigliato)
npm start

# Opzione 2: Avvia manualmente
# Terminal 1 - Backend Server
npm run server

# Terminal 2 - Frontend
npm run frontend
```

3. **Accedi al sito:**
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3001

### 🎮 Comandi Disponibili

```bash
# 🚀 Avvia tutto (backend + frontend)
npm start

# 🔧 Solo backend server
npm run server

# 🌐 Solo frontend
npm run frontend

# 🏗️ Build del progetto
npm run build

# 🧪 Test API del server
node test-sync.js

# 🛠️ Setup iniziale dipendenze
npm run setup
```

## 🔐 Accesso Admin

**Password Admin**: `admin123`

### 🎯 Funzionalità Admin
- ➕ Crea e modifica articoli
- 📢 Gestisci annunci settimanali
- 📊 Visualizza statistiche
- 📤 Esporta tutti i dati
- 📥 Importa dati da file
- 🗑️ Cancella contenuti
- 👥 Gestione utenti

## 🏗️ Architettura Tecnica

### 🔧 Frontend
- **📱 Responsive Design**: Bootstrap 5.3.2
- **🎨 Modern UI**: Font Awesome icons, Google Fonts
- **💾 Local Storage**: Backup locale per resilienza
- **📡 Socket.IO Client**: Real-time updates

### ⚙️ Backend
- **🚀 Node.js + Express**: Server API REST
- **📡 Socket.IO**: WebSocket real-time
- **📁 File Storage**: JSON files + image uploads
- **🔒 CORS**: Sicurezza cross-origin
- **📤 Multer**: Upload immagini multipart

### 🗄️ Storage System
- **Primary**: Server JSON files (articles.json, announcements.json, etc.)
- **Backup**: localStorage del browser
- **Images**: File system con Multer
- **Sync**: Real-time via Socket.IO

## 📁 Struttura Progetto

```
bistnews-29-09-25/
├── 📁 dist/                    # Frontend files
│   ├── 🌐 index.html          # Main page
│   ├── 📱 app.js              # Main application
│   ├── 💾 enhanced-database.js # Database system
│   ├── 🎨 styles/             # CSS styles
│   └── 📸 images/             # Static images
├── 📁 server-data/            # Backend data storage
│   ├── 📰 articles.json       # Articles data
│   ├── 📢 announcements.json  # Announcements
│   ├── 💬 comments.json       # Comments
│   ├── 👁️ views.json          # View tracking
│   └── 📁 uploads/            # Uploaded images
├── 🖥️ server.js              # Backend server
├── 🧪 test-sync.js           # API testing
├── 📦 package.json           # Dependencies
└── 📖 README.md              # This file
```

## 🔄 Sistema Real-time

### 📡 WebSocket Events
- `articleAdded` - Nuovo articolo pubblicato
- `articleUpdated` - Articolo modificato
- `articleDeleted` - Articolo cancellato
- `announcementAdded` - Nuovo annuncio
- `commentAdded` - Nuovo commento

### 🔌 Connessione Status
- ✅ **Online**: Usa server backend con sync real-time
- 📱 **Offline**: Fallback automatico su localStorage
- 🔄 **Auto-retry**: Riconnessione automatica

## 🧪 Testing

### 🔍 Test API Server
```bash
node test-sync.js
```

### 🌐 Test Multi-browser
1. Apri http://localhost:5000 in più tab/browser
2. Effettua login admin in una tab
3. Aggiungi un articolo o annuncio
4. Osserva l'aggiornamento automatico nelle altre tab

## 🐛 Troubleshooting

### ❌ Errori Comuni

**Server non si avvia:**
```bash
# Verifica se la porta 3001 è libera
netstat -an | findstr 3001

# Installa dipendenze mancanti
npm install express socket.io multer cors fs-extra uuid concurrently
```

**Frontend non si carica:**
```bash
# Verifica se la porta 5000 è libera
netstat -an | findstr 5000

# Installa http-server globalmente
npm install -g http-server
```

**Sincronizzazione non funziona:**
1. Controlla console browser per errori WebSocket
2. Verifica che il server backend sia attivo su porta 3001
3. Controlla che Socket.IO sia caricato (vedi network tab)

### 🔧 Reset Completo
```bash
# Cancella node_modules e reinstalla
rm -rf node_modules
npm install

# Reset dati server
rm -rf server-data
mkdir server-data
mkdir server-data/uploads
echo '{}' > server-data/articles.json
echo '{}' > server-data/announcements.json
echo '{}' > server-data/comments.json
echo '{}' > server-data/views.json
```

## 🎯 Roadmap Future

- [ ] 🔐 Sistema utenti avanzato con registrazione
- [ ] 📊 Dashboard analytics avanzata
- [ ] 🌍 Multilingua (Inglese/Italiano/Rumeno)
- [ ] 📱 App mobile companion
- [ ] 🔔 Sistema notifiche push
- [ ] 🗄️ Database PostgreSQL/MongoDB
- [ ] ☁️ Deploy cloud (AWS/Heroku/Vercel)

## 👨‍💻 Sviluppo

**Tecnologie utilizzate:**
- Frontend: HTML5, CSS3, JavaScript ES6+, Bootstrap 5, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, Multer, CORS
- Storage: JSON files, File system, localStorage
- Tools: npm, http-server, concurrently

**Creato per British International School of Timisoara**
*Versione 2.0 - Real-time Edition* 🚀