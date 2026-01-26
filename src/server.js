
import { createServer } from 'http';
import express, { json, static as expressStatic } from 'express';
import { join } from 'path';
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import loginRouter from './routes/login.js';
import locationsRouter from './routes/locations.js';
import.meta.dirname;

let app = express();

// json() - Returns middleware that only parses json 
// and only looks at requests where the Content-Type 
// header matches the type option.
app.use(json());

/*
 * Setting up the routes
 */

// 1) http://localhost:8000/ serves the index.html 
// ../public is the directory for static resources
// GET http://localhost:8000/ or GET http://localhost:8000/index.html 
// returns the index.html in /public
app.use(expressStatic(join(import.meta.dirname, '../public')));
app.use('/', indexRouter);

// 2) http://localhost:8000/users (from template)
app.use('/users', usersRouter);

// 3) POST http://localhost:8000/login - Login Endpoint
app.use('/login', loginRouter);

// 4) http://localhost:8000/loc - CRUD for Locations
app.use('/loc', locationsRouter);

// 5) Send "Not found" for all other 'paths'
app.use(function (req, res) {
  res.status(404).send('Not found: ' + req.path);
});

// 4) Error handler
app.use(function (err, res) {
  // send the error page
  res.status(err.status || 500).send('error' + err.message);
});


const port = 8000;
app.set('port', port);

/*
 * Create HTTP server.
 */
let server = createServer(app);

/*
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/*
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/*
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}
