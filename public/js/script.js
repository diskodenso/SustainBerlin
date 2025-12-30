// -------------------------------
// INITIAL STATE
// -------------------------------

// Kein hartcodiertes USERS Array mehr - Login wird über API validiert
// Kein hartcodiertes locations Array mehr - wird von API geladen

let currentUser = null;
let locations = []; // Wird von API geladen


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
// LOAD LOCATIONS (via API)
// -------------------------------
async function loadLocations() {
    try {
        const response = await fetch('/loc');
        if (response.ok) {
            locations = await response.json();
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
        li.onclick = () => openDetails(locId);
        list.appendChild(li);
    });
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
    form.image.value = loc.image || "";
    form.lat.value = loc.lat || "";
    form.lon.value = loc.lng || "";

    document.getElementById("details-img").src = loc.image || "";
    document.getElementById("details-caption").textContent = loc.name || "";

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
    const newImage = form.image.value.trim();

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

    // Parse zip and city from zipcity field
    const zipMatch = newZipcity.match(/\d{5}/);
    const zip = zipMatch ? zipMatch[0] : "";
    const city = newZipcity.replace(/\d{5}/, "").trim();

    // Prepare updated location object for API
    const updatedLocation = {
        name: newTitle,
        description: newDesc,
        street: newStreet,
        zip: zip,
        city: city,
        category: newCat,
        image: newImage,
        lat: geo.lat.toString(),
        lng: geo.lon.toString()
    };

    try {
        const response = await fetch(`/loc/${currentDetailsId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedLocation)
        });

        if (response.status === 204) {
            // Erfolgreich aktualisiert - Locations neu laden
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
    const image = f.image.value.trim();

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

    // Parse zip and city from zipcity field
    const zipMatch = zipcity.match(/\d{5}/);
    const zip = zipMatch ? zipMatch[0] : "";
    const city = zipcity.replace(/\d{5}/, "").trim();

    // Prepare new location object for API (ohne ID!)
    const newLocation = {
        name: title,
        description: description,
        street: street,
        zip: zip,
        city: city,
        category: category,
        image: image,
        lat: geo.lat.toString(),
        lng: geo.lon.toString()
    };

    try {
        const response = await fetch('/loc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newLocation)
        });

        if (response.status === 201) {
            // Erfolgreich angelegt - Locations neu laden
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
};