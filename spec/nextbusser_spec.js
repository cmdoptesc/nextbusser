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

  describe("agencyList", function() {
    var nb = makeNextBusser();

    it("should return a promise of an array of transit agency objects", function(done) {
      var promise = nb.agencyList();
      expect(promise).to.contain.keys('then','done','fail');
      promise.done(function(agencies) {
        expect(agencies).to.be.instanceof(Array);
        expect(agencies[0]).to.be.instanceof(Object);
        done();
      });
    });

    it("should accept a callback function", function(done) {
      nb.agencyList(function(agencyArray) {
        expect(agencyArray).to.be.instanceof(Array);
        expect(agencyArray[0]).to.be.instanceof(Object);
        done();
      });
    });
  });

});