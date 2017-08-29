import Switch, {Case, Default} from 'react-switch-case';
import React, { Component } from 'react';
import Plot from './Plot'
import Line from './Line'
import PropTypes from 'prop-types';
import * as firebase from 'firebase';

class Switcher extends Component {
	constructor() {
	    super()
	    this.state = {
	      value: "Candlestick",
				timeseries: []
	    }
	  }

		handleChange(event) {
			this.setState({ value: event.target.value })
	    }

		componentDidMount() {
      //console.log("mounting");
			//would you rather get a whole new array or just one new point?
			var self = this;
      var validatePoint = function(newpt){
					if(newpt.price === 0){
						return false;
					}
					var theTime = new Date(newpt.time);
					if(theTime.getUTCHours()>16){
						return false;
					}else if(theTime.getUTCHours()===16 && theTime.getUTCMinutes() >=1){
						return false;
					} else if(theTime.getUTCHours()<9){
						return false;
					}else if(theTime.getUTCHours()===9 && theTime.getUTCMinutes()<30){
						return false;
					}
          return true;
      }

      var newItems = false;

      this.timeseriesRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("TimeSeries");
      this.timeseriesRef.on('child_added', snap => {
        if (!newItems) return;
        var pnt = snap.val();
        //console.log("added", pnt);
        var pointHandler = function(newpt){
          //console.log(theTime.toUTCString());
          //console.log("point handler called");
          if (!validatePoint(newpt)){
            //console.log("invalid",newpt);
            return null;
          }
          var timeseries = self.state.timeseries;
          timeseries.push(newpt);
          //console.log("updated with",newpt);
          self.setState({
            timeseries: timeseries
          })
        }
        pointHandler(pnt);
      }); //end the child_added
      this.timeseriesRef.once('value', snap=>{
        //console.log("loading values once only!!");
        newItems = true;
        var timeseries = self.state.timeseries;
        snap.forEach(pnt => {
          if (!validatePoint(pnt)){
            return null;
          } else {
            timeseries.push(pnt.val());
          }
        });
        self.setState({
          timeseries: timeseries
        });

      });//end the once


			//TODO:hopefully this doesnt break it
			// var trace1 = {
			// 	x: [],
			// 	y: [],
			// 	type: 'scatter'
			// };
			//
			// var trace2 = {
			// 	x: [],
			// 	y: [],
			// 	type: 'scatter'
			// };





		//THIS ONE WORKS
		// for (var i=0; i<timeseries1.length; i++) {
		//     pointHandler(timeseries1[i]);
		// }

		// for (var i=0; i<timeseries2.length; i++) {
		//   trace2.x.push(timeseries2[i]["time"]);
		//   trace2.y.push(timeseries2[i]["price"]);
		// }




		}

		componentWillUnmount(){
			this.timeseriesRef.off();
		}



	render() {
		const style = {
		float: 'none',
		margin: '0 auto'
  };
		return (

			<div>
			{/* <select className='form-control' style={style} ref="selectOption" onChange={(e) => this.handleChange(e)}>
               <option  defaultValue="Candlestick" >Candlestick</option>
               <option value="Line" >Line</option>
            </select> */}
			<Switch condition={this.state.value}>
			  <Case value='Candlestick'>
			    <Plot timeseries={this.state.timeseries} />
			  </Case>
			  <Case value='Line'>
			    <Line timeseries={this.state.timeseries} />
			  </Case>
			  <Default>
			    <span>Nothing!</span>
			  </Default>
			</Switch>
			<select className='form-control' style={style} ref="selectOption" onChange={(e) => this.handleChange(e)}>
               <option  defaultValue="Candlestick" >Candlestick</option>
               <option value="Line" >Line</option>
            </select>
	      	</div>
			);
	}
}

Switcher.propTypes = {
  sessionid: PropTypes.string
};

export default Switcher;
