let simulator = {};
simulator.msPerSecond = 10;
simulator.gameStart = new Date(1499074200000);

simulator.timeDate = new Date(1499074200000).toUTCString(simulator.start);
simulator.startTime = new Date();

simulator.getTime = function(){
    //returns the current unix time stamp
    let time = new Date().getTime();
    return time;
}
simulator.sinceStart = function(){
    //returns real world milliseconds since the game started
    return this.getTime() - this.startTime;
}
simulator.firstTime = function(){
    return this.gameStart.toUTCString();
}
simulator.currentGameTime = function(){
    return (Math.round((this.sinceStart()*(1/this.msPerSecond))*1000 + this.gameStart.getTime()));
}
