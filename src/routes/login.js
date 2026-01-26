import { Router } from 'express';
import { findOneUser } from '../db/mongoCRUDs.js';

let loginRouter = Router();

// POST /login
// Accepts and validates the username/password combination
// On valid credentials: 200 + User object (without password)
// On invalid credentials: 401 Unauthorized
loginRouter.post('/', async function (req, res) {
    // Body is automatically converted to JS object
    // when Content-Type: application/json is set
    const { username, password } = req.body;

    console.log(`Login attempt for user: ${username}`);

    try {
        const user = await findOneUser(username, password);

        if (user) {
            // Successful login - Send user object without password
            res.status(200).json(user);
        } else {
            // Invalid credentials
            res.status(401).send("Unauthorized");
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("Internal Server Error");
    }
});

export default loginRouter;
