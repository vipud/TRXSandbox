/* global Plotly */
// Plot.js
import React from 'react';
import PropTypes from 'prop-types';
class Line extends React.Component {

  constructor(props) {
	    super(props);

	    this.state = {
	      trace1: {time: [], y: []}
	    };
      this.draw = function(nextState){
        //generate an "x" based on getTime
        var daycount = 0;
        if (nextState.trace1.time.length < 1){
          Plotly.newPlot('line', [], {}, {displayModeBar: false});
          return;
        }
        //We require a 9:30 timeseries event to start every day
        var currentDate = new Date(nextState.trace1.time[0]).toJSON().substr(0,10);
        var currentDayMs = new Date(nextState.trace1.time[0]).getTime();
        var tickvals = [0];
        var ticktext = [currentDate.substr(5,5)];
        var handleNewDay = function(stamp){
          var stampDate = new Date(stamp).toJSON().substr(0,10);
          if (stampDate !== currentDate){
            currentDate = stampDate;
            currentDayMs = new Date(stamp).getTime();
            daycount++;
            tickvals.push(23400000*daycount);
            ticktext.push(currentDate.substr(5,5));
          }
        }
        var xvals = nextState.trace1.time.map((stamp, i)=>{
          handleNewDay(stamp);
          //currentDayMs is the epoch at 9:30 the day of this stamp;
          //we want the x value to be the number of business ms simulated so far
          //daycount is the number of completed business days so far
          var thisEpoch = new Date(stamp).getTime();
          var msPerDay = 23400000;
          var x = thisEpoch - currentDayMs + msPerDay*daycount;
          tickvals.push(x);
          ticktext.push('');
          return x;
        });
        nextState.trace1.x = xvals;
        var data = [nextState.trace1];
        var getRange = function(xvals){
          return [xvals.reduce((a,b)=> parseFloat(a) <= parseFloat(b) ? a: b), xvals.reduce((a,b)=> parseFloat(a) >= parseFloat(b) ? a: b)];
        }
        var getYRange = function(yvals){
          return [yvals.reduce((a,b)=> parseFloat(a) <= parseFloat(b) ? a: b), yvals.reduce((a,b)=> parseFloat(a) >= parseFloat(b) ? a: b)];
        }
        var layout = {
          title: "",
          autosize: true,
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
						range: getRange(xvals),
						rangeslider: {range: getRange(xvals)},
						title: 'Date',
						type: 'linear',
            showgrid: false,
						tickmode: "array",
            tickvals: tickvals,
            ticktext: ticktext
					},
					yaxis: {
						autorange: true,
						domain: [0, 1],
						range: getYRange(nextState.trace1.y),
						type: 'linear'
					}
        }
        Plotly.newPlot('line', data, layout, {displayModeBar: false});
      }

	  }

    componentDidMount(){
      this.handlePoints = function(points){

        this.setState({trace1:
          {time: this.state.trace1.time.concat(points.map(el=>el.time)),
        y: this.state.trace1.y.concat(points.map(el=>el.price))}}
        );

      }
      var timeseries = this.props.timeseries;

        this.handlePoints(timeseries);

    }

		componentWillReceiveProps(nextProps) {
      //console.log(nextProps);
      var count = this.state.trace1.time.length;
      var propLength = nextProps.timeseries.length;
      //console.log(count, propLength);
      this.handlePoints(nextProps.timeseries.slice(count, propLength));



}
componentWillUpdate(nextProps, nextState){
  this.draw(nextState);
}


  render() {
    return (
    <div>
      <div id="line"></div>
    </div>
  );
};
}

Line.propTypes = {
  timeseries: PropTypes.array
};

export default Line;
