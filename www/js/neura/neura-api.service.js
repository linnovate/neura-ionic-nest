angular.module('neura-api', [])
  .constant('neuraAppUid', '59f35dda7a5cc365c5fd9a1a62ddc156e83e0c11aa156c8c8f5a43eefa980d19')
  .constant('neuraAppSecret', 'd1aa36f14ffcdc2908b7ae901bf7c8f403657db2038e460a6b9a0e1aa164ef8b')

  .constant('neuraPermissions', [
    'userStartedRunning',
    'userFinishedWalking',
    'userWokeUp',
    'userStartedSleeping',
    'userFinishedDriving',
    'userStartedDriving',
    'userStartedWalking',
    'userArrivedHome',
    'userLeftHome',
    'userArrivedToWorkByWalking',
    'userArrivedHomeByWalking',
    'userArrivedHomeByRunning',
    'userArrivedToWorkByRunning'
  ])
  /*
   .constant('neuraAppUid', '12abac932242f5d71f16560aadebf9f97c23cc4be9d71e43d6748792d763a849')
   .constant('neuraAppSecret', '1ec478d9ceabe452070bfd0e868fcd4289b891225fd9e5198f5506c2bedbc34b')

   .constant('neuraPermissions', [
   'userWokeUp',
   'userArrivedHome'
   ])*/

  .service('neuraAPI', function ($log, $q, neuraAppUid, neuraAppSecret, neuraPermissions)  {
    var connected = !!localStorage.getItem('neura-connected');

    this.isConnected = function () {
      return connected;
    };


    this.connect = function () {
      var defer = $q.defer();
      window.NeuraNest.authenticate(neuraAppUid, neuraAppSecret, neuraPermissions)
      window.NeuraNest.on('authenticate', function (data) {
        if (data.success) { 
          $log.debug('connected to Neura');
          localStorage.setItem('neura-connected', 1);
          connected = true;
          defer.resolve(true);
        } else {
          defer.reject(false);
        }
      });
      return defer.promise;
    }
  });


