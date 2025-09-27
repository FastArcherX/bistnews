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
- 🔄 **PROSSIMO:** Restyling completo seguendo style-guidelines.json

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

## Modifiche Recenti (27/09/2024)
- Creazione completa app statica HTML/JS
- Implementazione tutte le funzionalità richieste
- Setup http-server per servire l'applicazione
- Risoluzione definitiva problemi tecnici Vite/esbuild
- App finalmente FUNZIONANTE e pronta per restyling