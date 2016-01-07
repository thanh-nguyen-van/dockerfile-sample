
var db = require('../../../tools/db');

module.exports = function(BaseController){
 return BaseController.extend({ 
    name: "home",
    index: function(req, res, next) {
      var public_data = { 
        message: 'Hello there!',
        is_debug:global.is_debug,
        asset_version: global.config.asset_version,
        template_version: global.config.template_version,
        maximum_file_upload: global.config.maximum_file_upload
      };


      this.render( res,'index', public_data );

    },
    city: function(req, res, next) {
      var country_id = req.query.country_id;
      //get conntries from db
      var sql = 'SELECT * FROM '+ config.city_table + '  WHERE "country_id" = $1 ORDER BY name DESC ';
      var data = [ country_id ];
      
      db.query( sql, data, function( status, rows ){
          console.log("status city is ", status);
          if ( !status ){
            return next( status);
          }
          console.log(rows);
          res.json( jsonSucc(rows));
      });
      
    }
  });
}
 

