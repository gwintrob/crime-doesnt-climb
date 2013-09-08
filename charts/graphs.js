$(document).ready(function(){
    
    // Raw Data
    // --------

    var crimes     = [7928, 2996, 2004, 1424, 354, 149, 128];
    var areas      = [1943, 1479, 1873, 1670, 628, 425, 1177];
    var elevations = [25,   50,   75,   100,  125, 150, 175];

    var elevationLabels = _.map(elevations, function (elevation) {
        return elevation + " meters";
    });

    var normalize = function (array, normalizer) {
        return _.map(array, function (val) {
            return val/normalizer;
        });
    };


    // Crimes per Elevation
    // --------------------

    var dataCrimes = {
        labels : elevationLabels,
        datasets : [
            {
                fillColor : "rgba(151,187,205,0.5)",
                strokeColor : "rgba(151,187,205,1)",
                data : crimes
            }/*,
            {
                fillColor : "rgba(220,220,220,0.5)",
                strokeColor : "rgba(220,220,220,1)",
                data :  normalize(crimesPerArea, crimesPerArea[0])
            }*/
        ]
    };
    
    var ctx = $('canvas#crimes')[0].getContext("2d");
    new Chart(ctx).Bar(dataCrimes);



    // Crimes per Elevation per Land Area
    // ----------------------------------

    var crimesPerArea = _.map(_.range(0, crimes.length), function (index) {
        return crimes[index]/areas[index];
    });

    var dataCrimesPerArea = {
        labels : elevationLabels,
        datasets : [{
            fillColor : "rgba(220,220,220,0.5)",
            strokeColor : "rgba(220,220,220,1)",
            data :  normalize(crimesPerArea, crimesPerArea[0])
        }]
    };
    
    var ctx = $('canvas#crimes-per-area')[0].getContext("2d");
    new Chart(ctx).Bar(dataCrimesPerArea, {
        scaleShowLabels : false
    });

});