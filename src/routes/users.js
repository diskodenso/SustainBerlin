import { Router } from 'express';
import { findAllUsers, findOneUser } from '../db/mongoCRUDs.js';

let usersRouter = Router();

// Called at GET http://localhost:8000/users 
usersRouter.get('/', async function (req, res) {
  try {
    //let userDoc = await mongo_cruds.findOneUser("admina", "pass1234");
    let users = await findAllUsers();
    if (users) {
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

// Called at
// POST http://localhost:8000/users with payload 
// {"username":"xyz", "password":"zyx"}
// expects a payload in this ^^^ format 
// the header Content-Type: application/json MUST be sent
// 
usersRouter.post('/', async function (req, res) {
  // will be automatically converted to JS object, 
  // when Content-Type: application/json is set
  let userToLogin = req.body;
  console.log(userToLogin);
  let user = await findOneUser(userToLogin.username, userToLogin.password);
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(401).send("Bad Login Credentials");
  }
});

export default usersRouter;
