import { Router } from 'express';
let indexRouter = Router();

// GET http://localhost:8000/ 
// Die index.html wird bereits durch express.static serviert
// Dieser Router ist nur für Kompatibilität vorhanden
indexRouter.get('/', function (req, res, next) {
  // Weiterleiten an den nächsten Handler (express.static)
  next();
});

export default indexRouter;

