import React, { Component } from 'react';
import PropTypes from 'prop-types';
import '../../../node_modules/bootstrap/dist/css/bootstrap.min.css';
//import Countdown from './Countdown';
import Button from './Buttons';
import * as firebase from 'firebase';

//receives paused, uid, and sessionid props from OrderbookContainer

//this component deals with submitting market orders as well as
//rendering the start button(will need to change)

class MarketOrders extends Component {
  constructor(props) {
    super(props);
    this.state = {
      paused: this.props.paused
    }
  }


  handleMarketKeyUp = (event) => {
    const ordersPendingRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("OrdersPending");
    //if statements handle various checks (to validate input)
    if (event.key === 'Enter') {
      if (event.target.value != null && !isNaN(event.target.value) && event.target.value % 1 === 0) {
        var volumeInt = parseInt(event.target.value, 10);
        if (volumeInt > 0 && volumeInt <= 999) {
          if (event.target.name === 'marketBid') {
            //checks if the market order was a Bid and sets that order
            //to OrdersPending
            var order = {
              Type: "Bid",
              Volume: volumeInt,
              UserId: this.props.uid,
              AssetId: "INTC",
              Strike: null,
              Class: "Market"

            }
            //console.log(order);
            var newOrderRef = ordersPendingRef.push();
            newOrderRef.set(order);
            event.target.value = "";
          } else {
            //checks if the market order was a Ask and sets that order
            //to OrdersPending
            order = {
              Type: "Ask",
              Volume: volumeInt,
              AssetId: "INTC",
              UserId: this.props.uid,
              Strike: null,
              Class: "Market"
            }
            //console.log(order);
            newOrderRef = ordersPendingRef.push();
            newOrderRef.set(order);
            event.target.value = "";
          }
        } else {
          alert("You must enter a number between 0 and 999");
          event.target.value = "";
        }
      } else {
        alert("You must enter a valid whole number");
        event.target.value = "";
      }
    };
  }

  componentWillReceiveProps(nextProps) {
    //checks to see if the game is paused and
    //sets paused state to true or false
    if (nextProps.paused === true) {
      //console.log("paused:", nextProps.paused);
      this.setState({
        paused: true
      });
    } else {
      //console.log("else paused:", nextProps.paused);
      this.setState({
        paused: false
      });
    }
  }

  render() {
    return (
      <div className='row text-center'>
        {/* based on the paused state, will disable
        the input for market orders */}
        <div className='col-xs-4'>Market Buy:<input disabled={this.state.paused} onKeyUp={this.handleMarketKeyUp} className="marketBid" type="text" name="marketBid" size="4" /></div>
        <Button institution={this.props.institution} sessionid={this.props.sessionid} />
        {/* <Countdown sessionid={this.props.sessionid} /> */}
        <div className='col-xs-4' >Market Sell:<input disabled={this.state.paused} onKeyUp={this.handleMarketKeyUp} className="marketAsk" type="text" name="marketAsk" size="4" /></div>
      </div>
    );
  }
}

MarketOrders.propTypes = {
  sessionid: PropTypes.string,
  uid: PropTypes.string
};

export default MarketOrders;
