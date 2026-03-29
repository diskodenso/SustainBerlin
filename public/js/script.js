// -------------------------------
// CONSTANTS
// -------------------------------
const BERLIN_CENTER = { lat: 52.52, lng: 13.405 };
const DEFAULT_ZOOM = 9;
const MAP_MAX_ZOOM = 19;
const BERLIN_ZIP_PATTERN = /\b1\d{4}\b/;
const BERLIN_LAT_MIN = 52.3;
const BERLIN_LAT_MAX = 52.7;
const BERLIN_LNG_MIN = 13.0;
const BERLIN_LNG_MAX = 13.8;
const MARKER_BOUNDS_PADDING = [50, 50];

// -------------------------------
// INITIAL STATE
// -------------------------------
let currentUser = null;
let locations = [];
let map = null; // Leaflet Map Instance
let markers = {}; // Store markers by location ID

// -------------------------------
// HELPER FUNCTIONS
// -------------------------------
/**
 * Parses a combined zip-city string into separate zip and city
 * @param {string} zipcity - String like "10115 Berlin"
 * @returns {{zip: string, city: string}}
 */
function parseZipCity(zipcity) {
    const zipMatch = zipcity.match(/\d{5}/);
    return {
        zip: zipMatch ? zipMatch[0] : "",
        city: zipcity.replace(/\d{5}/, "").trim()
    };
}

// -------------------------------
// SPA NAVIGATION
// -------------------------------
function showScreen(id) {
    const screens = document.querySelectorAll(".screen");
    screens.forEach(screen => screen.style.display = "none");
    document.getElementById(id).style.display = "block";
}

// -------------------------------
// LOGIN
// -------------------------------
async function handleLogin() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const response = await fetch('/login', {
            method: 'POST', headers: {
                'Content-Type': 'application/json'
            }, body: JSON.stringify({ username, password })
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
// LOAD LOCATIONS
// -------------------------------
async function loadLocations() {
    try {
        const response = await fetch('/loc');
        if (response.ok) {
            locations = await response.json();
            // Update Map after loading locations
            if (map) {
                updateMapMarkers();
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

    function createLocationItem(loc) {
        const li = document.createElement("li");
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
        return li;
    }

    const list = document.getElementById("location-list");
    list.innerHTML = "";
    locations.forEach(loc => list.appendChild(createLocationItem(loc)));

    // Initialize map if not already initialized
    if (!map) {
        initMap();
    }

    // Update Map Markers
    updateMapMarkers();

    // Fix Leaflet rendering issue: invalidate size after screen is visible
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
        }
    }, 100);
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
    function setFormDisabled(form, disabled = true) {
        [...form.querySelectorAll("input, textarea, select")].forEach(i => i.disabled = disabled);
    }

    setFormDisabled(form, false);

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
        setFormDisabled(form, true);
    }

    showScreen("details");
}

// -------------------------------
// DELETE LOCATION
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
// UPDATE LOCATION
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

    // File Input
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

    // helper function to parse zip and city
    const { zip, city } = parseZipCity(newZipcity);

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
    
    // Check if image should be deleted
    if (form.dataset.deleteImage === "true") {
        formData.append("deleteImage", "true");
    }

    try {
        const response = await fetch(`/loc/${currentDetailsId}`, {
            method: 'PUT', 
            body: formData // Verwende FormData statt JSON!
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
// ADD NEW LOCATION
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

    const validation = validateAddressInput(street, zipcity);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }

    const addr = `${street}, ${zipcity}`;
    let geo;
    try {
        geo = await geocodeAddress(addr, zipcity);
    } catch (err) {
        alert(err.message);
        return;
    }

    const { zip, city } = parseZipCity(zipcity);

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
            body: formData  // Use FormData, NOT JSON.stringify!
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
    const inputPLZ = zipcity.match(BERLIN_ZIP_PATTERN);
    if (!inputPLZ) {
        throw new Error("Invalid postal code format in input.");
    }

    // Request addressdetails=1 to get structured data (city, postcode, etc.)
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`;

    const res = await fetch(url, { headers: { "Accept-Language": "de" } });
    if (!res.ok) throw new Error("Network error accessing Geocoding service.");

    const data = await res.json();
    if (!data.length) throw new Error("No results found for this address.");

    // Filter: Check if it's in Berlin AND postal code starts with '1'
    const berlinMatch = data.find(item => {
        const a = item.address;
        if (!a) return false;

        // 1. Check for "Berlin" in state/city/town/village
        const isBerlin = ((a.state && a.state.includes("Berlin")) || (a.city && a.city.includes("Berlin")) || (a.town && a.town.includes("Berlin")));

        // 2. Check postal code starts with "1" (Berlin postal code range is approx 10xxx - 14xxx)
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
        lat: parseFloat(berlinMatch.lat), lon: parseFloat(berlinMatch.lon)
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

    // 3. Check for postal code starting with 1 (5 digits)
    if (!BERLIN_ZIP_PATTERN.test(zipcity)) {
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

// -------------------------------
// LEAFLET MAP INITIALIZATION
// -------------------------------
function initMap() {
    // Only initialize once
    if (map) return;

    // Create map centered on Berlin
    map = L.map('map-view').setView([BERLIN_CENTER.lat, BERLIN_CENTER.lng], DEFAULT_ZOOM);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: MAP_MAX_ZOOM
    }).addTo(map);
}

function updateMapMarkers() {
    if (!map) return;

    // Clear existing markers
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};

    // Add markers for all locations
    locations.forEach(loc => {
        const locId = loc._id || loc.id;
        if (!loc.lat || !loc.lng) return;

        const marker = L.marker([parseFloat(loc.lat), parseFloat(loc.lng)])
            .addTo(map)
            .bindPopup(`
                <div>
                    <strong>${loc.name}</strong><br/>
                    ${loc.street}, ${loc.zip} ${loc.city}<br/>
                    <em>${loc.category}</em>
                    ${loc.image ? `<br/><img src="${loc.image}" style="width:100%; max-width:200px; margin-top:5px; border-radius:4px;"/>` : ""}
                    <br/>
                    <button class="popup-btn" onclick="openDetails('${locId}')">Details</button>
                </div>
            `);

        // Store marker reference
        markers[locId] = marker;
    });

    // Fit map bounds to show all markers (only on first load)
    if (locations.length > 0 && Object.keys(markers).length === locations.length) {
        const bounds = L.latLngBounds(locations.filter(l => l.lat && l.lng).map(l => [parseFloat(l.lat), parseFloat(l.lng)]));
        if (bounds.isValid() && !map._fitBoundsCalled) {
            map.fitBounds(bounds, {
                padding: MARKER_BOUNDS_PADDING,
                maxZoom: DEFAULT_ZOOM  // Don't zoom in closer than DEFAULT_ZOOM
            });
            map._fitBoundsCalled = true; // Mark as already fitted
        }
    }
}

// -------------------------------
// MARKER HIGHLIGHTING
// -------------------------------
function highlightMarker(locId) {
    const marker = markers[locId];
    if (marker && marker._icon) {
        marker._icon.classList.add('marker-highlight');

        // Center map on marker with controlled zoom (not too close)
        const latLng = marker.getLatLng();
        map.setView(latLng, 13, { animate: true });  // Zoom 13 = moderate zoom

        // Open popup after centering
        marker.openPopup();
    }
}

function unhighlightMarker(locId) {
    const marker = markers[locId];
    if (marker && marker._icon) {
        marker._icon.classList.remove('marker-highlight');
        // Close popup
        marker.closePopup();
    }
}