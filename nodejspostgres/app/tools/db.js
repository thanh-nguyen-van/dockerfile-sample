var pg = require('pg');

function connectDB(func_callback){
  

  var client = new pg.Client(config.db_url);
  client.connect(function(err) {
    if(err) {

      console.error('could not connect to postgres', err);
      throw "could not connect to db"
    }

    return func_callback( client );
    /*client.query('SELECT NOW() AS "theTime"', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }
      console.log(result.rows[0].theTime);
      //output: Tue Jan 15 2013 19:12:47 GMT-600 (CST)
      client.end();
    });*/
  });

}

function query(sql, data, func_callback){
  connectDB(function( client ){
    console.log("query is ", sql,data);
    client.query( sql , data, function(err, result) {
        if (err){
          func_callback(false, err);
        }else{
          console.log("result",result);
          func_callback(true, result.rows);
        }
        client.end();
    });
  });
}


function addTracking( req, UserID, Action ){
   connectDB(function( client ){

    var track_sql = 'INSERT INTO '+ config.tracking_table +'("UserID","Date","Action","IP") VALUES ($1,$2,$3,$4)';
    var data = [ UserID, new Date(), Action, getUserIP(req) ];

    console.log("track_sql",track_sql);

    client.query( track_sql , data, function(err, result) {
        if (err){
          console.log("add tracking err",err)
        }
        client.end();
    });
  }); 
}

module.exports = {
  query:query,
  addTracking:addTracking
}