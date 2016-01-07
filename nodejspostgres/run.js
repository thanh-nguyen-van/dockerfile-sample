
var express = require('express');
var app = express();
var swig = require('swig');

//app.engine('jade', require('jade').__express);

//Register views folder
app.set('views', './app/views'); // specify the views directory
//Register template engine
//app.set('view engine', 'jade'); // register the template engine


app.engine('html', swig.renderFile);
//app.set('views', 'views');
app.set('view engine', 'html');

//HienCaCa
app.set('view cache', false);
// To disable Swig's cache, do the following:
swig.setDefaults({
    cache: false
});


//Allow use static
app.use(express.static('app/public'));
//Allow download file
//app.use(express.static('app/files'));



//production or development
//process.env.NODE_ENV = 'production';

// ----------------------ERROR HANDLING
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

//global.app = app;


function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.send(500, { error: 'Something blew up!' });
  } else {
    next(err);
  }
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}
// ------------------- END ERROR HANDLING

//Default is false
global.is_debug = false;

require('./app/tools/pre_init');
require('./app/tools/general');
var configs = require('./configs');
showLog( process.argv );


//nodejs run.js config_production.js
var config_file = process.argv[2] || "config.json";
showLog("Config file name is " + config_file);
configs( config_file, function(config){
  global.config = config;

  app.set('env', config.env || "development" );
  global.is_debug = config.env == "developement";

  showWarn("debug is ",is_debug );

  if ( is_debug ){
    //Show pretty html on the bebug case
    app.locals.pretty = true;
  }

  connectDB();

});

function connectDB(){

  var pg = require('pg');
  var conString = config.db_url;

  //this initializes a connection pool
  //it will keep idle connections open for a (configurable) 30 seconds
  //and set a limit of 20 (also configurable)
  pg.connect(conString, function(err, client, done) {
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    done();
    
    connectRedis();
  });

}



function connectRedis(){
  var redis  = require("redis"),
  client = redis.createClient();

  client.on('error', function (err) {
    showError("Redis error", err);
  });

  client.on('connect', function(){
    showSucc("connected to redis");
    //Boot router
    boot();
  });
}

function boot(){

  var expressSession = require('express-session');
  var cookieParser = require('cookie-parser'); // the session is stored in a cookie, so we use this to parse it
  var RedisStore = require('connect-redis')(expressSession);
  app.use(cookieParser());
  //app.use(expressSession({secret:'a3flsjf&*&S*DHFSDF'}));
  app.use(expressSession({
      secret: 'tais#@@$%sd',
      name: "cookie_name",
      store:new RedisStore(config.redis),
      proxy: true,
      resave: true,
      //cookie: { maxAge: 1000*60*2 },
      saveUninitialized: true
  }));

  //Allow get body in the request
  var bodyParser = require('body-parser');
    
  //Limit is 1mb
  app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
  app.use( bodyParser.json( {limit: '1mb'}) );       // to support JSON-encoded bodies
  

  /*app.use(bodyParser.json({limit: '1mb'}));
  app.use(bodyParser.urlencoded({extended: false,limit: '1mb'}));*/

  var methodOverride = require('method-override');
  app.use(methodOverride());

  if ( !global.is_debug ){
    var csrf    = require('csurf')

    app.use(csrf())

    // error handler
    app.use(function (err, req, res, next) {
      if (err.code !== 'EBADCSRFTOKEN') return next(err)

      // handle CSRF token errors here
      res.status(403)
      res.send('session has expired or form tampered with')
    })    
  }

  require('./app/modules/frontend')(app);
  require('./app/modules/backend')(app);
  
  var listen_port = config.port || 3000;
  var server = app.listen(listen_port, function() {
    console.log('Listening on port %d', server.address().port);
  });

  //Custom 404 page
  app.use(function(req, res, next){
    res.status(404).send('Sorry cant find that!')
  });
}