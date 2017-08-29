import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as firebase from 'firebase';


//receives paused,uid,sessionid, bid, strike, ask, and midPoints props
//from OrderbookContainer

//this component deals with rendering all of the strikes in the
//orderbook as well as allowing users to enter limit orders and clear
//them. This component also deals with highlighting the equilibrium
//bid and ask price

var style;
class PlaceholderTest extends Component {
  constructor(props) {
    super(props);
    this.state = {
      midAskStyle: false,
      midBidStyle: false,
      placeholderBid: "",
      placeholderAsk: "",
      paused: this.props.paused
    };
  }

  //handles clearing orders,
  //can only be invoked if transaction hasnt occured
  handleClear = (event) => {
    event.persist();
    const ordersRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Orders").child("INTC").child((this.props.Strike * 100).toFixed(0));
    const deleteRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("DeletesPending");
    ordersRef.once('value', snap => {
      let rawOrders = snap.val();
      if (rawOrders != null) {
        //console.log(rawOrders);
        let keys = Object.keys(rawOrders);
        for (var i = 0; i < keys.length; i++) {
          if (rawOrders[keys[i]].Type === 'Bid' && event.target.name === 'userBidReset') {
            //ordersRef.child(keys[i]).child("DeleteThis").set(true);
            this.setState({
              placeholderBid: ""
            });
            let newKey = deleteRef.push();
            newKey.set(rawOrders[keys[i]]);

          } else if (rawOrders[keys[i]].Type === 'Ask' && event.target.name === 'userAskReset') {
            //ordersRef.child(keys[i]).child("DeleteThis").set(true);
            this.setState({
              placeholderAsk: ""
            });
            let newKey = deleteRef.push();
            newKey.set(rawOrders[keys[i]]);

          }
        }
      }
    });
  }

  //handles entering limit orders
  handleKeyUp = (event) => {
    const ordersPendingRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("OrdersPending");
    //various checks to validate input
    if (event.key === 'Enter') {
      if (event.target.value != null && !isNaN(event.target.value) && event.target.value % 1 === 0) {
        var volumeInt = parseInt(event.target.value, 10);
        if (volumeInt > 0 && volumeInt <= 999) {
          if (event.target.name === 'userBid') {
            //checks if order is a bid then sets
            //to OrdersPending
            let order = {
              AheadOfThis: 0,
              OrderId: -1,
              UserId: this.props.uid,
              Type: event.target.getAttribute("data-type"),
              Volume: volumeInt,
              AssetId: "INTC",
              Strike: (this.props.Strike * 100).toFixed(0),
              Class: "Limit"

            }
            //console.log(order);
            event.target.value = "";
            let newOrderRef = ordersPendingRef.push();
            newOrderRef.set(order);
          } else {
            //if order is a bid then sets
            //to OrdersPending
            let order = {
              AheadOfThis: 0,
              OrderId: -1,
              UserId: this.props.uid,
              Type: event.target.getAttribute("data-type"),
              Volume: volumeInt,
              AssetId: "INTC",
              Strike: (this.props.Strike * 100).toFixed(0),
              Class: "Limit"
            }
            //console.log(order);
            event.target.value = "";
            let newOrderRef = ordersPendingRef.push();
            newOrderRef.set(order);

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
  };

  componentDidMount() {
    this.aheadRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Orders").child("INTC").child((this.props.Strike * 100).toFixed(0));
    this.aheadRef.on('value', snap => {
      //this listener attemps to loop through orders
      //and determind total order volume at that Strike
      //as well as ahead of this(needs work)
      if (!!snap.val()) {
        let rawData = snap.val();
        console.log(rawData);
        let aheadkey = Object.keys(rawData)[Object.keys(rawData).length - 1];
        console.log(aheadkey);
        let ahead = rawData[aheadkey].AheadOfThis;
        console.log(ahead);
        let vol = 0;
        let keys = Object.keys(rawData);
        for (let i = 0; i < keys.length; i++) {
          vol += rawData[keys[i]].Volume;
        }
        console.log(vol, ahead);
        if (rawData[aheadkey].Type === 'Bid') {
          this.setState({
            placeholderBid: vol + "(" + ahead + ")",
            placeholderAsk: ""
          });
        } else {
          this.setState({
            placeholderBid: "",
            placeholderAsk: vol + "(" + ahead + ")"
          });
        }
      } else {
        this.setState({
          placeholderBid: "",
          placeholderAsk: ""
        })
      }
    })

  }

  componentWillUnmount() {
    this.aheadRef.off();
  }

  componentWillReceiveProps(nextProps) {
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
    // let newBid = nextProps.Bid;
    // let newAsk = nextProps.Ask;
    // if(newBid !== this.props.Bid){
    //   console.log("Bid:",this.props.Strike, this.props.Bid, newBid);
    //   style = {
    //     backgroundColor: 'green',
    //     transition:'backgroundColor 1s'
    //   }
    // }else{
    //   style = {}
    // }
    // if(newAsk !== this.props.Ask){
    //   console.log("Ask:",this.props.Strike, this.props.Ask, newAsk);
    //   style = {
    //     backgroundColor: 'red',
    //     transition:'backgroundColor 1s'
    //   }
    // }else{
    //   style ={}
    // }
  }

  render() {
    return (

      <div>
        <div className='col-xs-3'><input disabled={this.state.paused} onClick={this.handleClear} className="btn-danger" name="userBidReset" type="reset" size="1" value="x" />
        <input disabled={this.state.paused} onKeyUp={this.handleKeyUp} data-type="Bid" name="userBid" className="userBid" type="text" size="4"   />
        </div>
        <div style={style} className='col-xs-2 bid'>{this.props.Bid}</div>
        <div className='col-xs-2 strike'>{this.props.Strike}</div>
        <div style={style} className='col-xs-2 ask'>{this.props.Ask}</div>
        <div className='col-xs-3' ><input disabled={this.state.paused} onKeyUp={this.handleKeyUp} data-type="Ask" className="userAsk" type="text" size="4"   />
        <input disabled={this.state.paused} onClick={this.handleClear} className="btn-danger" name="userAskReset"  type="reset" size="1" value="x" />
        </div>
      </div>
    );
  }
}

PlaceholderTest.propTypes = {
  sessionid: PropTypes.string,
  uid: PropTypes.string,
  Bid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  Ask: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  Strike: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default PlaceholderTest;
