/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//function getAccurateLocation(win, fail)
//{
//  if (typeof getAccurateLocation.watchid == 'undefined')
//  {
//      getAccurateLocation.watchid = navigator.geolocation.watchPosition(
//      function(loc) {
//        if (!getAccurateLocation.lastLoc || Math.max(getAccurateLocation.lastLoc.accuracy, 30) > loc.accuracy)
//        {
//          getAccurateLocation.lastLoc = loc;
//        }
//      },
//      function() { }, {frequency: 3000, enableHighAccuracy: true });
//  }
//  setTimeout(function() { if (getAccurateLocation.lastLoc) win(getAccurateLocation.lastLoc);
//             else alert('Sorry, location error #10T occurred.'); }, 4000);
//}

function reportError(payload)
{
    $('a.reportLink', '#errorModal').attr('href', 'mailto:gavin@bpilotglobal.com?subject=Kids%20Kruiser%20Error%20Report&body=' + escape( JSON.stringify(payload) ) );
  $('#errorModal').modal({show: true});
}

function getAccurateLocation(win)
{
  if (typeof getAccurateLocation.watchid == 'undefined')
  {
      getAccurateLocation.watchid = navigator.geolocation.watchPosition(
      function(loc) {
        var LASTACCEPT_AGE = (new Date() / 1000) - (getAccurateLocation.lastAcceptance || (getAccurateLocation.lastAcceptance=new Date() / 1000)); /* Seconds since last update */
        if (
            25 >= loc.coords.accuracy ||
            /* Within 35 meters after 4 seconds */
            (LASTACCEPT_AGE > 4 && 35 >= loc.coords.accuracy ) ||
            /* Within 25 meters after 7 seconds */
            (LASTACCEPT_AGE > 6 && 65 >= loc.coords.accuracy ) ||
            /* Within any range after 9 seconds */
            LASTACCEPT_AGE > 9)

        {
          getAccurateLocation.lastLoc = loc;
          getAccurateLocation.lastAcceptance = new Date()/1000;
        }
      },
      function() { }, {frequency: 3000, enableHighAccuracy: true });
  }

  setTimeout(function()
  {
    if (getAccurateLocation.lastLoc) win(getAccurateLocation.lastLoc);
    else getAccurateLocation(win); /* Wait another 250 milliseconds and try again */
  }, 250);
}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        
        var _settings = JSON.parse(localStorage.getItem('KruiserSettings') || 'null');
        if (_settings)
        {
            app.username = _settings.username;
            app.passwd = _settings.passwd;
            app.whereIsHome = _settings.whereIsHome || 'http://kidskruiser.fasterlocal.com';
            document.getElementById('userBox').value = app.username;
            document.getElementById('passBox').value = app.passwd;
            document.getElementById('homeBox').value = app.whereIsHome;
        }
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // `load`, `deviceready`, `offline`, and `online`.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of `this` is the event. In order to call the `receivedEvent`
    // function, we must explicity call `app.receivedEvent(...);`
    onDeviceReady: function() {
        
        app.receivedEvent('deviceready');
    
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
        
        var dropoffButton = document.getElementById('dropoffButton');
        var pickupButton = document.getElementById('pickupButton');
        
        //dropoffButton.addEventListener('click', this.scanBadge.bind(this, 'dropoff'));
        //pickupButton.addEventListener('click', this.scanBadge.bind(this, 'pickup'));
        
        //dropoffButton.addEventListener('click', function() { alert('Footest'); });


    },
    
getLocation: function(operationType)
    {
 
        document.getElementById('waitsign').style.display = 'block';
        
        var self = this;
        getAccurateLocation(function(locationObj)
        {
          document.getElementById('waitsign').style.display = 'none';
          self.scanBadge(operationType, locationObj);
        });
        
    },
    
    scanBadge: function(operationType, locationObj)
    {
        var self = this;
        try {
            var barcodeScanner = cordova.require("cordova/plugin/BarcodeScanner");
            barcodeScanner.scan(function(result) { self.reportOperationToHQ(operationType, result, locationObj); }, function(reason) { alert("SCAN FAILURE"); alert(reason); });
        }
        catch (err) { alert("ERROR THROWN"); alert(JSON.stringify(err)); alert(err.toString()); }
    },
    
    reportOperationToHQ: function(operationType, result, locationObj)
    {
        if (!app.passwd || !app.username) return alert('Sorry, you must log in.');
        if (!result.cancelled)
        {
          var req = new XMLHttpRequest();

          req.open('POST', [app.whereIsHome /*'http://kidskruiser.fasterlocal.com'*/, 'ActionDo' + operationType].join('/'));
          req.setRequestHeader('Content-Type', 'text/javascript');
          var obj = locationObj.coords;
          obj.passenger = result.text;
          //obj.driver = '3f817a88a73a4587ab592cc5a8cd1e7c';
          obj.username = app.username;
          obj.passwd = app.passwd;
          req.send(JSON.stringify(obj));
          req.onreadystatechange = function()
          {
            if (req.readyState==4 && req.status != 200)
            {
                var errdetail = {httpStatusCode: req.status};
                errdetail.url = [app.whereIsHome, 'ActionDo' + operationType].join('/');
                errdetail.scanText = result.text;
                reportError(errdetail);
            }
            else if (req.readyState==4)
            {
              if (req.responseText=='true') alert('Thank you!');
              else alert('Check that your login credentials are correct and that this passenger is valid!');
            }
          };
        }
    },
    
    storeCredentials: function()
    {
      var form = document.getElementById('appCredentials');
      app.username = document.getElementById('userBox').value;
      app.passwd = document.getElementById('passBox').value;

      app.whereIsHome = document.getElementById('homeBox').value;

      if (!app.username || !app.passwd) return alert('Bad credentials');
      localStorage.setItem('KruiserSettings', JSON.stringify({username: app.username, passwd: app.passwd, whereIsHome: app.whereIsHome}))
      app.toggleScreen();
      return false;
    },
    
    
    toggleScreen: function()
    {
      document.getElementById('appCredentials').style.display = document.getElementById('appCredentials').style.display=='block' ? 'none' : 'block';
      document.getElementById('appHome').style.display = document.getElementById('appHome').style.display=='block' ? 'none' : 'block';
    }
    

};
