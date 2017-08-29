var functions = require('firebase-functions');
var PD = require("probability-distributions");
const admin = require('firebase-admin');
var jsonfile = require("jsonfile");
let userPendingListener;
let orderPendingListeners = [];
let deletesPendingListeners = [];
var THISISLOCAL = false;
let CREATEUNIQUESESSION = false;
let RUNFULLSIM = true;
let RESETAFTER = 5
var paused = false;

// should be firebase key
let session = "Sessions/-Kr1L3P5C2AuE4-MnPSb";

let reset = function() {
  var SessionData = {};// global namespace
  SessionData.bid = 21.30;
  SessionData.ask = 22.40;
  SessionData.run = 0;
  SessionData.lastPrice = 0.00;
  SessionData.guid = 1000;
  SessionData.priceVolumeAccumulator = 0;
  SessionData.totalVolume = 0;
  SessionData.secsRunning = 0;

  var simulator = {}; //"global" namespace
  simulator.msPerSecond = 0;
  simulator.buffer = 0;//300;
  simulator.gameTime = new Date(1499679000000); //07/13/2017 @ 9:30am (UTC)
  simulator.pStar = 21;
  simulator.timeSeries = [];
  // ACTUAL TIMEKEEPING
  simulator.gameStart = new Date(1499679000000); //07/13/2017 @ 9:30am (UTC)
  simulator.timeDate = new Date(1499074200000).toUTCString(simulator.start);
  simulator.inASimulation = true;
  simulator.numberOfDays = 3;
  simulator.VWAP = 0;
  simulator.getTime = function(){//Unix Time Stamp
      let time = new Date().getTime();
      return time;
  }
  simulator.sinceStart = function(){//Real world ms since game start
      return simulator.getTime() - simulator.startTime;
  }
  simulator.firstTime = function(){
      return simulator.gameStart.toUTCString();
  }
  simulator.currentGameTime = function(){//calculates ingame time from real world ms
      if(simulator.inASimulation) {
        return simulator.gameTime;
      } else {
        return new Date(Math.round((simulator.sinceStart()*(1/simulator.msPerSecond))*1000 + simulator.gameStart.getTime()));
      }
  }
  simulator.initializetime = function(dayNumber){
    simulator.startTime = new Date();
    if(dayNumber > 0) {
      newDay();
    }
  }
  simulator.getVolume = function(){ //TODO: make this beta based
    return Math.max(2, Math.floor(triangle(2,45,100)));
  }
  return {sd:SessionData, sim: simulator};
}

var result = reset();
var SessionData= result.sd;
var simulator = result.sim;

if (THISISLOCAL){
  var serviceAccount = require("../stuff/traderxsandbox-firebase-adminsdk-yppre-44e7628c92.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://traderxsandbox.firebaseio.com/"
  });
  if(CREATEUNIQUESESSION) {
    session = "Sessions/" + admin.database().ref("Sessions/").push().key;
  }
} else {
  admin.initializeApp(functions.config().firebase);
  if(CREATEUNIQUESESSION) {
    session = "Sessions/" + admin.database().ref("Sessions/").push().key;
  }
  /*
  Firebase function: This trigger runs when Sessions/{sessionId}/StartSim/start is
   set to anything, by habit we set it to true. Once start is set we set running to 1
   indicating the sim is running. This preents this method from starting antoher
   in the same spot in the database. This method starts the game by calling
   doTheThing();
  */
  exports.startSession = functions.database
  .ref("{institutionId}/Sessions/{sessionId}/StartSim/start").onWrite(event => {
    if(!event.data.val()){
      console.log("Returning nul, this is false", event.data.val());
      return null;
    }
    console.log("Start=", event.data.val());
    session = event.params.institutionId + "/Sessions/" + event.params.sessionId;
    console.log("startSession Called");
    return admin.database().ref(session).child("/StartSim/").child("Ready/").once("value").then(function(ss){
      if(ss.val()) {
        simulator.inASimulation = false;
        return admin.database().ref(session).child("/StartSim/running").once("value").then(function(ss2){
          if (!ss2.val()){
            return admin.database().ref(session).child("/StartSim/running").set("1").then(function(){
              return doTheThing(simulator.numberOfDays+1);
            }).catch(error =>{
              console.error(error.stack);
            });
          } else {
            console.log("WHY WAS THIS CALLED?!?!?*****");
            return null;
          }
        });
      } else {
        console.log("Running local sim");
        return null;
      }
    });
  });

  // exports.neverStopPartying = functions.database.ref("{institutionId}/Sessions/{sessionId}/StartSim/ResetTimeOut").onWrite(event=> {
  //   console.log("neverStop is firing");
  //   if(event.data.val() === null){
  //     return null;
  //   } else {
  //     //console.log("Reaches here");
  //     session = event.params.institutionId + "/Sessions/" + event.params.sessionId;
  //     let ref = admin.database().ref(session).child("/StartSim");
  //     return ref.child("ResetTimeOut").remove().then(function() {
  //       return ref.once('value').then(function(snapshot){
  //         if(snapshot.val().State === "Running"){
  //           setTimeout(function(){
  //             return ref.once('value').then(function(snapshot){
  //               if(snapshot.val().State === "Running"){
  //                 console.log("Reseting Time Out");
  //                 return pauseUnpause();
  //               }
  //             });
  //           }, RESETAFTER*60*1000);
  //           //RESETAFTER*60*1000
  //         } else {
  //           //console.log("if is false");
  //           return null;
  //         }
  //       });
  //     });
  //   }
  // });

  /*
  Firebase function: this trigger runs before the game to set up the three dat sim.
  It listens on when Sessions/{sessionId}/GameParams are created and creates a
  playable session for U.I and calls doTheSuperThing()
  */
  exports.runBeforeSim = functions.database.ref("{institutionId}/Sessions/{sessionId}/GameParams").onWrite(event =>{
    let institutionId = event.params.institutionId;
    let sessionId = event.params.sessionId;
    var result = reset();
    SessionData= result.sd;
    simulator = result.sim;

    session = institutionId + "/Sessions/" + sessionId;
    simulator.inASimulation = true;
    if(!event.data.val()) {
      return null;
    }
    return admin.database().ref(session).child("/Info").once('value').then(function(snapshot) {
      let info = snapshot.val();
      return admin.database().ref(institutionId).child("PlayableSessions/").child(sessionId).set(info);
    }).then(function() {
      return doTheSuperThing().then(function() {
        return admin.database().ref(session).child("/StartSim/")
        .child("Ready/").set(true);
      }).catch(error=> {
        console.error(error);
      });
    });
  });



}

let pauseUnpause = function() {
  return admin.database().ref(session).child("StartSim/start").set(false).then(function(){
    return admin.database().ref(session).child("StartSim/State").set("Paused");
  }).then(function(){
    return admin.database().ref(session).child("StartSim/running").remove();
  }).then(function(){
    return admin.database().ref(session).child("StartSim/start").set(true);
  }).then(function(){
    return admin.database().ref(session).child("StartSim/State").set("Running");
  });
}

// This method is not yet implimented
let loadGame = function() {
  return loadSessionData().then(function() {
    return loadSimulator();
  }).then(function() {
    return loadEvents();
  });
}

/*
days: Int, default is 0; the current day of the sim, usually between 0-4

Helper function for Firebase Function runBeforeSim() and called automatically
at end of file when run locally;
Purpose: To initialize everything and run the 3 day pregame sim.
Returns: Promise
*/
var doTheSuperThing = function(days=0) {
  return initializeMarket().then(function() {
    return Promise.resolve(doTheThing(days));
  }).then(function() {
    return saveData(SessionData, simulator);
  }).then(function() {
    return admin.database().ref(session).child("/TimeSeries").set(simulator.timeSeries);
  }).then(function(){
    if(THISISLOCAL && RUNFULLSIM) {
      return doTheThing(simulator.numberOfDays+1);
    } else {
      return null;
    }
  });
}

var rectifyTimes = function(){
  if(simulator.inASimulation === false){
    simulator.startTime = new Date(-(simulator.msPerSecond/1000)*(simulator.gameTime.getTime() - simulator.gameStart.getTime())+new Date().getTime() );
  }
}

/*
days: Int, the current day of the sim, usually between 0-4

Helper function for Firebase Function startSession(), getNextEvent(), and
 doTheSuperThing().
Purpose: To generate events for the game sim and start the recursion loop
 that runs our game.
Returns: Promise
*/
var doTheThing = function(days) {
  console.log(`starting day ${days}`);
  if(simulator.inASimulation) {
    console.log("simulating day in simulation", days);
    // pregame         simulateDay(150, 100, 50, 3, 1);
    simulator.events = simulateDay(150, 100, 50, 3, 1);
    return getNextEvent(days);
  } else {
    console.log("Running a day asign sim params", days);
    return loadEvents().then(function(){
      if(simulator.events.length === 0) {
        console.log("Starting Game");
        return startGame(days);
      } else {
        console.log("Resuming Game");
        return resumeGame(days);
      }
    });
  }
}


let resumeGame = function(days){
  return loadSimulator().then(function(){
    //SessionData.zeroAgg = {};
    return loadSessionData();
  }).then(function(){
    return stopListening();
  }).then(function() {
    assignListenersExsistingUsers();
    //assignListeners();
    return getNextEvent(days);
  });
}

/*
days: Int, the current day of the sim, usually between 0-4

Helper function for doTheThing()
Purpose: initializes the market and assign Listeners to every user. After this is
 done, it starts the game calling our recursive game engine, getNextEvent()
*/
let startGame = function(days) {
  return initializeMarket().then(function(){
    return assignListeners();
  }).then(banana=>{
    //simulator.events = y(100,50,50,3,1);
    return assignSimParams();
  }).then(function() {
    return getNextEvent(days);
  });
}

/*
days: Int, the current day of the sim, usually between 0-4

Main game engine
Purpose: This functon keeps calling itself as long as there are events still left
 in the day. It takes the current event and processes it. This is the life of our
 simulation.
Returns: Promise
*/
var getNextEvent = function(days){
  var event = simulator.events.shift();
  processEvent(event.type, event, days);
  if (!paused && simulator.events.length > 0){
    updateClock(event.secondsUntilNext);
    rectifyTimes();
    return delay(Math.max(event.secondsUntilNext*simulator.msPerSecond - simulator.buffer, 0)).then(function() {
      return saveData(SessionData,simulator).then(function() {
        return getNextEvent(days);
      }).catch(error=> {
        console.log(error);
      });
    });
  } else {
    console.log("Sim over", days);
    if(!simulator.inASimulation) {
      return endGame();
    }else {
      days = days + 1;
      console.log("Day: " + days);
      if(days >= simulator.numberOfDays) {
        console.log("Before sim over", days);
        simulator.inASimulation = false;
        return saveData(SessionData, simulator);
      } else {
        return doTheThing(days);
      }
    }
  }
};

/*
Purpose: Cleans up the game when its over, removes listeners and changes the
 status of running
Returns: Promise
*/
let endGame = function() {
  return stopListening().then(function(){
    return admin.database().ref(session).child("/UserArray/").remove();
  }).then(function(){
    return admin.database().ref(session).child("/StartSim/").child("running").remove();
  }).then(function(){
    console.log("End Game");
    return admin.database().ref(session).child("StartSim/State").set("Over");
  });
}

/*
Purpose: Assignes all neccessary listners to all users in a session and sets up
 user Stats to starting state
*/
let assignListeners = function() {
   userPendingListener = admin.database().ref(session).child("/UsersPending/").on('child_added', function(snapshot) {
    let user = snapshot.val();
    return admin.database().ref(session).child("/Users").once('value').then(function(snapshot) {
      let users = snapshot.val();
      if(!users) {
        let orderlistener = assignOrderListener(user.uid);
        let deleteListener = assignDeleteListener(user.uid);
        orderPendingListeners.push(orderlistener);
        deletesPendingListeners.push(deleteListener);
        return Promise.resolve();
      } else {
        let usersKeys = Object.keys(users);
        if(!findUser(usersKeys, user.uid)) {
          let orderlistener = assignOrderListener(user.uid);
          let deleteListener = assignDeleteListener(user.uid);
          orderPendingListeners.push(orderlistener);
          deletesPendingListeners.push(deleteListener);
        }
      }
    }).then(function() {
      return setUpUsers(user).then(function() {
        return admin.database().ref(session).child("/UsersPending/")
        .child(snapshot.key).remove();
      });
    });
  });
}

let assignListenersExsistingUsers = function() {
  userPendingListener = admin.database().ref(session).child("/Users/").on('child_added', function(snapshot) {
   let user = snapshot.val();
   let userID = snapshot.key;
   //console.log("user id: ", userID);
   let orderlistener = assignOrderListener(userID);
   let deleteListener = assignDeleteListener(userID);
   orderPendingListeners.push(orderlistener);
   deletesPendingListeners.push(deleteListener);
  });
}

// jackson helper function ignore
let findUser = function(usersKeys, userId) {
  for(let i = 0; i < usersKeys.length; i++) {
    if(usersKeys[i] == userId) {
      return true;
    }
  }
  return false;
}

/*
user: {userId, displayName}
Helper function for assignListeners()

Purpose: put user in correct spot in database and resetUserVitals
Returns: Promise
*/
let setUpUsers = function(user) {
  return admin.database().ref(session).child("/Users").child(user.uid).once('value').then(function(snap){
    if(snap.val() === null) {
      return admin.database().ref(session).child("/Users/").child(user.uid)
      .child("/DisplayName/").set(user.displayName).then(function() {
        return resetUserVitals(user.uid);
      });
    }
  });
}

/*
userId: String, unique id for the user

Helper function for initializeMarket() and setUpUsers()
Purpose: Initalzes user stats to default settings, resets transaction, orders
 assets.
Returns: Promise
*/
let resetUserVitals = function(userId) {
  let statsRef = admin.database().ref(session).child("/Users/").child(userId).child("/Assets/").child("INTC/").child("Stats/");
  let proms = []
  console.log("initializing stats and assets");
  proms.push(statsRef.child("Shares").set(0));
  proms.push(statsRef.child("PL").set(0));
  proms.push(statsRef.child("NetVWAP").set(0));
  proms.push(statsRef.child("NetPriceVolumeAccumulator").set(0));
  proms.push(statsRef.child("NetTotalVolume").set(0));
  proms.push(statsRef.child("VWAPDifference").set(0));
  proms.push(statsRef.child("BuyVWAP").set(0));
  proms.push(statsRef.child("BuyPriceVolumeAccumulator").set(0));
  proms.push(statsRef.child("BuyTotalVolume").set(0));
  proms.push(statsRef.child("SellVWAP").set(0));
  proms.push(statsRef.child("SellPriceVolumeAccumulator").set(0));
  proms.push(statsRef.child("SellTotalVolume").set(0));
  proms.push(statsRef.child("ShortTermAccumulator").set(0));
  proms.push(statsRef.child("Position").set("None"));
  proms.push(statsRef.child("ThisPosition").set(0));
  proms.push(statsRef.child("ShortTermVolume").set(0));
  proms.push(statsRef.child("Mission").set(Math.random()<.5 ? "Buy 1000" : "Sell 1000"));
  proms.push(admin.database().ref(session).child("/Users").child(userId).child("Transactions").remove());
  proms.push(admin.database().ref(session).child("/Users").child(userId).child("Orders").remove());
  proms.push(admin.database().ref(session).child("/Users/").child(userId).child("/Assets/").child("Cash").set(0));
  return Promise.all(proms);
}

/*
SessionData: {bid, ask, run, lastPrice, orderbook, guid}
simulator: {msPerSecond, buffer, gameTime, pStar, events,
 timeSeries, gameStart, timeDate, startTime}

Helper function for doTheSuperThing() and getNextEvent()
Purpose: Saves all important data
Returns: Promise
*/
let saveData = function(SessionData, simulator) {
  if(!simulator.inASimulation) {
    return Promise.resolve(saveSessionData(SessionData)).then(function() {
      return saveSimulator(simulator);
    });
  } else {
    return Promise.resolve(null);
  }
}

/*
SessionData: {bid, ask, run, lastPrice, orderbook, guid}

Helper function for saveData()
Purpose: Saves the SessionData
Returns: Promise
*/
let saveSessionData = function(SessionData) {
  let object = {
    bid: SessionData.bid,
    ask: SessionData.ask,
    run: SessionData.run,
    lastPrice: SessionData.lastPrice,
    orderbook: SessionData.orderbook.toJSON(),
    guid: SessionData.guid
  }
  return admin.database().ref(session).child("/ImportantData/SessionData").set(object);
}

/*
simulator: {msPerSecond, buffer, gameTime, pStar, events,
 timeSeries, gameStart, timeDate, startTime}

Helper function for saveData()
Purpose: Saves the simulator data
Returns: Promise
*/
let saveSimulator = function(simulator) {
  let object = {
    msPerSecond: simulator.msPerSecond,
    buffer: simulator.buffer,
    gameTime: simulator.gameTime.toJSON(),
    pStar: simulator.pStar,
    events: simulator.events,
    timeSeries: simulator.timeSeries,
    gameStart: simulator.gameStart.toJSON(),
    timeDate: simulator.timeDate,
    startTime: simulator.startTime.toJSON()
  }
  return admin.database().ref(session).child("/ImportantData/Simulator").set(object);
}

/*
Helper function for endGame()
Purpose: Deletes all user listeners at the end of a session
Returns: Promise
*/
let stopListening = function() {
  let proms = [];
  return admin.database().ref(session).child("/Users/").once('value').then(function(snapshot) {
    let users = snapshot.val();
    let userIds = Object.keys(users);
    for(let i = 0; i < userIds.length; i++){
      proms.push(admin.database().ref(session).child("/Users/").child(userIds[i]).child("/OrdersPending/").off());
      proms.push(admin.database().ref(session).child("/Users/").child(userIds[i]).child("/DeletesPending/").off());
    }
    return Promise.all(proms);
  });
};


/*
UserId: String, unique ID for a user

Helper function for assignListeners()
Purpose: creates an order pending listener for a user
Returns: Promise
*/
let assignOrderListener = function(UserId) {
  //console.log(UserId);
  return admin.database().ref(session).child("/Users/").child(UserId).child("/OrdersPending/").on('child_added', function(snapshot) {
    let order = snapshot.val();
    if(!order) {
      return null;
    }
    return Promise.resolve(processOrder(order, order.UserId)).then(function() {
      return admin.database().ref(session).child("/Users/").child(UserId).child("/OrdersPending/"+snapshot.key).remove();
    });
  });
}

/*
UserId: String, unique ID for a user

Helper function for assignListeners()
Purpose: creates an deletes pending listener for a user
Returns: Promise
*/
let assignDeleteListener = function(UserId) {
   return admin.database().ref(session).child("/Users/").child(UserId).child("/DeletesPending/").on('child_added', function(snapshot) {
    let order = snapshot.val();
    let key = snapshot.key;
    let orderId = order.OrderId;
    return admin.database().ref(session).child("/Assets/").child(order.AssetId).child("AggOB")
    .child(order.Strike).child(order.Type).transaction(function(currVol) {
      return currVol - order.Volume;
    }).then(function() {
      SessionData.orderbook.deleteOrder(order);
      setSessionOrderBook(SessionData.orderbook.toJSON());
    }).then(function() {
      return admin.database().ref(session).child("/Users/").child(UserId).child("/Orders/").child(order.AssetId)
      .child(order.Strike).child(order.OrderId).remove();
    }).then(function() {
      return admin.database().ref(session).child("/Users/").child(UserId).child("/DeletesPending/")
      .child(key).remove();
    });
  });
}

/*
Purpose: assign the simulator params pulling them down from firebase
Returns: Promise
*/
let assignSimParams = function() {
  return admin.database().ref(session).child("/GameParams/").once('value').then(function(snapshot) {
    let gp = snapshot.val();
    simulator.msPerSecond = gp.msPerSec;
    simulator.buffer = 300;
    simulator.events = simulateDay(parseInt(gp.numLiq), parseInt(gp.numInf),
     parseInt(gp.numMom), parseInt(gp.numPStar), parseFloat(gp.FracOfDay));
  });
}

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
    let numEvents = numP + numL + numM + numI;
    let firstEvent = Math.round(PD.rexp(1, numEvents)[0]*fractionOfDay*23400);
    let gameLength = firstEvent;
    let order1 = {
        type:"open",
        secondsUntilNext:firstEvent,
    }
    events.push(order1);
    let perLiq = numL/numEvents;
    let perMom = perLiq + numM/numEvents;
    let perInf = perMom + numI/numEvents;
    let frac = fractionOfDay*23400/200;
    let step = 0;
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
    let lastEvent = events.pop();
    let lengthOfDay = Math.floor(23400*fractionOfDay);
    lastEvent.secondsUntilNext-= gameLength-lengthOfDay;
    events.push(lastEvent);
    events.push({type: "close", secondsUntilNext:0});
    return events;
}

var getNewPstar = function(oldPstar){
    return(PD.rnorm(1,oldPstar,.5)[0]);// TODO: change Standard deviation to % of old pStar
}

var triangle = function(min, mode, max){
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

var getBid = function(){
  return SessionData.bid;
}

var nearestTick = function(rawPrice){ // done
  var tick = getTick();
  return parseFloat((Math.round(parseFloat(rawPrice)/tick)*tick).toFixed(2));
}

var getAsk = function(){
  return SessionData.ask;
}

var getTick = function(){
  return .05;
}

var getRun = function(){
  return SessionData.run;
}

var updateClock = function(seconds){
  simulator.gameTime.setSeconds(simulator.gameTime.getSeconds() + seconds);
}

var newDay = function() {
  simulator.gameTime.setSeconds(simulator.gameTime.getSeconds() + 63000);
  simulator.gameStart.setSeconds(simulator.gameStart.getSeconds() + 86400);
  console.log(simulator.gameTime.toUTCString());
  console.log(simulator.gameStart.toUTCString());
}

var reportEvent = function(eType){
  if(!simulator.inASimulation) {
      //console.log(`performing ${eType} event at game time: ${simulator.gameTime.toLocaleTimeString()}, real time: ${new Date()}`);
  }
};

var executeOrder = function(order, extra=""){
  reportEvent(`${extra} ORDER: ${JSON.stringify(order)}`);
  return new Promise((resolve,reject) => {
    processOrder(order, order.UserId);
  });
};

var momentumOrder = function(){
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
    throw "ASK UNDER BID";
  }
}

var informedOrder = function(){
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

var liquidityOrder = function(){
  var patient = true;
  if (Math.random() < .2){
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
        Order.Strike = nearestTick(triangle(bid*.99, Math.min(bid + tick, ask), ask)); //TODO: parameterize this spread
      }
      Order.Class = "Limit";
    } else if (!patient){
      Order.Class = "Market";
      var ask = getAsk();
      if (ask > 9999){
        var tick = getTick();
        Order.Strike = nearestTick(simulator.pStar - Math.floor(Math.random()*7)*tick);
      } else {
        Order.Strike = nearestTick(triangle(ask, ask*(1+0.0075), ask*(1+0.015))); //TODO: parameterize this spread
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
        Order.Strike = nearestTick(triangle(bid*(1-0.015), bid*(1-0.0075), bid)); //TODO: parameterize this spread
      }
    } else {
      Order.Class = "Limit";
      var bid = getBid();
      var ask = getAsk();
      var tick = getTick();
      if (bid < .1 || ask > 9999){
        Order.Strike = nearestTick(simulator.pStar + Math.floor(Math.random()*7)*tick); //TODO: parameterize this spread
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

let getGameTime = function () {
  return simulator.currentGameTime().toJSON();
}

let makePoint = function(){
    simulator.timeSeries.push({
        time : getGameTime(),
        price : SessionData.lastPrice,
    });
    if(!simulator.inASimulation) {
      return admin.database().ref(session).child('TimeSeries')
      .set(simulator.timeSeries);
    }
}

var processEvent = function(eventType, event, dayNumber){ // done
  //console.log("processEvent called!");
  //console.log("event is: " + event);
  switch (eventType){
    case 'mom':
      momentumOrder();
      //console.log("MOM");
      break;
    case 'inf':
      informedOrder();
      //console.log("INF");
      break;
    case 'pStar':
      pStarChange();
      //console.log("pStar");
      break;
    case 'liq':
      liquidityOrder();
      //console.log("LIQ");
      break;
    case "close":
      makePoint();
      console.log("Close ", dayNumber);
      break;
    case "open":
      simulator.initializetime(dayNumber);
      rectifyTimes();
      makePoint();
      console.log("open ", dayNumber);
      break;
    default:
      reportEvent(eventType);
  }
  checkSpread();
};

let delay = function(time) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, time);
  });
}

function removeKeys(object){
  var array = [];
   for(key in object){
     if (object.hasOwnProperty(key)){
       array.push(object[key]);
     }
   }
   return array;
 }

/*
userId: String, id of user
type: String, the type of order; "Ask" or "Bid"
AssetId: String, The assetId assoicated with the order; should be "INTC"
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Purpose: userTransaction is responsible for creating and handle a user transaction.
The function calls 3 helper function which breaks userTransaction up into 3 subtasks.
Returns: Promise
*/
let userTransaction = function(userID, type, assetID, strike, transactionVolume, time) {
  return postUserTransaction(userID, type, assetID, strike, transactionVolume, time).then(function() {
    return adjustCash(userID, strike, transactionVolume, type);
  }).then(function() {
    return adjustStats(userID, strike, transactionVolume, type);
  });
}
/*
userId: String, id of user
type: String, the type of order; "Ask" or "Bid"
AssetId: String, The assetId assoicated with the order; should be "INTC"
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function to userTransaction()
Purpose: Creates a transaction and sends it to the database
Returns: Promise
*/
let postUserTransaction = function(userID, type, assetID, strike, transactionVolume, time) {
  let transKey = admin.database().ref(session).child("/Users/")
  .child(userID).child("Transactions")
  .push().key;
  return admin.database().ref(session).child("/Users/")
  .child(userID).child("Transactions")
  .child(transKey).update({
    AssetId: assetID,
    Price: strike,
    Time: time,
    Type: type,
    Volume: transactionVolume
  });
}
/*
userId: String, id of user
type: String, the type of order; "Ask" or "Bid"
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for userTransaction
Purpose: Updates users cash value
Returns: Promise
*/
let adjustCash = function(userID, strike, transactionVolume, type) {
  return admin.database().ref(session).child("/Users/").child(userID).child("/Assets/").child("Cash")
  .transaction(function(currCash) {
    let strikePrice = parseFloat((parseInt(strike)/100).toFixed(2));
    if(type == "Bid") {
      return parseFloat((currCash - (transactionVolume * strikePrice)).toFixed(2));
    } else {
      return parseFloat((currCash + (transactionVolume * strikePrice)).toFixed(2));
    }
  });
}
/*
userId: String, id of user
type: String, the type of order; "Ask" or "Bid"
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for userTransaction
Purpose: This functions is responsible for updating all of a users stats. This
function calls three helper functions to break up its tasks
Returns: Promise
*/
let adjustStats = function(userID, strike, transactionVolume, type) {
  return calcPosition(userID, strike, transactionVolume, type).then(function() {
    return calcVWAP(userID, strike, transactionVolume, type);
  }).then(function(){
    return calcShares(userID, strike, transactionVolume, type);
  }).catch(error => {
    console.log(error);
  });
}



let willBeLong = function(userID, type, transactionVolume) {
  //console.log("calling willBeLong");
  //console.log(session);
  //console.log(userID);
  let ref = admin.database().ref(session).child("/Users/").child(userID).child("Assets/").child("INTC/")
    .child("Stats/");
  return ref.child("Shares").once('value').then(function(snap){
    let currShares = snap.val();
    //console.log("Gets here 1");
    if(type === "Bid") {
      currShares = currShares + transactionVolume;
    } else {
      currShares = currShares - transactionVolume;
    }
    if(currShares > 0) {
      return true;
    } else if(currShares < 0) {
      return false;
    } else {
      return null;
    }
  });
}

// Pat you need to redo this
let calcPosition = function(userID, strike, transactionVolume, type) {
  //console.log("Calling calcPosition");
  //console.log(session);
  let ref = admin.database().ref(session).child("/Users/").child(userID).child("Assets/").child("INTC/")
    .child("Stats/");
  let shares = 0;
  return ref.child("Shares").once('value').then(function(snap){
    shares = snap.val();
  }).then(function(){
    return willBeLong(userID, type, transactionVolume).then(function(isLong){
      if(isLong === null){
        return ref.child("ShortTermAccumulator").transaction(data=>{
          return 0;
        }).then(function(){
          return ref.child("shortTermVolume").transaction(data=>{
            return 0;
          }).then(function(){
            return ref.child("ThisPosition").transaction(data=>{
              return 0;
            });
          });
        });
      } else {
        let newPos = isLong ? "Long":"Short";
        if(type === "Ask") {
          type = "Short";
        } else {
          type = "Bid";
        }
        return ref.child("Position").once('value').then(function(snap){
          let oldPos = snap.val();
          let stAcct = 0;
          let stVol = 0;
          if(newPos === oldPos && type === oldPos){
            return ref.child("ShortTermAccumulator").transaction(data=>{
              stAcct = data + (transactionVolume * strike);
              return parseFloat(stAcct.toFixed(2));
            }).then(function(){
              return ref.child("ShortTermVolume").transaction(data=>{
                if(type === "Ask") {
                  stVol = data - transactionVolume;
                } else {
                  stVol = data + transactionVolume;
                }
                return parseFloat(stVol.toFixed(2));
              }).then(function(){
                return ref.child("ThisPosition").transaction(data=>{
                  return parseFloat((stAcct/stVol).toFixed(2));
                });
              });
            });
          } else if(newPos !== oldPos) {
            let newShares = transactionVolume - Math.abs(shares);
            return ref.child("ShortTermAccumulator").transaction(data=>{
              stAcct = data + (newShares * strike);
              return parseFloat(stAcct.toFixed(2));
            }).then(function(){
              return ref.child("ShortTermVolume").transaction(data=>{
                if(type === "Ask") {
                  stVol = data - newShares;
                } else {
                  stVol = data + newShares;
                }
                return parseFloat(stVol.toFixed(2));
              }).then(function(){
                return ref.child("ThisPosition").transaction(data=>{
                  return parseFloat(((stAcct/stVol)/100).toFixed(2));
                });
              });
            });
          }
        });
      }
    }).catch(error=>{
      console.log(error);
    });
  });

}

/*
userId: String, id of user
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for adjustStats()
Purpose: Calculates the buy VWAP for the user
Returns: Promise
*/
let calcBuyVWAP = function(userID, strike, transactionVolume) {
  let parsedStrike = parseFloat((parseFloat(strike)/100).toFixed(2));
  let buyPriceVolumeAccumulator = 0;
  let buyTotalVolume = 0;
  let ref = admin.database().ref(session).child("/Users/").child(userID).child("Assets/").child("INTC/")
    .child("Stats/");
  return ref.child("BuyPriceVolumeAccumulator/").transaction(data=> {
      buyPriceVolumeAccumulator = data + parseFloat((parsedStrike*transactionVolume).toFixed(2));
      return buyPriceVolumeAccumulator;
    }).then(function() {
      return ref.child("BuyTotalVolume/").transaction(data=> {
        buyTotalVolume = data + parseFloat((transactionVolume).toFixed(2));
        return buyTotalVolume;
      });
    }).then(function() {
      return ref.child("BuyVWAP/").transaction(data=>{
        return parseFloat((buyPriceVolumeAccumulator/buyTotalVolume).toFixed(2));
      });
    }).catch(error=> {
      console.log("error: ", error);
    });
}
/*
userId: String, id of user
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for adjustStats()
Purpose: Calculates the sell VWAP for the user
Returns: Promise
*/
let calcSellVWAP = function(userID, strike, transactionVolume) {
  let parsedStrike = parseFloat((parseFloat(strike)/100).toFixed(2));
  let sellPriceVolumeAccumulator = 0;
  let sellTotalVolume = 0;
  let ref = admin.database().ref(session).child("/Users/").child(userID).child("Assets/").child("INTC/")
    .child("Stats/");
  return ref.child("SellPriceVolumeAccumulator/").transaction(data=> {
      sellPriceVolumeAccumulator = data + parseFloat((parsedStrike*transactionVolume).toFixed(2));
      return sellPriceVolumeAccumulator;
    }).then(function() {
      return ref.child("SellTotalVolume/").transaction(data=> {
        sellTotalVolume = data + parseFloat((transactionVolume).toFixed(2));
        return sellTotalVolume;
      });
    }).then(function() {
      return ref.child("SellVWAP/").transaction(data=>{
        return parseFloat((sellPriceVolumeAccumulator/sellTotalVolume).toFixed(2));
      });
    }).catch(error=> {
      console.log("error: ", error);
    });
}
/*
userId: String, id of user
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for adjustStats()
Purpose: Calculates the net VWAP for the user, this function is useless information
Returns: Promise
*/
let calcNetVWAP = function(userID, strike, transactionVolume) {
  let parsedStrike = parseFloat((parseFloat(strike)/100).toFixed(2));
  let netPriceVolumeAccumulator = 0;
  let netTotalVolume = 0;
  let ref = admin.database().ref(session).child("/Users/").child(userID).child("Assets/").child("INTC/")
    .child("Stats/");
  return ref.child("NetPriceVolumeAccumulator/").transaction(data=> {
      netPriceVolumeAccumulator = data + parseFloat((parsedStrike*transactionVolume).toFixed(2));
      return netPriceVolumeAccumulator;
    }).then(function() {
      return ref.child("NetTotalVolume/").transaction(data=> {
        netTotalVolume = data + parseFloat((transactionVolume).toFixed(2));
        return netTotalVolume;
      });
    }).then(function() {
      return ref.child("NetVWAP/").transaction(data=>{
        return parseFloat((netPriceVolumeAccumulator/netTotalVolume).toFixed(2));
      });
    }).catch(error=> {
      console.log("error: ", error);
    });
}
/*
userId: String, id of user
type: String, the type of order; "Ask" or "Bid"
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for adjustStats()
Purpose: Handles calculating all the different types of VWAP for a user. Calls 3
different helper functions
Returns: Promise
*/
let calcVWAP = function(userID, strike, transactionVolume, type) {
  if(type == "Bid") {
    return calcBuyVWAP(userID, strike, transactionVolume).then(function() {
      return calcNetVWAP(userID, strike, transactionVolume);
    }).catch(error=> {
      console.log("error: ", error);
    });
  } else {
    return calcSellVWAP(userID, strike, transactionVolume).then(function() {
      return calcNetVWAP(userID, strike, transactionVolume);
    }).catch(error=> {
      console.log("error: ", error);
    });
  }
}
/*
userId: String, id of user
type: String, the type of order; "Ask" or "Bid"
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for adjustStats()
Purpose: Handles calculating user shares
Returns: Promise
*/
let calcShares = function(userID, strike, transactionVolume, type) {
  return admin.database().ref(session).child("/Users/").child(userID).child("Assets/").child("INTC/")
    .child("Stats/Shares").transaction(data=> {
      if(type == "Bid") {
        return data + transactionVolume;
      } else {
        return data - transactionVolume;
      }
    });
}

/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 The order already on the orderbook
newOrder: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 The user's order
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function for fulfillTransaction()
Purpose: Creates a global transaction record, updates current assest price,
  calculates market VWAP, ajust P/l for all users
Returns: Promise
*/
let createTransactionRecord = function(order, newOrder, strike, transactionVolume, time) {
  let transKey = admin.database().ref(session).child("/Transactions").push().key;
  return Promise.resolve(
    admin.database().ref(session).child("/Transactions/").child(transKey).set({
      AssetId: order.AssetId,
      Price: strike,
      Time: time,
      Volume: transactionVolume,
      Type: newOrder.Type == "Ask" ? "Sell" : "Buy"
    })).then(function() {
      return updateCurrentAssetPrice(strike, order.AssetId);
    }).then(function() {
      let parsedStrike = parseFloat((parseFloat(strike)/100).toFixed(2));
      SessionData.priceVolumeAccumulator += (parsedStrike*transactionVolume);
      SessionData.totalVolume += transactionVolume;
      simulator.VWAP = parseFloat((SessionData.priceVolumeAccumulator/SessionData.totalVolume).toFixed(2));
      return admin.database().ref(session).child("/Assets/").child(order.AssetId).child("/VWAP/").set(simulator.VWAP).then(function(){
        return admin.database().ref(session).child("/Assets/").child(order.AssetId).child("/TotalVolume/").set(SessionData.totalVolume);
      });
    }).then(function() {
      return admin.database().ref(session).child("/Users/").once('value').then(function(snapshot) {
        let userIds = Object.keys(snapshot.val());
        let proms = [];
        for(let i = 0; i < userIds.length; i++) {
          proms.push(
            admin.database().ref(session).child("/Users/").child(userIds[i]).child("/Assets/Cash").once('value').then(function(snapshot){
              //console.log("Cash", snapshot.val());
              let cash = parseFloat(snapshot.val());
              return admin.database().ref(session).child("/Users/").child(userIds[i]).child("/Assets/").child("INTC/").child("Stats/").once('value').then(function(snapshot) {
                let shares = snapshot.val().Shares;
                let position = snapshot.val().Position;
                //console.log("shares", shares);
                return admin.database().ref(session).child("/Users/").child(userIds[i]).child("/Assets/").child("INTC/").child("Stats/PL").transaction(data=>{
                  if(position === "Short") {
                    return parseFloat((parseFloat(cash) + (shares * getAsk())).toFixed(2));
                  } else {
                    return parseFloat((parseFloat(cash) + (shares * getBid())).toFixed(2));
                  }
                });
              });
            })
          );
        }
        return Promise.all(proms);
      });
    });
}

/*
aggOB: {"2010":{"Ask:" 0, "Bid":0}}

Helper function of fulfillTransaction() and createLimitOrder()
Purpose: Update the AggOB
Returns: Promise
*/
let updateSessionAggOrderBook = function(aggOB) {
  return admin.database().ref(session).child("/Assets/").child("INTC")
  .child("AggOB").transaction(data => {
    data = aggOB;
    return data;
  });
};
/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 order already on orderbook
strike: Int, The strike price the order was transacted at; In the formate of 2010
transactionVolume: Int, The volume of the transaction; Always positive

Helper function of fulfillTransaction()
Purpose: Deletes or creates an order for the user
Returns: Promise
*/
let userUpdateOrderBook = function(order, strike, transactionVolume) {
  if(order.volume - transactionVolume === 0) {
    // delete order
    return Promise.resolve(admin.database().ref(session).child("/Users/")
    .child(order.UserId).child("Orders").child(order.AssetId).child(strike)
    .child(order.OrderId).remove());
  } else {
    // update order
    return Promise.resolve(admin.database().ref(session).child("/Users/")
    .child(order.UserId).child("Orders").child(order.AssetId).child(strike)
    .child(order.OrderId).child("Volume").set(order.Volume - transactionVolume));
  }
}

/*
orderbook: {"2090":{"Bids":{orderid:{order}}"Asks:"{}}}

Helper function for fulfillTransaction(), createLimitOrder(),
 assignDeleteListener()
Purpose: update the orderbook
Returns: Promise
*/
let setSessionOrderBook = function(orderbook) {
  let assetId = "INTC";
  return admin.database().ref(session).child("/Assets/")
  .child(assetId).child("orderbook").transaction(data => {
    data = orderbook;
    return orderbook;
  }).then(function(){
    return admin.database().ref(session).child("ImportantData/").child("SessionData/").child("ask").set(getAsk());
  }).then(function(){
    return admin.database().ref(session).child("ImportantData/").child("SessionData/").child("bid").set(getBid());
  });
}

/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 new order about to be placed on orderbook
userId: String, unique ID of the user

Helper function for createLimitOrder()
Purpose: adds a limit order to the users list of Orders
Returns: Promise
*/
let userCreateLimitOrder = function(order, userId) {
  return Promise.resolve(admin.database().ref(session).child("/Users/").child(userId)
  .child("Orders").child(order.AssetId).child(order.Strike).child(order.OrderId)
  .set(order));
}

/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 The order already on the orderbook
newOrder: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 The user's order
strike: Int, The strike price the order was transacted at; In the formate of 2010
orderbook: {"2090":{"Bids":{orderid:{order}}"Asks:"{}}}

Helper function for checkForTransaction()
Purpose: handles a all aspects of a transaction, creates userTransactions, global transactions
 updates the orderbooks, and makes a time series point
Returns: transactionVolume, volume that was transacted
*/
let fulfillTransaction = function(order, newOrder, strike, orderbook){
  //this strike is of the form "2020"
  var transactionVolume = SessionData.orderbook.fillOrder(order, newOrder.Volume, strike); //don't change order2 but return volume of transaction
  var strikeFloat = parseInt(order.Strike)/100.0;
  if (strikeFloat < SessionData.lastPrice){
    SessionData.lastPrice = strikeFloat;
    SessionData.run = Math.min(SessionData.run - 1, -1);
  } else if (strikeFloat > SessionData.lastPrice){
    SessionData.lastPrice = strikeFloat;
    SessionData.run = Math.max(SessionData.run + 1, 1);
  }
  // OH SHIT VALVE
  let time = new Date(getGameTime());
  // special format for posting
  let databaseTime = getGameTime();
  console.log(time);
  if(!(time.getUTCHours() >= 16 && time.getUTCMinutes() > 1)) {
    if(!simulator.inASimulation) {
      return Promise.resolve(userTransaction(newOrder.UserId, newOrder.Type, newOrder.AssetId, strike, transactionVolume, databaseTime)).then(function() { // write Receipts function
        return userTransaction(order.UserId, order.Type, order.AssetId, strike, transactionVolume, databaseTime);  // write Receipts function
      }).then(function() {
        return createTransactionRecord(order, newOrder, strike, transactionVolume, databaseTime); //global Transaction Record
      }).then(function() {
        return userUpdateOrderBook(order, strike, transactionVolume); //old user chnage remove or change vol
      }).then(function() {
        return updateSessionAggOrderBook(SessionData.orderbook.toAggOB()); //old user chnage remove or change vol
      }).then(function() {
        return setSessionOrderBook(SessionData.orderbook.toJSON());
      }).then(function() {
        return makePoint();
      }).then(function() {
        return transactionVolume;
      });
    } else {
      makePoint();
      return transactionVolume;
    }
  } else {
    console.log("OVER TIME");
  }

}

/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 an order about to be placed on the books
userId: String, unique ID of the user
orderbook: {"2090":{"Bids":{orderid:{order}}"Asks:"{}}}

Helper function for checkForTransaction()
Purpose: Handles everything to do with creating a limit order for a user. Creates
 a limit order, updates the AggOB, updates the orderbook
Returns: Promise
*/
var createLimitOrder = function(order, userId, orderbook){
  //order cannot be filled
  let newOrder = SessionData.orderbook.createLimitOrder(order, userId); //has a Strike price
  //Firebase side:
  if(!simulator.inASimulation) {
    return Promise.resolve(userCreateLimitOrder(newOrder, userId)).then(function() { //order has Strike, and this cannot be fulfilled, so place limit order
      return updateSessionAggOrderBook(SessionData.orderbook.toAggOB()); //old user chnage remove or change vol
    }).then(function() {
      return setSessionOrderBook(SessionData.orderbook.toJSON());
    }).catch(error => {
      console.log(error);
    });
  }
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
       if(!newOrder.Strike && newOrder.Class == "Market") {
         return bid;
       }
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
       if(!newOrder.Strike && newOrder.Class == "Market") {
         return ask;
       }
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
     if(!self.Strike[newOrder.Strike].hasOwnProperty("Bids")) {
       self.Strike[newOrder.Strike].Bids = {};
     }
     if(!self.Strike[newOrder.Strike].hasOwnProperty("Asks")) {
       self.Strike[newOrder.Strike].Asks = {};
     }
     let len;

     len = Object.keys(self["Strike"][newOrder.Strike][newOrder["Type"]+"s"]).length;


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
        self.Strike[existingOrder["Strike"]][existingOrder["Type"]+"s"][existingOrder.OrderId]["Volume"] = existingOrder.Volume;
        return volumeDesired;
      }
      else{
        let tmp = existingOrder.Volume;
        delete self.Strike[existingOrder["Strike"]][existingOrder["Type"]+"s"][existingOrder.OrderId];
        self.updateAheadOfThis(existingOrder["Strike"], existingOrder["Type"]+"s");
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
        return theSum;
      }

      var zeroAgg = SessionData.zeroAgg;
      let lastStrikeCreated = null;
      for (let strike in self.Strike){
        if(zeroAgg !== undefined) {
          if (!zeroAgg.hasOwnProperty(strike)){
            lastStrikeCreated = strike;
            //console.log("AggOB doesnt have: " , strike);
            zeroAgg[strike] = {"Bid": 0, "Ask": 0};
          }
        } else {
          zeroAgg = {};
          lastStrikeCreated = strike;
          //console.log("AggOB doesnt have: " , strike);
          zeroAgg[strike] = {"Bid": 0, "Ask": 0};
        }
        if (self.Strike[strike].hasOwnProperty("Asks")){
          zeroAgg[strike]["Ask"] = sumQueue(self.Strike[strike]["Asks"]);
        }
        if (self.Strike[strike].hasOwnProperty("Bids")){
          zeroAgg[strike]["Bid"] = sumQueue(self.Strike[strike]["Bids"]);
        }
      }
      let lastStrike = Object.keys(zeroAgg)[Object.keys(zeroAgg).length - 1];
      //console.log("Last Strike: " , lastStrike);
      if(lastStrike === lastStrikeCreated) {
        if(lastStrike > SessionData.lastPrice) {
          let strike = parseInt(lastStrikeCreated);
          // console.log("Strike: ", strike);
          // console.log("Increment: " , ((getTick()*100)*1));
          // let increment =  parseInt(((getTick()*100)*1));
          // console.log("strike + Increment: ", strike + increment);
          for(let i = 1; i < 8; i++){
            let increment =  parseInt(((getTick()*100)*i));
            let newStrike = strike + increment;
            zeroAgg[newStrike] = {"Bid": 0, "Ask": 0};
            self.Strike[strike] = {"Bids": {}, "Asks": {}};
            //console.log("newStrikes: " , newStrike);
          }
        } else {
          let strike = lastStrikeCreated;
          for(let i = 1; i < 8; i++){
            let increment =  parseInt(((getTick()*100)*i));
            let newStrike = strike - increment;
            zeroAgg[newStrike] = {"Bid": 0, "Ask": 0};
            self.Strike[strike] = {"Bids": {}, "Asks": {}};
            //console.log("newStrikes: " , newStrike);
          }
        }
      }
      //console.log(zeroAgg);
      return zeroAgg;
   };
   this.deleteOrder = function(existingOrder){
      let strike = existingOrder.Strike;
      let type = existingOrder.Type +"s";
      delete self.Strike[strike][type][existingOrder.OrderId];
   }
}

var getOrderBook = function(order){
    return admin.database().ref(session).child("/Assets/").child(order.AssetId)
    .child("/Orderbook").once('value').then(function(snapshot) {
      return new OrderBook(snapshot.val());
    });
}

/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 the user order coming in
userId: String, unique ID of the user

Helper function for processOrder()
Purpose: Recursively run through the orderbook determining what to do with an order.
 Either fulfills and order, partially fulfills and order and places a limit order,
 or places a limit order
Returns: Promise or null
*/
var checkForTransaction = function(order, userId){
    var fillableOrder = SessionData.orderbook.canFillTransaction(order); //should include strike in returned order
    if (!fillableOrder){
      if (order.Class == "Market"){
        return null;
      } else {
        return Promise.resolve(createLimitOrder(order, userId, SessionData.orderbook)); //order has a Strike
      }
    } else {
      return Promise.resolve(fulfillTransaction(fillableOrder, order, fillableOrder.Strike, SessionData.orderbook))
      .then(function(sizeOfTransaction) {
        order.Volume -= sizeOfTransaction;
        if (order.Volume > 0){
          return Promise.resolve(checkForTransaction(order, userId));
        } else if (order.Volume < 0){
          return null;
        } else {
          return null;
        }
      });
    }

}

/*
order: {AheadOfThis, OrderId, UserId, Type, Volume, AssetId, Strike, Class},
 the user order coming in
userId: String, unique ID of the user

Helper function for  assignOrderListener() and executeOrder()
Purpose: validates the orders strike and checks for a transaction
Returns: Promise
*/
let processOrder = function(order, userId) {
  if (parseFloat(order.Strike) < 100){
    order.Strike = (100*parseFloat(order.Strike)).toFixed(0).toString();
  }
  return Promise.resolve(checkForTransaction(order, userId)).then(data=>{return data});
}

/*
lastStrikeSold: Int, the last strike an order was sold at in the form 2010
assetId: String, unique id of the asset should be "INTC"
*/
let updateCurrentAssetPrice = function(lastStrikeSold, assetId) {
  lastStrikeSold = parseFloat(lastStrikeSold).toFixed(2);
  return admin.database().ref(session).child("/Assets").child(assetId).child("CurrentAssetPrice").set(lastStrikeSold);
}

// this function hasn't been implimented yet
let initAggOB = function() {
  let lastPrice = parseInt(SessionData.lastPrice * 100);
  let start = lastPrice - 200;
  let book = {};
  let strike = {"Bid": 0, "Ask": 0};
  for(let i = 0; i < 50; i++) {
    let currentStrike = start + (10*i);
    book[currentStrike+""] = strike;
  }
  //console.log(book);
  return book;
}

/*
Helper function for startGame() and doTheSuperThing()
Purpose: initializes the AggOB, loads in the SessionData and simulator,
and resets/sets user starting stats
Returns: Promise
*/
let initializeMarket = function(){
  if(!simulator.inASimulation) {
    let aggOBref = admin.database().ref(session).child("Assets").child("INTC").child("AggOB");
    SessionData.zeroAgg ={};// initAggOB();
    //  {"1800":{"Bid":0,"Ask":0},"1810":{"Bid":0,"Ask":0},"1820":{"Bid":0,"Ask":0},"1830":{"Bid":0,"Ask":0},"1840":{"Bid":0,"Ask":0},
    // "1850":{"Bid":0,"Ask":0},"1860":{"Bid":0,"Ask":0},"1870":{"Bid":0,"Ask":0},"1880":{"Bid":0,"Ask":0},"1890":{"Bid":0,"Ask":0},
    // "1900":{"Bid":0,"Ask":0},"1910":{"Bid":0,"Ask":0},"1920":{"Bid":0,"Ask":0},"1930":{"Bid":0,"Ask":0},"1940":{"Bid":0,"Ask":0},
    // "1950":{"Bid":0,"Ask":0},"1960":{"Bid":0,"Ask":0},"1970":{"Bid":0,"Ask":0},"1980":{"Bid":0,"Ask":0},"1990":{"Bid":0,"Ask":0}},
    // "2000":{"Bid":0,"Ask":0},"2010":{"Bid":0,"Ask":0},"2020":{"Bid":0,"Ask":0},"2030":{"Bid":0,"Ask":0},"2040":{"Bid":0,"Ask":0},
    // "2050":{"Bid":0,"Ask":0},"2060":{"Bid":0,"Ask":0},"2070":{"Bid":0,"Ask":0},"2080":{"Bid":0,"Ask":0},"2090":{"Bid":0,"Ask":0},
    // "2100":{"Bid":0,"Ask":0},"2110":{"Bid":0,"Ask":0},"2120":{"Bid":0,"Ask":0},"2130":{"Bid":0,"Ask":0},"2140":{"Bid":0,"Ask":0},
    // "2150":{"Bid":0,"Ask":0},"2160":{"Bid":0,"Ask":0},"2170":{"Bid":0,"Ask":0},"2180":{"Bid":0,"Ask":0},"2190":{"Bid":0,"Ask":0},
    // "2200":{"Bid":0,"Ask":0},"2210":{"Bid":0,"Ask":0},"2220":{"Bid":0,"Ask":0},"2230":{"Bid":0,"Ask":0},"2240":{"Bid":0,"Ask":0},
    // "2250":{"Bid":0,"Ask":0},"2260":{"Bid":0,"Ask":0},"2270":{"Bid":0,"Ask":0},"2280":{"Bid":0,"Ask":0},"2290":{"Bid":0,"Ask":0}};

    return aggOBref.set(SessionData.zeroAgg).then(function(evt){
      return admin.database().ref(session).child("/Assets/").child("INTC").child("orderbook").remove();
    }).then(function(evt2){
      return admin.database().ref(session).child("Transactions").remove();
    }).then(function() {
      return loadSessionData();
    }).then(function(){
      return loadSimulator();
    }).then(function() {
      // resetting sim
      return resetUserVitals(0);
    });
  } else {
    SessionData.orderbook = new OrderBook({});
    return admin.database().ref(session).child("/GameParams/").child("StartPrice/").once('value').then(function(snapshot) {
      let StartPrice = snapshot.val();
      if(!StartPrice) {
        SessionData.lastPrice = 21.00; // default lastPrice
      } else {
        SessionData.lastPrice = parseFloat((parseFloat(StartPrice)/100).toFixed(2));
      }
    });
  }
}

/*
Helper function for loadGame() and initializeMarket()
Purpose: Load in the simulator data from the database
Returns: Promise
*/
let loadSimulator = function() {
  return admin.database().ref(session).child("/ImportantData/").child("Simulator")
  .once('value').then(function(snapshot) {
      let currentSimulator = snapshot.val();
      simulator.msPerSecond = currentSimulator.msPerSecond;
      simulator.buffer = 300;
      simulator.pstar = currentSimulator.pStar;
      simulator.timeDate = currentSimulator.timeDate;
      simulator.timeSeries = currentSimulator.timeSeries;
      simulator.gameTime = new Date(currentSimulator.gameTime);
      simulator.startTime = new Date(currentSimulator.startTime);
      simulator.gameStart = new Date(currentSimulator.gameStart);
  });
}

/*
Helper function for loadGame()
Purpose: Load in the events for the day
Returns: Promise
*/
let loadEvents = function() {
  return admin.database().ref(session).child("/ImportantData/").child("Simulator/").child("events")
  .once('value').then(function(snapshot) {
    simulator.events = removeKeys(snapshot.val());
  });
}

/*
Helper function for loadGame() and initializeMarket()
Purpose: Load in the SessionData data from the database
Returns: Promise
*/
let loadSessionData = function() {
  return admin.database().ref(session).child("/ImportantData/").child("SessionData")
  .once('value').then(function(snapshot) {
    let currentSessionData = snapshot.val();
    SessionData.bid = currentSessionData.bid;
    SessionData.ask = currentSessionData.ask;
    SessionData.run = currentSessionData.run;
    SessionData.lastPrice = currentSessionData.lastPrice;
    SessionData.orderbook = new OrderBook(currentSessionData.orderbook);
    SessionData.guid = currentSessionData.guid;
  });
}

// Starts game when running locally
if (THISISLOCAL){
  doTheSuperThing();
}
