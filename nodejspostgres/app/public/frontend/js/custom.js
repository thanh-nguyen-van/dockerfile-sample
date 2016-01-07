$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

function sendAjax(url, post_data, func_callback){
    function successFunc(result){
        $(".loading").hide();
        
        console.log("result", result);
        if ( result.status == "error" ){
            func_callback( false, result.data );
        }else{
            func_callback( true, result.data );
        }
        
        //func_callback()
    }
    function errorFunc(result){
        $(".loading").hide();
        alert("Happend error when request to server");
        
        /*console.log("result", result);
        func_callback( false, result );*/
        //func_callback()
    }
    
    $(".loading").show()
    $.ajax({
        url: url,
        type: "POST",
        data: JSON.stringify(post_data),
        contentType: "application/json",
        success: successFunc,
        error: errorFunc
    });

}

function appAlert( alert_data ){
    alert(alert_data);
}


window.Parsley.addValidator('username', {
    requirementType: 'string',
    validateString: function(value, requirement) {
        //return true;
        //return 0 === value % requirement;
        //console.log("value",value);
        //console.error("value",value);
        return  value.match("^[a-zA-Z0-9]*$") != null;
    },
    messages: {
      en: 'Username only allow alphabet and numberic'
    }
  });
