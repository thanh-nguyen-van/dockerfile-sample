module.exports = function( app ){

  var BaseController = require('./controllers/base');

  var HomeController =  require('./controllers/home')(BaseController);
  var UserController =  require('./controllers/user')(BaseController);
  

  app.get('/', attachDB, function (req, res,next) {
    UserController.login( req, res, next );
  });


  app.post('/get-cities', attachDB, function (req, res,next) {
    HomeController.city( req, res, next );
  });

  app.get('/captcha', attachDB, function (req, res,next) {
    UserController.captcha( req, res, next );
  });

  app.get('/register', attachDB, function (req, res,next) {
    UserController.register( req, res, next );
  });

  app.post('/register', attachDB, function (req, res,next) {
    UserController.doregister( req, res, next );
  });

  app.get('/login', attachDB, function (req, res,next) {
    UserController.login( req, res, next );
  });

  app.get('/profile', attachDB, function (req, res,next) {
    UserController.profile( req, res, next );
  });

  app.post('/login', attachDB, function (req, res,next) {
    UserController.dologin( req, res, next );
  });
  app.get('/logout', attachDB, function (req, res,next) {
    UserController.logout( req, res, next );
  });

  app.get('/users/active', attachDB, function (req, res,next) {
    UserController.active( req, res, next );
  });

  app.get('/forgot-password', attachDB, function (req, res,next) {
    UserController.viewForgot( req, res, next );
  });
  
  app.get('/users/reset-password', attachDB, function (req, res,next) {
    UserController.doResetPassword( req, res, next );
  });

  app.post('/users/reset-password', attachDB, function (req, res,next) {
    UserController.resetPassword( req, res, next );
  });


}
