var simulator = {}; //"global" namespace

simulator.msPerSecond = 0;
simulator.buffer = 15;
simulator.gameTime = new Date("2017-06-12T09:30:00.000");
simulator.pStar = 21;

var triangle = function(min, mode, max){ // done
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

var getBid = function(){ // not done
  return 20.10;
}

var nearestTick = function(rawPrice){ // done
  var tick = getTick();
  return Math.round(rawPrice/tick)*tick;
}

var getAsk = function(){ // not done
  return 21.30;
}

var getTick = function(){ // not done
  return .1;
}

var getRun = function(){ // not done
  return 3*Math.floor(Math.random()*3 -  1);
}

var updateClock = function(seconds){ // done
  simulator.gameTime.setSeconds(simulator.gameTime.getSeconds() + seconds);
}

var reportEvent = function(eType){ // for testing
  document.querySelector('ul').innerHTML += `<li>performing ${eType} event at game time: ${simulator.gameTime.toLocaleTimeString()}, real time: ${new Date()}</li>`;
};

var executeOrder = function(order, extra=""){ // not done testing
  reportEvent(`${extra} ORDER: ${JSON.stringify(order)}`);
};

var momentumOrder = function(){ // needs to be generalized
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

var pStarChange = function(){ // not done
  simulator.pStar = nearestTick(Math.random()*4 + 18);
  reportEvent(`p-star change now: ${simulator.pStar}`);
};

var informedOrder = function(){ // needs to be generalized
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

var liquidityOrder = function(){ // needs to be generalized
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

var processEvent = function(eventType){ // done
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



var getNextEvent = function(){ // done
  var event = simulator.events.shift();
  processEvent(event.type);
  if (simulator.events.length > 0){
    updateClock(event.secondsUntilNext);
    setTimeout(getNextEvent, Math.max(event.secondsUntilNext*simulator.msPerSecond - simulator.buffer, 0));
  }
};

getNextEvent();
