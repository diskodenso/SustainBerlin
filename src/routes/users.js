import { Router } from 'express';
import { findAllUsers, findOneUser } from '../db/mongoCRUDs.js';

let usersRouter = Router();

// Wird bei GET http://localhost:8000/users aufgerufen 
usersRouter.get('/', async function(req, res) {
  try {
    //let userDoc = await mongo_cruds.findOneUser("admina", "pass1234");
    let users = await findAllUsers();
    if(users) {
      res.status(200).json(users);
    }
    else {
      res.status(404).send(`Users not found!`);
    }
  } catch (err) {
    console.log(err);
    res.status(400).send("Something is not right!!");
  }
});

// Wird bei  
// POST http://localhost:8000/users mit payload 
// {"username":"xyz", "password":"zyx"}
// erwartet eine payload diesen ^^^ Formats 
// der Header Content-Type: application/json MUSS mitgeschickt
// 
usersRouter.post('/', async function(req, res) {
  // wird automatisch in ein JS-Objekt umgewandelt, 
  // wenn Content-Type: application/json gesetzt ist
  let userToLogin = req.body;  
  console.log (userToLogin);
  let user = await findOneUser(userToLogin.username, userToLogin.password);
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(401).send("Bad Login Credentials");
  }
});

export default usersRouter;
