var fs      = require('fs')
  , _       = require('underscore')
  , csv     = require('csv')
  , request = require('request')
  , async   = require('async');

// We can make batch requests to Google's API up to 30 coordinate pairs at a time
// 50 is too high, complains 414 URI too long...
var batchSize = 30;

var addElevationsToCrimeData = function(data) {
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
        .to.stream(fs.createWriteStream(__dirname + '/sample.out'));
  });
};


var callElevationAPIWithLocations = function(locations, callback) {
  var baseUrl = 'http://maps.googleapis.com/maps/api/elevation/json?sensor=false&locations=';

  var locationsParam = _.reduce(locations, function(memo, loc) {
    return memo + '|' + loc[0] + ',' + loc[1];
  }, '');

  var url = baseUrl + locationsParam.substring(1);

  request.get({url: url, json: true, headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.28 Safari/537.36'}}, function(error, response, body) {
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

// Load in the CSV of crimes and run the script
csv()
  .from.path(__dirname + '../data/sfpd_incident_2013-partial.csv', { delimiter: ',', escape: '"' })
  .to.array(addElevationsToCrimeData);

