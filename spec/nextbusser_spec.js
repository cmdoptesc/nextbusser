describe("nextBusser", function() {

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
    it("should accepted as the first or second argument when instantiating", function() {
      var nb1 = makeNextBusser('agency-name', {cache: false});
      var nb2 = makeNextBusser({cache: false});

      expect(nb1._options.cache).to.equal(false);
      expect(nb2._options.cache).to.equal(false);
    });
  });

  describe("agencyList()", function() {
    var nb = makeNextBusser();

    it("should return a promise of an array of transit agencies (objects)", function(done) {
      var promise = nb.agencyList();
      expect(promise).to.contain.keys('then','done','fail');
      promise.done(function(agencies) {
        expect(agencies).to.be.instanceof(Array);
        expect(agencies).to.have.length.of.at.least(1);
        expect(agencies[0]).to.be.instanceof(Object);
        done();
      });
    });

    it("should also accept a callback function", function(done) {
      nb.agencyList(function(agencyArray) {
        expect(agencyArray).to.be.instanceof(Array);
        expect(agencyArray).to.have.length.of.at.least(1);
        expect(agencyArray[0]).to.be.instanceof(Object);
        done();
      });
    });
  });

  describe("routeList()", function() {
    var agencyTag = 'sf-muni';
    var nb = makeNextBusser(agencyTag);

    it("should return a promise of an array of routes (objects) for the specified agency", function(done) {
      var promise = nb.routeList();
      expect(promise).to.contain.keys('then','done','fail');
      promise.done(function(routes) {
        expect(routes).to.be.instanceof(Array);
        expect(routes).to.have.length.of.at.least(1);
        expect(routes[0]).to.be.instanceof(Object);
        done();
      });
    });

    it("should also accept a callback function", function(done) {
      nb.routeList(function(routeArray) {
        expect(routeArray).to.be.instanceof(Array);
        expect(routeArray).to.have.length.of.at.least(1);
        expect(routeArray[0]).to.be.instanceof(Object);
        done();
      });
    });

    describe("caching", function() {
      var nb1 = makeNextBusser(agencyTag);
      var callbackRoutes;
      var cacheRoutes;
      before(function(done) {
        nb1.routeList(function(routes) {
          callbackRoutes = routes;
          cacheRoutes = nb1.cache[agencyTag].routeList;
          done();
        });
      });
      describe("should cache a route listing for an agency if the cache option is set to true", function() {
        it("cache is set to true", function() {
          expect(nb1._options.cache).to.equal(true);
        });
        it("the cached route list is stored under an agencyTag key on the cache", function() {
          expect(nb1.cache).to.include.keys(agencyTag);
          expect(nb1.cache).to.include.not.keys('blahblahblahbalh');
          expect(nb1.cache[agencyTag]).to.include.keys('routeList');
        });
        it("the cached route list and the callback route list are both arrays", function() {
          expect(cacheRoutes).to.be.instanceof(Array);
          expect(callbackRoutes).to.be.instanceof(Array);
        });
        it("the number of elements in the cached route list is equal to the routes passed to the callback", function() {
          expect(cacheRoutes.length).to.equal(callbackRoutes.length);
        });
        it("the first item in the cache is the same as the first item passed to the callback", function() {
          expect(cacheRoutes).to.have.length.of.at.least(1);
          expect(callbackRoutes).to.have.length.of.at.least(1);
          expect(JSON.stringify(cacheRoutes[0])).to.equal(JSON.stringify(callbackRoutes[0]));
        });
      });
      describe("should use the cache the second time routeList() is called for the same agency", function() {
        it("callback should be passed a value from the cache", function(done) {
          var oldval0 = JSON.stringify(nb1.cache[agencyTag].routeList[0]);
          var oldval1 = JSON.stringify(nb1.cache[agencyTag].routeList[1]);
          nb1.cache[agencyTag].routeList[0] = 'flagged_for_test';

          nb1.routeList(function(routes) {
            expect(JSON.stringify(routes[0])).to.not.equal(oldval0);
            expect(routes[0]).to.equal('flagged_for_test');
            expect(routes[1]).to.not.equal('flagged_for_test');
            expect(JSON.stringify(routes[1])).to.equal(oldval1);
            done();
          });
        });
        it("promise should be passed a value from the cache", function(done) {
          nb1.cache[agencyTag].routeList[3] = 'promise_test';
          
          var promise = nb1.routeList();
          promise.done(function(list) {
            expect(list[3]).to.equal('promise_test');
            done();
          });
        });
      });
      describe("should not store anything on the cache if the cache option is set to false", function() {
        var nb2 = makeNextBusser(agencyTag, {cache: false});

        it("cache is set to false", function() {
          expect(nb2._options.cache).to.equal(false);
        });
        it("nothing is stored to the cache", function(done) {
          expect(nb2.cache).to.be.empty;

          nb2.routeList(function(routes){
            expect(nb2.cache).to.be.empty;
            expect(nb2.cache).to.not.include.keys(agencyTag);
            expect(routes).to.have.length.of.at.least(1);
            done();
          });
        });
      });
    });
  });

});