var bodyParser, cors, docket, docs, express, http, io, logger, mongoose, morgan, notAllowed, rat, rescue, app, httpServer, passport, path, port, router, socket;





// IMPORT
// =============================================================================

// Import config
config = require( './config' );

// Import libraries
bodyParser = require( 'body-parser' );
cors = require( 'cors' );
// docket = require( './docket.js' );
docs = require( 'express-mongoose-docs' );
express = require( 'express' );
expressSession = require( 'express-session' );
http = require( 'http' );
mongoose = require( 'mongoose' );
morgan = require( 'morgan' );
passport = require( 'passport' );
path = require( 'path' );
io = require( 'socket.io' );
LocalStrategy = require( 'passport-local' ).Strategy;

// Import models
User = require( './models/user' );

// Import controllers
rat = require( './controllers/rat' );
rescue = require( './controllers/rescue' );

// Connect to MongoDB
mongoose.connect( 'mongodb://localhost/fuelrats' );





// SHARED METHODS
// =============================================================================

// Function for disallowed methods
notAllowed = function notAllowed ( request, response ) {
  response.status( 405 );
  response.send();
};





// MIDDLEWARE
// =============================================================================

app = express();
app.use( morgan( 'combined' ) )
app.use( cors() );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( expressSession({
  secret: config.secretSauce,
  resave: false,
  saveUninitialized: false
}));
app.use( passport.initialize() );
app.use( passport.session() );

app.set( 'json spaces', 2 );
app.set( 'x-powered-by', false );

httpServer = http.Server( app );

port = process.env.PORT || config.port;

passport.use( User.createStrategy() );
passport.serializeUser( User.serializeUser() );
passport.deserializeUser( User.deserializeUser() );

app.use( expressSession({
  secret: 'foobarbazdiddlydingdongsdf]08st0agf/b',
  resave: false,
  saveUninitialized: false
}));
app.use( passport.initialize() );
app.use( passport.session() );

docs( app, mongoose );
// docket( app, mongoose );





// ROUTER
// =============================================================================

// Create router
router = express.Router();





// ROUTES
// =============================================================================

router.get( '/rats/:id', rat.get );

router.get( '/rats', rat.get );
router.post( '/rats', rat.post );

router.get( '/rescues/:id', rescue.get );
router.post( '/rescues/:id', rescue.post );
router.put( '/rescues/:id', rescue.put );
router.delete( '/rescues/:id', notAllowed );

router.get( '/rescues', rescue.get );
router.post( '/rescues', rescue.post );
router.put( '/rescues', notAllowed );
router.delete( '/rescues', notAllowed );

router.get( '/search/rescues', rescue.search );

router.get( '/search/rats', rat.search );

// Register routes
app.use( '/api', router );
app.use( '/test', express.static( 'test' ) );
app.use( '/node_modules', express.static( 'node_modules' ) );





// SOCKET
// =============================================================================

socket = io( httpServer );

socket.on( 'connection', function ( socket ) {
  console.log( 'a user connected' );
});





// START THE SERVER
// =============================================================================

httpServer.listen( port );
console.log( 'Listening for requests on port ' + port + '...' );
