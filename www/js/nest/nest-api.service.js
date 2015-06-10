angular.module('nest-api', [])
  .constant('nestClientId', 'ee211324-956d-4ab6-8a89-25d86778e68d')
  .constant('nestClientSecret', '5AIffjalX3poKVmMYhwkv1OOj')
  .service('nestAPI', function ($interval, $q, $http, nestClientId, nestClientSecret, $log) {
    var intervalId;

    var self = this;

    this.getToken = function () {
      return localStorage.getItem('nestToken');
    };


    this.getThermostates = function () {
      var token = self.getToken();
      if (!token) {
        throw new Error('No token');
      }

      var url = [
        'https://developer-api.nest.com/devices/thermostats',
        '?auth=' + token
      ].join('');
      return $http.get(url).then(function (response) {
          var result = [];
          angular.forEach(response.data, function (item) {
            result.push(item);
          });
          return result;
        }
      );
    };

    function fieldGetterSetter(id, field, value) {
      var token = self.getToken();
      if (!token) {
        throw new Error('No token');
      }

      if (value) {
        $log.debug('Setting value ' + field + ' for thermostate ' + id + ' to ' + value);
      } else {
        $log.debug('Querying value ' + field + ' for thermostate ' + id);
      }

      var url = [
        'https://developer-api.nest.com/devices/thermostats',
        '/' + id,
        '/' + field,
        '?auth=' + token
      ].join('');

      return $http[value ? 'put' : 'get'](url, value).then(function (response) {
        $log.debug('Result ' + response.data);
        return response.data;
      });
    }

    this.getThermostateInfo = function (id)  {
      var token = self.getToken();
      if (!token) {
        throw new Error('No token');
      }

      $log.debug('Querying info for thermostate ' + id);

      var url = [
        'https://developer-api.nest.com/devices/thermostats',
        '/' + id,
        '?auth=' + token
      ].join('');

      return $http.get(url).then(function (response) {
        $log.debug('Got Result');
        return response.data;
      });
    };



    this.thermostateTargetTemperature = function (id, newT) {
      return fieldGetterSetter(id, 'target_temperature_f', newT);
    };

    this.thermostateMode = function (id, newMode) {
      if (newMode) {
        newMode = '"' + newMode + '"';
      }

      return fieldGetterSetter(id, 'hvac_mode', newMode);
    };




    this.authorize = function () {
      return this.getPin().then(this.exchangePinForToken).then(function (token) {
        localStorage.setItem('nestToken', token);
        return token;
      });
    };

    this.exchangePinForToken = function (pin) {
      var url = [
        'https://api.home.nest.com/oauth2/access_token',
        '?client_id=' + nestClientId,
        '&client_secret=' + nestClientSecret,
        '&grant_type=authorization_code',
        '&code=' + pin
      ].join('');

      return $http.post(url).then(function (response) {
        return response.data.access_token;
      });
    };

    this.getPin = function () {
      var defer = $q.defer();
      var success = false;
      var inAppWindow = window.open(
        'https://home.nest.com/login/oauth2?client_id=' + nestClientId + '&state=STATE',
        '_blank',
        'location=no'
      );
      var checker = function () {
        inAppWindow.executeScript({
          code: '(document.querySelector("div.pincode") || {}).innerText'
        }, function (c) {
          c = c.toString();
          if (c.length > 0) {
            success = true;
            defer.resolve(c);
            inAppWindow.close();
          }
        });
      };
      inAppWindow.addEventListener('loadstop', function () {
        intervalId = $interval(checker, 1000);
      });
      inAppWindow.addEventListener('exit', function () {
        console.log('closing');
        if (intervalId) {
          $interval.cancel(intervalId);
        }
        if (!success) {
          defer.reject("No result");
        }
        intervalId = $interval(checker, 1000);
      });
      return defer.promise;
    };
  });


