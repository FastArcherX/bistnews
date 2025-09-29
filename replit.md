# The Student Voice - Complete Campus News Platform

## Project Overview
The Student Voice is a comprehensive web application for a student newspaper/publication platform. Fully transformed from BISTnews into an English-language campus news platform with expanded functionality including news categorization, student life content, events calendar, resources section, and enhanced submission system.

## Stato Attuale
- ✅ **APP FUNZIONANTE** - Server HTTP attivo e stabile su porta 5000
- ✅ Tutte le funzionalità core implementate e testate
- ✅ Sistema di upload PDF per giornalini (admin + pubblico)
- ✅ Gestione annunci completa (creazione/eliminazione)
- ✅ Interfaccia responsive con Bootstrap
- ✅ Workflow http-server configurato e stabile
- ✅ **COMPLETATO:** Restyling completo con design professionale e Firebase integrato

## Architettura del Progetto
```
dist/                   # Applicazione web servita
├── index.html         # Pagina principale
└── app.js            # JavaScript applicazione

src/                   # Codice sorgente
└── app.js            # Collegamento simbolico per sviluppo
```

## Tecnologie Utilizzate
- **Frontend**: HTML5, JavaScript ES6+, Bootstrap 5.3.2
- **Server**: http-server (semplice e affidabile)
- **Styling**: Bootstrap CDN + CSS personalizzato
- **Funzionalità**: JavaScript vanilla per SPA behavior
- **Mock Data**: Dati dimostrativi per sviluppo

## Funzionalità Implementate

### LATO PUBBLICO:
- ✅ Homepage con articoli recenti e annunci
- ✅ Visualizzazione articoli completi in modal
- ✅ Sezione PDF giornalini con download/visualizzazione
- ✅ Modulo contatti funzionante
- ✅ Navigazione responsive

### LATO ADMIN:
- ✅ **Gestione Annunci** - Creazione, visualizzazione, eliminazione
- ✅ **Upload PDF Giornalini** - Sistema completo di caricamento
- ✅ **Visualizzazione Messaggi** - Area per messaggi ricevuti
- ✅ Interfaccia tab-based per gestione contenuti

## Configurazione per Replit
- Server http-server configurato per porta 5000 con bind 0.0.0.0
- Cache disabilitata per sviluppo (-c-1)
- Workflow automatico attivo e stabile
- Deploy ready per autoscale

## Risoluzione Problemi Tecnici
- ❌ **Risolto:** Errori EPIPE esbuild - sostituito Vite con setup statico
- ❌ **Risolto:** Problemi dipendenze npm - eliminato build process complesso
- ❌ **Risolto:** Conflitti TypeScript - usato JavaScript puro
- ✅ **Risultato:** App stabile e performante

## Modifiche Recenti (28/09/2024) - VERSIONE FINALE
- ✅ **SISTEMA ARTICOLI PDF LOCALE** - Gestione articoli da cartella `magazine/` locale
- ✅ **PREVIEW INGRANDITA HOMEPAGE** - Prima pagina 600px per leggibilità ottimale
- ✅ **VISUALIZZATORE PDF LIBRO** - Navigazione destra/sinistra con thumbnails
- ✅ **SOLO LOGIN ADMIN** - Rimossa registrazione, accesso con credenziali Firebase
- ✅ **FIREBASE REALTIME DATABASE** - Database real-time per gestione contenuti
- ✅ **SEZIONE CONTATTI FINALE** - Design completo seguendo specifiche
- ✅ **ADMIN PUBBLICAZIONE/RITIRO** - Controllo completo visibilità articoli
- ✅ **MODERAZIONE COMMENTI** - Pannello admin per gestire tutti i commenti
- ✅ **STRUTTURA CARTELLE MAGAZINE** - Sistema file locale senza costi Storage

## Architettura Finale
- **Firebase Auth** - Solo accesso admin con email/password (no registrazione)
- **Firebase Realtime Database** - Articoli, annunci, commenti e messaggi
- **Sistema File Locale** - PDF nella cartella `magazine/[nome-articolo]/page1.jpg, page2.jpg...`
- **NO Firebase Storage** - Evita costi, gestione manuale file
- **Controllo Admin Completo** - Pubblicazione/ritiro + moderazione commenti

## Struttura Cartelle Magazine
```
dist/magazine/
├── Benvenuti al nuovo anno scolastico/
│   ├── page1.jpg
│   ├── page2.jpg
│   └── page3.jpg
├── Progetto sostenibilità ambientale/
│   ├── page1.jpg
│   └── page2.jpg
└── [Altri articoli...]/
    ├── page1.jpg
    └── [altre pagine...]
```

## Funzionalità Principali
### LATO PUBBLICO:
- ✅ **Homepage con preview aperta** - Prima pagina articolo visibile direttamente
- ✅ **Visualizzatore PDF completo** - Navigazione libro con controlli destra/sinistra
- ✅ **Sezione contatti strutturata** - Fondatore, Admin, Moderatori come da design
- ✅ **Sistema commenti real-time** - Conteggio dinamico da Firebase
- ✅ **Tracciamento visualizzazioni** - Sistema analytics integrato
- ✅ **Responsive design** ottimizzato

### LATO ADMIN:
- ✅ **Autenticazione email/password** sicura
- ✅ **Gestione articoli PDF** - Upload con organizzazione per cartelle
- ✅ **Editor annunci** con priorità e rich text
- ✅ **Gestione messaggi** ricevuti
- ✅ **Pubblicazione immediata/programmata** per tutti i contenuti
- ✅ **Analytics completi** - Visualizzazioni e commenti in tempo reale