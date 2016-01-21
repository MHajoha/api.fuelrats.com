var path, Rat, rat, User, user





path = require( 'path' )





exports.get = function ( request, response ) {
  response.sendFile( path.join( __dirname + '/templates/register.html' ) )
}





exports.post = function ( request, response ) {
  var ratData

  ratData = {}

  if ( request.body.CMDRname ) {
    ratData.CMDRname = request.body.CMDRname
  }

  if ( request.body.gamertag ) {
    ratData.gamertag = request.body.gamertag
  }

  rat = new Rat( ratData )

  user = new User({
    email: request.body.email,
    rat: rat._id
  })

  User.register( user, request.body.password, function ( error, user ) {
    var auth

    if ( error ) {
      response.send( error )
      return
    }

    Rat.create( rat )

    auth = passport.authenticate( 'local' )

    auth( request, response, function () {
      response.status( 200 )
      response.json( user )
    })
  })
}