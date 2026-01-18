// -------------------------------
// INITIAL STATE
// -------------------------------

// Kein hartcodiertes USERS Array mehr - Login wird über API validiert
// Kein hartcodiertes locations Array mehr - wird von API geladen

let currentUser = null;
let locations = []; // Wird von API geladen
let map = null;     // Leaflet Map Instance
let markers = {};   // Object to store markers by location ID

// -------------------------------
// SPA NAVIGATION
// -------------------------------
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    document.getElementById(id).style.display = "block";
}


// -------------------------------
// LOGIN (via API)
// -------------------------------
async function handleLogin() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.status === 401) {
            alert("Invalid username or password.");
            return;
        }

        if (!response.ok) {
            alert("Login failed. Please try again.");
            return;
        }

        // Erfolgreicher Login - User-Objekt aus Response
        currentUser = await response.json();

        // Locations laden und Main Screen anzeigen
        await loadLocations();
        renderMainScreen();
        showScreen("main");

    } catch (error) {
        console.error("Login error:", error);
        alert("Network error. Please try again.");
    }
}



// -------------------------------
// MAP FUNCTIONALITY
// -------------------------------
function initMap() {
    if (map) return; // Schon initialisiert

    // Berlin Center
    map = L.map('map-view').setView([52.5200, 13.4050], 11);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function updateMapMarkers() {
    if (!map) return;

    // Clear existing markers
    for (let id in markers) {
        map.removeLayer(markers[id]);
    }
    markers = {};

    // Add new markers
    locations.forEach(loc => {
        if (loc.lat && loc.lng) {
            const id = loc._id || loc.id;
            const marker = L.marker([parseFloat(loc.lat), parseFloat(loc.lng)]).addTo(map);

            // Popup Info with Link
            const popupContent = `
                <b>${loc.name}</b><br>
                ${loc.category}<br>
                <button onclick="openDetails('${id}')" class="popup-btn">Details</button>
            `;
            marker.bindPopup(popupContent);

            // Click Event -> Open Details NOT directly anymore
            // marker.on('click', () => { openDetails(id); });

            markers[id] = marker;
        }
    });
}

// -------------------------------
// LOAD LOCATIONS (via API)
// -------------------------------
async function loadLocations() {
    try {
        const response = await fetch('/loc');
        if (response.ok) {
            locations = await response.json();
            // Update Map after loading locations
            if (document.getElementById('map-view').offsetParent !== null) {
                // Nur updaten wenn Map sichtbar ist (oder zumindest initialisiert)
                // Da wir SPA sind, müssen wir sicherstellen, dass initMap gerufen wurde
            }
        } else {
            console.error("Failed to load locations");
            locations = [];
        }
    } catch (error) {
        console.error("Error loading locations:", error);
        locations = [];
    }
}


// -------------------------------
// MAIN SCREEN RENDERING
// -------------------------------
function renderMainScreen() {
    if (!currentUser) return;

    // Welcome text
    document.getElementById("welcome-text").textContent = `Hello ${currentUser.name}!`;

    // Action buttons (Add only for admin)
    const actions = document.getElementById("main-actions");
    actions.innerHTML = "";

    if (currentUser.role === "admin") {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.textContent = "Add";
        addBtn.onclick = () => {
            clearAddForm();
            showScreen("add");
        };
        actions.appendChild(addBtn);
    }

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.textContent = "Logout";
    logoutBtn.onclick = logout;
    actions.appendChild(logoutBtn);

    // Render location list
    const list = document.getElementById("location-list");
    list.innerHTML = "";

    locations.forEach(loc => {
        const li = document.createElement("li");
        // Verwende _id von MongoDB oder id falls vorhanden
        const locId = loc._id || loc.id;
        li.innerHTML = `
            <strong>${loc.name}</strong><br/>
            ${loc.street}, ${loc.zip} ${loc.city}<br/>
            ${loc.category}<br/>
            ${loc.image ? `<img src="${loc.image}" />` : ""}
        `;

        // Hover -> Highlight Marker
        li.addEventListener('mouseenter', () => highlightMarker(locId));
        li.addEventListener('mouseleave', () => unhighlightMarker(locId));

        li.onclick = () => openDetails(locId);
        list.appendChild(li);
    });

    // Map initialisieren und Marker setzen
    // Timeout needed to ensuring DOM is visible for Leaflet size calculation
    setTimeout(() => {
        initMap();
        map.invalidateSize(); // Wichtig wenn Map in hidden Element war
        updateMapMarkers();
    }, 100);
}


// -------------------------------
// MAP INTERACTIVITY
// -------------------------------
function highlightMarker(id) {
    const marker = markers[id];
    if (marker) {
        marker.openPopup();
        marker._icon.classList.add("marker-highlight");
    }
}

function unhighlightMarker(id) {
    const marker = markers[id];
    if (marker) {
        marker.closePopup();
        marker._icon.classList.remove("marker-highlight");
    }
}


// -------------------------------
// LOGOUT
// -------------------------------
function logout() {
    currentUser = null;
    locations = [];
    showScreen("login");
}


// -------------------------------
// DETAILS SCREEN
// -------------------------------
let currentDetailsId = null;

// Make openDetails globally available for Map Popup Buttons
window.openDetails = openDetails;

function openDetails(id) {
    const loc = locations.find(l => (l._id || l.id) === id);
    currentDetailsId = id;

    const form = document.getElementById("details-form");

    // Alle Felder aktivieren
    [...form.querySelectorAll("input, textarea, select")].forEach(i => {
        i.disabled = false;
        if (i.readOnly) {
            i.disabled = false;
        }
    });

    // Felder befüllen (Mapping von DB-Feldern)
    form.title.value = loc.name || "";
    form.description.value = loc.description || "";
    form.street.value = loc.street || "";
    form.zipcity.value = `${loc.zip || ""} ${loc.city || ""}`.trim();
    form.category.value = loc.category || "";
    // Bei File Input kann man value nicht setzen (Security), also reset
    form.image.value = "";
    form.lat.value = loc.lat || "";
    form.lon.value = loc.lng || "";

    const imgPreview = document.getElementById("details-img");
    const removeBtn = document.getElementById("btn-remove-image");

    // Reset Remove Logic
    form.dataset.deleteImage = "false";

    if (loc.image) {
        imgPreview.src = loc.image;
        imgPreview.style.display = "block";
        // Show remove button only for admin
        if (currentUser && currentUser.role === "admin") {
            removeBtn.style.display = "inline-block";
        } else {
            removeBtn.style.display = "none";
        }
    } else {
        imgPreview.style.display = "none";
        imgPreview.src = "";
        removeBtn.style.display = "none";
    }
    document.getElementById("details-caption").textContent = loc.name || "";

    // Remove Button Click
    removeBtn.onclick = () => {
        if (confirm("Remove this image? (Will be saved on Update)")) {
            imgPreview.style.display = "none";
            imgPreview.src = "";
            removeBtn.style.display = "none";
            form.image.value = ""; // Clear file input if any
            form.dataset.deleteImage = "true"; // Set Flag
        }
    };

    // Set action buttons
    const actions = document.getElementById("details-actions");
    actions.innerHTML = "";

    if (currentUser && currentUser.role === "admin") {
        // Update
        const updateBtn = document.createElement("button");
        updateBtn.type = "button";
        updateBtn.textContent = "Update";
        updateBtn.onclick = updateLocation;
        actions.appendChild(updateBtn);

        // Delete
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "Delete";
        del.onclick = deleteLocation;
        actions.appendChild(del);

        // Cancel
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "Cancel";
        cancel.onclick = () => showScreen("main");
        actions.appendChild(cancel);
    } else {
        // Normal user -> only close
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Close";
        close.onclick = () => showScreen("main");
        actions.appendChild(close);

        // make form readonly
        [...form.querySelectorAll("input, textarea, select")].forEach(i => i.disabled = true);
    }

    showScreen("details");
}


// -------------------------------
// DELETE LOCATION (via API)
// -------------------------------
async function deleteLocation() {
    if (!confirm("Delete this location?")) return;

    try {
        const response = await fetch(`/loc/${currentDetailsId}`, {
            method: 'DELETE'
        });

        if (response.status === 204) {
            // Erfolgreich gelöscht - Locations neu laden
            await loadLocations();
            renderMainScreen();
            showScreen("main");
        } else {
            alert("Failed to delete location.");
        }
    } catch (error) {
        console.error("Error deleting location:", error);
        alert("Network error. Please try again.");
    }
}


// -------------------------------
// UPDATE LOCATION (via API)
// -------------------------------
async function updateLocation() {
    const form = document.getElementById("details-form");
    const loc = locations.find(l => (l._id || l.id) === currentDetailsId);

    if (!loc) return;

    // Read values from form
    const newTitle = form.title.value.trim();
    const newDesc = form.description.value.trim();
    const newStreet = form.street.value.trim();
    const newZipcity = form.zipcity.value.trim();
    const newCat = form.category.value.trim();

    // File Input (Details form)
    // Note: You need to change input type="text" to "file" in HTML first!
    // But assuming we have a file input there or will add one.
    // Let's assume input name="image" is becoming type="file"
    const imageFile = form.image.files ? form.image.files[0] : null;

    // Check required fields
    if (!newTitle || !newStreet || !newZipcity || !newCat) {
        alert("Please fill in all required fields.");
        return;
    }

    // Validate Input
    const validation = validateAddressInput(newStreet, newZipcity);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }

    // Geocode new address
    const addr = `${newStreet}, ${newZipcity}`;

    let geo;
    try {
        geo = await geocodeAddress(addr, newZipcity);
    } catch (err) {
        alert(err.message);
        return;
    }

    // Parse zip and city
    const zipMatch = newZipcity.match(/\d{5}/);
    const zip = zipMatch ? zipMatch[0] : "";
    const city = newZipcity.replace(/\d{5}/, "").trim();

    // Prepare FormData
    const formData = new FormData();
    formData.append("name", newTitle);
    formData.append("description", newDesc);
    formData.append("street", newStreet);
    formData.append("zip", zip);
    formData.append("city", city);
    formData.append("category", newCat);
    formData.append("lat", geo.lat.toString());
    formData.append("lng", geo.lon.toString());

    if (imageFile) {
        formData.append("image", imageFile);
    }

    // Check delete flag
    if (form.dataset.deleteImage === "true") {
        formData.append("deleteImage", "true");
    }

    try {
        const response = await fetch(`/loc/${currentDetailsId}`, {
            method: 'PUT',
            body: formData
        });

        if (response.status === 204) {
            await loadLocations();
            renderMainScreen();
            showScreen("main");
        } else {
            alert("Failed to update location.");
        }
    } catch (error) {
        console.error("Error updating location:", error);
        alert("Network error. Please try again.");
    }
}


// -------------------------------
// ADD NEW LOCATION (via API)
// -------------------------------
function clearAddForm() {
    const f = document.getElementById("add-form");
    f.reset();
}

async function saveNewLocation() {
    const f = document.getElementById("add-form");

    const title = f.title.value.trim();
    const description = f.description.value.trim();
    const street = f.street.value.trim();
    const zipcity = f.zipcity.value.trim();
    const category = f.category.value.trim();

    // File Input
    const imageFile = f.image.files[0];

    if (!title || !street || !zipcity || !category) {
        alert("Please fill in all required fields.");
        return;
    }

    const addr = `${street}, ${zipcity}`;

    const validation = validateAddressInput(street, zipcity);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }

    let geo;
    try {
        geo = await geocodeAddress(addr, zipcity);
    } catch (err) {
        alert(err.message);
        return;
    }

    // Parse zip and city
    const zipMatch = zipcity.match(/\d{5}/);
    const zip = zipMatch ? zipMatch[0] : "";
    const city = zipcity.replace(/\d{5}/, "").trim();

    // Prepare FormData
    const formData = new FormData();
    formData.append("name", title);
    formData.append("description", description);
    formData.append("street", street);
    formData.append("zip", zip);
    formData.append("city", city);
    formData.append("category", category);
    formData.append("lat", geo.lat.toString());
    formData.append("lng", geo.lon.toString());

    if (imageFile) {
        formData.append("image", imageFile);
    }

    try {
        // NOTE: Do NOT set Content-Type header manually when sending FormData,
        // fetch will set it automatically with the correct boundary!
        const response = await fetch('/loc', {
            method: 'POST',
            body: formData
        });

        if (response.status === 201) {
            f.reset();
            await loadLocations();
            renderMainScreen();
            showScreen("main");
        } else {
            alert("Failed to create location.");
        }
    } catch (error) {
        console.error("Error creating location:", error);
        alert("Network error. Please try again.");
    }
}


// -------------------------------
// GEOCODING FUNCTION (Nominatim API)
// -------------------------------
async function geocodeAddress(address, zipcity) {
    // Extract input postal code
    const inputPLZ = zipcity.match(/\b1\d{4}\b/);
    if (!inputPLZ) {
        throw new Error("Invalid postal code format in input.");
    }

    // Request addressdetails=1 to get structured data (city, postcode, etc.)
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`;

    const res = await fetch(url, { headers: { "Accept-Language": "de" } });
    if (!res.ok) throw new Error("Network error accessing Geocoding service.");

    const data = await res.json();
    if (!data.length) throw new Error("No results found for this address.");

    // Filter: Check if it's in Berlin AND PLZ starts with '1'
    const berlinMatch = data.find(item => {
        const a = item.address;
        if (!a) return false;

        // 1. Check for "Berlin" in state/city/town/village
        const isBerlin = (
            (a.state && a.state.includes("Berlin")) ||
            (a.city && a.city.includes("Berlin")) ||
            (a.town && a.town.includes("Berlin"))
        );

        // 2. Check PLZ starts with "1" (Berlin PLZ range is approx 10xxx - 14xxx)
        const validPLZ = a.postcode && a.postcode.startsWith("1");

        return isBerlin && validPLZ;
    });

    if (!berlinMatch) {
        throw new Error("Location must be in Berlin (PLZ starting with 1).");
    }

    // 3. Validate that returned PLZ matches input PLZ
    const returnedPLZ = berlinMatch.address.postcode;
    if (returnedPLZ !== inputPLZ[0]) {
        throw new Error(`Postal code mismatch: You entered '${inputPLZ[0]}', but the address is in '${returnedPLZ}'. Please use the correct postal code for this street.`);
    }

    return {
        lat: parseFloat(berlinMatch.lat),
        lon: parseFloat(berlinMatch.lon)
    };
}

function validateAddressInput(street, zipcity) {
    // 1. Check for House Number (at least one digit in street)
    if (!/\d/.test(street)) {
        return { valid: false, error: "Please enter a house number in the street field." };
    }

    // 2. Check for "Berlin" (case-insensitive)
    if (!/Berlin/i.test(zipcity)) {
        return { valid: false, error: "City must be 'Berlin'." };
    }

    // 3. Check for PLZ starting with 1 (5 digits)
    if (!/\b1\d{4}\b/.test(zipcity)) {
        return { valid: false, error: "Postal code must start with '1' (Berlin code)." };
    }

    return { valid: true };
}


// -------------------------------
// INIT
// -------------------------------
window.onload = () => {
    // hide all except login
    showScreen("login");

    // Login über Formular-Submit
    const loginForm = document.getElementById("login-form");
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleLogin();
    });

    // Add-Form über Formular-Submit
    const addForm = document.getElementById("add-form");
    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveNewLocation();
    });

    // Cancel im Add-Screen
    document.getElementById("add-cancel").addEventListener("click", () => {
        showScreen("main");
    });

    // Footer Links
    document.getElementById("footer-imprint").addEventListener("click", (e) => {
        e.preventDefault();
        showScreen("imprint");
    });

    document.getElementById("footer-privacy").addEventListener("click", (e) => {
        e.preventDefault();
        showScreen("privacy");
    });
};

// Smart Back Navigation
function closeInfoScreen() {
    if (currentUser) {
        showScreen("main");
    } else {
        showScreen("login");
    }
}
// Make it global for HTML onclick
window.closeInfoScreen = closeInfoScreen;