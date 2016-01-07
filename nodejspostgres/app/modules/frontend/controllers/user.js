var sendEmail = require('../../../tools/send_mail').sendEmail;
var image_tool = require('../../../tools/image');
var db = require('../../../tools/db');
var uuid      = require('node-uuid');
var _         = require('underscore');
var validator = require('validator');
var captchapng = require('captchapng');
var bcrypt = require('bcrypt-nodejs');
var crypto =  require('crypto');

function validateRegister(body){

  if ( !body.Email || !validator.isEmail( body.Email )){
    return "Your email is invalid";
  }

  if ( !body.username ||  body.username.match("^[a-zA-Z0-9]*$") == null ){
    return "Your username is invalid";
  }

  if ( !body.FirstName || !validator.isLength(body.FirstName, 3,30) ){
    return "First name must have length from 3->30";
  }

  if ( !body.LastName || !validator.isLength(body.LastName, 3,30) ){
    return "Last name must have length from 3->30";
  }

  var validate_password = validatePassword(body.Password);
  
  if (validate_password !== true ){
    return validate_password;
  }

  return true;
}

function validatePassword(password){


  if ( !password || !validator.isLength(password, 6,30) ){
    return "Password have length from 6->30";
  }
  return true;
}

function validateLogin(body, only_login_name){

  var validator = require('validator');

  if ( !body.Email || !validator.isEmail( body.Email )){
    return "Your email is invalid";
  }

  if (only_login_name){
    return true;
  }

  if ( !body.Password || !validator.isLength(body.Password, 6,30) ){
    return "Password must have length from 6 -> 30";
  }

  return true;
}

module.exports = function(BaseController){
 return BaseController.extend({ 
    name: "user",
    index: function(req, res, next) {
      res.json("how");
    },
    register: function(req, res, next) {

      //get conntries from db
      var sql = 'SELECT * FROM '+ config.country_table + ' ORDER BY name DESC ';
      var data = [ ];
      var _this = this;
      db.query( sql, data, function( status, rows ){
          console.log("status", status);
          if ( !status ){
            return next( status);
          }
          console.log(rows);
          _this.render( res,'register', { countries: rows } );
      });
      
    },
    login: function(req, res, next) {
      if (req.session.user){
        res.redirect('/profile');
      }else{
        this.render( res,'login', {} );
      }
      
    },
    viewForgot: function(req, res, next) {
      if (req.session.user){
        res.redirect('/profile');
      }else{
        this.render( res,'forgot', {} );
      }
    },
    
    profile: function(req, res, next) {
      if (!req.session.user){
        res.redirect('/login');
      }else{
        console.log(req.session.user);
        this.render( res,'profile', { user: req.session.user} );
      }
      
    },
    captcha: function(req, res, next) {
        var captcha_number = parseInt(Math.random()*9000+1000);
        req.session.captcha = captcha_number;
        console.log(req.session.captcha);
        var p = new captchapng(80,30, captcha_number); // width,height,numeric captcha 
        p.color(0, 0, 0, 0);  // First color: background (red, green, blue, alpha) 
        p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha) 
 
        var img = p.getBase64();
        var imgbase64 = new Buffer(img,'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png'
        });
        res.end(imgbase64);
    },
    dologin: function(req, res, next) {
      console.log("req.body");
      var body = req.body;

/*      var validator_error = validateLogin( body );

      if ( typeof(validator_error) == "string" ){
        return res.json( jsonErr(validator_error) );
      }*/

      var sql = 'SELECT * FROM '+ config.user_table + ' WHERE "username" = $1';
      var data = [ body.username  ];
      db.query( sql, data, function( status, rows ){
          console.log("status", status);

          if ( rows.length == 0 ){
            return res.json( jsonErr("Not found your account") );
          }
          var first_user = rows[0];
          var hash =  first_user.Password.trim();

          if ( first_user.Active == 0 ){
            return res.json( jsonErr("Please active your account") );
          }

          console.log("hash",hash, body.Password);
          console.log("hash1",hash);
          console.log("hash2",body.Password);

          bcrypt.compare( body.Password, hash, function(err, result) {
            if (result){
              req.session.user = first_user;
              showLog("first_user", first_user);
              res.json( jsonSucc( "ok" ) );
              db.addTracking( req, first_user.id,  "login"  );
            }
            else{
              return res.json( jsonErr("The login name or password does not match, Please try again") );
            }
          });
      });

      return;

   

    },
    doregister: function(req, res, next) {
      
      var body = req.body;

      console.log("req.body", body );

      var validator_error = validateRegister( body );

      if ( typeof(validator_error) == "string" ){
        return res.json( jsonErr(validator_error) );
      }

      if ( body.Captcha != req.session.captcha ){
        return res.json( jsonErr("Invalid captcha, Please try again") );
      }

      var _this = this;
      //res.json( jsonSucc( req.body ) );

      var sql = 'SELECT * FROM '+ config.user_table + ' WHERE "Email" = $1 or "username" = $2 ';
      var data = [ body.Email, body.username  ];
      db.query( sql, data, function( status, rows ){
        console.log("status", status);
        //console.log("result", rows[0], rows[0].Email);
        if (rows.length > 0){

          if ( rows[0].Email.trim() == body.Email )
            return res.json( jsonErr("The email is existing,Please try another")  ); 
          else
            return res.json( jsonErr("The username is existing,Please try another")  ); 
        }


        bcrypt.hash(body.Password, null, null, function(err, hash) {
          if (err){
            return res.json( jsonErr( err ) );
          }

          //ok, first one is insert to custom table
          var insert_sql = 'INSERT INTO '+ config.customer_table + '("descr","active") VALUES ($1,$2)  RETURNING id';

          db.query( insert_sql, [ body.username,0 ], function( status, rows ){
            if ( !status ){
              console.log("on insert to custom table", status, rows);
              return res.json( jsonErr("Happended error while resgisting your account, Please try later")  ); 
            }


            body.Password = hash;
            body.Active   = 0;
            body.hash_register = uuid.v4();
            body.customer_id = rows[0].id;
            body.RoleID = 0;
            body.TimeStamp= new Date().getTime();
            body.CustomerIP = getUserIP( req );
            body.reset_password = "";

            var insert_sql = 'INSERT INTO '+ config.user_table + '("RoleID","TerritoryID","Password","CompanyName",'+
              '"FirstName","LastName","Email","Phone","MobilePhone","Address1","Address2","City","State","ZipCode",'+
              '"CustomerIP","TimeStamp","Active","customer_id","hash_register","username","Country") ';
            insert_sql += "  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id;";

            console.log("insert_sql",insert_sql);
            var insert_data = []

            insert_data.push( body.RoleID );
            insert_data.push( body.TerritoryID );
            insert_data.push( body.Password );
            insert_data.push( body.CompanyName );
            insert_data.push( body.FirstName );
            insert_data.push( body.LastName );
            insert_data.push( body.Email );
            insert_data.push( body.Phone );
            insert_data.push( body.MobilePhone );
            insert_data.push( body.Address1 );
            insert_data.push( body.Address2 );
            insert_data.push( body.City );
            insert_data.push( body.State );
            insert_data.push( body.ZipCode );
            insert_data.push( body.CustomerIP );
            insert_data.push( body.TimeStamp );
            insert_data.push( body.Active );
            insert_data.push( body.customer_id );
            insert_data.push( body.hash_register );
            insert_data.push( body.username );
            insert_data.push( body.Country );
            //insert_data.push( body.reset_password );

            console.log("insert_data", insert_data.length);

            db.query( insert_sql, insert_data, function( status, rows ){
              console.log("status", status);
              console.log("rows", rows);

              if ( !status ){
                return res.json( jsonErr("Happended error while resgisting your account, Please try later")  ); 
              }

              var subject = "Active your account at website: "+config.domain;
              var active_link = "http://{0}/users/active?hash={1}";
              active_link = active_link.format( config.domain, body.hash_register );

              var html_content  = "<p>Hi, you registered an account on our website at address http://{0}</p>".format(config.domain);
              html_content += "<p>To active your account, Please click  <a href='{0}'>here</a></p>".format(active_link);
              html_content += "<p>If you don't see the link, Please copy below link:</p>";

              html_content += "<p>{0}</p>".format(active_link);
              html_content += "<p>Note: this link will be expired after 72 hours since registration time</p>"
              showLog(html_content);

              res.json( jsonSucc("ok"));

              sendEmail(config.admin_email,body.email,subject,html_content,config);
            });


          });
          

        });

      });

      return;
      /*var filter = {"$or":[{user_name:body.user_name}, {email:body.email} ]}

      User.find(filter, function(err, users){

        if (err){
          return res.json(err);
        }

        if ( users.length > 0){
          var first_user = users[0];
          if ( first_user.user_name == body.user_name ){
            return res.json( jsonErr("The user name is existing,Please try another")  );
          }
          else{
            return res.json( jsonErr("The email is existing,Please try another")  ); 
          }


          

        }

        
        bcrypt.hash(body.password, null, null, function(err, hash) {
          if (err){
            return res.json( jsonErr( err ) );
          }

          body.password = hash;
          body.status   = "unactive";
          body.hash_register = uuid.v4();

          new User( body ).save( function( err, user, count ){
            if (err){
              return res.jsonErr(err);
            }
            req.session.user = user;
            //showLog(user);
            
            var subject = "Active your account at website: "+config.domain;
            var active_link = "http://{0}/users/active?hash={1}&user_id={2}";
            active_link = active_link.format( config.domain, user.hash_register, user._id );

            var html_content  = "<p>Hi, you registered an account on our website at address http://{0}</p>".format(config.domain);
            html_content += "<p>To active your account, Please click  <a href='{0}'>here</a></p>".format(active_link);
            html_content += "<p>If you don't see the link, Please copy below link:</p>";

            html_content += "<p>{0}</p>".format(active_link);
            showLog(html_content);

            user = _this.removeSecretFields(user.toObject());
            res.json(user);

            sendEmail(config.admin_email,user.email,subject,html_content,config);
          });

        });

      });*/

    },
    removeSecretFields:function(user){
      showLog( typeof(user) );
      
      delete user.hash_register;
      delete user.password;
      delete user.reset_password;
      delete user.hash_reset;

      return user;
    },
    //end register
    info: function(req, res, next) {
      if (req.session.user){
        var user = req.session.user;
        user = this.removeSecretFields(user);
        res.json( jsonSucc( user ) );
      }
      else{
        res.json( jsonErr("You are not login") );  
      }
      
    },
    logout: function( req, res, next ){
      delete req.session.user;
      res.redirect('/login');
    },

    active:function(req, res, next){
      var hash = req.query.hash;
      
      //http://localhost:3000/users/active?hash=cd52ad82-f11f-44bb-9f56-aa05438335cb
      if (!hash ){
        return res.send("Invalid request");
      }

      var sql = 'SELECT * FROM '+ config.user_table + ' WHERE "hash_register" = $1';
      hash = hash.trim() ;
      var data = [ hash  ];
      var _this = this;

      db.query( sql, data, function( status, rows ){


        if ( rows.length == 0 ){
          return res.send("Invalid request");
        }
        var first_user = rows[0];
        
        if (first_user.Active == 1){
          return res.send("Your account has already actived"); 
        }
        
        if (req.session.user){
          delete req.session.user;
        }

        var current_timestamp = new Date().getTime();

        //72 hours = 72* 72*60*60*1000 = 259200000


        //expired over 72 hours
        if  ( first_user.TimeStamp +  259200000 < current_timestamp  ){
          return res.send("Your account is expired after registration 72 hours"); 
        }


        var update_sql = 'UPDATE '+ config.user_table + ' SET "Active" = 1 WHERE hash_register = $1'

        console.log("update_sql",update_sql);
        var update_data = [ hash ]

        
        console.log("update_data", update_data);

        db.query( update_sql, update_data, function( status, rows ){
          console.log("status", status);
          console.log("rows", rows);

          if ( !status ){
            return res.send("Happended error while update your account, Please try later"); 
          }

          db.addTracking( req, first_user.id,  "active_account"  );

          update_sql = 'UPDATE '+ config.customer_table + ' SET "active" = true WHERE descr = $1'
          db.query( update_sql, [ first_user.username ], function( status, rows ){
            console.log("status", status);
            console.log("rows", rows);

            if ( !status ){
              return res.send("Happended error while update your account, Please try later"); 
            }

            var return_text = "Your account is actived, Please click <a href='{0}'>here</a> to go to homepage";
            return_text = return_text.format("http://"+config.domain);

            _this.render( res,'well', {text:return_text} );

            var subject = "Active account successful "
            

            var html_content  = "<p>Hi {0} {1}, You actived your account on our system successfully</p>".format(first_user.FirstName,first_user.LastName);
            
            showLog(html_content);

            sendEmail(config.admin_email,first_user.Email,subject,html_content,config);

          });

        });
      });

    },
    UpdateBasic: function(body,current_user, req, res){

      var user_id           = req.session.user._id;
      var _this = this;

      User.findById(user_id, function(err,user){
        if (body.first_name){
          user.first_name = body.first_name;
        }

        if (body.last_name){
          user.last_name = body.last_name;
        }

        user.save();
        return res.json( jsonSucc( _this.removeSecretFields(user.toObject())) );

      });
    },
    changePassword: function(body,current_user, req, res){
      
      if ( !body.current_password || !body.new_password ){
        return res.json( jsonErr("Invalid request") );
      }

      var current_password  = body.current_password;
      var new_password      = body.new_password;
      var user_id           = req.session.user._id;

      var validate_password =  validatePassword(new_password);

      if ( validate_password !== true){
        return res.json( jsonErr( validate_password ) );
      }

      var _this = this;

      User.findById(user_id, function(err,user){
        //Check current password
        var bcrypt = require('bcrypt-nodejs');
        bcrypt.compare( current_password, user.password, function(err, result) {

          if (!result){
            return res.json( jsonErr("The current password isn't correct") );
          }

          bcrypt.hash(new_password, null, null, function(err, hash) {
            //Update new password
            user.password = hash;
            user.save();

            return res.json( jsonSucc( _this.removeSecretFields(user.toObject())) );
          });
        });
      });
    },

    updateExtra: function(body,current_user, req, res){
      if (body.theme){
        User.findById(current_user._id, function(err, user){

          if (err){
            return showError("error while update song_id "+ song_id);
          }
          user.theme= body.theme;
          /*showLog("user1",user);
          showLog("theme", body.theme);*/
          user.save();
          showLog("user1",user);
          req.session.user = user;
          return res.json( jsonSucc(user)  );
        });
      }
      else{
        return res.json( jsonSucc(current_user)  );
      }
      
    },
    //


    //End udpate extra:
    resetPassword:function( req, res, next ){
      console.log("req.body");
      var body = req.body;

      var validator_error = validateLogin( body, true );

      if ( typeof(validator_error) == "string" ){
        return res.json( jsonErr(validator_error) );
      }


      var sql = 'SELECT * FROM '+ config.user_table + ' WHERE "Email" = $1';
      var email = body.Email.trim() ;
      var data = [ email ];
      var _this = this;

      db.query( sql, data, function( status, rows ){


        if ( rows.length == 0 ){
          return res.json( jsonErr("Not found your email") );
        }
        var first_user = rows[0];
        
        if (first_user.Active == 0){
          return res.json( jsonErr("This account is inactive") );
        }
        
        if (req.session.user){
          delete req.session.user;
        }

        var current_timestamp = new Date().getTime();

        var reset_password = crypto.randomBytes(64).toString('hex').substr(0,6);

        bcrypt.hash(reset_password, null, null, function(err, hash) {
          if (err){
            return res.json( jsonErr( err ) );
          }

          var update_sql = 'UPDATE '+ config.user_table + ' SET "reset_password" = $1, "TimeStampReset" = $2,"hash_reset" =$3  WHERE id = $4'

          console.log("update_sql",update_sql);
          var hash_reset = uuid.v4();
          var update_data = [ hash, current_timestamp, hash_reset, first_user.id  ]

          
          console.log("update_data", update_data);

          db.query( update_sql, update_data, function( status, rows ){
            console.log("status", status);
            console.log("rows", rows);

            if ( !status ){
              return res.json( jsonErr("Happended error while reset your account, Please try later") );

            }

            db.addTracking( req, first_user.id,  "request_reset_account"  );
            res.json( jsonSucc("ok") );

            
            var subject = "Reset your account at website: " + config.domain;
            var reset_link = "http://{0}/users/reset-password?hash={1}&user_id={2}";
            reset_link = reset_link.format( config.domain, hash_reset, first_user.id );

            var html_content  = "<p>Hi {0}, Someone have just reseted password on your account on our website  http://{1}, ".format( first_user.FirstName + " " + first_user.LastName , config.domain);
            html_content += "We set new password is <strong>{0}</strong>. If that was you,Please click  <a href='{1}'>here</a> to apply new password, ".format(reset_password, reset_link);
            html_content += "If you don't see the link, Please copy below link:</p>";
            html_content += "<p>{0}</p>".format(reset_link);
            html_content += "<p>If that wasn't you, Just ignore this email. This email will be expired after 72 hours</p>"
            showLog("html_content",html_content);

            sendEmail(config.admin_email,first_user.email,subject,html_content,config);


          });
        });
        

      });

      /*

      var filter = {"$or":[{user_name:body.login_name}, {email:body.login_name} ]}
      var _this = this;

      User.find(filter, function(err, users){
        if (err){
          return res.json(err);
        }

        if ( users.length == 0){
          return res.json( jsonErr("Not found your login name") );
        }

        var first_user = users[0];

        var bcrypt = require('bcrypt-nodejs');
        
        var crypto =  require('crypto');
        var reset_password = crypto.randomBytes(64).toString('hex').substr(0,6);

        bcrypt.hash(reset_password, null, null, function(err, hash) {
          if (err){
            return res.json( jsonErr( err ) );
          }
          showLog("reset hash", hash);
          first_user.reset_password = hash;
          first_user.hash_reset = uuid.v4();
          first_user.save();

          var subject = "Reset your account at website: " + config.domain;
          var reset_link = "http://{0}/users/reset-password?hash={1}&user_id={2}";
          reset_link = reset_link.format( config.domain, first_user.hash_reset, first_user._id );

          var html_content  = "<p>Hi {0}, Someone have just reseted password on your account on our website  http://{1}, ".format( first_user.user_name, config.domain);
          html_content += "We set new password is <strong>{0}</strong>. If that was you,Please click  <a href='{1}'>here</a> to apply new password, ".format(reset_password, reset_link);
          html_content += "If you don't see the link, Please copy below link:</p>";
          html_content += "<p>{0}</p>".format(reset_link);
          html_content += "<p>If that wasn't you, Just ignore this email</p>"
          showLog(html_content);

          sendEmail(config.admin_email,first_user.email,subject,html_content,config);

          return res.json( jsonSucc("ok"));

        });
      });*/
    },
    doResetPassword:function(req, res, next){
      var hash = req.query.hash;
      var user_id = req.query.user_id;
      //http://localhost:3000/users/reset-password?hash=9d4bd369-84d2-4366-a7a6-a5931400af54&user_id=9
      if (!hash && user_id){
        return res.send("Invalid request");
      }

      var _this = this;
      var hash = req.query.hash;
      
      //http://localhost:3000/users/active?hash=cd52ad82-f11f-44bb-9f56-aa05438335cb
      if (!hash || hash.length < 5 ){
        return res.send("Invalid request");
      }

      var sql = 'SELECT * FROM '+ config.user_table + ' WHERE "hash_reset" = $1 AND id= $2' ;
      hash = hash.trim() ;
      var data = [ hash, user_id  ];
      var _this = this;

      db.query( sql, data, function( status, rows ){


        if ( rows.length == 0 ){
          return res.send("Invalid request");
        }
        var first_user = rows[0];
        
        
        
        if (req.session.user){
          delete req.session.user;
        }

        var current_timestamp = new Date().getTime();

        //72 hours = 72* 72*60*60*1000 = 259200000


        //expired over 72 hours
        if  ( first_user.TimeStampReset +  259200000 < current_timestamp  ){
          return res.send("This link is expired"); 
        }


        var update_sql = 'UPDATE '+ config.user_table + ' SET "Password" = $1, hash_reset = \'\', reset_password = \'\' WHERE id = $2'

        console.log("update_sql",update_sql);
        var update_data = [ first_user.reset_password, first_user.id ]

        
        console.log("update_data", update_data);

        db.query( update_sql, update_data, function( status, rows ){
          console.log("status", status);
          console.log("rows", rows);

          if ( !status ){
            return res.send("Happended error while update your account, Please try later"); 
          }

          db.addTracking( req, first_user.id,  "done_reset_account"  );

          var return_text = "New password is actived successfully, Please click <a href='{0}'>here</a> to go to login page";
          return_text = return_text.format("http://"+config.domain);

          _this.render( res,'well', {text:return_text} );


        });
      });
    }

  });
}
 

