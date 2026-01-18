import { Router } from 'express';
import multer from 'multer';
import { unlink } from 'fs/promises';
import { join, extname } from 'path';
import {
    findAllLocations,
    findLocationById,
    insertLocation,
    updateLocation,
    deleteLocation
} from '../db/mongoCRUDs.js';

let locationsRouter = Router();

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/uploads/');
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-name.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// GET /loc - Alle Standorte zurückschicken
// Response: 200 + JSON Array mit allen Standorten
locationsRouter.get('/', async function (req, res) {
    try {
        const locations = await findAllLocations();
        res.status(200).json(locations);
    } catch (err) {
        console.error("Error fetching locations:", err);
        res.status(500).send("Internal Server Error");
    }
});

// GET /loc/:id - Einzelnen Standort zurückschicken
// Response: 200 + JSON Object mit Standort
locationsRouter.get('/:id', async function (req, res) {
    try {
        const location = await findLocationById(req.params.id);
        if (location) {
            res.status(200).json(location);
        } else {
            res.status(404).send("Location not found");
        }
    } catch (err) {
        console.error("Error fetching location:", err);
        res.status(500).send("Internal Server Error");
    }
});

// POST /loc - Neuen Standort anlegen
// Payload: Standort-Objekt OHNE ID
// Response: 201 + Location-Header mit neuer ID
locationsRouter.post('/', upload.single('image'), async function (req, res) {
    try {
        let newLocation = req.body;

        // Handle Image upload
        if (req.file) {
            newLocation.image = `images/uploads/${req.file.filename}`;
        }

        const insertedId = await insertLocation(newLocation);
        res.status(201)
            .location(`/loc/${insertedId}`)
            .send();
    } catch (err) {
        console.error("Error creating location:", err);
        res.status(500).send("Internal Server Error");
    }
});

// PUT /loc/:id - Standort aktualisieren
// Payload: Aktualisiertes Standort-Objekt
// Response: 204 No Content
locationsRouter.put('/:id', upload.single('image'), async function (req, res) {
    try {
        let updatedLocation = req.body;
        const id = req.params.id;

        // Check for explicit image deletion flag
        if (req.body.deleteImage === "true") {
            const oldLocation = await findLocationById(id);
            if (oldLocation && oldLocation.image && oldLocation.image.startsWith('images/uploads/')) {
                try {
                    await unlink(join(process.cwd(), 'public', oldLocation.image));
                    console.log(`Deleted image (requested): ${oldLocation.image}`);
                } catch (e) {
                    console.warn(`Failed to delete image ${oldLocation.image}:`, e.message);
                }
            }
            updatedLocation.image = ""; // Remove reference in DB
        } else if (req.file) {
            // Check if new image was uploaded
            updatedLocation.image = `images/uploads/${req.file.filename}`;

            // OPTIONAL: Delete old image from filesystem if it was a local upload
            // 1. Fetch old location
            const oldLocation = await findLocationById(id);
            if (oldLocation && oldLocation.image && oldLocation.image.startsWith('images/uploads/')) {
                try {
                    // Construct absolute path to delete
                    // Note: "public/" is statically served but physically it's in the project root/public
                    await unlink(join(process.cwd(), 'public', oldLocation.image));
                    console.log(`Deleted old image: ${oldLocation.image}`);
                } catch (e) {
                    console.warn(`Failed to delete old image ${oldLocation.image}:`, e.message);
                }
            }
        }

        const success = await updateLocation(id, updatedLocation);

        if (success) {
            res.status(204).send();
        } else {
            res.status(404).send("Location not found");
        }
    } catch (err) {
        console.error("Error updating location:", err);
        res.status(500).send("Internal Server Error");
    }
});

// DELETE /loc/:id - Standort löschen
// Response: 204 No Content
locationsRouter.delete('/:id', async function (req, res) {
    try {
        const id = req.params.id;

        // 1. Get Location to find image path
        const location = await findLocationById(id);

        if (location && location.image && location.image.startsWith('images/uploads/')) {
            try {
                await unlink(join(process.cwd(), 'public', location.image));
                console.log(`Deleted image for location ${id}: ${location.image}`);
            } catch (e) {
                console.warn(`Failed to delete image ${location.image}:`, e.message);
            }
        }

        const success = await deleteLocation(id);

        if (success) {
            res.status(204).send();
        } else {
            res.status(404).send("Location not found");
        }
    } catch (err) {
        console.error("Error deleting location:", err);
        res.status(500).send("Internal Server Error");
    }
});

export default locationsRouter;
