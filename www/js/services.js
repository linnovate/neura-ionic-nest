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

    function setTargetTemperature(delta) {
      return function () {
        var thermostateOnFn = setThermostateMode('on');
        thermostateOnFn().then(function () {
          $log.debug('Setting temperature to ' + delta);
          return nestAPI.thermostateTargetTemperature(globalStorage.getThermostateId());
        }).then(function (t) {
          $log.debug('Current temperature is ' + t + ', changing by delta ' + delta);
          nestAPI.thermostateTargetTemperature(
            globalStorage.getThermostateId(),
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

    function setThermostateMode(mode) {
      return function () {
        if (mode === 'off') {
          $log.debug('Setting thermostate mode to ' + mode);
          return nestAPI.thermostateMode(globalStorage.getThermostateId(), mode);
        } else {
          return nestAPI.getThermostateInfo(globalStorage.getThermostateId()).then(function (data) {
            var newMode = 'heat';
            var currentTemperature = data.ambient_temperature_f;
            var targetTemperature = data.target_temperature_f;
            if (currentTemperature > targetTemperature) {
              newMode = 'cool'
            }
            $log.debug('Ambient temperature is ' + currentTemperature);
            $log.debug('Target temperature is ' + targetTemperature);
            $log.debug('New mode is ' + newMode);
            return nestAPI.thermostateMode(globalStorage.getThermostateId(), newMode);
          });
        }
      }
    }


    var eventActions = {
      userStartedWalking: enterState('walking'),
      userFinishedWalking: leaveState('walking'),
      userStartedRunning: enterState('running'),
      userFinishedRunning: leaveState('running'),
      userArrivedHomeByRunning: setTargetTemperature(-7),
      userArrivedHomeByWalking: setTargetTemperature(-4),
      userArrivedHome: setThermostateMode('on'),
      userWokeUp: setThermostateMode('on'),
      userStartedSleeping: [enterState('sleeping'), setThermostateMode('off')]
    };

    var popups = {
      userArrivedHome:          'Welcome home! Adjusting your Nest…',
      userArrivedHomeByRunning: 'Welcome home! Your Nest will now cool down your house',
      userArrivedHomeByWalking: 'Welcome home! Your Nest will now cool down your house',
      userWokeUp:               'Rise and shine! Nest is now on'
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

