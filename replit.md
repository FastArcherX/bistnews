# BISTnews - Giornale Scolastico

## Panoramica del Progetto
BISTnews è un'applicazione web per un giornale scolastico ora implementata come applicazione statica HTML/JavaScript. L'applicazione include funzionalità complete per la gestione degli articoli, upload PDF giornalini, annunci e area amministrativa.

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

## Modifiche Recenti (28/09/2024) - AGGIORNAMENTO MAGGIORE
- ✅ **SISTEMA ARTICOLI PDF COMPLETO** - Gestione articoli organizzati per cartelle con titolo
- ✅ **PREVIEW APERTA HOMEPAGE** - Anteprima articoli con prima pagina visibile direttamente
- ✅ **VISUALIZZATORE PDF LIBRO** - Navigazione destra/sinistra come libro con thumbnails
- ✅ **AUTENTICAZIONE EMAIL/PASSWORD** - Auth Firebase standard invece di Google
- ✅ **FIREBASE REALTIME DATABASE** - Migrazione da Firestore a Realtime Database
- ✅ **SEZIONE CONTATTI MIGLIORATA** - Design seguendo immagine di riferimento con gerarchia staff
- ✅ **PANNELLO ADMIN COMPLETO** - Gestione articoli PDF, annunci e messaggi
- ✅ **SISTEMA COMMENTI REALTIME** - Commenti per tutti i contenuti con database real-time

## Architettura Firebase Aggiornata
- **Firebase Auth** con email/password per admin
- **Realtime Database** per articoli, annunci, commenti e messaggi
- **Firebase Storage** per upload PDF organizzati per cartelle (nome cartella = titolo articolo)
- **Upload multipagina** supportato per creare articoli con più pagine PDF
- **Sistema preview** con navigazione completa tipo ebook

## Funzionalità Principali
### LATO PUBBLICO:
- ✅ **Homepage con preview aperta** - Prima pagina articolo visibile direttamente
- ✅ **Visualizzatore PDF completo** - Navigazione libro con controlli destra/sinistra
- ✅ **Sezione contatti strutturata** - Fondatore, Admin, Moderatori come da design
- ✅ **Sistema commenti** per tutti i contenuti
- ✅ **Responsive design** ottimizzato

### LATO ADMIN:
- ✅ **Autenticazione email/password** sicura
- ✅ **Gestione articoli PDF** - Upload con organizzazione per cartelle
- ✅ **Editor annunci** con priorità e rich text
- ✅ **Gestione messaggi** ricevuti
- ✅ **Pubblicazione immediata/programmata** per tutti i contenuti