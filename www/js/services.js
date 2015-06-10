angular.module('starter')
  .config(function ($provide) {
    $provide.decorator('$log', function ($delegate) {
      $delegate.debug = function (message) {
        window.logs = window.logs || [];
        window.logs.unshift((new Date()).toString() + ' ' + message);
      };
      return $delegate;
    });
  })
  .service('globalStorage', function() {
    var globalStorage = JSON.parse(localStorage.getItem('globalStorage') || "{}");

    function saveToLocalStorage () {
      localStorage.setItem('globalStorage', JSON.stringify(globalStorage));
    }

    this.getThermostateId = function () {
      return globalStorage.thermostatId;
    }

    this.setThermostateId = function (id) {
      globalStorage.thermostatId = id;
      saveToLocalStorage();
    }
  })

  .service('neuraToNest', function ($rootScope, neuraAPI, globalStorage, $log, nestAPI, neuraPermissions) {
    var self = this;
    var state ='';

    function leaveState(stateName) {
      return function () {
        if (state === stateName) {
          $log.debug('Cancelling state ' + stateName);
          state = '';
        }
      }
    }

    function enterState(stateName) {
      return function () {
        $log.debug('Entering state ' + stateName);
        state = stateName;
      }
    }

    function setTargetTemperature(delta) {
      return function () {
        $log.debug('Setting temperature to ' + delta);
        nestAPI.thermostateTargetTemperature(globalStorage.getThermostateId()).then(function (t) {
          nestAPI.thermostateTargetTemperature(
            globalStorage.getThermostateId(),
            self.getTargetTemperature() + (ruleMap[state] || 0)
          );
        });
      }
    }

    function setThermostateMode(mode) {
      return function () {
        if (mode === 'off') {
          $log.debug('Setting thermostate mode to ' + mode);
          nestAPI.thermostateMode(globalStorage.getThermostateId(), mode);
        } else {
          nestAPI.getThermostateInfo(globalStorage.getThermostateId()).then(function (data) {
            var newMode = 'heat';
            var currentTemperature = data.ambient_temperature_f;
            var targetTemperature = data.target_temperature_f;
            if (currentTemperature > targetTemperature) {
              newMode = 'cool'
            }
            $log.debug('Ambient temperature is ' + currentTemperature);
            $log.debug('Target temperature is ' + targetTemperature);
            $log.debug('New mode is ' + newMode);
            nestAPI.thermostateMode(globalStorage.getThermostateId(), mode);
          });
        }
      }
    }


    var eventActions = {
      userStartedWalking: enterState('walking'),
      userFinishedWalking: leaveState('walking'),
      userStartedRunning: enterState('running'),
      userFinishedRunning: leaveState('running'),
      userArrivedHomeByRunning: setTargetTemperature(-4 * 1.8),
      userArrivedHomeByWalking: setTargetTemperature(-2 * 1.8),
      userWokeUp: setThermostateMode('on'),
      userStartedSleeping: setThermostateMode('off')
    };

    var popups = {
      userArrivedHomeByRunning: 'Welcome home! Your Nest will now cool down your house',
      userArrivedHomeByWalking: 'Welcome home! Your Nest will now cool down your house',
      userWokeUp: 'Rise and shine! Nest is now on'
    };
    
    

    this.getState = function () {
      return state;
    }

    this.handleEvent = function (event) {
      $log.debug('Got event from Neura: ' + event);
      if (eventActions[event]) {
        eventActions[event]();
        $rootScope.$applyAsync();

      } else {
        $log.debug('No handler for this event');
      }
      if (popups[event]) {
        plugin.notification.local.add({
          title: "NeuraNest",
          message: popups[event]
        });
      }
    };

    this.startWatching = function () {
      window.NeuraNest.subscribe(
        neuraPermissions,
        angular.noop,
        angular.noop,
        this.handleEvent
      );
    }
  });
  

