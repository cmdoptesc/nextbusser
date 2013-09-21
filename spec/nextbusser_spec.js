describe("nextBusser", function() {

  describe("has the methods: agencyList, routeList, routeConfig, predictions, predictionsMulti", function() {
    var nb = makeNextBusser("");

    it("agencyList()", function() {
      expect(nb).to.have.property('agencyList');
      expect(typeof nb.agencyList).to.equal('function');
    });
  });

});