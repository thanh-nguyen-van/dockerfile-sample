var app = angular.module('app', [ 
    'ngRoute',
    'ngCookies',
    'ngResource',
    'ngAnimate',
    'usersApp',
    'albumApp',
    'playerApp',
    'songApp',
    'navigationApp',
    'headerApp'
  ]);

app.run(function($rootScope, $window,$http, $cookies, $dialogs, $location, $templateCache) {
  //Logic given data, consider it's error or normal data
  $templateCache.put('loading.html','<div class="wrap-loader"><p class="inline link"><i class="fa fa-circle-o-notch fa-spin"></i>&nbsp; {{text}}</p></div>');

  $rootScope.processRetrieveData = function(res,callback,callback_error){
    if (typeof res['status'] && res['status'] == 'error'){
      var message = res['data'];
    
      if ( angular.isDefined(callback_error) ){
        callback_error( message );
      }
      else{
        $dialogs.error(message);
      }
      
    }
    else{
      callback(res.data);
    }
  }

  //Find item in the list by id and remove it
  $rootScope.removeItemInList = function(list,id){
    for ( var i=0 ; i<  list.length; i++ ){
      if (list[i]._id == id ){
        list.splice(i, 1);
        break;
      }
    }
  }


  $rootScope.templateVersion = function( template_url ){
    return $window.templateVersion( template_url );
  }

  $rootScope.navigation_template = $rootScope.templateVersion('frontend/js/navigation/navigation.html');
  $rootScope.header_template = $rootScope.templateVersion('frontend/js/header/header.html');
  $rootScope.song_template = $rootScope.templateVersion('frontend/js/song/song.html');

});