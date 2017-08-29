var PD = require("probability-distributions");
var jsonfile = require("jsonfile");
//console.log("starting server");
// sim stuff
var simulator = {}; //"global" namespace

simulator.msPerSecond = 0;
simulator.buffer = 15;
simulator.gameTime = new Date("2017-06-12T09:30:00.000");
simulator.pStar = 21;

var triangle = function(min, mode, max){
  if (max === min){
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
  return 20.10;
}

var nearestTick = function(rawPrice){
  var tick = getTick();
  return Math.round(rawPrice/tick)*tick;
}

var getAsk = function(){
  return 21.30;
}

var getTick = function(){
  return .1;
}

var getRun = function(){
  return 3*Math.floor(Math.random()*3 -  1);
}

var updateClock = function(seconds){
  simulator.gameTime.setSeconds(simulator.gameTime.getSeconds() + seconds);
}

var reportEvent = function(eType){
  document.querySelector('ul').innerHTML += `<li>performing ${eType} event at game time: ${simulator.gameTime.toLocaleTimeString()}, real time: ${new Date()}</li>`;
};

var executeOrder = function(order, extra=""){
  reportEvent(`${extra} ORDER: ${JSON.stringify(order)}`);
};

var momentumOrder = function(){
  var run = getRun();
  if (run < 3 && run > -3){
    reportEvent("NO Momentum");
    return;
  }
  var Order = {};
  Order.UserId = 0;
  Order.Volume = Math.floor(triangle(1, 25, 100));
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
  simulator.pStar = nearestTick(Math.random()*4 + 18);
  reportEvent(`p-star change now: ${simulator.pStar}`);
};

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
  Order.Volume = Math.floor(triangle(1, 25, 100));
  Order.AssetId = "INTC";
  Order.Class = "Market";
  Order.Strike = simulator.pStar;
  Order.Type = theType;

  executeOrder(Order, "Informed");
};

var liquidityOrder = function(){
  var patient = true;
  if (Math.random() < .35){
    patient = false;
  }

  var Order = {};
  Order.Volume = Math.floor(triangle(1, 25, 100));
  Order.AssetId = "INTC";
  Order.UserId = 0;

  if (Math.random() < .5){
    //Buy order
    Order.Type = "Bid";

    if (patient){
      var bid = getBid();
      var ask = getAsk();
      var tick = getTick();
      Order.Strike = nearestTick(triangle(bid*.99, bid + tick, ask));
      Order.Class = "Limit";
    } else if (!patient){
      Order.Class = "Market";
      var ask = getAsk();
      Order.Strike = nearestTick(triangle(ask, ask*(1+0.0075), ask*(1+0.015)));
    }

  } else {
    //Sell order
    Order.Type = "Ask";

    if (!patient){
      Order.Class = "Market";
      var bid = getBid();
      Order.Strike = nearestTick(triangle(bid*(1-0.015), bid*(1-0.0075), bid));
    } else {
      Order.Class = "Limit";
      var bid = getBid();
      var ask = getAsk();
      var tick = getTick();
      Order.Strike = nearestTick(triangle(bid, ask - tick, ask*1.01));
    }
  }
  executeOrder(Order, `Liquidity ${patient ? "Patient": "Impatient"}`);
};

var processEvent = function(eventType){
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
  processEvent(event.type);
  if (simulator.events.length > 0){
    updateClock(event.secondsUntilNext);
    setTimeout(getNextEvent, Math.max(event.secondsUntilNext*simulator.msPerSecond - simulator.buffer, 0));
  }
};
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

var simulateDay =function(){
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
//array = simulateDay(100,50,50,3,1);
//console.log(array)

var getNewPstar = function(oldPstar){
    return(PD.rnorm(1,oldPstar,1)[0]);
}
