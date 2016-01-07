

// ------------------- END ERROR HANDLING

//Default is false
global.is_debug = false;

require('./app/tools/pre_init');
require('./app/tools/general');
var db = require('./app/tools/db');
var configs = require('./configs');
var async = require('async');
showLog( process.argv );


//nodejs run.js config_production.js
var config_file = process.argv[2] || "config.json";
showLog("Config file name is " + config_file);
configs( config_file, function(config){
  global.config = config;

  global.is_debug = config.env == "developement";

  showWarn("debug is ",is_debug );

  

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
    
    connectMongo();
  });

}


function connectMongo(){

  var mongoose = require('mongoose'), 
    Schema = mongoose.Schema;
      

  var CountrySchema = new Schema({
      dial_code: {
          type: String,
          required: true,
          default: 0
      },
      iso2: {
          type: String,
      required: true
      },
      name: {
          type: String,
          required: true
      },
      priority: {
          type: Number,
          default: 0,
          required: true
      }
  },{collection: 'legiti_country'});

  global.CountryModel = mongoose.model('Country', CountrySchema);  
  
    

  var CitySchema = new Schema({
      country_id: {
          type: Schema.Types.ObjectId,
          required: true,
          index: true
      },
      name: {
          type: String,
          required: true
      },
      priority: {
          type: Number,
          default: 0,
          required: true
      }
  },{collection: 'legiti_cities'});
  global.CityModel = mongoose.model('Cities', CitySchema);
  
  mongoose.connect( "mongodb://127.0.0.1:27017/teknorecord" );
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback () {
    showSucc("Connected to the db");
    collectCity();    
  });
}

function collectCountry(){
    var condition = {};
    
    CountryModel.find(condition).skip(0).sort({ name: 1}).exec(function(error, data){
        if(error){
            console.log(error);
        }else{
          console.log(data);

          async.eachSeries(data, function iterator(item, callback) {
            console.log(item);
            //callback( null, item );
                
            var insert_sql = 'INSERT INTO '+ config.country_table + '("id","name","dial_code","iso2") VALUES ($1,$2,$3,$4) ';
            db.query( insert_sql, [ item._id.toString(), item.name, item.dial_code, item.iso2 ], function( status, rows ){
              if ( !status ){
                console.log("on insert to country_table", status, rows);
              }
              callback( null,item );
            });


          }, function done() {
            console.log("loop done");
          });
        }
    });
}

function collectCity(){
    var condition = {};
    
    CityModel.find(condition).skip(0).sort({ name: 1}).exec(function(error, data){
        if(error){
            console.log(error);
        }else{
          console.log(data);

          async.eachSeries(data, function iterator(item, callback) {
            console.log(item);
            //callback( null, item );
                
            var insert_sql = 'INSERT INTO '+ config.city_table + '("id","country_id","name") VALUES ($1,$2,$3) ';
            db.query( insert_sql, [item._id.toString(), item.country_id.toString(), item.name ], function( status, rows ){
              if ( !status ){
                console.log("on insert to city_table", status, rows);
              }
              callback( null,item );
            });


          }, function done() {
            console.log("loop done");
          });
        }
    });
}