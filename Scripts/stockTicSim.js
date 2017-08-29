console.log("Hello world");
// Initialize Firebase
var config = {
    apiKey: "AIzaSyC4umbQ3Av0bWfRGYMWZe9CJMv6A7Esbc4",
    authDomain: "traderx-a41b3.firebaseapp.com",
    databaseURL: "https://traderx-a41b3.firebaseio.com",
    projectId: "traderx-a41b3",
    storageBucket: "traderx-a41b3.appspot.com",
    messagingSenderId: "64491605877"
};

firebase.initializeApp(config);

const database = firebase.database();
const startSimRef = database.ref('StartSim/');
const countDownRef = database.ref('CountDown/').child('Time');
const disRef = database.ref('Distributions/');
const hiRef = database.ref('ServerHello/');
const testRef = database.ref('TEST/');
const orderbookRef = database.ref('Session2/Assets/INTC/Orderbook');
const key = startSimRef.push().key;

let counter = document.getElementById('counter');
let pointsDiv  = document.getElementById('points');
let message = document.getElementById('serverMessage');

let points = [];
let data = [];


function sayHi() {
  console.log("Working?");
  database.ref("ClientHi/").update({message: "HI"});

}
 // START FUNCTIONS AND CALLS -------------------------------------------------
function changeStat(startObject) {
    database.ref('StartSim/').update(startObject);
}

//changeStat({start: true});

function changeMessage() {
    database.ref('StartMessages/').update({start: true});
}

//changeMessage();

function changeDis(startObject) {
    database.ref('Distributions/').update(startObject);
}

changeDis({start: true});
 // ---------------------------------------------------------------------------

// LISTENERS ------------------------------------------------------------------
countDownRef.on('value', function(snapshot) {
  console.log(snapshot.val());
  counter.innerHTML = snapshot.val();
});

hiRef.on('value', function(snapshot) {
  message.innerHTML = snapshot.val();
  console.log("Activated");
});

testRef.on('value', function(snapshot) {
  console.log(snapshot.val().vals);
  points = snapshot.val().vals;
  data = [
    {
      x: points,
      type: 'histogram',
      marker: {
        color: 'rgba(100, 250, 100, 0.7)',
      },
    }
  ];
  Plotly.newPlot('points', data);
});
// ----------------------------------------------------------------------------

// Start the 30 sec on write cloud functions
let x = 0;
let seconds = 1;
let loop = window.setInterval(function() {
  x++;
  database.ref('StartMessages/').update({Running: x});
  console.log("Running");
}, 900);

window.setTimeout(function(){
   clearInterval(loop);
   console.log("Stoping loop");
 }, 1000 * seconds);
 // ---------------------------------------------------------------------------
 function round(value, exp) {
   if (typeof exp === 'undefined' || +exp === 0)
     return Math.round(value);

   value = +value;
   exp = +exp;

   if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
     return NaN;

   // Shift
   value = value.toString().split('e');
   value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

   // Shift back
   value = value.toString().split('e');
   return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
 }
function calacStrikes(starterPrice, percentage, numOfStrikes) {
  let bound = starterPrice * percentage;
  let upperBound = starterPrice + bound;
  let lowerBound = starterPrice - bound;
  let strikes = [];
  let currentStrike = lowerBound;
  let interval = (upperBound - lowerBound) / numOfStrikes;
  strikes.push(round(currentStrike, 2).toFixed(2));
  while(currentStrike < upperBound) {
    currentStrike = currentStrike + interval;
    strikes.push(round(currentStrike, 2).toFixed(2));
  }
  let convertedStrikes = [];
  for(var i = 0; i < strikes.length; i++) {
    convertedStrikes.push((strikes[i] + "") .split('.').join(''));

  }
  return convertedStrikes;
}

console.log(calacStrikes(20, 0.04, 15));

 function makeOrderBook() {
   var strikes = calacStrikes(20, 0.04, 15);
   for (var i = 0; i < strikes.length; i++) {
     database.ref("Session2/").child("Assets").child("INTC").child("AggOB")
     .child(strikes[i]).update({Ask : 0});
     database.ref("Session2/").child("Assets").child("INTC").child("AggOB")
     .child(strikes[i]).update({Bid : 0});
   }
 }
 //makeOrderBook();

 function makeLoop () {
   database.ref("Loop/").update({start: true});
 }
 //makeLoop();

function addDummyOrder(type, volume, strike, clas) {
  console.log("Creating dummy order");
  let key = database.ref("Session2/").child("Users/").child(0)
  .child("OrdersPending/").push().key;
  database.ref("Session2/").child("Users/").child(0)
  .child("OrdersPending").child(key).update({
    AssetId : "INTC",
    Strike : strike,
    Type: type,
    Volume: volume,
    Class: clas
  });
}

// addDummyOrder("Bid", 30, 1920, "Limit");
// addDummyOrder("Bid", 30, 1920, "Limit");
// addDummyOrder("Bid", 30, 1920, "Limit");
// addDummyOrder("Bid", 30, 1920, "Limit");
// addDummyOrder("Bid", 30, 1920, "Limit");
// addDummyOrder("Bid", 30, 1930, "Limit");
// addDummyOrder("Bid", 30, 1930, "Limit");
// addDummyOrder("Bid", 30, 1930, "Limit");
//addDummyOrder("Bid", 100, 1930, "Limit");
addDummyOrder("Ask", 100, 1930, "Limit");








function testOrderbook() {
  orderbookRef.once('value').then(function(snapshot) {
    console.log(snapshot.val());
    let orderbook = snapshot.val();
    console.log(Object.keys(orderbook));
    let keys = Object.keys(orderbook);
    for(var i = 0; i < keys.length; i++) {
      let asks = orderbook[keys[i]].Ask;
      let bids = orderbook[keys[i]].Bids;
      if(asks !== undefined && bids !== undefined) {
        testAskandBids(asks, bids);
      }
    }

  });
}
function testAskandBids(asks, bids) {
  console.log(asks);
  console.log(bids);
  let asksKeys = Object.keys(asks);
  let bidsKeys = Object.keys(bids);
  let length = Math.min(asksKeys.length, bidsKeys.length);

  for(var i = 0; i < length; i++) {

    if(asks[asksKeys[i]].Volume > bids[bidsKeys[i]].Volume) {
      let newAskVol = asks[asksKeys[i]].Volume - bids[bidsKeys[i]].Volume;
      // update ask vol
      console.log("bid cleared");
    } else if(asks[asksKeys[i]].Volume < bids[bidsKeys[i]].Volume) {
      let newBidVol = bids[bidsKeys[i]].Volume - asks[asksKeys[i]].Volume;
      // update bid vol
      console.log("Ask cleared");
    } else if (asks[asksKeys[i]].Volume = bids[bidsKeys[i]].Volume) {
      // update ask vol
      console.log("Bid and Ask cleared");
    } else {
      console.log("ERROR evaluating volume differences");
    }

  }

}

//testOrderbook();
