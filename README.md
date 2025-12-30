# SustainBerlin

**App-Name:** SustainBerlin  
**Team:** Denis Olf (@diskodenso), Yehya Hussein  
**Matrikelnummer(n):** s0590296, 587893

## Kurzbeschreibung

SustainBerlin ist eine webbasierte Single Page Application (SPA), die nicht-nachhaltige Standorte in Berlin dokumentiert. Die Anwendung ermöglicht das Erfassen, Bearbeiten und Löschen von Standorten mit Anbindung an eine MongoDB-Datenbank.

---

## Voraussetzungen

- **Node.js** (v18 oder höher)
- **npm** (Node Package Manager)
- **VPN zur HTW Berlin** (für MongoDB-Zugriff)
- **MongoDB-Zugangsdaten** (von ocean.f4.htw-berlin.de)

---

## Installation

```bash
# 1. Repository klonen
git clone https://github.com/diskodenso/SustainBerlin.git
cd SustainBerlin

# 2. Dependencies installieren
npm install
```

---

## Konfiguration

Bevor die App gestartet werden kann, müssen die MongoDB-Credentials in `src/db/mongoCRUDs.js` eingetragen werden:

```javascript
const db_user = 'DEIN_BENUTZERNAME';
const db_pass = 'DEIN_PASSWORT';
const db_name = 'DEIN_DATENBANKNAME';
```

---

## Starten

```bash
# Server starten (Express Backend + MongoDB)
npm start
```

Dann im Browser öffnen: **http://localhost:8000**

---

## Benutzer

| Username | Passwort | Rolle | Rechte |
|----------|----------|-------|--------|
| `admina` | `password` | Admin | Lesen, Hinzufügen, Bearbeiten, Löschen |
| `normalo` | `password` | Non-Admin | Nur Lesen |

---

## API Endpoints

### Login
```
POST /login
Body: { "username": "...", "password": "..." }
Response: 200 + User-Objekt (ohne Passwort) oder 401
```

### Locations (CRUD)
```
GET    /loc          → Alle Standorte abrufen
GET    /loc/:id      → Einzelnen Standort abrufen
POST   /loc          → Neuen Standort anlegen (201 + Location-Header)
PUT    /loc/:id      → Standort aktualisieren (204)
DELETE /loc/:id      → Standort löschen (204)
```

---

## Projektstruktur

```
SustainBerlin/
├── public/                  # Frontend (statische Dateien)
│   ├── index.html          # SPA HTML
│   ├── css/styles.css      # Styling
│   └── js/script.js        # Frontend-Logik mit API-Calls
├── src/                     # Backend
│   ├── server.js           # Express Server
│   ├── db/
│   │   └── mongoCRUDs.js   # MongoDB CRUD-Funktionen
│   └── routes/
│       ├── index.js        # Root-Route
│       ├── login.js        # /login Endpoint
│       ├── locations.js    # /loc CRUD Endpoint
│       └── users.js        # /users Endpoint (Template)
└── package.json
```

---

## Technologien

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Datenbank:** MongoDB
- **Geocoding:** Nominatim OpenStreetMap API
