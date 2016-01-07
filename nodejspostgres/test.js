var bcrypt = require('bcrypt-nodejs');
bcrypt.hash("tamthoi", null, null, function(err, hash) {
  if (err){
    return res.json( jsonErr( err ) );
  }
  console.log(hash);
});