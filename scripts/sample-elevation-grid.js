var fs      = require('fs')
  , _       = require('underscore')
  , csv     = require('csv')
  , request = require('request')
  , async   = require('async');

// We can make batch requests to Google's API up to 30 coordinate pairs at a time
// 50 is too high, complains 414 URI too long...
var batchSize = 30;

var callElevationApiWithLocations = function(locations, callback) {
  var baseUrl = 'http://maps.googleapis.com/maps/api/elevation/json?sensor=false&locations=';

  var locationsParam = _.reduce(locations, function(memo, loc) {
    return memo + '|' + loc[0] + ',' + loc[1];
  }, '');

  var url = baseUrl + locationsParam.substring(1);

  request.get({url: url, json: true}, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body.status);
      var elevations = _.map(body.results, function(result) {
        return result.elevation;
      });
      callback(elevations);
    } else {
      console.log(response);
    }
  });
};

// Create the grid to sample on...
var initialLat = 37.735121;
var initialLong = -122.469749;
var finalLat = 37.804596;
var finalLong = -122.405891;

var latStep = (finalLat - initialLat) / 100.0;
var longStep = (finalLong - initialLong) / 100.0;
var latArray = _.range(initialLat, finalLat, latStep);
var longArray = _.range(initialLong, finalLong, latStep);
var data = [];
_.each(latArray, function(latValue) {
  _.each(longArray, function(longValue) {
    data.push([latValue, longValue]);
  });
});

// Get the elevations for each point on the grid.
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
          var startIndex = groupIndex * batchSize;
          for (var i = 0; i < elevations.length; i++) {
            console.log(startIndex+i, data.length);
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
    .to.stream(fs.createWriteStream(__dirname + '/areaElevation.out'));
});
