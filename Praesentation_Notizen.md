# SustainBerlin - Technische Dokumentation & Präsentationsnotizen

Dieses Dokument dient als Vorbereitung für die Präsentation (Belegabgabe 4) und beantwortet die wichtigsten technischen Entscheidungen des Projekts.

---

## 1. Die interaktive Karte (Map Library)

**Entscheidung:** Wir haben uns als Karten-Provider für **OpenStreetMap** und als JavaScript-Bibliothek für **Leaflet.js** entschieden. Für die Umwandlung von Text-Adressen in Koordinaten nutzen wir **Nominatim**.

**Warum haben wir uns dafür entschieden?**
1. **Kostenlos & Keine API-Keys:** Anders als bei Google Maps oder Mapbox erfordert Leaflet mit OpenStreetMap keine Kreditkarte, keinen Account-Zwang und keine Einrichtung von API-Keys. Es funktioniert "out of the box".
2. **Leichtgewichtig & Open-Source:** Leaflet ist extrem schnell, Open-Source (im Gegensatz zu proprietären Diensten) und bietet genau die nötigen Funktionen (Marker hinzufügen, Zoomen, Popups), ohne das Projekt künstlich "aufzublähen".
3. **Einfache Geocoding-Integrierbarkeit:** Die `Nominatim`-API von OpenStreetMap ist frei per HTTP-Request zugänglich, sodass wir die eingegebenen Adressen aus dem Formular problemlos in die notwendigen Längen- und Breitengrade (`lat`/`lng`) umwandeln konnten.

---

## 2. Der Image-Upload (Frontend & Backend)

Der Bilder-Upload ist in zwei Hauptkomponenten unterteilt. Da normale Text-Anfragen (JSON) keine einfachen Binärdaten (wie ein Bild) übertragen können, nutzen wir das **`multipart/form-data`**-Format.

### Frontend: Daten verpacken (Vanilla JavaScript)
In der Datei `public/js/script.js` nutzen wir das native `FormData`-Objekt. Es nimmt alle unsere Text-Felder (Titel, Straße etc.) und die `imageFile` (das eigentliche Bild) auf und baut ein Datenpaket, das an den Server geschickt wird.

```javascript
// Auszug aus script.js (Funktion: saveNewLocation / updateLocation)

// 1. Die hochgeladene Datei aus dem HTML-Input-Feld auslesen:
const imageFile = form.image.files[0];

// 2. Ein FormData Objekt erstellen:
const formData = new FormData();
formData.append("name", newTitle);
formData.append("street", newStreet);
// ... weitere Text-Felder

// 3. Wenn ein Bild ausgewählt wurde, fügen wir es an das Paket an:
if (imageFile) {
    formData.append("image", imageFile);
}

// 4. Das Paket absenden. Der fetch-Befehl setzt den Header automatisch richtig auf 'multipart/form-data'!
const response = await fetch('/loc', {
    method: 'POST',
    body: formData  
});
```

### Backend: Daten empfangen und speichern (Node.js/Express)
Um das ankommende `multipart`-Paket im Server verarbeiten zu können, nutzen wir als Middleware das npm-Paket **`multer`** in der `src/routes/locations.js`.

```javascript
// Auszug aus locations.js

// 1. Storage konfigurieren (Wohin sollen die Bilder und wie sollen sie heißen?)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Die Bilder werden physisch auf der Festplatte des Servers abgelegt
        cb(null, 'public/images/uploads/'); 
    },
    filename: function (req, file, cb) {
        // Um Überschreibungen zu verhindern, erhält jedes Bild eine ID aus der aktuellen Uhrzeit
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 2. multer als Middleware in die Route einbinden
locationsRouter.post('/', upload.single('image'), async function (req, res) {
    // req.file enthält nun das fertig gespeicherte Bild. 
    // Wir können den neuen Pfad nun für die Datenbank auslesen und speichern!
    let newLocation = req.body;
    if (req.file) {
        newLocation.image = `images/uploads/${req.file.filename}`;
    }
    // ... Speicherung in der MongoDB
});
```

---

## 3. Funktionsweise der MongoDB-Datenbankverbindung

Die Anbindung der HTW-Datenbank erfolgt über den nativen NPM-Treiber `mongodb` in der Datei `src/db/mongoCRUDs.js`.

### Sicherheit über ".env" Dateien
Zunächst laden wir das Modul `dotenv`. Dies ermöglicht es uns, Passwörter und Matrikelnummern nicht in den Quellcode zu schreiben (Sicherheit vor Veröffentlichungen auf GitHub). Der Connection-String wird dynamisch aus lokalen Umgebungsvariablen zusammengebaut.

### Verbindungs-Design (Connection Pooling & Singleton Pattern)
Das Highlight der Umsetzung ist die `connectToDatabase()` Funktion. Wir stellen nicht bei *jeder* Anfrage des Nutzers eine komplett neue Verbindung zum Server her (was enorm langsam und fehleranfällig wäre), sondern speichern eine einmal hergestellte Verbindung ab.

```javascript
// Auszug aus mongoCRUDs.js
let cachedDb = null;

async function connectToDatabase() {
  // Wenn schon eine Verbindung existert (cachedDb), nimm einfach diese!
  if (cachedDb) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  // Nur wenn der Server neu gestartet wird, logge dich neu ein:
  console.log('Creating new database connection');
  const client = new MongoClient(uri);
  await client.connect();
  cachedDb = client.db(db_name);

  return cachedDb;
}
```
* **Was bringt das?** Wenn 10 Nutzer gleichzeitig Standorte abrufen, baut der Server nur genau beim *ersten* Abruf die Verbindung zur HTW-Datenbank auf. Die anderen 9 Nutzer surfen über diese sofort einsatzbereite, zwischengespeicherte Verbindung ("Connection Pool"). Das sorgt für eine flüssige WebApp.
