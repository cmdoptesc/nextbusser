describe("nextBusser", function() {
  var settings = {};
  settings.agencyTag = 'sf-muni';
  settings.routeTag = 5;
  settings.stopTag = '5684';
  settings.stopId = 15684;
  settings.routeTag2 = '38';
  settings.stopTag2 = '5684';
  settings.routeTagStr = settings.routeTag + '';
  settings.stopTagStr = settings.stopTag + '';
  settings.routeTag2Str = settings.routeTag2 + '';

  describe("should have the methods: agencyList, routeList, routeConfig, predictions, predictionsMulti", function() {
    var nb = makeNextBusser();

    var methods = ['agencyList', 'routeList', 'routeConfig', 'predictions', 'predictionsMulti'];
    for(var i=0; i<methods.length; i++) {
      var method = methods[i];
      it(method +'()', function() {
        expect(nb).to.have.property(method);
        expect(typeof nb[method]).to.equal('function');
      });
    }
  });

  describe("Options", function() {
    it("should have caching set to true by default", function() {
      var noArgs = makeNextBusser();
      expect(noArgs._options.cache).to.equal(true);
    });
    it("should be accepted as the first argument when instantiating", function() {
      var nb1 = makeNextBusser({cache: false});
      expect(nb1._options.cache).to.equal(false);
    });
    it("should be accepted as the second argument when instantiating", function() {
      var nb2 = makeNextBusser(settings.agencyTag, {cache: false});
      expect(nb2._options.cache).to.equal(false);
    });
  });

  describe("agencyList()", function() {
    var nb = makeNextBusser();
    var promise;

    it("should return a promise", function() {
      promise = nb.agencyList();
      expect(promise).to.contain.keys('then','done','fail');
    });

    it("should pass to the promise an array of transit agencies (objects)", function(done) {
      promise.done(function(agencies) {
        expect(agencies).to.be.instanceof(Array);
        expect(agencies).to.have.length.of.at.least(1);
        expect(agencies[0]).to.be.instanceof(Object);
        done();
      });
    });

    it("should also accept a callback function and pass it the array of transit agencies", function(done) {
      nb.agencyList(function(agencyArray) {
        expect(agencyArray).to.be.instanceof(Array);
        expect(agencyArray).to.have.length.of.at.least(1);
        expect(agencyArray[0]).to.be.instanceof(Object);
        done();
      });
    });
  });

  describe("routeList()", function() {
    var nb = makeNextBusser(settings.agencyTag);
    var promise;

    it("should return a promise", function() {
      promise = nb.routeList();
      expect(promise).to.contain.keys('then','done','fail');
    });
    it("should pass to the promise an array of routes (objects) for a specified agency", function(done) {
      promise.done(function(routes) {
        expect(routes).to.be.instanceof(Array);
        expect(routes).to.have.length.of.at.least(1);
        expect(routes[0]).to.be.instanceof(Object);
        done();
      });
    });
    it("should also accept a callback function and pass it the array of routes", function(done) {
      nb.routeList(function(routeArray) {
        expect(routeArray).to.be.instanceof(Array);
        expect(routeArray).to.have.length.of.at.least(1);
        expect(routeArray[0]).to.be.instanceof(Object);
        done();
      });
    });

    describe("caching", function() {
      var nb1 = makeNextBusser(settings.agencyTag);
      var callbackRoutes;
      var cacheRoutes;
      before(function(done) {
        nb1.routeList(function(routes) {
          callbackRoutes = routes;
          cacheRoutes = nb1.cache[settings.agencyTag].routeList;
          done();
        });
      });

      describe("should cache the route listings for an agency if the cache option is set to true", function() {
        it("cache is set to true", function() {
          expect(nb1._options.cache).to.equal(true);
        });
        it("the cached routes list is stored under an agencyTag key on the cache", function() {
          expect(nb1.cache).to.contain.keys(settings.agencyTag);
          expect(nb1.cache).to.contain.not.keys('blahblahblahbalh');
          expect(nb1.cache[settings.agencyTag]).to.contain.keys('routeList');
        });
        it("the cached routes list and the callback routes list are both arrays", function() {
          expect(cacheRoutes).to.be.instanceof(Array);
          expect(callbackRoutes).to.be.instanceof(Array);
        });
        it("the number of elements in the cached routes list is equal to the routes passed to the callback", function() {
          expect(cacheRoutes.length).to.equal(callbackRoutes.length);
        });
        it("the first item in the cache is the same as the first item passed to the callback", function() {
          expect(cacheRoutes).to.have.length.of.at.least(1);
          expect(callbackRoutes).to.have.length.of.at.least(1);
          expect(JSON.stringify(cacheRoutes[0])).to.equal(JSON.stringify(callbackRoutes[0]));
        });
      });

      describe("should use the cache the second time routeList() is called for the same agency", function() {
        it("promise should be passed a value from the cache", function(done) {
          nb1.cache[settings.agencyTag].routeList[3] = 'promise_test';
          
          var promise = nb1.routeList();
          promise.done(function(list) {
            expect(list[3]).to.equal('promise_test');
            done();
          });
        });
        it("callback should be passed a value from the cache", function(done) {
          var oldval0 = JSON.stringify(nb1.cache[settings.agencyTag].routeList[0]);
          var oldval1 = JSON.stringify(nb1.cache[settings.agencyTag].routeList[1]);
          nb1.cache[settings.agencyTag].routeList[0] = 'flagged_for_test';

          nb1.routeList(function(routes) {
            expect(JSON.stringify(routes[0])).to.not.equal(oldval0);
            expect(routes[0]).to.equal('flagged_for_test');
            expect(routes[1]).to.not.equal('flagged_for_test');
            expect(JSON.stringify(routes[1])).to.equal(oldval1);
            done();
          });
        });
      });

      describe("should not store anything on the cache if the cache option is set to false", function() {
        var nb2 = makeNextBusser(settings.agencyTag, {cache: false});

        it("cache is set to false", function() {
          expect(nb2._options.cache).to.equal(false);
        });
        it("nothing is stored to the cache", function(done) {
          expect(nb2.cache).to.be.empty;

          nb2.routeList(function(routes) {
            expect(nb2.cache).to.be.empty;
            expect(nb2.cache).to.not.contain.keys(settings.agencyTag);
            done();
          });
        });
        it("still passes a value (the array of routes) to the promise, while not caching", function(done) {
          var promise2 = nb2.routeList();
          promise2.done(function(routes) {
            expect(nb2.cache).to.be.empty;
            expect(routes).to.be.instanceof(Array);
            expect(routes).to.have.length.of.at.least(1);
            done();
          });
        });
        it("still passes a value to the callback", function(done) {
          nb2.routeList(function(routesCallback) {
            expect(nb2.cache).to.be.empty;
            expect(routesCallback).to.be.instanceof(Array);
            expect(routesCallback).to.have.length.of.at.least(1);
            done();
          });
        });
      });
    });
  });

  describe("routeConfig()", function() {
    var nb = makeNextBusser(settings.agencyTag);
    var promise;

    it("should return a promise", function() {
      promise = nb.routeConfig(settings.routeTag);
      expect(promise).to.contain.keys('then','done','fail');
    });

    it('should pass to the promise an object representing the route information with keys "stopsInfo" and "directions"', function(done) {
      promise.done(function(routeInfo) {
        expect(routeInfo).to.be.instanceof(Object);
        expect(routeInfo).to.contain.keys('stopsInfo','directions');
        expect(routeInfo.stopsInfo).to.be.instanceof(Object);
        expect(Object.keys(routeInfo.stopsInfo).length).to.be.at.least(3);
        expect(routeInfo.stopsInfo).to.contain.keys('routeTag','title');
        done();
      });
    });

    it('should also accept a callback function and pass it the object containing route information', function(done) {
      nb.routeConfig(settings.routeTag, function(routeInfoCb) {
        expect(routeInfoCb).to.be.instanceof(Object);
        expect(routeInfoCb).to.contain.keys('stopsInfo','directions');
        expect(routeInfoCb.stopsInfo).to.be.instanceof(Object);
        expect(Object.keys(routeInfoCb.stopsInfo).length).to.be.at.least(3);
        expect(routeInfoCb.stopsInfo).to.contain.keys('routeTag','title');
        expect(routeInfoCb.directions).to.be.instanceof(Object);
        expect(Object.keys(routeInfoCb.directions).length).to.be.at.least(1);
        done();
      });
    });

    it("should accept an object with keys 'r' and 'a' representing route and agency for its route arguments", function(done) {
      nb.routeConfig({r: settings.routeTag, a: settings.agencyTag}, function(routeInfoCb) {
        expect(routeInfoCb).to.be.instanceof(Object);
        expect(routeInfoCb).to.contain.keys('stopsInfo','directions');
        done();
      });
    });
    it("should accept an object with only key 'r' for its route argument if the agency has already been set", function(done) {
      nb.setAgency(settings.agencyTag);
      nb.routeConfig({r: settings.routeTag}, function(routeInfoCb) {
        expect(routeInfoCb).to.be.instanceof(Object);
        expect(routeInfoCb).to.contain.keys('stopsInfo','directions');
        done();
      });
    });
    it('should also accept numbers for its route arguments if the agency has already been set', function(done) {
      nb.setAgency(settings.agencyTag);
      nb.routeConfig(settings.routeTagStr, function(routeInfoCb) {
        expect(routeInfoCb).to.be.instanceof(Object);
        expect(routeInfoCb).to.contain.keys('stopsInfo','directions');
        done();
      });
    });
    it('should also accept strings for its route arguments if the agency has already been set', function(done) {
      nb.setAgency(settings.agencyTag);
      nb.routeConfig(settings.routeTagStr, function(routeInfoCb) {
        expect(routeInfoCb).to.be.instanceof(Object);
        expect(routeInfoCb).to.contain.keys('stopsInfo','directions');
        done();
      });
    });

    describe("caching", function() {
      var nb1 = makeNextBusser(settings.agencyTag);
      var callbackRouteInfo;
      var cacheRouteInfo;
      before(function(done) {
        nb1.routeConfig(settings.routeTag, function(routeInfo) {
          callbackRouteInfo = routeInfo;
          cacheRouteInfo = nb1.cache[settings.agencyTag][settings.routeTag];
          done();
        });
      });

      describe("should cache the route information if the cache option is set to true", function() {
        it("cache is set to true", function() {
          expect(nb1._options.cache).to.equal(true);
        });
        it("the cached route list is stored under the agencyTag, then routeTag on the cache", function() {
          expect(nb1.cache).to.contain.keys(settings.agencyTag);
          expect(nb1.cache).to.contain.not.keys(settings.routeTag);
          expect(nb1.cache[settings.agencyTag]).to.contain.keys(settings.routeTagStr);
          expect(nb1.cache[settings.agencyTag][settings.routeTag]).to.contain.keys('stopsInfo','directions');
        });
        it("the cached route list and the callback route list are both objects", function() {
          expect(cacheRouteInfo).to.be.instanceof(Object);
          expect(callbackRouteInfo).to.be.instanceof(Object);
        });
        it("the object in the cache has the same keys as the object passed to the callback", function() {
          expect(cacheRouteInfo).to.contain.keys('stopsInfo','directions');
          expect(Object.keys(cacheRouteInfo).length).to.equal(2);
          expect(cacheRouteInfo.stopsInfo).to.contain.keys('routeTag','title');
          expect(Object.keys(cacheRouteInfo.stopsInfo).length).to.be.at.least(3);

          expect(callbackRouteInfo).to.contain.keys('stopsInfo','directions');
          expect(Object.keys(callbackRouteInfo).length).to.equal(2);
          expect(callbackRouteInfo.stopsInfo).to.contain.keys('routeTag','title');
          expect(Object.keys(callbackRouteInfo.stopsInfo).length).to.be.at.least(3);
        });
        it("the object in the cache is equal to object passed to the callback", function() {
          var dirTags = Object.keys(cacheRouteInfo.directions);
          expect(cacheRouteInfo.stopsInfo.routeTag).to.equal(callbackRouteInfo.stopsInfo.routeTag);
          expect(cacheRouteInfo.directions[dirTags[0]].dirTag).to.equal(callbackRouteInfo.directions[dirTags[0]].dirTag);
        });
      });

      describe("should use the cache the second time routeConfig() is called for the same route and agency", function() {
        it("promise should be passed a value from the cache", function(done) {
          cacheRouteInfo.directions = 'promise_test';

          var promise = nb1.routeConfig(settings.routeTag);
          promise.done(function(routeInfo) {
            expect(routeInfo.directions).to.equal('promise_test');
            done();
          });
        });
        it("callback should be passed a value from the cache", function(done) {
          cacheRouteInfo.stopsInfo.routeTag = 'callerbackyoungin';

          nb1.routeConfig(settings.routeTag, function(routeInfo) {
            expect(routeInfo.stopsInfo.routeTag).to.equal('callerbackyoungin');
            done();
          });
        });
      });

      describe("should not store anything on the cache if the cache option is set to false", function() {
        var nb2 = makeNextBusser(settings.agencyTag, {cache: false});

        it("cache is set to false", function() {
          expect(nb2._options.cache).to.equal(false);
        });
        it("nothing is stored to the cache", function(done) {
          expect(nb2.cache).to.be.empty;

          nb2.routeConfig(settings.routeTag, function(routeInfo) {
            expect(nb2.cache).to.be.empty;
            expect(nb2.cache).to.not.contain.keys(settings.agencyTag);
            done();
          });
        });
        it("still passes a value (an object of route information) to the promise, while not caching", function(done) {
          var promise2 = nb2.routeConfig(settings.routeTag);
          promise2.done(function(routeInfo) {
            expect(nb2.cache).to.be.empty;
            expect(routeInfo).to.be.instanceof(Object);
            expect(routeInfo).to.contain.keys('stopsInfo','directions');
            done();
          });
        });
        it("still passes a value to the callback", function(done) {
          nb2.routeConfig(settings.routeTag, function(infoCallback) {
            expect(nb2.cache).to.be.empty;
            expect(infoCallback).to.be.instanceof(Object);
            expect(infoCallback).to.contain.keys('stopsInfo','directions');
            done();
          });
        });
      });
    });
  });

  describe("predictions()", function() {
    var nb = makeNextBusser(settings.agencyTag);
    var promise;

    it("should return a promise", function() {
      promise = nb.predictions({r: settings.routeTag, s: settings.stopTag});
      expect(promise).to.contain.keys('then','done','fail');
    });
    it("should pass to the promise an array of prediction objects for the specified route and stop tag.", function(done) {
      promise.done(function(predictions) {
        expect(predictions).to.be.instanceof(Array);
        expect(predictions[0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');
        expect(predictions[0].routeTag).to.equal(settings.routeTagStr);
        expect(predictions[0].stopTag).to.equal(settings.stopTagStr);
        done();
      });
    });
    it("should also accept a callback and pass it the the array of prediction objects", function(done) {
      nb.predictions({r: settings.routeTag, s: settings.stopTag, flatten: true}, function(cbPredictions) {
        expect(cbPredictions).to.be.instanceof(Array);
        expect(cbPredictions[0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');
        expect(cbPredictions[0].routeTag).to.equal(settings.routeTagStr);
        expect(cbPredictions[0].stopTag).to.equal(settings.stopTagStr);
        done();
      });
    });
    describe("flatten: false", function() {
      var nonFlatPromise = nb.predictions({r: settings.routeTag, s: settings.stopTag, flatten: false});

      it("should pass to the promise an object (instead of an array). This object will be similar in structure to the one used in predictionsMulti()", function(done) {
        nonFlatPromise.done(function(prediction) {
          expect(prediction).to.be.instanceof(Object);
          done();
        });
      });
      it("should structure the object by having the stop tag as a key, and nested underneath the route tag as a key, with an array of prediction objects as the value", function(done) {
        nonFlatPromise.done(function(prediction) {
          expect(prediction).to.be.instanceof(Object);
          expect(prediction[settings.stopTag]).to.be.instanceof(Object);
          expect(prediction[settings.stopTag][settings.routeTag]).to.be.instanceof(Array);
          expect(prediction[settings.stopTag][settings.routeTag][0]).to.be.instanceof(Object);
          expect(prediction[settings.stopTag][settings.routeTag][0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');
          done();
        });
      });
      it("should also accept a callback and pass it the same object as the promise", function(done) {
        nb.predictions({r: settings.routeTag, s: settings.stopTag, flatten: false}, function(cbObject) {
          expect(cbObject).to.be.instanceof(Object);
          expect(cbObject[settings.stopTag]).to.be.instanceof(Object);
          expect(cbObject[settings.stopTag][settings.routeTag]).to.be.instanceof(Array);
          expect(cbObject[settings.stopTag][settings.routeTag][0]).to.be.instanceof(Object);
          expect(cbObject[settings.stopTag][settings.routeTag][0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');
          expect(cbObject[settings.stopTag][settings.routeTag][0].routeTag).to.equal(settings.routeTagStr);
          expect(cbObject[settings.stopTag][settings.routeTag][0].stopTag).to.equal(settings.stopTagStr);
          done();
        });
      });
    });
  });
  describe("predictionsMulti()", function() {
    var nb = makeNextBusser(settings.agencyTag);
    var promise;
    var stops = [{r: settings.routeTag, s: settings.stopTag}, {r: settings.routeTag2, s: settings.stopTag2}];

    describe("passing in an array of stops for the argument", function() {

      it("should return a promise", function() {
        promise = nb.predictionsMulti(stops);
        expect(promise).to.contain.keys('then','done','fail');
      });
      it("should pass to the promise an array of prediction objects for the specified routes and stops.", function(done) {
        promise.done(function(predictions) {
          expect(predictions).to.be.instanceof(Array);
          expect(predictions[0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');

          var hasRoute1 = false, hasRoute2 = false;

          for(var i=0; i<predictions.length; i++) {
            if(predictions[i].routeTag === settings.routeTagStr) { hasRoute1 = true; }
            if(predictions[i].routeTag === settings.routeTag2Str) { hasRoute2 = true; }
          }

          expect(hasRoute1).to.equal(true);
          expect(hasRoute2).to.equal(true);
          done();
        });
      });
      it("should also accept a callback and pass it the the array of prediction objects", function(done) {
        nb.predictionsMulti(stops, function(predictions) {
          expect(predictions).to.be.instanceof(Array);
          expect(predictions[0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');

          var hasRoute1 = false, hasRoute2 = false;

          for(var i=0; i<predictions.length; i++) {
            if(predictions[i].routeTag === settings.routeTagStr) { hasRoute1 = true; }
            if(predictions[i].routeTag === settings.routeTag2Str) { hasRoute2 = true; }
          }

          expect(hasRoute1).to.equal(true);
          expect(hasRoute2).to.equal(true);
          done();
        });
      });
    });

    describe('passing in an object for the argument', function() {
      var queryObj = { stops: stops };
      var promise2;

      it("should return a promise", function() {
        promise2 = nb.predictionsMulti(queryObj);
        expect(promise).to.contain.keys('then','done','fail');
      });
      it("should pass to the promise an array of prediction objects for the specified routes and stops.", function(done) {
        promise2.done(function(predictions) {
          expect(predictions).to.be.instanceof(Array);
          expect(predictions[0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');

          var hasRoute1 = false, hasRoute2 = false;

          for(var i=0; i<predictions.length; i++) {
            if(predictions[i].routeTag === settings.routeTagStr) { hasRoute1 = true; }
            if(predictions[i].routeTag === settings.routeTag2Str) { hasRoute2 = true; }
          }

          expect(hasRoute1).to.equal(true);
          expect(hasRoute2).to.equal(true);
          done();
        });
      });
      it("should also accept a callback and pass it the the array of prediction objects", function(done) {
        nb.predictionsMulti(queryObj, function(predictions) {
          expect(predictions).to.be.instanceof(Array);
          expect(predictions[0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');

          var hasRoute1 = false, hasRoute2 = false;

          for(var i=0; i<predictions.length; i++) {
            if(predictions[i].routeTag === settings.routeTagStr) { hasRoute1 = true; }
            if(predictions[i].routeTag === settings.routeTag2Str) { hasRoute2 = true; }
          }

          expect(hasRoute1).to.equal(true);
          expect(hasRoute2).to.equal(true);
          done();
        });
      });
      it("array passed to the promise/callback should be similar the one passed by using an array for the arguments", function(done) {
        var promiseFromArray = nb.predictionsMulti(stops);
        var promiseFromObj = nb.predictionsMulti(queryObj);

        promiseFromArray.done(function(predictionsFromArray){
          promiseFromObj.done(function(predictionsFromObj){
            expect(predictionsFromArray.length).to.equal(predictionsFromObj.length);
            expect(predictionsFromArray[0].routeTag).to.equal(predictionsFromObj[0].routeTag);
            expect(predictionsFromArray[0].stopTag).to.equal(predictionsFromObj[0].stopTag);
            done();
          });
        });
      });
      describe("flatten: false", function() {
        var flatQuery = { stops: stops, flatten: false };
        var nonFlatPromise = nb.predictionsMulti(flatQuery);

        it("should pass to the promise an object", function(done) {
          nonFlatPromise.done(function(prediction) {
            expect(prediction).to.be.instanceof(Object);
            done();
          });
        });
        it("should structure the object by having the stop tag as a key, and nested underneath the route tag as a key, with an array of prediction objects as the value", function(done) {
          nonFlatPromise.done(function(prediction) {
            expect(prediction).to.be.instanceof(Object);
            expect(prediction[settings.stopTag]).to.be.instanceof(Object);
            expect(prediction[settings.stopTag][settings.routeTag]).to.be.instanceof(Array);
            expect(prediction[settings.stopTag][settings.routeTag][0]).to.be.instanceof(Object);
            expect(prediction[settings.stopTag][settings.routeTag][0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');
            done();
          });
        });
        it("should also accept a callback and pass it the same object as the promise", function(done) {
          nb.predictionsMulti(flatQuery, function(cbObject) {
            expect(cbObject).to.be.instanceof(Object);
            expect(cbObject[settings.stopTag]).to.be.instanceof(Object);
            expect(cbObject[settings.stopTag][settings.routeTag]).to.be.instanceof(Array);
            expect(cbObject[settings.stopTag][settings.routeTag][0]).to.be.instanceof(Object);
            expect(cbObject[settings.stopTag][settings.routeTag][0]).to.contain.keys('routeTag','stopTag','dirTag','seconds','vehicle');
            expect(cbObject[settings.stopTag][settings.routeTag][0].routeTag).to.equal(settings.routeTagStr);
            expect(cbObject[settings.stopTag][settings.routeTag][0].stopTag).to.equal(settings.stopTagStr);
            done();
          });
        });
      });
    });
  });


});