angular.module('starter')
  .controller('AppCtrl', function($scope) {
    $scope.loginData = {};
  })

  .controller('WelcomeCtrl', function($scope, nestAPI, neuraAPI, $ionicLoading, $ionicModal, globalStorage, neuraToNest, $timeout, $ionicPopup) {
    //FIXME: replace with events
    $scope.$watch(
      function ( ) { return !!nestAPI.getToken() && (!!globalStorage.getHomeThermostatId() || !!globalStorage.getWorkThermostatId()); },
      function (v) { $scope.nestConnected = v;    }
    );

    $scope.$watch(
      function ( ) { return neuraAPI.isConnected(); },
      function (v) { $scope.neuraConnected = v;     }
    );

    $scope.$watch(
      function ( ) { return $scope.nestConnected && $scope.neuraConnected; },
      function (v) { if (v) { neuraToNest.startWatching(); }               }
    );

    $scope.$watch(
      function ( ) { return globalStorage.getWorkThermostatId(); },
      function (v) { $scope.workThermostatId = v;     }
    );

    $scope.$watch(
      function ( ) { return globalStorage.getHomeThermostatId(); },
      function (v) { $scope.homeThermostatId = v;     }
    );
    $ionicModal.fromTemplateUrl('templates/select-thermostat.html', {
      scope: $scope,
      animation: 'slide-in-up',
      backdropClickToClose: false
    }).then(function(modal) {
      $scope.thermostatModal = modal;
    });

    $scope.connectNest = function () {
      nestAPI.authorize().then(function () {
        $ionicLoading.show({ template: 'Loading...'});
        return nestAPI.getThermostats();
      }).then(function (list) {
        $ionicLoading.hide();
        list.forEach(function (item) {
          if (item.device_id == globalStorage.getHomeThermostatId() || item.device_id == globalStorage.getWorkThermostatId()) {
            item.selected = true;
          }
        });
        $scope.thermostats = list;
        $scope.thermostatModal.show();
      });
    };

    $scope.connectNeura = function () {
      neuraAPI.connect().then(function () {
        console.log('connected');
      });
    };

    $scope.pickThermostat = function (thermostat) {
      if (thermostat.selected === false) {
        if (globalStorage.getHomeThermostatId() == thermostat.device_id) {
          globalStorage.setHomeThermostatId(null);
        }
        if (globalStorage.getWorkThermostatId() == thermostat.device_id) {
          globalStorage.setWorkThermostatId(null);
        }
        return;
      }
      $ionicPopup.show({
        template: 'Is it home or office thermostat?',
        title: 'Thermostat type',
        scope: $scope,
        buttons: [
          { text: 'Home', onTap: function () { return 'home' }},
          { text: 'Office', onTap: function () { return 'office' }}
        ]
      }).then(function (res) {
        if (res === 'office') {
          if (globalStorage.getHomeThermostatId() == thermostat.device_id) {
            globalStorage.setHomeThermostatId(null);
          }
          globalStorage.setWorkThermostatId(thermostat.device_id);
        }
        if (res === 'home') {
          if (globalStorage.getWorkThermostatId() == thermostat.device_id) {
            globalStorage.setWorkThermostatId(null);
          }
          globalStorage.setHomeThermostatId(thermostat.device_id);
        }
      });
    }
  })
  .controller('StatusCtrl', function($scope, $rootScope, globalStorage, nestAPI, globalStorage, neuraToNest, $interval) {
    var stateToText = {
      ''        : {text: 'Normal mode'     , img: 'img/normal.png'  },
      'sleeping': {text: 'You are sleeping', img: 'img/normal.png'  },
      'running' : {text: 'You are running' , img: 'img/running.png' },
      'walking' : {text: 'You are walking' , img: 'img/walking.png' },
      'driving' : {text: 'You are driving' , img: 'img/driving.png' }
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

    function updateThermostatInfo() {
      nestAPI.getThermostatInfo(globalStorage.getHomeThermostatId()).then(function (data) {
        $scope.thermostatMode = hvacModes[data.hvac_mode] || data.hvac_mode;
        $scope.targetTemperature = data.target_temperature_f;
      });
    }
    $scope.thermostatMode = hvacModes.off;
    $scope.targetTemperature = '';
    try {
      updateThermostatInfo();
      var intervalId = $interval(updateThermostatInfo, 15000);
    } catch (e) {}
    $scope.$on('$destroy', function () {
      $interval.cancel(intervalId);
    });
  })
;

