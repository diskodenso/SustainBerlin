import { Router } from 'express';
import {
    findAllLocations,
    findLocationById,
    insertLocation,
    updateLocation,
    deleteLocation
} from '../db/mongoCRUDs.js';

let locationsRouter = Router();

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
locationsRouter.post('/', async function (req, res) {
    try {
        const newLocation = req.body;
        const insertedId = await insertLocation(newLocation);

        // Location-Header mit der neuen ID setzen
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
locationsRouter.put('/:id', async function (req, res) {
    try {
        const updatedLocation = req.body;
        const success = await updateLocation(req.params.id, updatedLocation);

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
        const success = await deleteLocation(req.params.id);

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
