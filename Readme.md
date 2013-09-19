# nextBusser

nextBusser is a JavaScript library to query the NextBus API ([pdf doc](http://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf)) and parse the resulting XML data.

Callbacks can be provided to the functions, or they will return a basic jQuery promise that will have the methods `.then()`, `.done()`, and `.fail()`.

An early version of nextbusser was used for my muniNow app:  
  [demo](http://bl.ocks.org/cmdoptesc/raw/6224455/)  
  [github](http://github.com/cmdoptesc/muninow)  

# Usage

```javascript
// initialise a nextBusser object
var nb = makeNextBusser('sf-muni');

// to change agencies
nb.setAgency('actransit');

// to get all the routes -- this can take a callback or return a promise
var promise = nb.routesList(callerback);

promise.done(function(list) {
  console.log(list);
});

function callerback(routes) {
  console.log(list);
}
```

# Dependencies
jQuery 1.10.x or 2.x

## Further Work
- add in schedule  
- add in vehicle locations  



# License
al lin, sep 2013  
MIT, do as you will license..