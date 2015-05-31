angular.module('starter', ['ionic', 'nest-api', 'neura-api'])

  .run(function($ionicPlatform, nestAPI) {
    window.nestAPI = nestAPI;
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
    });
  })

  .config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

      .state('app', {
        url: "/app",
        abstract: true,
        templateUrl: "templates/menu.html",
        controller: 'AppCtrl'
      })

      .state('app.welcome', {
        url: "/welcome",
        views: {
          'menuContent': {
            templateUrl: "templates/welcome.html",
            controller: 'WelcomeCtrl'
          }
        }
      })

      .state('app.logs', {
        url: "/logs",
        views: {
          'menuContent': {
            templateUrl: "templates/logs.html",
            controller: function ($scope) { $scope.logs = window.logs; }
          }
        }
      })

      .state('app.status', {
        url: "/status",
        views: {
          'menuContent': {
            templateUrl: "templates/status.html",
            controller: 'StatusCtrl'
          }
        }
      })
    ;
    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/welcome');
  });
