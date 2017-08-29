/* global Plotly */
// Plot.js
import React from 'react';
import PropTypes from 'prop-types';
var plotself;

class Plot extends React.Component {

  constructor(props) {
	    super(props);
//removing .x and using .time everywhere
      plotself = this;
      this.secondsPerCandle = 1800;
	    this.state = {
        trace1: {
          close: [],
          high: [],
          low: [],
          open: [],
          time: []
        },
        numPoints: 0
      }

	  }

    componentDidMount(){
      this.getXRange = function(trace){
        //console.log(trace);
        if(!trace || trace.time.length === 0){
          return [0,1];
        }else{
          let XRange = [0, trace.time.length-1];
          return XRange;
        }
      }
      this.getYRange = function(trace){
        if(!trace || trace.time.length === 0){
          return [10,30];
        }else{
          let YRange = [trace.low.reduce((a,b)=> parseFloat(a) <= parseFloat(b) ? a: b), trace.high.reduce((a,b)=> parseFloat(a) >= parseFloat(b) ? a: b)];
          return YRange;
        }
      }
      this.getXSlide = function(trace){
          if(!trace || trace.time.length === 0){
            return {range: [0, 1] };
          }else{
            let XSlide = {range: [Math.max(0, trace.time.length-11), trace.time.length-1]};
            return XSlide;
          }
      }

      this.handlePoints = function(points){

        var needsNewCandle = function(point, currentCandle){
          let nextTime = new Date(point.time);
          if(!currentCandle || new Date(currentCandle.time).toJSON().substr(0,10)!== nextTime.toJSON().substr(0,10)){
            let price = parseFloat(parseFloat(point.price).toFixed(2));
            let now  = new Date(point.time).getTime();
            let newCurrentCandle = {
              time: new Date(now).toJSON(),
              open:price,
              close:price,
              high:price,
              low:price,
            }
            return [newCurrentCandle];

          }
          let now  = new Date(point.time).getTime();
          let then = new Date(currentCandle.time).getTime();
          //Decides if needs new candle
          var secondsPerCandle = plotself.secondsPerCandle;
          var cutOff = new Date(then);
          cutOff.setSeconds(cutOff.getSeconds() + secondsPerCandle);
          if (now < cutOff.getTime() || nextTime.getUTCHours() >= 16){ //listen for 4pm here!
            return false;
          }
          else{
          //Generate Empty Candles
          let numCandles = parseInt(Math.floor((now - then)/(secondsPerCandle*1000)),10);
          let candles = [];
          if (numCandles > 1){
            let emptyCandle = {
              time : null,
              high:currentCandle.close,
              low:currentCandle.close,
              open:currentCandle.close,
              close:currentCandle.close,
            }
            for(let i = 1; i < numCandles ; i++){
              candles.push(JSON.parse(JSON.stringify(emptyCandle)));
              let stamp = new Date(then + i*(secondsPerCandle*1000)).toJSON()
              candles[i-1].time = stamp;
            }
          }
          let price = parseFloat(parseFloat(point.price).toFixed(2));
          let newCurrentCandle = {
            time: new Date(then + numCandles*(secondsPerCandle*1000)).toJSON(),
            open:price,
            close:price,
            high:price,
            low:price,
          }
          candles.push(newCurrentCandle);
          return candles;
          }
        };

        var mergePoint = function(point, currentCandle){
          var price = parseFloat(point.price);
          var prettyPrice = parseFloat(price.toFixed(2));
          currentCandle.close = prettyPrice;
          if(price < currentCandle.low){
            currentCandle.low = prettyPrice;
          }
          else if(price > currentCandle.high){
            currentCandle.high = prettyPrice;
          }
          return JSON.parse(JSON.stringify(currentCandle));
        };

      //TODO: is this used?  var currentLength = this.state.trace1.time.length;
        var currentTrace = this.state.trace1;
        var currentNumPoints = this.state.numPoints;

        var getCurrentCandle = function(trace){
          var length = trace.time.length;
          if (length === 0){
            return null;
          }
          var curCandle = {
            time: trace.time[length-1],
            low: trace.low[length-1],
            high: trace.high[length-1],
            close: trace.close[length-1],
            open: trace.open[length-1]
          };
          return curCandle;
        }
        var currentCandle = getCurrentCandle(currentTrace);

        //start point loop here set state after all processing
        for(var j = 0; j < points.length; j++){
          var point = points[j];
          var isNew = needsNewCandle(point, getCurrentCandle(currentTrace));
          if (!!isNew){
            //append new candle
            for(var k=0; k < isNew.length; k++){
              currentTrace.time.push(isNew[k].time);
              currentTrace.close.push(isNew[k].close);
              currentTrace.open.push(isNew[k].open);
              currentTrace.high.push(isNew[k].high);
              currentTrace.low.push(isNew[k].low);
            }
            currentNumPoints += 1;
          } else {
            currentNumPoints += 1;
            var updateCandle = mergePoint(point, getCurrentCandle(currentTrace));
            currentTrace.time.pop();
            currentTrace.time.push(updateCandle.time);
            currentTrace.close.pop();
            currentTrace.close.push(updateCandle.close);
            currentTrace.high.pop();
            currentTrace.high.push(updateCandle.high);
            currentTrace.low.pop();
            currentTrace.low.push(updateCandle.low);
            currentTrace.open.pop();
            currentTrace.open.push(updateCandle.open);
          }
        }
        this.setState({trace1: currentTrace, numPoints: currentNumPoints});
      }
      var timeseries = this.props.timeseries;
      this.handlePoints(timeseries);
    }

		componentWillReceiveProps(nextProps) {

      var count = this.state.numPoints;
      var propLength = nextProps.timeseries.length;
      this.handlePoints(nextProps.timeseries.slice(count, propLength));
    }

  componentWillUpdate(nextProps, nextState){
    //TODO: fix error where get Range is null array
    //console.log(nextState); //neither is null
    //console.log(nextState.trace1);
    var newTrace = Object.assign(nextState.trace1, {
        x: Array(nextState.trace1.time.length).fill().map((_, i) => i),
        decreasing: {line: {color: 'red'}},
        increasing: {line: {color: 'green'}},
        line: {color: 'rgba(31,119,180,1'},
        type: 'candlestick',
        xaxis: 'x',
        yaxis: 'y'
        //hoverinfo: 'skip'
    });
    var data = [newTrace];

    var layout = {
      dragmode: 'zoom',
      margin: {
        r: 10,
        t: 25,
        b: 40,
        l: 60
      },
      showlegend: false,
      xaxis: {
        autorange: true,
        domain: [0, 1],
        range: this.getXRange(nextState.trace1),//this is null
        //autorange:true,
        rangeslider: this.getXSlide(nextState.trace1),
        title: 'Date',
        type: 'linear',
        tickmode: "array",
        tickvals: Array(nextState.trace1.time.length).fill().map((_, i) => i),
        ticktext: nextState.trace1.time.map((stamp, i) => {
          var numCandlesPerDay = 23400/plotself.secondsPerCandle;
          var d = new Date(stamp);
          if (i % numCandlesPerDay === 0){
            return `OPEN ${d.getUTCMonth()+1}-${d.getUTCDate()}`;
          } else {
            var dnum = d.getUTCMinutes();
            if (dnum < 10){
              dnum = '0'+dnum;
              return '';
            }
            return `${d.getUTCHours()}:${dnum}`;
          }
        })
      },
      yaxis: {
        autorange: true,
        domain: [0, 1],
        range: this.getYRange(nextState.trace1), //so is this
        //autorange: true,
        type: 'linear'
      }
    };
    Plotly.newPlot('plot',data,layout, {displayModeBar: false});
  }

  render() {
    return (
    <div>
      <div id="plot"></div>
    </div>
  );
};
}

Plot.propTypes = {
  timeseries: PropTypes.array
};

export default Plot;
