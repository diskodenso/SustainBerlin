import { Router } from 'express';
import { findOneUser } from '../db/mongoCRUDs.js';

let loginRouter = Router();

// POST /login
// Akzeptiert und validiert die username/password-Kombination
// Bei gültiger Kombi: 200 + User-Objekt (ohne Passwort)
// Bei ungültiger Kombi: 401 Unauthorized
loginRouter.post('/', async function (req, res) {
    // Body wird automatisch in JS-Objekt umgewandelt,
    // wenn Content-Type: application/json gesetzt ist
    const { username, password } = req.body;

    console.log(`Login attempt for user: ${username}`);

    try {
        const user = await findOneUser(username, password);

        if (user) {
            // Erfolgreicher Login - User-Objekt ohne Passwort zurückschicken
            res.status(200).json(user);
        } else {
            // Ungültige Credentials
            res.status(401).send("Unauthorized");
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("Internal Server Error");
    }
});

export default loginRouter;
