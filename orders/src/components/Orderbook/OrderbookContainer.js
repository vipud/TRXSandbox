import React, { Component } from 'react';
import PropTypes from 'prop-types';
import LimitOrder from './LimitOrder';
import PlaceholderTest from './PlaceholderTest';
import MarketOrders from './MarketOrders';
import * as firebase from 'firebase';

//receives sessionid and uid props from container

//this component acts as the container for all
//components in the actual orderbook.

const quips = ["Calling in favors...", "Embezzling Funds...", "Betting against USD...", "Misplaced your cash...", "On the phone with the SEC..."];
class OrderbookContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      // midPoints: [],
      paused: true,
      quip:quips[Math.floor(Math.random()*quips.length)]
    };
  }

  //sets quip state to display quips on a timer
  getQuip() {
    this.setState({
      quip: quips[Math.floor(Math.random()*quips.length)]
    })
  }

  componentDidMount() {
    this.aggobRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Assets").child("INTC").child("AggOB");
    this.middlePointRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("ImportantData").child("SessionData");
    this.pausedRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child('StartSim').child('State');

    //declares quip automation timer
    this.quipsTimer = setInterval(this.getQuip.bind(this),5000);

    var strike, bid, ask, midBid, midAsk;

    //this listener deals with determining if the sim is paused
    this.pausedRef.on('value', snap => {
      let rawData = snap.val();
      if (rawData === "Running") {
        this.setState({
          paused: false
        });
      } else if (rawData === "Paused" || rawData === "Over") {
        this.setState({
          paused: true
        });
      }
    })

    //this listener deals with checking the middle bid
    //and ask points
    // this.middlePointRef.on('value', snap => {
    //   let rawData = snap.val();
    //   if (!!rawData) {
    //     var midPoints = [];
    //     //let midPoints = [];
    //     //console.log(rawData);
    //     midAsk = rawData.ask;
    //     midBid = rawData.bid;
    //     midPoints.push({
    //       midAsk: midAsk,
    //       midBid: midBid
    //     });
    //     //console.log(midAsk,midBid);
    //     this.setState({
    //       midPoints: midPoints
    //     });
    //   }
    // })

    //this listener deals with getting current strikes, bid,
    //and ask. Also deals with setting ready state
    this.aggobRef.on('value', snap => {
      let rawData = snap.val();
      if (rawData) {
        //console.log(rawData);
        var ords = [];
        for (var key in rawData) {
          //rawStrike = key;
          strike = (key / 100).toFixed(2);
          bid = rawData[key].Bid;
          if (bid === undefined) {
            bid = 0;
          }
          ask = rawData[key].Ask;
          if (ask === undefined) {
            ask = 0;
          }
          if (bid === 0) {
            bid = "";
          }
          if (ask === 0) {
            ask = "";
          }
          ords.push({
            "Strike": strike,
            "Bid": bid,
            "Ask": ask
          });
        }
        this.setState({
          orders: ords.reverse(),
          ready: true
        });
      } else {
        //var ords = [];
        this.setState({
          orders: ords,
          ready: false
        });
      }
    })


  }

  componentWillUnmount() {
    clearInterval(this.quipsTimer);
    this.aggobRef.off();
    this.middlePointRef.off();
    this.pausedRef.off();
  }

  render() {
    return (
      <div id='PlaceOrder'>
        <div id='placeorderstyle'>
          <MarketOrders institution={this.props.institution} paused={this.state.paused} uid={this.props.uid} sessionid={this.props.sessionid} />
          <div className='row text-center'>
            <div className='col-xs-3'>Limit Bid</div>
            <div className='col-xs-2'>Bids</div>
            <div className='col-xs-2'>Strike</div>
            <div className='col-xs-2'>Asks</div>
            <div className='col-xs-3'>Limit Ask</div>
          </div>
        </div>
        {
          this.state.ready
          //conditionally renders limit orders based on state.ready
          ? <div className='row text-center'>
              {this.state.orders.map(function(ord, index){
                return(
                  <div key={ord.toString()+index}>
                    <PlaceholderTest institution={this.props.institution} paused={this.state.paused} key={ord.toString()} uid={this.props.uid} sessionid={this.props.sessionid} Bid={ord.Bid}
                    Strike={ord.Strike} Ask={ord.Ask} /*midPoints={this.state.midPoints}*/ />
                  </div>
                );
              }.bind(this))}
            </div>
          : <div style={{'position':'absolute','top':'40%','left':'25%','fontSize':'26px'}}>{this.state.quip}</div>
        }
      </div>
    );
  }
}

OrderbookContainer.propTypes = {
  sessionid: PropTypes.string,
  uid: PropTypes.string
};

export default OrderbookContainer;
