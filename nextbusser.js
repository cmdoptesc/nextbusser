/*
  nextBusser is a JavaScript library to query the NextBus API and parse
  the resulting XML data. Callbacks can be provided to the functions, or they
  will return a basic jQuery promise that will have the methods .then(),
  .done(), and .fail().

  An early version of nextBusser was used for my muniNow app:
    demo: http://bl.ocks.org/cmdoptesc/raw/6224455/
    git: http://github.com/cmdoptesc/muninow

  - al lin, sep 2013

  MIT, do as you will license..
*/

var makeNextBusser = function(agencyTag, userOptions) {

  var apiUrl = 'http://webservices.nextbus.com/service/publicXMLFeed';
  var stopIdLength = 5;

    // cribbed from _underscore
    //  if the browser does *not* interpret regexes (non-functions) as functions, use the typeof method,
    //  otherwise use the slower, but surer way
  var _isFunction = function(obj) {
    return (typeof (/./) !== 'function') ? (typeof obj === 'function') : (Object.prototype.toString.call(obj) === '[object Function]');
  };

  var _isArray = function(obj) {
    return (typeof Array.isArray !== 'undefined') ? Array.isArray(obj) : (Object.prototype.toString.call(obj) === '[object Array]');
  };

  var _findTag = function(obj, keys) {
    if(typeof obj === 'string') { return obj; }
    if(typeof obj === 'object') {
      for(var i=0; i<keys.length; i++) {
        if(obj.hasOwnProperty(keys[i]) && typeof obj[keys[i]] === 'string') {
          return obj[keys[i]];
        }
      }
      return false;
    }
    return false;
  };

  var nb = {

    cache: {},
    agencyTag: '',
    _options: {
      cache: true
    },

      // basic nextbus query, check the Nextbus PDF for commands & options
      //  http://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf
    getNextbus: function(query, callback) {
      return $.get(apiUrl, query, function(xml){
          callback.call(null, xml);
      });
    },

    hasError: function(xml) {
      var errorMsg = '';
      $(xml).find("body > Error").each(function(indx, err){
        errorMsg = $(err).text().trim();
      });
      return (errorMsg.length > 0) ? errorMsg : false;
    },

      // parse agencyList: http://webservices.nextbus.com/service/publicXMLFeed?command=agencyList
    parseXMLagencyList: function(xml, callback) {
      var agencies = [];
      var $agency, agency = {};

      $(xml).find("body > agency").each(function(indx, ag){
        var $agency = $(ag);
        agency = {
          agencyTag: $agency.attr('tag'),
          title: $agency.attr('title'),
          regionTitle: $agency.attr('regionTitle')
        };
        agencies.push(agency);
      });
      return callback ? callback(agencies) : agencies;
    },

      // parse routeList: http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=sf-muni
    parseXMLrouteList: function(xml, callback) {
      var routes = [];
      var $rt, route = {};

      $(xml).find("body > route").each(function(indx, rt){
        $rt = $(rt);
        route = {
          routeTag: $rt.attr('tag'),
          title: $rt.attr('title')
        };
        routes.push(route);
      });
      return callback ? callback(routes) : routes;
    },

      // parse routeConfig: http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=sf-muni&r=J
      // then passing it to a callback or as an object with keys `stopsInfo` and `directions`
    parseXMLrouteConfig: function(xml, callback) {
      var directions = {};
      var $dir, dirTag;

      $(xml).find('direction').each(function(indx, dir){
        $dir = $(dir);
        dirTag = $dir.attr('tag');
        directions[dirTag] = {
          title : $dir.attr('title'),
          name : $dir.attr('name'),
          dirTag: dirTag,
          stops : []
        };
        $dir.find('stop').each(function(indx, stop) {
          directions[dirTag].stops.push($(stop).attr('tag'));
        });
      });

      var $route = $(xml).find("body > route");

      var stopsInfo = {
        routeTag: $route.attr('tag'),
        title: $route.attr('title'),
        color: $route.attr('color'),
        oppositeColor: $route.attr('oppositeColor')
      };

      var $stop, stopTag;

      $(xml).find("body route > stop").each(function(indx, stop) {
        $stop = $(stop);
        stopTag = $stop.attr('tag');
        stopsInfo[stopTag] = {
          title : $stop.attr('title'),
          lat : $stop.attr('lat'),
          lon : $stop.attr('lon'),
          stopId : $stop.attr('stopId')
        };
      });

      return callback ? callback(stopsInfo, directions) : {stopsInfo:stopsInfo, directions:directions};
    },

      // parses predictions for individual *and* multiple stops:
      //  http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=sf-muni&r=5&s=5684
      //  http://webservices.nextbus.com/service/publicXMLFeed?command=predictionsForMultiStops&a=sf-muni&stops=5|5684&stops=38|5684&stops=38|5689
      //  returns an object of stops of routes with an array of prediction objects:
      /*    {
              stopTag: {
                routeTag: [
                  {
                    dirTag: direction info,
                    seconds: time to stop in seconds,
                    vehicle: vehicle id,
                    stopTag: stop tag again,
                    routeTag: route tag again
                  }
                ]
              }
            }
      */
    parseXMLpredictions: function(xml, callback) {
      var allPredictions = {};
      var $pr, prediction;
      var $rt, routeTag, stopTag;

      $(xml).find('body > predictions').each(function(indx, rt){
        $rt = $(rt);
        routeTag = $rt.attr('routeTag');
        stopTag = $rt.attr('stopTag');

        var routePredictions = [];
        $(rt).find('prediction').each(function(indx, pr) {
          $pr = $(pr);
          prediction = {
            routeTag: routeTag,
            stopTag: stopTag,
            seconds: $pr.attr('seconds'),
            vehicle: $pr.attr('vehicle'),
            dirTag: $pr.attr('dirTag')
          };
          routePredictions.push(prediction);
        });
        if(typeof allPredictions[stopTag] === 'undefined') { allPredictions[stopTag] = {}; }
        allPredictions[stopTag][routeTag] = routePredictions;
      });

      return callback ? callback(allPredictions) : allPredictions;
    },

      // does the same parsing as above (parseXMLpredictions), but returns
      //  a one-dimensional array of prediction objects, instead.
      //  object has the same keys: dirTag, seconds, vehicle, stopTag, routeTag
    parseXMLpredictionsFlat: function(xml, callback) {
      var predictions = [];
      var $pr, prediction;
      var $rt, routeTag, stopTag;

      $(xml).find('body > predictions').each(function(indx, rt){
        $rt = $(rt);
        routeTag = $rt.attr('routeTag');
        stopTag = $rt.attr('stopTag');

        $(rt).find('prediction').each(function(indx, pr) {
          $pr = $(pr);
          prediction = {
            routeTag: routeTag,
            stopTag: stopTag,
            seconds: $pr.attr('seconds'),
            vehicle: $pr.attr('vehicle'),
            dirTag: $pr.attr('dirTag')
          };
          predictions.push(prediction);
        });
      });

      return callback ? callback(predictions) : predictions;
    },

      // retrieves the list of agencies Nextbus supports
      //  returns an array of objects with keys: agencyTag, title, regionTitle
    agencyList: function(callback) {
      var deferred = new $.Deferred();
      nb.getNextbus({command: 'agencyList'}, function(xml){
        var errorMsg = nb.hasError(xml);
        if(errorMsg) {
          deferred.reject(errorMsg);
        } else {
          var agencies = nb.parseXMLagencyList(xml);
          deferred.resolve(agencies);
          if(callback && _isFunction(callback)) { callback(agencies); }
        }
      })
      .fail(function(){
        deferred.reject();
      });
      return deferred.promise();
    },

      // retrieves the list of routes for a particular agency
    routeList: function(agencyQuery, callback) {
      var deferred = new $.Deferred();
      var agencyTag;

        // checking inputs
      if(_isFunction(agencyQuery) && typeof callback === 'undefined') {
        callback = agencyQuery;
        agencyTag = nb.agencyTag;
      } else {
        agencyTag = _findTag(agencyQuery, ['a', 'agencyTag', 'agency']) || nb.agencyTag;
      }

        // checking and using cache if agency has been looked up
      if(nb._options.cache && typeof nb.cache[agencyTag] !== 'undefined' && nb.cache[agencyTag].routeList) {
        if(callback && _isFunction(callback)) { callback(nb.cache[agencyTag].routeList); }
        deferred.resolve(nb.cache[agencyTag].routeList);
      } else {
        // else look up the route list
        var query = {
          command: 'routeList',
          a: agencyTag
        };

        nb.getNextbus(query, function(xml){
          var errorMsg = nb.hasError(xml);
          if(errorMsg) {
            deferred.reject(errorMsg);
          } else {
            var routes = nb.parseXMLrouteList(xml);
              // cache this info
            if(typeof nb.agencyTag === 'undefined') { nb.agencyTag = agencyTag; }
            if(nb._options.cache && typeof nb.cache[agencyTag] === 'undefined') {
              nb.cache[agencyTag] = {};
              nb.cache[agencyTag].routeList = routes;
            }

            if(callback && _isFunction(callback)) { callback(routes); }
            deferred.resolve(routes);
          }
        })
        .fail(function() {
          deferred.reject();
        });
      }

      return deferred.promise();
    },

    routeConfig: function(routeQuery, callback) {
      var deferred = new $.Deferred();

      var routeTag, agencyTag;
      if(typeof routeQuery === 'string') {
        routeTag = routeQuery;
        agencyTag = nb.agencyTag;
      } else {
        routeTag = _findTag(routeQuery, ['r', 'routeTag', 'route']);
        agencyTag = _findTag(routeQuery, ['a', 'agencyTag', 'agency']);
      }

      if(nb._options.cache && typeof nb.cache[agencyTag] !== 'undefined' && typeof nb.cache[agencyTag][routeTag] !== 'undefined') {
        if(callback && _isFunction(callback)) { callback(nb.cache[agencyTag][routeTag]); }
        deferred.resolve(nb.cache[agencyTag][routeTag]);
      } else {
        var query = {
          command: 'routeConfig',
          a: agencyTag,
          r: routeTag
        };
        nb.getNextbus(query, function(xml){
          var errorMsg = nb.hasError(xml);
          if(errorMsg) {
            deferred.reject(errorMsg);
          } else {
            if(typeof nb.agencyTag === 'undefined') { nb.agencyTag = agencyTag; }

            var routeInfo = nb.parseXMLrouteConfig(xml);
            if(nb._options.cache) {
              if(typeof nb.cache[agencyTag] === 'undefined') { nb.cache[agencyTag] = {}; }
              nb.cache[agencyTag][routeTag] = routeInfo;
            }
            if(callback && _isFunction(callback)) { callback(routeInfo); }
            deferred.resolve(routeInfo);
          }
        })
        .fail(function() {
          deferred.reject();
        });
      }

      return deferred.promise();
    },

    predictions: function(prQuery, callback) {
      var deferred = new $.Deferred();

      var query = { command: 'predictions' };
      if(typeof prQuery === 'number') { prQuery += ''; }
      if(typeof prQuery === 'string' && prQuery.length === stopIdLength) {
        query.stopId = prQuery;
        query.a = nb.agencyTag;
      } else if(typeof prQuery === 'object') {
        if(prQuery.hasOwnProperty('stopId')) {
          query.stopId = prQuery.stopId;
          query.a = nb.agencyTag;
        } else {
          query.s = _findTag(prQuery, ['s', 'stopTag', 'stop']);
          query.r = _findTag(prQuery, ['r', 'routeTag', 'route']);
          query.a = _findTag(prQuery, ['a', 'agencyTag', 'agency']) || nb.agencyTag;
        }
      }

      nb.getNextbus(query, function(xml){
        var errorMsg = nb.hasError(xml);
        if(errorMsg) {
          deferred.reject(errorMsg);
        } else {
          var predictions = nb.parseXMLpredictions(xml);
          if(callback && _isFunction(callback)) { callback(predictions); }
          deferred.resolve(predictions);
        }
      })
      .fail(function() {
        deferred.reject();
      });

      return deferred.promise();
    },

      // needed a custom query function since the query URL reuses the "stops" key
      // stopsArray is an array of stop objects in the format: {r: route tag, s: stop tag}
    getPredictionsMulti: function(agency, stopsArray, callback) {
      var stopsQuery = '';
      for(var i=0; i<stopsArray.length; i++) {
        stopsQuery += '&stops='+ stopsArray[i].r +'|'+ stopsArray[i].s;
      }

      var reqUrl = apiUrl + '?command=predictionsForMultiStops&a=' + agency + stopsQuery;

      return $.get(reqUrl, function(xml){
        callback.call(null, xml);
      });
    },

    predictionsMulti: function(prQuery, callback) {
      var deferred = new $.Deferred();

      var agency, stopsArray = [];
      if(_isArray(prQuery)) {
        agency = nb.agencyTag;
        stopsArray = prQuery;
      } else if( typeof prQuery === 'object' && prQuery.hasOwnProperty('stops') ) {
        agency = _findTag(prQuery, ['a', 'agencyTag', 'agency']) || nb.agencyTag;
        stopsArray = prQuery.stops;
      }

      nb.getPredictionsMulti(agency, stopsArray, function(xml) {
        var errorMsg = nb.hasError(xml);
        if(errorMsg) {
          deferred.reject(errorMsg);
        } else {
          var predictions = nb.parseXMLpredictions(xml);
          if(callback && _isFunction(callback)) { callback(predictions); }
          deferred.resolve(predictions);
        }
      })
      .fail(function() {
        deferred.reject();
      });

      return deferred.promise();
    },


    setAgency: function(agencyTag) {
      if(typeof agencyTag === 'string') {
        nb.agencyTag = agencyTag;
      } else if(agencyTag.hasOwnProperty('a') || agencyTag.hasOwnProperty('agencyTag')) {
        nb.agencyTag = agencyTag.a || agencyTag.agencyTag;
      }
    }
  };

  if(typeof agencyTag === 'string') {
    nb.setAgency(agencyTag);
  } else if(typeof userOptions === 'undefined') {
    userOptions = agencyTag;
  }
  if(typeof userOptions !== 'undefined' && Object.prototype.toString.call(userOptions) === '[object Object]') {
    for(var key in nb._options) {
      if(typeof userOptions[key] !== 'undefined') {
        nb._options[key] = userOptions[key];
      }
    }
  }

  return nb;
};