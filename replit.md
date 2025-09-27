# BISTnews - Giornale Scolastico

## Panoramica del Progetto
BISTnews è un'applicazione web per un giornale scolastico costruita con React, TypeScript, Vite e Firebase. L'applicazione include funzionalità per la gestione degli articoli, autenticazione utenti e un'area amministrativa.

## Stato Attuale
- ✅ Server di sviluppo Vite configurato e funzionante su porta 5000
- ✅ Dipendenze installate e risolte
- ✅ Workflow configurato per l'ambiente Replit
- ✅ Configurazione di deployment impostata
- ⚠️ Problema noto: errori EPIPE esbuild durante la trasformazione dei file (server funziona ma con avvisi)

## Architettura del Progetto
```
src/
├── components/          # Componenti React riutilizzabili
│   ├── Footer.tsx
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx
├── hooks/              # Custom hooks
│   └── useAuth.ts
├── pages/              # Pagine dell'applicazione
│   ├── admin/          # Area amministrativa
│   │   ├── AnnouncementEditor.tsx
│   │   ├── ArticleEditor.tsx
│   │   ├── ArticleManager.tsx
│   │   ├── MessageViewer.tsx
│   │   └── PdfManager.tsx
│   ├── AdminPage.tsx
│   ├── ArticlePage.tsx
│   ├── ContactPage.tsx
│   ├── CreditsPage.tsx
│   ├── HomePage.tsx
│   └── LoginPage.tsx
├── App.tsx             # Componente principale
├── firebase.ts         # Configurazione Firebase
└── main.jsx           # Entry point (convertito da TSX per compatibilità)
```

## Tecnologie Utilizzate
- **Frontend**: React 19.1.1, TypeScript, Vite 7.1.7
- **Styling**: Bootstrap 5.3.8, React Bootstrap
- **Backend**: Firebase (Auth, Database, Storage)
- **Editor**: CKEditor 5
- **Routing**: React Router DOM
- **Animations**: Framer Motion
- **PDF**: React PDF

## Configurazione per Replit
- Server Vite configurato per bind su 0.0.0.0:5000
- Workflow impostato per esecuzione automatica
- Deployment configurato per autoscale

## Problemi Noti
- Errori EPIPE esbuild durante la trasformazione: il server funziona ma mostra avvisi
- Conversione da main.tsx a main.jsx per evitare problemi di compatibilità

## Modifiche Recenti
- Configurazione Vite per ambiente Replit
- Risoluzione problemi dipendenze npm
- Setup workflow di sviluppo
- Configurazione deployment