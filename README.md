Crime Doesn't Climb
==================
![Animated GIF of crime at decreasing elevation in San Francisco](https://dl.dropboxusercontent.com/u/34372/crime-doesnt-climb/crime-per-elevation-level.gif)

Among San Francisco's diverse neighborhoods and varied micro-climates, we've heard the phrase "Crime Doesn't Climb," meaning that the city's loftier areas are often associated with less crime.  San Francisco, sometimes refered to as the ["homeless capital of the United States"][homelessness], ranks in the bottom [10% of safest cities](http://www.neighborhoodscout.com/ca/san-francisco/crime/ "SF Crime") in the country (New York City is nearly [three times safer](http://www.neighborhoodscout.com/ny/new-york/crime/ "NYC Crime")).  Although certain neighborhoods (e.g. the Tenderloin) (http://en.wikipedia.org/wiki/Tenderloin,_San_Francisco#Crime) have particularly high crime rates, we wondered if there was more granular data that could answer the question: does crime climb?

We used the [DataSF](https://data.sfgov.org/ "DataSF") repository, part of the Mayor's [2.0 City initiative](http://techcrunch.com/2012/03/09/san-francisco-open-data/ "TechCrunch 2.0 City") to tap into local innovation.  The site includes a [CSV file](https://data.sfgov.org/Public-Safety/SFPD-Reported-Incidents-2003-to-Present/dyj4-n68b) of all reported SFPD incidents since 2003.  Of the 83,991 incidents in 2013 (we pulled the data on 9/7 at 2:00pm), we selected the most recent 15,000.  These crimes ranged from 7,691 "Grand Theft from Locked Auto" incdents to 610 cases of drunkenness.  The incidents are tagged with latitude/longitude information and we used the [Google Elevation API](https://developers.google.com/maps/documentation/elevation/ "Google Elevation API") to translate to height in meters.  Here's the script that reads the incident CSV file:

```javascript
var fs = require('fs');
var csv = require('csv');
var _ = require('underscore');
var request = require('request');
var async = require('async');

var batchSize = 50;

csv()
  .from.path(__dirname + '/sfpd_incident_2013-partial.csv', { delimiter: ',', escape: '"' })
  .to.array( function(data) {
    var locations = [];
    var elevationFunctions = _.chain(data.slice(1))
      .groupBy(function(row, index) {
        return Math.floor(index / batchSize);
      })
      .map(function(dataGroup, groupIndex) {
          var locations = _.map(_.values(dataGroup), function(row) {
            return [row[10], row[9]];
          });

          return function (callback) {
            callElevationApiWithLocations(locations, function(elevations) {
              var startIndex = groupIndex * batchSize + 1;
              for (var i = 0; i < elevations.length; i++) {
                data[startIndex + i].push(elevations[i]);
              }
              setTimeout(callback, 200);
            });
          };
      })
      .value();

    async.series(elevationFunctions, function(err, results) {
        csv()
          .from.array(data)
          .to.stream(fs.createWriteStream(__dirname + '/incidentsWithElevation.csv'));
    });
  });
```

Here's the code snippet that queries the Google Elevation API (careful--Google rate limits agressively):

```javascript
var callElevationApiWithLocations = function(locations, callback) {
  var baseUrl = 'http://maps.googleapis.com/maps/api/elevation/json?sensor=false&locations=';

  var locationsParam = _.reduce(locations, function(memo, loc) {
    return memo + '|' + loc[0] + ',' + loc[1];
  }, '');

  var url = baseUrl + locationsParam.substring(1);

  request.get({url: url, json: true}, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var elevations = _.map(body.results, function(result) {
        return result.elevation;
      });
      callback(elevations);
    }
  });
};
```

[CartoDB](http://cartodb.com/ "CartoDB") lets you quickly slice-and-dice geospatial data and easily display it on a map.  We segmented the data into incidents at 25 meter intervals (see the charts folder for more details) and found that crime levels drop off sharply at higher elevations:

![San Francisco crime per elevation level](https://dl.dropboxusercontent.com/u/34372/crime-doesnt-climb/crimes-per-elevation-level.png)

One flaw in this analysis is that it could be a byproduct of the fact that there is less land mass in the city at these higher altitudes.  In other words, if 90% of the city is at an elevation less than 25m, then 90% of the crime would occur at those lower altitudes, assuming an even distribution of incidents.  To correct for this problem, we took a distributed sample of 10,000 locations in San Francisco and divided the number of incidents in each elevation range by the number of locations in that bucket.  We manually selected latitude and longitude points to define San Francisco as a grid and created a CSV of latitude, longitude, elevation triplets:

```javascript
var initialLat = 37.735121;
var initialLong = -122.469749;
var finalLat = 37.804596;
var finalLong = -122.405891;

var latStep = (finalLat - initialLat) / 5.0;
var longStep = (finalLong - initialLong) / 5.0;
var latArray = _.range(initialLat, finalLat, latStep);
var longArray = _.range(initialLong, finalLong, latStep);
var data = [];
_.each(latArray, function(latValue) {
  _.each(longArray, function(longValue) {
    data.push([latValue, longValue]);
  });
});

var elevationFunctions = _.chain(data)
  .groupBy(function(row, index) {
    return Math.floor(index / batchSize);
  })
  .map(function(dataGroup, groupIndex) {
      var locations = _.map(_.values(dataGroup), function(row) {
        return row;
      });

      return function (callback) {
        callElevationApiWithLocations(locations, function(elevations) {
          var startIndex = groupIndex * batchSize + 1;
          for (var i = 0; i < elevations.length; i++) {
            data[startIndex + i].push(elevations[i]);
          }
          setTimeout(callback, 200);
        });
      };
  })
  .value();

async.series(elevationFunctions, function(err, results) {
  csv()
    .from.array(data)
    .to.stream(fs.createWriteStream(__dirname + '/elevationSample.csv'));
});
```

When normalizing for land mass at different elevations, we found that the trend of lower crime at higher elevations was even more drastic:

![San Francisco crime per elevation level per land area](https://dl.dropboxusercontent.com/u/34372/crime-doesnt-climb/crimes-per-elevation-level-per-land-area.png)

[homelessness]: http://en.wikipedia.org/wiki/Homelessness_in_the_United_States#cite_note-SFPTACH-112 "Homelessness in the US"




