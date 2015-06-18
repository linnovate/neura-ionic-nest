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

    this.getWorkThermostatId = function () {
      return globalStorage.workThermostatId;
    }

    this.setWorkThermostatId = function (id) {
      globalStorage.workThermostatId = id;
      saveToLocalStorage();
    }

    this.getHomeThermostatId = function () {
      return globalStorage.homeThermostatId;
    }

    this.setHomeThermostatId = function (id) {
      globalStorage.homeThermostatId = id;
      saveToLocalStorage();
    }
  })

  .service('neuraToNest', function ($rootScope, neuraAPI, globalStorage, $log, nestAPI, neuraPermissions) {
    var self = this;
    var state ='';

    function leaveState() {
      return function () {
        $log.debug('Cancelling state ' + state + ', normal mode now');
        state = '';
      }
    }

    function enterState(stateName) {
      return function () {
        $log.debug('Entering state ' + stateName);
        state = stateName;
      }
    }

    function resolveWhere(where) {
      if (where === 'home') {
        return globalStorage.getHomeThermostatId();
      }
      if (where === 'work') {
        return globalStorage.getWorkThermostatId();
      }
    }

    function setTargetTemperature(where, delta) {
      return function () {
        var tId = resolveWhere(where);
        if (!tId) {
          $log('No thermostat configured at this point');
          return;
        }
        var thermostatOnFn = setThermostatMode(where, 'on');
        thermostatOnFn().then(function () {
          $log.debug('Setting temperature to ' + delta);
          return nestAPI.thermostatTargetTemperature(tId);
        }).then(function (t) {
          $log.debug('Current temperature is ' + t + ', changing by delta ' + delta);
          nestAPI.thermostatTargetTemperature(
            tId,
            t + (delta || 0)
          );
        }).catch(function (e) {
          console.log(e);
          var message = ': ';
          if (e.data && e.data.error) {
            message += e.data.error
          }
          $log.debug('Got error on setting target temperature' + message);
        });
      }
    }

    function setThermostatMode(where, mode) {
      return function () {
        var tId = resolveWhere(where);
        if (!tId) {
          $log('No thermostat configured at this point');
          return;
        }
        if (mode === 'off') {
          $log.debug('Setting thermostat mode to ' + mode);
          return nestAPI.thermostatMode(tId, mode);
        } else {
          return nestAPI.getThermostatInfo(tId).then(function (data) {
            var newMode = 'heat';
            var currentTemperature = data.ambient_temperature_f;
            var targetTemperature = data.target_temperature_f;
            if (currentTemperature > targetTemperature) {
              newMode = 'cool'
            }
            $log.debug('Ambient temperature is ' + currentTemperature);
            $log.debug('Target temperature is ' + targetTemperature);
            $log.debug('New mode is ' + newMode);
            return nestAPI.thermostatMode(tId, newMode);
          });
        }
      }
    }


    var eventActions = {
      userStartedWalking        : enterState('walking'),
      userFinishedWalking       : leaveState('walking'),
      userStartedRunning        : enterState('running'),
      userFinishedRunning       : leaveState('running'),
      userArrivedHomeByRunning  : setTargetTemperature('home', -7),
      userArrivedHomeByWalking  : setTargetTemperature('home', -4),
      userArrivedToWorkByRunning: setTargetTemperature('work', -7),
      userArrivedToWorkByWalking: setTargetTemperature('work', -4),
      userArrivedHome           : setThermostatMode('home', 'on'),
      userArrivedToWork         : setThermostatMode('work', 'on'),
      userLeftWork              : setThermostatMode('work', 'off'),
      userWokeUp                : setThermostatMode('home', 'on'),
      userStartedSleeping       : [enterState('sleeping'), setThermostatMode('home', 'off')]
    };

    var popups = {
      userArrivedHome           : 'Welcome home! Adjusting your Nest…',
      userArrivedHomeByRunning  : 'Welcome home! Your Nest will now cool down your house',
      userArrivedHomeByWalking  : 'Welcome home! Your Nest will now cool down your house',
      userArrivedToWork         : 'Welcome back! Adjusting your work Nest…',
      userArrivedToWorkByRunning: 'Welcome back! Nest will now cool down your workplace',
      userArrivedToWorkByWalking: 'Welcome back! Nest will now cool down your workplace',
      userLeftWork              : 'Au revoir! Putting your work Nest off',
      userWokeUp:                 'Rise and shine! Nest is now on'
    };

    this.getState = function () {
      return state;
    }

    this.handleEvent = function (event) {
      $log.debug('Got event from Neura: ' + event);
      if (eventActions[event]) {
        var eventHandlers = Array.isArray(eventActions[event]) ? eventActions[event] : [eventActions[event]];
        eventHandlers.forEach(function (eventHandler) {
          eventHandler();
        });
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
      var self = this;
      window.NeuraNest.once('connect', function () {
        console.log('connected ok');
        window.NeuraNest.subscribe(neuraPermissions);
        console.log('subscribing');
        window.NeuraNest.on('event', self.handleEvent.bind(self));
      });
      console.log('attemping connect');
      window.NeuraNest.connect();
    }
  });

