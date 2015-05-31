angular.module('starter')
  .controller('AppCtrl', function($scope, $ionicModal, $timeout) {
    // Form data for the login modal
    $scope.loginData = {};

    // Create the login modal that we will use later
  })

  .controller('WelcomeCtrl', function($scope, nestAPI, neuraAPI, $ionicLoading, $ionicModal, globalStorage, neuraToNest, $timeout) {
    //FIXME: replace with events
    $scope.$watch(
      function ( ) { return !!nestAPI.getToken() && !!globalStorage.getThermostateId(); },
      function (v) { $scope.nestConnected = v;    }
    );

    $scope.$watch(
      function ( ) { return neuraAPI.isConnected(); },
      function (v) { $scope.neuraConnected = v;     }
    );

    $scope.$watch(
      function ( ) { return $scope.nestConnected && $scope.neuraConnected; },
      function (v) { if (v) { $timeout(function () { neuraToNest.startWatching(); }, 5000); } }
    );

    $ionicModal.fromTemplateUrl('templates/select-thermostate.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.thermostateModal = modal;
    });

    $scope.connectNest = function () {
      nestAPI.authorize().then(function () {
        $ionicLoading.show({ template: 'Loading...'});
        return nestAPI.getThermostates();
      }).then(function (list) {
        $ionicLoading.hide();
        $scope.thermostates = list;
        $scope.thermostateModal.show();
      });
    };

    $scope.connectNeura = function () {
      neuraAPI.connect().then(function () {
        console.log('connected');
      });
    };

    $scope.pickThermostate = function (id) {
      $scope.thermostateModal.hide();
      globalStorage.setThermostateId(id);
    }
  })
  .controller('StatusCtrl', function($scope, $rootScope, globalStorage, nestAPI, globalStorage, neuraToNest, $interval) {
    var stateToText = {
      '': {text: 'Normal mode', img: 'img/normal.png'},
      'running': {text: 'You are running', img: 'img/running.png' },
      'walking': {text: 'You are walking', img: 'img/walking.png' },
      'driving': {text: 'You are driving', img: 'img/driving.png' }
    };

    $scope.$watch(function () {
      return neuraToNest.getState();
    }, function (state) {
      $scope.state = stateToText[state];
    });
    
    var hvacModes = {
      'heat': 'Heating',
      'off': 'Shutdown',
      'cool': 'Cooling'
    };

    function updateThermostateInfo() {
      nestAPI.getThermostateInfo(globalStorage.getThermostateId()).then(function (data) {
        $scope.thermostateMode = hvacModes[data.hvac_mode] || data.hvac_mode;
        $scope.targetTemperature = data.target_temperature_c;
      });
    }
    $scope.thermostateMode = hvacModes.off;
    $scope.targetTemperature = 20;
    try {
      updateThermostateInfo();
      var intervalId = $interval(updateThermostateInfo, 15000);
    } catch (e) {}
    $scope.$on('$destroy', function () {
      $interval.cancel(intervalId);
    });
  })
;

