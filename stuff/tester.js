var functions = require('firebase-functions');
var PD = require("probability-distributions");
const admin = require('firebase-admin');
var jsonfile = require("jsonfile");
let voyager1;
let apollo13;
var THISISLOCAL = true;

// sim stuff ------------------------------------------------------------------
var simulator = {}; //"global" namespace

simulator.msPerSecond = 5;
simulator.buffer = 0;
simulator.gameTime = new Date("2017-06-12T05:30:00.000-04:00");
simulator.pStar = 21;

var triangle = function(min, mode, max){ // done
  if (max <= min){
    return min;
  }
  var r = Math.random();
  var ans = min;
  if (r < (mode - min)/(max-min)){
    ans = Math.sqrt(r*(max-min)*(mode-min))+min;
  } else {
    ans = max - Math.sqrt((1-r)*(max-min)*(max-mode));
  }
  return ans;
};

simulator.gameStart = new Date(1499074200000);
simulator.initializeTime = function(){
  simulator.gameStart = new Date(1499074200000);
}
simulator.timeDate = new Date(1499074200000).toUTCString(simulator.start);
simulator.startTime = new Date();

simulator.getTime = function(){
    //returns the current unix time stamp
    let time = new Date().getTime();
    return time;
}
simulator.sinceStart = function(){
    //returns real world milliseconds since the game started
    return simulator.getTime() - simulator.startTime;
}
simulator.firstTime = function(){
    return simulator.gameStart.toUTCString();
}
simulator.currentGameTime = function(){
    return (Math.round((simulator.sinceStart()*(1/simulator.msPerSecond))*1000 + simulator.gameStart.getTime()));
}
simulator.readableTime = function(){
    let time = new Date(simulator.currentGameTime()).toUTCString();
    return(time);
}


var doTheThing = function() {
  simulator.initializeTime()
  return initializeMarket().then(function() {
    assignOrderListener();
    assignDeleteListener();
  }).then(event=>{
    simulator.events = simulateDay(100,50,50,3,1);
    return getNextEvent();
  });
}

if (THISISLOCAL){
  var serviceAccount = require("../stuff/TraderX-9fcc4a1362e4.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://traderx-a41b3.firebaseio.com"
  });
} else {
  admin.initializeApp(functions.config().firebase);

  exports.startSession = functions.database
  .ref("StartSim/start").onWrite(event => {
    if(!event.data.val()) {
      return null;
    }
    if (!!event.data.val()){
      paused = false;
      return doTheThing();
    } else {
      paused = true;
    }

  });
}


let assignOrderListener = function() {
  voyager1 = admin.database().ref("Session3/Users/1/OrdersPending/").on('child_added', function(snapshot) {
    let order = snapshot.val();
    let prom = processOrder(order, order.UserId);
    return Promise.all([prom]).then(function() {
      return admin.database().ref("Session3/Users/1/OrdersPending/"+snapshot.key).remove();
    });
  });
}

let assignDeleteListener = function() {
  apollo13 = admin.database().ref("Session3/Users/1/DeletesPending/").on('child_added', function(snapshot) {
    let order = snapshot.val();
    let key = snapshot.key;
    let orderId = order.OrderId;
    return admin.database().ref("Session3/Assets/").child(order.AssetId).child("AggOB")
    .child(order.Strike).child(order.Type).transaction(function(currVol) {
      return currVol - order.Volume;
    }).then(function() {
      SessionData.orderbook.deleteOrder(order);
      setSessionOrderBook(SessionData.orderbook.toJSON());
    }).then(function() {
      return admin.database().ref("Session3/Users/1/Orders/").child(order.AssetId)
      .child(order.Strike).child(order.OrderId).remove();
    }).then(function() {
      return admin.database().ref("Session3/Users/1/DeletesPending/")
      .child(key).remove();
    });
  });
}


//SHARE CODE BENEATH HERE TRIALABLE
// SIM Pat's stuff
// Actual Utilities:

let beta = function(){
    return PD.rbeta(1,2,5)[0];
}

var getEvents = function(numEvents){
    var x = 0;
    var eventTimes = [];
    while(x<1){
        var sample = PD.rexp(1,numEvents)[0];
        x = sample + x;
        eventTimes.push(x);
    }
    return(eventTimes);
}

var simulateDay =function(numL, numI, numM, numP, fractionOfDay){
    let events = [];
    gameLength = 0;
    numEvents = numP + numL + numM + numI;
    perLiq = numL/numEvents;
    perMom = perLiq + numM/numEvents;
    perInf = perMom + numI/numEvents;
    while(gameLength < 1*23400*fractionOfDay){
        const spin = PD.runif(1);
        var pause = Math.round(PD.rexp(1, numEvents)[0]*fractionOfDay*23400);
        if(spin < perLiq){
            var order = {
                type:"liq",
                secondsUntilNext: pause,
            }
            gameLength += pause;
            events.push(order);
        }else if(spin < perMom){
            var order = {
                type:"mom",
                secondsUntilNext: pause,
            }
            gameLength += pause;
            events.push(order);
        }else if(spin < perInf){
            var type = null;
            var order = {
                type:"inf",
                secondsUntilNext: pause,
            }
            gameLength += pause;
            events.push(order);
        }
        else{
            var order = {
                type:"pStar",
                secondsUntilNext: pause,
            }
            gameLength += pause;
            events.push(order);
        }
    }
    return events;
}

var getNewPstar = function(oldPstar){
    return(PD.rnorm(1,oldPstar,1)[0]);
}
// end Pat's stuff

var SessionData = {};
SessionData.bid = 21.30;
SessionData.ask = 22.40;
SessionData.run = 0;
SessionData.lastPrice = 0.00;
SessionData.guid = 1000;


simulator.getVolume = function(){ //TODO: make this beta based
  return Math.max(2, Math.floor(triangle(2,25,100)));
}

var getBid = function(){
  return SessionData.bid;
}

//TODO: reset AheadOfThis for old orders when one is filled

var nearestTick = function(rawPrice){ // done
  var tick = getTick();
  return Math.round(parseFloat(rawPrice)/tick)*tick;
}

var getAsk = function(){
  return SessionData.ask;
}

var getTick = function(){ //TODO will need AssetId to be accurate
  return .1;
}

var getRun = function(){
  return SessionData.run;
}

var updateClock = function(seconds){ // done
  simulator.gameTime.setSeconds(simulator.gameTime.getSeconds() + seconds);
}

var reportEvent = function(eType){ // for testing
  console.log(`performing ${eType} event at game time: ${simulator.gameTime.toLocaleTimeString()}, real time: ${new Date()}`);
};

var executeOrder = function(order, extra=""){ // not done testing
  reportEvent(`${extra} ORDER: ${JSON.stringify(order)}`);
  return new Promise((resolve,reject) => {
    processOrder(order, order.UserId);
  });
};

var momentumOrder = function(){ //TODO: (assetid) needs to be generalized
  var run = getRun();
  if (run < 3 && run > -3){
    reportEvent("NO Momentum");
    return;
  }
  var Order = {};
  Order.UserId = 0;
  Order.Volume = simulator.getVolume(); //make Beta
  Order.AssetId = "INTC";
  Order.Class = "Market";
  Order.Strike = false;
  if (run >= 3){
    Order.Type = "Bid";
  } else if (run <= -3){
    Order.Type = "Ask";
  }
  return executeOrder(Order, "Momentum");
};

var pStarChange = function(){
  simulator.pStar = nearestTick(getNewPstar(simulator.pStar));
  reportEvent(`p-star change now: ${simulator.pStar}`);
};

var checkSpread = function(){
  var ask = getAsk();
  var bid = getBid();
  if (ask <= bid){
    //console.log(ask, bid, "Ask < Bid: ERROR******");
    throw "ASK UNDER BID";
  }
}

var informedOrder = function(){ //TODO: needs to be generalized
  var ask = getAsk();
  var bid = getBid();
  var theType = "Bid";
  if (simulator.pStar > ask){
    theType = "Bid";
  } else if (simulator.pStar < bid){
    theType = "Ask";
  } else {
    reportEvent("No Informed Order Possible");
    return;
  }
  var Order = {};
  Order.UserId = 0;
  Order.Volume = simulator.getVolume();
  Order.AssetId = "INTC";
  Order.Class = "Market";
  Order.Strike = nearestTick(simulator.pStar + (theType == "Bid" ? -getTick() : getTick() ));
  Order.Type = theType;

  return executeOrder(Order, "Informed");
};

var liquidityOrder = function(){ //TODO: needs to be generalized
  var patient = true;
  if (Math.random() < .35){
    patient = false;
  }

  var Order = {};
  Order.Volume = simulator.getVolume();
  Order.AssetId = "INTC";
  Order.UserId = 0;

  if (Math.random() < .5){
    //Buy order
    Order.Type = "Bid";

    if (patient){
      var bid = getBid();
      var ask = getAsk();
      var tick = getTick();
      if (bid < 0.1 || ask > 9999){
        Order.Strike = nearestTick(simulator.pStar - Math.floor(Math.random()*7)*tick);
      } else {
        Order.Strike = nearestTick(triangle(bid*.99, Math.min(bid + tick, ask), ask)); //this spread
      }
      Order.Class = "Limit";
    } else if (!patient){
      Order.Class = "Market";
      var ask = getAsk();
      if (ask > 9999){
        var tick = getTick();
        Order.Strike = nearestTick(simulator.pStar - Math.floor(Math.random()*7)*tick);
      } else {
        Order.Strike = nearestTick(triangle(ask, ask*(1+0.0075), ask*(1+0.015))); //parameterize this spread
      }
    }

  } else {
    //Sell order
    Order.Type = "Ask";

    if (!patient){
      Order.Class = "Market";
      var bid = getBid();
      if (bid < .1){
        var tick = getTick();
        Order.Strike = nearestTick(simulator.pStar + Math.floor(Math.random()*7)*tick);
      } else {
        Order.Strike = nearestTick(triangle(bid*(1-0.015), bid*(1-0.0075), bid)); //this spread
      }
    } else {
      Order.Class = "Limit";
      var bid = getBid();
      var ask = getAsk();
      var tick = getTick();
      if (bid < .1 || ask > 9999){
        Order.Strike = nearestTick(simulator.pStar + Math.floor(Math.random()*7)*tick);
      } else {
        Order.Strike = nearestTick(triangle(bid, Math.max(ask - tick, bid), ask*1.01));
      }
    }
  }
  if (Order.Volume === 0){
    //console.log("****** ZERO VOLUME? ******");
  }
  return executeOrder(Order, `Liquidity ${patient ? "Patient": "Impatient"}`);
};

var processEvent = function(eventType, event){ // done
  switch (eventType){
    case 'mom':
      momentumOrder();
      console.log("MOM");
      break;
    case 'inf':
      informedOrder();
      console.log("INF");
      break;
    case 'pStar':
      pStarChange();
      console.log("pStar");
      break;
    case 'liq':
      liquidityOrder();
      console.log("LIQ");
      break;
    default:
      reportEvent(eventType);
  }
  checkSpread();
};


var getNextEvent = function(){
  var event = simulator.events.shift();
  processEvent(event.type, event);
  if (!paused && simulator.events.length > 0){
    updateClock(event.secondsUntilNext);
    console.log(simulator.readableTime());
    console.log(simulator.gameTime);
    return new Promise((resolve,reject) => {
      setTimeout(getNextEvent,
        Math.max(event.secondsUntilNext*simulator.msPerSecond - simulator.buffer, 0));
    });
  } else {
    console.log("Sim over");
  }
};

// end sim stuff---------------------------------------------------------------

var paused = false;

function removeKeys(object){
  var array = [];
   for(key in object){
     if (object.hasOwnProperty(key)){
       array.push(object[key]);
     }
   }
   return array;
 }

let userTransaction = function(userID, type, assetID, strike, transactionVolume) {
  let transKey = admin.database().ref("Session3/Users/")
  .child(userID).child("Transactions")
  .push().key;
  //TODO: update AlL of users shares, PL, and VWAPDifference
  return Promise.resolve(
    admin.database().ref("Session3/Users/")
    .child(userID).child("Transactions")
    .child(transKey).update({
      AssetId: assetID,
      Price: strike,
      Time: getGameTime(),
      Type: type,
      Volume: transactionVolume
    })).then(function() {
      return admin.database().ref("Session3/Users/").child(userID).child("Assets")
      .child(assetID).transaction(function(currVol) {
        if(type == "Bid") {
          currVol += transactionVolume;
        } else {
          currVol -= transactionVolume;
        }
        return currVol;
      });
    }).then(function() {
      return admin.database().ref("Session3/Users/").child(userID).child("Assets")
      .child("Cash").transaction(function(currCash) {
        let strikePrice = (parseInt(strike)/100).toFixed(2);
        currCash = parseInt(currCash);
        if(type == "Bid") {
          currCash -= (transactionVolume * strikePrice);
        } else {
          currCash += (transactionVolume * strikePrice);
        }
        return currCash.toFixed(0);
      });
    }).then(function() {
      let startingCash = 0;
      let currentCash = 0;
      let currentShares = 0;
      return admin.database().ref("Session3/Users/StartingCash").once('value').then(function(snapshot) {
        startingCash = snapshot.val();
      }).then(function() {
        return admin.database().ref("Session3/Users/").child(userID)
        .child("Assets").once('value').then(function(snapshot) {
          currentCash = snapshot.val().Cash;
          currentShares = snapshot.val().INTC;
        }).then(function() {
          if(currentShares !== 0) {
            return admin.database().ref("Session3/Users/").child(userID)
            .child("Stats").child("AverageBuyPrice").set(((startingCash - currentCash)/currentShares).toFixed(2));
          } else {
            return null;
          }
        });
      });
    });
}

let getGameTime = function () {
  return simulator.gameTime.toLocaleTimeString({timeZone: "America/New_York"});
}

let createTransactionRecord = function(order, newOrder, strike, transactionVolume) {
  let transKey = admin.database().ref("Session3/Transactions").push().key;
  return Promise.resolve(
    admin.database().ref("Session3/Transactions/").child(transKey).set({
      AssetId: order.AssetId,
      Price: strike,
      Time: getGameTime(),
      Volume: transactionVolume,
      Type: newOrder.Type == "Ask" ? "Sell" : "Buy"
    })).then(function() {
      return updateCurrentAssetPrice(strike, order.AssetId);
    });
}

let updateSessionAggOrderBook = function(aggOB) { //TODO: hot mess
  //console.log("Updating AggOB");
  return admin.database().ref("Session3/Assets/").child("INTC").child("AggOB").set(aggOB);
};

let userUpdateOrderBook = function(order, strike, transactionVolume) {
  if(order.volume - transactionVolume === 0) {
    // delete order
    return Promise.resolve(admin.database().ref("Session3/Users/")
    .child(order.UserId).child("Orders").child(order.AssetId).child(strike)
    .child(order.OrderId).remove());
  } else {
    // update order
    return Promise.resolve(admin.database().ref("Session3/Users/")
    .child(order.UserId).child("Orders").child(order.AssetId).child(strike)
    .child(order.OrderId).child("Volume").set(order.Volume - transactionVolume));
  }
}

let setSessionOrderBook = function(orderbook) {
  let assetId = "INTC";
  return Promise.resolve(admin.database().ref("Session3/Assets/")
  .child(assetId).child("orderbook").set(orderbook));
}

let userCreateLimitOrder = function(order, userId) {
  return Promise.resolve(admin.database().ref("Session3/Users/").child(userId)
  .child("Orders").child(order.AssetId).child(order.Strike).child(order.OrderId)
  .set(order));
}

let fulfillTransaction = function(order, newOrder, strike, orderbook){
  //this strike is of the form "2020"
  var transactionVolume = SessionData.orderbook.fillOrder(order, newOrder.Volume, strike); //don't change order2 but return volume of transaction
  var strikeFloat = parseInt(strike)/100.0;
  if (strikeFloat < SessionData.lastPrice){
    SessionData.lastPrice = strikeFloat;
    SessionData.run = Math.min(SessionData.run - 1, -1);
  } else if (strikeFloat > SessionData.lastPrice){
    SessionData.lastPrice = strikeFloat;
    SessionData.run = Math.max(SessionData.run + 1, 1);
  }
  //Jackson deal with firebase stuff here
  userTransaction(newOrder.UserId, newOrder.Type, newOrder.AssetId, strike, transactionVolume);  // write Receipts function
  userTransaction(order.UserId, order.Type, order.AssetId, strike, transactionVolume);  // write Receipts function
  createTransactionRecord(order, newOrder, strike, transactionVolume); //global Transaction Record
  userUpdateOrderBook(order, strike, transactionVolume); //old user chnage remove or change vol
  updateSessionAggOrderBook(SessionData.orderbook.toAggOB()); //old user chnage remove or change vol
  setSessionOrderBook(SessionData.orderbook.toJSON());
  return transactionVolume;
}

var createLimitOrder = function(order, userId, orderbook){
  //order cannot be filled
  let newOrder = SessionData.orderbook.createLimitOrder(order, userId); //has a Strike price
  //Firebase side:
  userCreateLimitOrder(newOrder, userId); //order has Strike, and this cannot be fulfilled, so place limit order
  updateSessionAggOrderBook(SessionData.orderbook.toAggOB()); //old user chnage remove or change vol
  setSessionOrderBook(SessionData.orderbook.toJSON());
}

var OrderBook = function(obJSON){
   var self = this;
   this.Strike = obJSON || {};

   this.canFillTransaction = function(newOrder){
     let type = newOrder.Type;
     let reserve = null;
     if (type === "Ask"){
       // LOOK at Bids
       let bid = this.getBid();
       if(bid == 0) {
         return null;
       }
       reserve = bid.Strike;
       if (parseInt(newOrder.Strike) > parseInt(reserve)){
         return null;
       }
       else{
         return bid;
       }
     }
     else {
       // LOOK at Asks
       let ask = this.getAsk();
       //console.log(ask, "was ask");
       if(ask == 999999) {
         return null;
       }
       reserve = ask.Strike;
       if (parseInt(newOrder.Strike) < parseInt(reserve)){
         return null;
       }
       else{
         return ask;
       }
     }
   };

   this.createLimitOrder = function(newOrder, user){
     if(!self.Strike.hasOwnProperty(newOrder.Strike)) {
       self.Strike[newOrder.Strike] = {
         Bids: {},
         Asks: {}
       };
     }
     let len = Object.keys(self["Strike"][newOrder.Strike][newOrder["Type"]+"s"]).length;
     let last;
     if(len === 0) {
       last = {
         AheadOfThis: 0,
         Volume: 0
       };
     } else {
       let key = Object.keys(self["Strike"][newOrder.Strike][newOrder["Type"]+"s"])[len-1];
       last = self["Strike"][newOrder.Strike][newOrder["Type"]+"s"][key];
     }
     SessionData.guid++;
     // TODO check for concurrency on guid
     let order ={
       Volume : newOrder.Volume,
       UserId : user,
       AheadOfThis : parseInt(last.AheadOfThis) + parseInt(last.Volume),
       Class: "Limit",
       Type: newOrder.Type,
       Strike: newOrder.Strike,
       OrderId: SessionData.guid,
       AssetId: newOrder.AssetId
     }
     self.Strike[newOrder.Strike][newOrder.Type + "s"][order.OrderId] = order;
     return order;
   };

   this.updateAheadOfThis = function(theStrike, theTypes){
     var theQueue = self.Strike[theStrike][theTypes];
     var aheadOfThis = 0;
     for(let key in theQueue){
       self.Strike[theStrike][theTypes][key].AheadOfThis = aheadOfThis;
       aheadOfThis += self.Strike[theStrike][theTypes][key].Volume;
     }
   }
   this.fillOrder = function(existingOrder, volumeDesired, strikeAsInt){
      if(existingOrder.Volume > volumeDesired){
        existingOrder.Volume -= volumeDesired;
        // TODO Always update the orderbook directly
        self.Strike[existingOrder["Strike"]][existingOrder["Type"]+"s"][existingOrder.OrderId]["Volume"] = existingOrder.Volume;
        return volumeDesired;
      }
      else{
        let tmp = existingOrder.Volume;
        delete self.Strike[existingOrder["Strike"]][existingOrder["Type"]+"s"][existingOrder.OrderId];
        self.updateAheadOfThis(existingOrder["Strike"], existingOrder["Type"]+"s");
        //setSessionOrderBook(SessionData.orderbook.toJSON());
        return tmp;
      }
     // please return the volume of the actual transaction and remove
     // the existing order if it was knocked out
   };

   this.getBid = function(){
     // TODO this presumes order of self.Strike keys
     let max = "0";

     for (let strike in self.Strike){
       if (self.Strike[strike]["Bids"] === undefined || Object.keys(self.Strike[strike]["Bids"]).length == 0){
       }
       else{
         if(parseInt(max) < parseInt(strike)) {
           max = strike;
           key = Object.keys(self.Strike[strike]["Bids"])[0];
         }
       }
     }
     if(max == '0') {
       SessionData.bid = 0.00;
       return max;
     }
     let ans = JSON.parse(JSON.stringify(self.Strike[max]["Bids"][key]));
     ans.Strike = max;
     ans.OrderId = key;
     ans.AssetId = "INTC";
     SessionData.bid = parseInt(max)/100;
     return ans;
   };

   this.getAsk = function(){
     // TODO this presumes order of self.Strike keys
     let min = "999999";
     for (let strike in self.Strike){
       if (self.Strike[strike]["Asks"] === undefined || Object.keys(self.Strike[strike]["Asks"]).length == 0){
       }
       else{
         if(parseInt(strike) < parseInt(min)) {
           min = strike;
           key = Object.keys(self.Strike[strike]["Asks"])[0];
         }

       }
     }
     if(min == '999999') {
       SessionData.ask = 9999.99;
       return min;
     }
     let ans = JSON.parse(JSON.stringify(self.Strike[min]["Asks"][key]));
     ans.Strike = min;
     ans.OrderId = key;
     ans.AssetId = "INTC";
     SessionData.ask = parseInt(min)/100;
     return ans;
   };
   this.toJSON = function(){
      return self.Strike;
   };
   this.toAggOB = function(){
      let sumQueue = function(queueJSON){
        let theSum = 0;
        for(let key in queueJSON){
          if (queueJSON.hasOwnProperty(key)){
            theSum += parseInt(queueJSON[key].Volume);
          }
        }
        //console.log("aggOB sum: " + theSum, queueJSON);
        return theSum;
      }

      var zeroAgg = SessionData.zeroAgg;
      for (let strike in self.Strike){
        if (!zeroAgg.hasOwnProperty(strike)){
          zeroAgg[strike] = {"Bid": 0, "Ask": 0};
        //  console.log(`${strike} was not in zeroAgg`);
        }
        if (self.Strike[strike].hasOwnProperty("Asks")){
          zeroAgg[strike]["Ask"] = sumQueue(self.Strike[strike]["Asks"]);
        }
        if (self.Strike[strike].hasOwnProperty("Bids")){
          zeroAgg[strike]["Bid"] = sumQueue(self.Strike[strike]["Bids"]);
        }
      }
      return zeroAgg;
   };
   this.deleteOrder = function(existingOrder){
      //console.log("attempting to delete order from local orderbook");
      let strike = existingOrder.Strike;
      let type = existingOrder.Type +"s";
      //console.log("strike: " + existingOrder.Strike);
      //console.log("type: " + existingOrder.Type);
      delete self.Strike[strike][type][existingOrder.OrderId];
   }
}

var getOrderBook = function(order){
    return admin.database().ref("Session3/Assets/").child(order.AssetId)
    .child("/Orderbook").once('value').then(function(snapshot) {
      return new OrderBook(snapshot.val());
    });
}

var checkForTransaction = function(order, userId){
  //console.log("new Order");
  //console.log(order);
  var fillableOrder = SessionData.orderbook.canFillTransaction(order); //should include strike in returned order
  //console.log("The next thing is fillableOrder");
  //console.log(fillableOrder);
  if (!fillableOrder){
    //possibly place limit follow-up
    if (order.Class == "Market"){
      return;
    } else {
      //console.log("Creating limit order");
      return createLimitOrder(order, userId, SessionData.orderbook); //order has a Strike
    }
  } else {
    //console.log("Attempting to fill transaction");
    order.Volume -= fulfillTransaction(fillableOrder, order, fillableOrder.Strike, SessionData.orderbook);
    if (order.Volume > 0){
      checkForTransaction(order, userId);
    } else if (order.Volume < 0){
      //console.log("the world exploded");
    } else {
      //console.log("the world is safe");
    }
  }
}

let processOrder = function(order, userId) {
  if (parseFloat(order.Strike) < 100){
    order.Strike = (100*parseFloat(order.Strike)).toFixed(0).toString();
  }
  var orderbook = SessionData.orderbook;
  checkForTransaction(order, userId);
}

// updates the last sell price and add this to timeseries
// TODO implement this function
let updateCurrentAssetPrice = function(lastStrikeSold, assetId) {
  console.log("updateCurrentAssetPrice() was called");
  return admin.database().ref("Session3/Assets").child(assetId).child("CurrentAssetPrice").set(lastStrikeSold);
}

let initializeMarket = function(){
  SessionData.orderbook = new OrderBook({});
  let aggOBref = admin.database().ref("Session3").child("Assets").child("INTC").child("AggOB");
  SessionData.zeroAgg = {"1800":{"Bid":0,"Ask":0},"1810":{"Bid":0,"Ask":0},"1820":{"Bid":0,"Ask":0},"1830":{"Bid":0,"Ask":0},"1840":{"Bid":0,"Ask":0},
  "1850":{"Bid":0,"Ask":0},"1860":{"Bid":0,"Ask":0},"1870":{"Bid":0,"Ask":0},"1880":{"Bid":0,"Ask":0},"1890":{"Bid":0,"Ask":0},
  "1900":{"Bid":0,"Ask":0},"1910":{"Bid":0,"Ask":0},"1920":{"Bid":0,"Ask":0},"1930":{"Bid":0,"Ask":0},"1940":{"Bid":0,"Ask":0},
  "1950":{"Bid":0,"Ask":0},"1960":{"Bid":0,"Ask":0},"1970":{"Bid":0,"Ask":0},"1980":{"Bid":0,"Ask":0},"1990":{"Bid":0,"Ask":0},
  "2000":{"Bid":0,"Ask":0},"2010":{"Bid":0,"Ask":0},"2020":{"Bid":0,"Ask":0},"2030":{"Bid":0,"Ask":0},"2040":{"Bid":0,"Ask":0},
  "2050":{"Bid":0,"Ask":0},"2060":{"Bid":0,"Ask":0},"2070":{"Bid":0,"Ask":0},"2080":{"Bid":0,"Ask":0},"2090":{"Bid":0,"Ask":0},
  "2100":{"Bid":0,"Ask":0},"2110":{"Bid":0,"Ask":0},"2120":{"Bid":0,"Ask":0},"2130":{"Bid":0,"Ask":0},"2140":{"Bid":0,"Ask":0},
  "2150":{"Bid":0,"Ask":0},"2160":{"Bid":0,"Ask":0},"2170":{"Bid":0,"Ask":0},"2180":{"Bid":0,"Ask":0},"2190":{"Bid":0,"Ask":0},
  "2200":{"Bid":0,"Ask":0},"2210":{"Bid":0,"Ask":0},"2220":{"Bid":0,"Ask":0},"2230":{"Bid":0,"Ask":0},"2240":{"Bid":0,"Ask":0},
  "2250":{"Bid":0,"Ask":0},"2260":{"Bid":0,"Ask":0},"2270":{"Bid":0,"Ask":0},"2280":{"Bid":0,"Ask":0},"2290":{"Bid":0,"Ask":0}};

  return aggOBref.set(SessionData.zeroAgg).then(function(evt){
    return admin.database().ref("Session3/Assets/").child("INTC").child("orderbook").remove();
  }).then(function(evt2){
    return admin.database().ref("Session3/").child("Transactions").remove();
  }).then(function(evt3) {
    return admin.database().ref("Session3/Users").once('value').then(function(snapshot) {
      let allUsers = snapshot.val();
      let keys = Object.keys(allUsers);
      let proms = []
      // -2 for StartingCash and user template
      for(let i = 0; i < keys.length - 2; i++){
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Assets").child("INTC").set(0));
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Assets").child("Cash").set(allUsers.StartingCash));
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Stats").child("AverageBuyPrice").set("N/A"));
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Stats").child("PL").set("N/A"));
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Stats").child("VWAPDifference").set("N/A"));
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Transactions").remove());
        proms.push(admin.database().ref("Session3/Users").child(keys[i]).child("Orders").remove());
      }
      return Promise.all(proms);
    })
  });
}

if (THISISLOCAL){
  doTheThing();
}
