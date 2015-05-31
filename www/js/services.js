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

    function setTargetTemperature(ruleMap) {
      return function () {
        $log.debug('Setting temperature to default ' + ruleMap[state]);
        nestAPI.thermostateTargetTemperature(
          globalStorage.getThermostateId(),
          self.getTargetTemperature() + (ruleMap[state] || 0)
        );
      }
    }

    function setThermostateMode(mode) {
      return function () {
        $log.debug('Setting thermostate mode to ' + mode);
        nestAPI.thermostateMode(globalStorage.getThermostateId(), mode);
      }
    }

    var eventActions = {
      userStartedWalking: enterState('walking'),
      userFinishedWalking: leaveState('walking'),
      userStartedRunning: enterState('running'),
      userFinishedRunning: leaveState('running'),
      userArrivedHome: setTargetTemperature({
        '': 0,
        'walking': -2,
        'running': -4
      }),
      userWokeUp: setThermostateMode('heat'),
      userStartedSleeping: setThermostateMode('off')
    };


    this.getState = function () {
      return state;
    }

    this.getTargetTemperature = function () {
      return 20;
    };

    this.handleEvent = function (event) {
      $log.debug('Got event from Neura: ' + event);
      if (eventActions[event]) {
        eventActions[event]();
        $rootScope.$applyAsync();

      } else {
        $log.debug('No handler for this event');
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
  

