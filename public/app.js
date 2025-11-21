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

    // read values
    loc.title = form.title.value.trim();
    loc.description = form.description.value.trim();
    loc.street = form.street.value.trim();
    loc.zipcity = form.zipcity.value.trim();
    loc.category = form.category.value.trim();

    // geocode new address
    const addr = `${loc.street}, ${loc.zipcity}`;

    try {
        const geo = await geocodeAddress(addr);
        loc.lat = geo.lat;
        loc.lon = geo.lon;
    } catch (err) {
        alert("Could not geocode address. Please check your input.");
        return;
    }

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

    let geo;
    try {
        geo = await geocodeAddress(addr);
    } catch (err) {
        alert("Address could not be geocoded. Please adjust or cancel.");
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
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    const res = await fetch(url, { headers: { "Accept-Language": "de" } });
    if (!res.ok) throw new Error("network error");

    const data = await res.json();
    if (!data.length) throw new Error("no results");

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
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
