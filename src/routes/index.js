import { Router } from 'express';
let indexRouter = Router();

// GET http://localhost:8000/ 
// The index.html is already served by express.static
// This router is only for compatibility
indexRouter.get('/', function (req, res, next) {
  // Forward to the next handler (express.static)
  next();
});

export default indexRouter;

