// -------------------------------
// INITIAL DATA
// -------------------------------

// Allowed users
const USERS = [
    { username: "admina", password: "password", role: "admin", name: "Mina" },
    { username: "normalo", password: "password", role: "non-admin", name: "Norman" }
];

let currentUser = null;

// Example locations (3 real Berlin locations)
let locations = [
    {
        id: 1,
        title: "Tempelhofer Feld",
        description: "Großes offenes Feld mit Hitzeinseln.",
        street: "Tempelhofer Damm 1",
        zipcity: "12101 Berlin",
        category: "Air Quality",
        image: "assets/img/tempelhof.jpg",
        lat: 52.473,
        lon: 13.403
    },
    {
        id: 2,
        title: "Mauerpark",
        description: "Hohe Nutzung, wenig Schattenflächen.",
        street: "Bernauer Str. 63",
        zipcity: "13355 Berlin",
        category: "Pedestrians",
        image: "assets/img/mauerpark.jpg",
        lat: 52.543,
        lon: 13.402
    },
    {
        id: 3,
        title: "Recyclinghof Reinickendorf",
        description: "Hohe Verkehrsbelastung durch Anlieferungen.",
        street: "Lengeder Str. 6",
        zipcity: "13407 Berlin",
        category: "Industrial Facilities",
        image: "assets/img/recycling.jpg",
        lat: 52.574,
        lon: 13.343
    }
];


// -------------------------------
// SPA NAVIGATION
// -------------------------------
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    document.getElementById(id).style.display = "block";
}


// -------------------------------
// LOGIN
// -------------------------------
function handleLogin() {
    const u = document.getElementById("login-username").value.trim();
    const p = document.getElementById("login-password").value.trim();

    const user = USERS.find(x => x.username === u && x.password === p);

    if (!user) {
        alert("Invalid username or password.");
        return;
    }

    currentUser = user;

    renderMainScreen();
    showScreen("main");
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
        li.innerHTML = `
            <strong>${loc.title}</strong><br/>
            ${loc.street}, ${loc.zipcity}<br/>
            ${loc.category}<br/>
            ${loc.image ? `<img src="${loc.image}" />` : ""}
        `;
        li.onclick = () => openDetails(loc.id);
        list.appendChild(li);
    });
}


// -------------------------------
// LOGOUT
// -------------------------------
function logout() {
    currentUser = null;
    showScreen("login");
}


// -------------------------------
// DETAILS SCREEN
// -------------------------------
let currentDetailsId = null;

function openDetails(id) {
    const loc = locations.find(l => l.id === id);
    currentDetailsId = id;

    const form = document.getElementById("details-form");

    // immer erstmal alles wieder aktivieren
    [...form.querySelectorAll("input, textarea, select")].forEach(i => {
        i.disabled = false;
        if (i.readOnly) {
            // readOnly bleibt readOnly
            i.disabled = false;
        }
    });

    form.title.value = loc.title;
    form.description.value = loc.description;
    form.street.value = loc.street;
    form.zipcity.value = loc.zipcity;
    form.category.value = loc.category;
    form.image.value = loc.image || "";
    form.lat.value = loc.lat;
    form.lon.value = loc.lon;

    document.getElementById("details-img").src = loc.image || "";
    document.getElementById("details-caption").textContent = loc.title;

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
// DELETE LOCATION
// -------------------------------
function deleteLocation() {
    if (!confirm("Delete this location?")) return;

    locations = locations.filter(l => l.id !== currentDetailsId);
    renderMainScreen();
    showScreen("main");
}


// -------------------------------
// UPDATE LOCATION
// -------------------------------
async function updateLocation() {
    const form = document.getElementById("details-form");
    const loc = locations.find(l => l.id === currentDetailsId);

    if (!loc) return;

    // read values into temp variables
    const newTitle = form.title.value.trim();
    const newDesc = form.description.value.trim();
    const newStreet = form.street.value.trim();
    const newZip = form.zipcity.value.trim();
    const newCat = form.category.value.trim();
    const newImage = form.image.value.trim();

    // Validate Input
    const validation = validateAddressInput(newStreet, newZip);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }

    // geocode new address
    const addr = `${newStreet}, ${newZip}`;

    let geo;
    try {
        geo = await geocodeAddress(addr);
    } catch (err) {
        alert(err.message);
        return;
    }

    // Update location only after success
    loc.title = newTitle;
    loc.description = newDesc;
    loc.street = newStreet;
    loc.zipcity = newZip;
    loc.category = newCat;
    loc.image = newImage;
    loc.lat = geo.lat;
    loc.lon = geo.lon;

    renderMainScreen();
    showScreen("main");
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
        geo = await geocodeAddress(addr);
    } catch (err) {
        alert(err.message);
        return;
    }

    locations.push({
        id: Date.now(),
        title,
        description,
        street,
        zipcity,
        category,
        image,
        lat: geo.lat,
        lon: geo.lon
    });

    f.reset();
    renderMainScreen();
    showScreen("main");
}


// -------------------------------
// GEOCODING FUNCTION (Nominatim API)
// -------------------------------
async function geocodeAddress(address) {
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
        // Note: In Nominatim, Berlin is usually the state (Bundesland) and city.
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