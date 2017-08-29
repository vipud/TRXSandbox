var functions = require('firebase-functions');
var TaskTimer = require('tasktimer');
var PD = require("probability-distributions");
const admin = require('firebase-admin');
var jsonfile = require("jsonfile");

var serviceAccount = require("./TraderX-9fcc4a1362e4.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://traderx-a41b3.firebaseio.com"
});




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

// sim stuff ------------------------------------------------------------------
var simulator = {}; //"global" namespace

simulator.msPerSecond = 10;
simulator.buffer = 0;
simulator.gameTime = new Date("2017-06-12T09:30:00.000");
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

simulator.getVolume = function(){ //TODO: make this beta based
  return Math.floor(triangle(1,25,100));
}

var getBid = function(){
  return SessionData.bid;
}

var nearestTick = function(rawPrice){ // done
  var tick = getTick();
  return Math.round(rawPrice/tick)*tick;
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
  processOrder(order, order.UserId);
  reportEvent(`${extra} ORDER: ${JSON.stringify(order)}`);
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
  executeOrder(Order, "Momentum");
};

var pStarChange = function(){
  simulator.pStar = nearestTick(getNewPstar(simulator.pStar));
  reportEvent(`p-star change now: ${simulator.pStar}`);
};

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

  executeOrder(Order, "Informed");
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
      Order.Strike = nearestTick(triangle(bid*.99, Math.min(bid + tick, ask), ask)); //this spread
      Order.Class = "Limit";
    } else if (!patient){
      Order.Class = "Market";
      var ask = getAsk();
      Order.Strike = nearestTick(triangle(ask, ask*(1+0.0075), ask*(1+0.015))); //parameterize this spread
    }

  } else {
    //Sell order
    Order.Type = "Ask";

    if (!patient){
      Order.Class = "Market";
      var bid = getBid();
      Order.Strike = nearestTick(triangle(bid*(1-0.015), bid*(1-0.0075), bid)); //this spread
    } else {
      Order.Class = "Limit";
      var bid = getBid();
      var ask = getAsk();
      var tick = getTick();
      Order.Strike = nearestTick(triangle(bid, Math.max(ask - tick, bid), ask*1.01));
    }
  }
  executeOrder(Order, `Liquidity ${patient ? "Patient": "Impatient"}`);
};

var processEvent = function(eventType, event){ // done
  switch (eventType){
    case 'mom':
      momentumOrder();
      break;
    case 'inf':
      informedOrder();
      break;
    case 'pStar':
      pStarChange();
      break;
    case 'liq':
      liquidityOrder();
      break;
    default:
      reportEvent(eventType);
  }
};

var getNextEvent = function(){
  var event = simulator.events.shift();
  processEvent(event.type, event);
  if (!paused && simulator.events.length > 0){
    updateClock(event.secondsUntilNext);
    setTimeout(getNextEvent, Math.max(event.secondsUntilNext*simulator.msPerSecond - simulator.buffer, 0));
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



let removeFromOrderbook = function(strike, type, key, volume) {
  console.log("removeFromOrderbook called");
  return Promise.resolve(admin.database().ref("Session2/Assets/INTC/Orderbook")
  .child(strike).child(type).child(key).remove()).then(function () {
    if(type == "Bids") {
      admin.database().ref("Session2/Assets/INTC/AggOB").child(strike)
      .child("Bid").transaction(function(total) {
        console.log("transaction: " + total);
        console.log("Volume: " + volume);
        if(total == null) {
          return 0;
        }
        total-= volume;
        return total;
      });
    } else {
      admin.database().ref("Session2/Assets/INTC/AggOB").child(strike)
      .child("Ask").transaction(function(total) {
        console.log("transaction: " + total);
        console.log("Volume: " + volume);
        if(total == null) {
          return 0;
        }
        total -= volume;
        return total;
      });
    }
  });
}

let updateOrderbook = function(strike, type, key, newVolume) {
  return Promise.resolve(admin.database().ref("Session2/Assets/INTC/Orderbook")
  .child(strike).child(type).child(key).update({
    AheadOfThis: 0,
    UserID: 0,
    Volume: newVolume
  }));
}


let removeUserOrder = function(userID, key, assetid, rawStrike) {
  return Promise.resolve(
    admin.database().ref("Session2/Users/")
  .child(userID).child("Orders").child(assetid)
  .child(rawStrike).child(key).remove());
}

let updateUserOrder = function(order, key, newVolume) {
  return Promise.resolve(admin.database().ref("Session2/Users/")
  .child(0).child("Orders/")
  .child(key).update({
    AheadOfThis: order.AheadOfThis,
    UserID: order.UserID,
    Volume: newVolume
  }));
}




// let updateAllOrderbooks = function(order, key, newVolume) {
//   return Promise.resolve(updateOrder(order, key, newVolume)).then(function() {
//     return updateOrderbook(order, key, newVolume);
//   }).then(function() {
//     return updateAggOB(order);
//   });
// }

let cancelLimitOrder = function(orderID) {
  console.log("cancelLimitOrder called");
}

let cancelMarketOrder = function(orderID) {
  console.log("cancelMarketOrder called");
}



let createOrder = function(order, userId) {
  console.log("createOrder called");
  // expecting this
  // {
  //"AssetId" : "INTC",
  //"Strike" : "2202",
  //"Type" : "Bid",
  //"Volume" : 50
  // }
  // TODO: Make a validity check of the order here
  if (parseFloat(order.Strike) < 100){
    order.Strike = (100*parseFloat(order.Strike)).toFixed(0).toString();
  }

  if(order.Class == "Limit") {
    let orderKey = admin.database().ref("Session2/Users/").child(userId).child("Orders/")
    .child(order.AssetId).push().key;
    //TODO Should be created at the real orderbook and
    // THAT id should be reported to users
    let orderbook;
    return admin.database().ref("Session2/Assets/").child(order.AssetId)
    .child("/Orderbook").once('value').then(function(snapshot) {
      orderbook = snapshot.val();
    }).then(function() {
      return admin.database().ref("Session2/Users/").child(userId).child("Orders/")
      .child(order.AssetId).child(order.Strike).child(orderKey)
      .update(order);
    }).then(function() {
      return admin.database().ref("Session2/Assets/").child(order.AssetId)
      .child("Orderbook/").child(order.Strike).child(order.Type + "s")
      .child(orderKey).update({
        AheadOfThis: calcAheadOfThis(order.Strike, orderbook, order.Type),
        UserID: userId,
        Volume: order.Volume,
        Class: order.Class
      });
    }).then(function() {
      let prevVol;
      return admin.database().ref(`Session2/Assets/${order.AssetId}/AggOB`)
      .child(order.Strike).once('value').then(function(snapshot) {
        if(order.Type == "Bid") {
          //TODO: make this a transaction for when many things are happening at once
          prevVol= snapshot.val().Bid;
          return admin.database().ref(`Session2/Assets/${order.AssetId}/AggOB`)
          .child(order.Strike).child("Bid").set(parseInt(prevVol) + parseInt(order.Volume));
        } else {
          prevVol = snapshot.val().Ask;
          return admin.database().ref("Session2/Assets/INTC/AggOB")
          .child(order.Strike).child("Ask").set(parseInt(prevVol) + parseInt(order.Volume));
        }
      });
    });
  } else {
    let orderKey = admin.database().ref("Session2/Users/").child(userId).child("Orders/")
    .child(order.AssetId).push().key; //TODO: same note as above
    return Promise.resolve(
      admin.database().ref("Session2/Users/").child(userId).child("Orders/")
      .child(order.AssetId).child("M").child(orderKey)
      .update(order)).then(function() {
        return admin.database().ref("Session2/Assets/").child(order.AssetId)
        .child("/Orderbook").once('value').then(function(snapshot) {
          let listOfStrikes = handlePlaceMarketOrder(snapshot.val(), order);
          for(let i = 0; i < listOfStrikes.length; i++) {
            let limitOrder = {
              AssetId: order.AssetId,
              Class: "Limit",
              Strike: listOfStrikes[i].strike,
              Type: order.Type,
              Volume: listOfStrikes[i].sum
            };
            Promise.resolve(
              admin.database().ref("Session2/Users/").child(userId).child("Orders/")
              .child(order.AssetId).child(limitOrder.Strike).child(orderKey)
              .update(limitOrder)).then(function() {
                return admin.database().ref("Session2/Assets/").child(order.AssetId)
                .child("Orderbook/").child(limitOrder.Strike).child(limitOrder.Type + "s")
                .child(orderKey).update({
                  AheadOfThis: 0,
                  UserID: userId,
                  Volume: limitOrder.Volume
                });
              }).then(function() {
                return admin.database().ref("Session2/Assets/").child(order.AssetId)
                .child("/Orderbook").once('value').then(function(snapshot) {
                  return checkForCompleteOrders(snapshot.val());
                });
              });
          }

        });
      }).then(function() {
        return admin.database().ref("Session2/Users/").child(userId).child("Orders/")
        .child(order.AssetId).child("M").child(orderKey).remove();
      });
  }
}

let handlePlaceMarketOrder = function(orderbook, order) {
  console.log("handlePlaceMarketOrder called");
  let listOfStrikes = [];
  let length = Object.keys(orderbook).length; //might be larger than we want?
  let totalSum = 0;
  let originalDesiredVolume = order.Volume;
  for(let i = 0; i < length; i++) {
    let rawStrike = Object.keys(orderbook)[i];
    let oppositeOrders;
    if(order.Type == "Ask") {
      oppositeOrders = removeKeys(orderbook[rawStrike].Bids);
    } else {
      oppositeOrders = removeKeys(orderbook[rawStrike].Asks);
    }
    if(!oppositeOrders) {
      break;
    }
    let sum = 0;
    for(let j = 0; j < oppositeOrders.length; j++) {
      sum = sum + oppositeOrders[j].Volume;
    }
    order.Volume -= sum;
    if(i == length-1) {
      listOfStrikes.push({strike: rawStrike, sum: order.Volume});
    } else {
      listOfStrikes.push({strike: rawStrike, sum: sum});
    }

    totalSum += sum;
    if(totalSum >= originalDesiredVolume) {
      break;
    }
  }
  return listOfStrikes;
}

let placeLimitOrder = function(order, userId) {
  console.log("placeLimitOrder called");
  // expecting this
  // {
  //"AssetId" : "INTC",
  //"Strike" : "2202",
  //"Type" : "Bid",
  //"Volume" : 50
  // }
  // AggOb probabally isn't updating
  // order created in AggOB, The Orderbook, and User's Orderbook
  return Promise.resolve(createOrder(order, userId));

}

let placeMarketOrder = function(order, userId) {
  console.log("placeMarketOrder called");
  // expecting this
  // {
  //"AssetId" : "INTC",
  //"Strike" : "2202",
  //"Type" : "Bid",
  //"Volume" : 50
  // }
  return Promise.resolve(createOrder(order, userId));
}

 let createTransaction = function(order, type, strike, userId) {
   console.log("Creating transaction" + userId + " " + type);
   let transKey = admin.database().ref("Session2/Users/")
   .child(userId).child("Transactions")
   .push().key;

   const prom1 = Promise.resolve(
     admin.database().ref("Session2/Users/")
     .child(userId).child("Transactions")
     .child(transKey).update({
       AssetId: "INTC",
       Price: strike,
       Time: "IDK HOW TO GENERATE THIS YET",
       Type: type,
       Class: order.Class,
       Volume: order.Volume
     }));
   console.log("transaction created: " + order + " " + type);

   const prom2 = Promise.resolve(
     admin.database().ref("Session2/Assets/INTC").update({CurrentAssetPrice: strike}));
   return Promise.all([prom1, prom2]);
 }





let userTransaction = function(userID, type, assetID, strike, transactionVolume) {
  let transKey = admin.database().ref("Session2/Users/")
  .child(userID).child("Transactions")
  .push().key;

  return Promise.resolve(
    admin.database().ref("Session2/Users/")
    .child(userID).child("Transactions")
    .child(transKey).update({
      AssetId: assetID,
      Price: strike,
      Time: "IDK HOW TO GENERATE THIS YET",
      Type: type,
      Class: "Need to determine Class",
      Volume: transactionVolume
    })).then(function() {
      return admin.database().ref("Session2/Assets/").child(assetID).child("AggOB/")
      .child(strike).child(type).transaction(function(currVol) {
        return currVol - transactionVolume;
      });
    });
}

let getGameTime = function () {
  return simulator.gameTime.toLocaleTimeString();
}

let createTransactionRecord = function(order, newOrder, strike, transactionVolume) {
  // TODO
  // is this suppose to be ONE or TWO transactions? Right now coded for one?
  let transKey = admin.database().ref("Session2/Transactions").push().key;
  return Promise.resolve(
    admin.database().ref("Session2/Transactions/").child(transKey).update({
      AssetId: order.assetID,
      Price: strike,
      Time: getGameTime(),
      Volume: transactionVolume,
      Type: newOrder.Type == "Ask" ? "Sell" : "Buy"
    }));
}

let userUpdateOrderBook = function(order, strike, transactionVolume) {
  let orderId = Object.keys(order)[0];
  if(order.volume - transactionVolume === 0) {
    // delete order
    return Promise.resolve(admin.database().ref("Session2/Users/")
    .child(order.UserId).child("Orders/").child(order.AssetId).child(strike)
    .child(orderId).remove());
  } else {
    // update order
    return Promise.resolve(admin.database().ref("Session2/Users/")
    .child(order.UserId).child("Orders/").child(order.AssetId).child(strike)
    .child(orderId).child(Volume).set(order.Volume - transactionVolume));
  }
}



let setSessionOrderBook = function(orderbook) {
  let assetId = "INTC";
  return Promise.resolve(admin.database().ref("Session2/Assets/")
  .child(assetId).child("orderbook").update(orderbook));
}

let userCreateLimitOrder = function(order, userId) {
  console.log(order);
  let orderId = admin.database().ref("Session2/Users/").child(userId)
  .child("Orders").child(order.AssetId).child(order.Strike).push().key;

  return Promise.resolve(admin.database().ref("Session2/Users/").child(userId)
  .child("Orders").child(order.AssetId).child(order.Strike).child(orderId)
  .set(order)).then(function() {
    return admin.database().ref("Session2/Assets").child(order.AssetId)
    .child("AggOB").child(order.Strike).child(order.Type).transaction(function(currVol) {
      return currVol + order.Volume;
    })
  });
}

// delete orders if they are of type delete
let deleteOrder = function(userId, assetId, strike, orderId, volume, type) {
  console.log("Delete order called");
  return admin.database().ref("Session2/Assets/").child(assetId).child("AggOB")
  .child(strike).child(type).transaction(function(currVol) {
    return currVol - volume;
  }).then(function() {
    orderbook.deleteOrder();
    setSessionOrderBook(orderbook.toJSON());
  });

}

let fulfillTransaction = function(order, newOrder, strike, orderbook){
  //this strike is of the form "2020"
  console.log("Preforming transaction");
  var transactionVolume = orderbook.fillOrder(order, newOrder.Volume, strike); //don't change order2 but return volume of transaction
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
  setSessionOrderBook(orderbook.toJSON());

  return transactionVolume;
}

var createLimitOrder = function(order, userId, orderbook){
  //order cannot be filled
  let newOrder = orderbook.createLimitOrder(order, userId); //has a Strike price
  console.log("Look here");
  //Firebase side:
  userCreateLimitOrder(newOrder, userId); //order has Strike, and this cannot be fulfilled, so place limit order
  console.log("set prob");
  setSessionOrderBook(orderbook.toJSON());
}

var OrderBook = function(obJSON){
   var self = this;
   //console.log(obJSON);
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
     let len = Object.keys(this["Strike"][newOrder.Strike][newOrder["Type"]+"s"]).length;
     let last;
     if(len === 0) {
       last = {
         AheadOfThis: 0,
         Volume: 0
       };
     } else {
       let key = Object.keys(this["Strike"][newOrder.Strike][newOrder["Type"]+"s"])[len-1];
       let last = this["Strike"][newOrder.Strike][newOrder["Type"]+"s"][key];
     }
     SessionData.guid++;
     console.log(last);
     // TODO check for concurrency on guid
     let order ={
       Volume : newOrder["Volume"],
       UserId : user,
       AheadOfThis : parseInt(last.AheadOfThis) + parseInt(last.Volume),
       Class: "Limit",
       Type: newOrder.Type,
       Strike: newOrder.Strike,
       OrderId: SessionData.guid,
       AssetId: newOrder.AssetId
     }

     self.Strike[newOrder.Strike][newOrder.Type + "s"][order.OrderId] = order;

     console.log(order, newOrder);
     console.log("Made the limit order");
     return order;
   };

   this.fillOrder = function(existingOrder, volumeDesired, strikeAsInt){
      if(existingOrder.Volume > volumeDesired){
        existingOrder.Volume -= volumeDesired;
        return volumeDesired;
      }
      else{
        let tmp = existingOrder.Volume;
        delete self.Strike[existingOrder["Strike"]][existingOrder["Type"]+"s"][existingOrder.OrderId];
        return tmp;
      }
     // please return the volume of the actual transaction and remove
     // the existing order if it was knocked out
   };

   this.getBid = function(){
     // TODO this presumes order of self.Strike keys
     let max = "0";

     for (let strike in self.Strike){
       if (self.Strike[strike]["Bids"] === undefined){
       }
       else{
         if(parseInt(max) < parseInt(strike)) {
           max = strike;
           key = Object.keys(self.Strike[strike]["Bids"])[0];
         }
       }
     }
     if(max == '0') {
      //  self.createLimitOrder({
      //    Strike: (nearestTick(simulator.pStar - getTick())*100).toFixed(0),
      //    UserId: 0,
      //    Class: "Limit",
      //    Type: "Bid",
      //    Volume: Math.floor(triangle(1,25,100)),
      //    AssetId: "INTC",
      //    AheadOfThis: 0
      //  }, 0)
       return max;
     }
     let ans = JSON.parse(JSON.stringify(self.Strike[max]["Bids"][key]));
     ans.Strike = max;
     ans.OrderId = key;
     ans.AssetId = "INTC";
     SessionData.bid = max;
     return ans;
     //return {strike:max, first:key};
   };

   this.getAsk = function(){
     // TODO this presumes order of self.Strike keys
     let min = "999999";
     for (let strike in self.Strike){
       if (self.Strike[strike]["Asks"] === undefined){
       }
       else{
         if(parseInt(min) < parseInt(strike)) {
           min = strike;
           key = Object.keys(self.Strike[strike]["Asks"])[0];
         }

       }
     }
     if(min == '999999') {
      //  self.createLimitOrder({
      //    Strike: (nearestTick(simulator.pStar + getTick())*100).toFixed(0),
      //    UserId: 0,
      //    Class: "Limit",
      //    Type: "Ask",
      //    Volume: Math.floor(triangle(1,25,100)),
      //    AssetId: "INTC",
      //    AheadOfThis: 0
      //  }, 0)
       return min;
     }
     let ans = JSON.parse(JSON.stringify(self.Strike[min]["Asks"][key]));
     ans.Strike = min;
     ans.OrderId = key;
     ans.AssetId = "INTC";
     SessionData.ask = min;
     return ans;
   };
   this.toJSON = function(){
      return self.Strike;
   };
   this.deleteOrder = function(existingOrder){
      delete self.Strike[existingOrder["Strike"]][existingOrder["Type"]+"s"][existingOrder.OrderId];
   }
}


var getOrderBook = function(order){
    return admin.database().ref("Session2/Assets/").child(order.AssetId)
    .child("/Orderbook").once('value').then(function(snapshot) {
      return new OrderBook(snapshot.val());
    });
}

var checkForTransaction = function(orderbook, order, userId){
  console.log("Looking for transaction");
  var fillableOrder = orderbook.canFillTransaction(order); //should include strike in returned order
  if (!fillableOrder){
    //possibly place limit follow-up
    console.log("Creating order");
    if (order.Class == "Market"){
      return;
    } else {
      console.log("Creating limit order");
      return createLimitOrder(order, userId, orderbook); //order has a Strike
    }
  } else {
    console.log("Filling order");
    order.Volume -= fulfillTransaction(fillableOrder, order, fillableOrder.Strike, orderbook);
    checkForTransaction(orderbook, order, userId);
  }
}

let processOrder = function(order, userId) {
  console.log("processOrder called");

  //grab orderbook copy
  if (parseFloat(order.Strike) < 100){
    order.Strike = (100*parseFloat(order.Strike)).toFixed(0).toString();
  }
  var orderbook = getOrderBook(order);
  orderbook.then(function(realOrderbook) {
    checkForTransaction(realOrderbook, order, userId);
  });



  //check for transactions
  //make them until no more transactions
  //decide if a limit follow-up should be placed

  // expecting this
  // {
  //"AssetId" : "INTC",
  //"Strike" : "2202",
  //"Type" : "Bid",
  //"Volume" : 50,
  //"Class" : Limit,
  //"UserId" : someNum
  // }

  // We need to add a type for market or limit
  /*if(order.Class == "Limit") {
    Promise.resolve(placeLimitOrder(order, userId)).then(function() {
      // Check for complete orders
      return admin.database().ref("Session2/Assets/").child(order.AssetId)
      .child("/Orderbook").once('value').then(function(snapshot) {
        return checkForCompleteOrders(snapshot.val());
      }); //TODO Could convert OrderBook to object in local memory rather than in DB
      //If we want a long pause then we'll want function to die and make
      //a quick snapshot of the local storage for later
    });
  } else {
    Promise.resolve(placeMarketOrder(order, userId)).then(function() {
      // Check for complete orders
      return admin.database().ref("Session2/Assets/").child(order.AssetId)
      .child("/Orderbook").once('value').then(function(snapshot) {
        return checkForCompleteOrders(snapshot.val());
      });
    });
  }
  // Check for complete orders
  return admin.database().ref("Session2/Assets/").child(order.AssetId)
  .child("/Orderbook").once('value').then(function(snapshot) {
    return checkForCompleteOrders(snapshot.val());
  });
  */
}



let calcAheadOfThis = function(rawStrike, orderbook, type) {
  console.log("calcAheadOfThis called: " + rawStrike + " "
  + orderbook + " " + type);
  if(orderbook === null) {
    return 0
  } else {
    let strike = orderbook[rawStrike];
    let orders = Object.keys(strike);
    let strikeLength = 0;
    let order;

    if(type == "Bid") {
      strikeLength = removeKeys(strike.Bids).length;
      order = removeKeys(strike.Bids);
    } else {
      strikeLength = removeKeys(strike.Asks).length;
      order = removeKeys(strike.Asks);
    }
    if(order[strikeLength - 1] == undefined) {
      return 0;
    }
    let prevOrderVol = order[strikeLength - 1].Volume;
    let prevOrderAheadOfthis = order[strikeLength - 1].AheadOfThis;
    let totalVol = parseInt(order[strikeLength-1].Volume) + parseInt(order[strikeLength-1].AheadOfThis)

    return parseInt(prevOrderVol) + parseInt(prevOrderAheadOfthis);
  }
}

let checkForCompleteOrders = function(orderbook, currentStrikeIndex=0) {
  console.log("checkForCompleteOrders called");
  if(orderbook == null) {
    return null;
  }
  if (Object.keys(orderbook).length >= currentStrikeIndex){
    //update bid and ask
    var tempask = 100;
    var tempbid = 0;
    var keys = Object.keys(orderbook);
    for(var i = 0; i < keys.length; i++){
      var thisStrike = keys[i];
      if (!!getFirstAsk(thisStrike)){
        if (parseFloat(thisStrike)/100 < tempask){
          tempask = parseFloat(thisStrike)/100;
        }
      } else {
        if (!!getFirstBid(thisStrike)){
          if (parseFloat(thisStrike)/100 > tempbid){
            tempbid = parseFloat(thisStrike)/100;
          }
        }
      }
    }
    SessionData.bid = tempbid.toFixed(2);
    SessionData.ask = tempask.toFixed(2);
    return null;
  }
  let rawStrike = Object.keys(orderbook)[currentStrikeIndex];
  let strike = orderbook[rawStrike]; //this object has the Ask Queue and Bid Queue
  console.log("Loopingggggggggggggggggggggggggg");
  let ask = getFirstAsk(strike);
  let bid = getFirstBid(strike);
  if(bid == undefined || ask == undefined) {
    return checkForCompleteOrders(orderbook, currentStrikeIndex+1); //Andy's Nervous about this ordering of object keys
  } else {
    let firstAskKey = Object.keys(strike.Asks)[0];
    let firstBidKey = Object.keys(strike.Bids)[0];
    let askOrder = strike.Asks[firstAskKey];
    let bidOrder = strike.Bids[firstBidKey];
    if(ask.Volume == bid.Volume) {
      // this needs to remove both
      Promise.resolve(removeFromOrderbook(rawStrike, "Asks", Object.keys(strike.Asks)[0]), ask.Volume).then(function() {
        removeFromOrderbook(rawStrike, "Bids", Object.keys(strike.Bids)[0], bid.Volume);
      }).then(function() { //TODO: createTransaction(order1, order2, strike, userId1, userId2);
        return createTransaction(bidOrder, "Bid", rawStrike, bidOrder.UserID);
      }).then(function() {
        return createTransaction(askOrder, "Ask", rawStrike, askOrder.UserID);
      }).then(function() {
        return removeUserOrder(bidOrder.UserID, firstBidKey, "INTC", rawStrike); //TODO: AssetId
      }).then(function() {
        return removeUserOrder(askOrder.UserID, firstAskKey, "INTC", rawStrike);
      }).then(function() {
        return admin.database().ref("Session2/Assets/").child("INTC")
        .child("/Orderbook").once('value').then(function(snapshot) {
          return checkForCompleteOrders(snapshot.val(), currentStrikeIndex);
        });
      });
    } else if(ask.Volume > bid.Volume) {
        let newAskVol = ask.Volume - bid.Volume;
        return Promise.resolve(removeFromOrderbook(rawStrike, "Bids", firstBidKey, bid.Volume)).then(function(){
          return updateOrderbook(rawStrike, "Asks", firstAskKey, newAskVol);
        }).then(function() {
          return createTransaction(bidOrder, "Bid", rawStrike, bidOrder.UserID);
        }).then(function() {
          return createTransaction(askOrder, "Ask", rawStrike, bidOrder.UserID);
        }).then(function(){
          return removeUserOrder(bidOrder.UserID, firstBidKey, "INTC", rawStrike);
        }).then(function(){
          return admin.database().ref("Session2/Assets/").child("INTC")
          .child("/Orderbook").once('value').then(function(snapshot) {
            return checkForCompleteOrders(snapshot.val(), currentStrikeIndex);
          });
        });
    } else {
      let newBidVol = bid.Volume - ask.Volume;
      return Promise.resolve(removeFromOrderbook(rawStrike, "Asks", firstAskKey, ask.Volume)).then(function(){
        return updateOrderbook(rawStrike, "Bids", firstBidKey, newBidVol);
      }).then(function() {
        return createTransaction(askOrder, "Ask", rawStrike, askOrder.UserID);
      }).then(function() {
        return createTransaction(bidOrder, "Bid", rawStrike, bidOrder.UserID);
      }).then(function(){
        return removeUserOrder(askOrder.UserID, firstAskKey, "INTC", rawStrike);
      }).then(function(){
        return admin.database().ref("Session2/Assets/").child("INTC")
        .child("/Orderbook").once('value').then(function(snapshot) {
          return checkForCompleteOrders(snapshot.val(), currentStrikeIndex);
        });
      });
    }
  }
}

let getFirstBid = function(strike) {
  console.log("getFirstBid called");
  let bids = strike.Bids;
  let firstBid = removeKeys(bids)[0];
  return firstBid;
}

let getFirstAsk = function(strike) {
  console.log("getFirstAsk called");
  let asks = strike.Asks;
  let firstAsk = removeKeys(asks)[0];
  return firstAsk;
}

// updates the last sell price and add this to timeseries
let updateCurrentAssetPrice = function() {
  console.log("updateCurrentAssetPrice() was called");
}

let initializeMarket = function(){
  return;
}

let doTheThing = function() {
  initializeMarket();
  simulator.events = simulateDay(100,50,50,3,0.2);
  getNextEvent();
}

doTheThing();
