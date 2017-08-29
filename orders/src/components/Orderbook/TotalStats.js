import React, {Component} from 'react';
import PropTypes from 'prop-types';
//import '../../style/Orderbook.css';
import * as firebase from 'firebase';

//receives sessionid and uid props from container.js

//This component is responsible for displaying
//the stats of the user as well as the market

class TotalStats extends Component {
  constructor(props) {
    super(props);
    this.state = {
      AverageBuyPrice: 'N/A',
      AverageSellPrice: 'N/A',
      MarketVWAP: 'N/A',
      Cash: 'N/A',
      ABC: 'N/A',
      PL: 'N/A',
      LastPrice: 'N/A',
      TotalVol: 'N/A',
      ThisPosition: 'N/A',
      Mission: 'awaiting orders'
    };
  }

  componentDidMount() {
    //declares all listeners
    this.cashRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Assets").child("Cash");
    this.statsRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Assets").child("INTC").child("Stats");
    this.vwapRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Assets").child("INTC");

    //grabs user cash value and sets
    //corresponding state
    this.cashRef.on('value', snap => {
      if (snap.val() !== null) {
        this.setState({
          Cash: snap.val()
        });
      }
    });

    //grabs user stat values and sets
    //corresponding states
    this.statsRef.on('value', snap => {
      if (snap.val()) {
        this.setState({
          AverageBuyPrice: snap.val().BuyVWAP,
          AverageSellPrice: snap.val().SellVWAP,
          PL: snap.val().PL,
          ABC: snap.val().Shares,
          ThisPosition: snap.val().ThisPosition
        });
      } else {
        this.setState({
          AverageBuyPrice: 'N/A',
          AverageSellPrice: 'N/A',
          PL: 'N/A',
          ABC: 'N/A',
          ThisPosition: 'N/A'
        });
      }
    });

    //grabs market stats and sets
    //corresponding states
    this.vwapRef.on('value', snap => {
      if (snap.val()) {
        this.setState({
          MarketVWAP: (snap.val().VWAP),
          LastPrice: (snap.val().CurrentAssetPrice / 100).toFixed(2),
          TotalVol: snap.val().TotalVolume
        });
      } else {
        this.setState({
          MarketVWAP: 'N/A',
          LastPrice: 'N/A',
          TotalVol: 'N/A'
        });
      }
    });

  }

  componentWillUnmount() {
    this.statsRef.off();
    this.vwapRef.off();
    this.cashRef.off();
  }

  render() {
    return (
      //TODO: there is a better way to do this CSS
      <div id='stats_table'>
        <div className='row'>
          <div className='row'>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2 col-xs-offset-1'>Cash</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>ABC</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>AvgBuy</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>AvgSell</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>P/L</div>
          </div>
          <div className='row'>
            <div className='col-xs-2 col-xs-offset-1'>{this.state.Cash}</div>
            <div className='col-xs-2'>{this.state.ABC}</div>
            <div className='col-xs-2'>{this.state.AverageBuyPrice}</div>
            <div className='col-xs-2'>{this.state.AverageSellPrice}</div>
            <div className='col-xs-2'>{this.state.PL}</div>
          </div>
        </div>
        <br />
        <div className='row'>
          <div className='row'>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2 col-xs-offset-1'>MarketVWAP</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>LastPrice</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>TotalVol</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>This Position</div>
            <div style={{'fontWeight':'bold','fontSize':'14px'}} className='col-xs-2'>Instructions</div>
          </div>
          <div className='row'>
            <div className='col-xs-2 col-xs-offset-1'>{this.state.MarketVWAP}</div>
            <div className='col-xs-2'>{this.state.LastPrice}</div>
            <div className='col-xs-2'>{this.state.TotalVol}</div>
            <div className='col-xs-2'>{this.state.ThisPosition}</div>
            <div className='col-xs-2'>{this.state.Mission}</div>
          </div>
        </div>
      </div>
    );
  }
}

TotalStats.propTypes = {
  sessionid: PropTypes.string,
  uid: PropTypes.string
};

export default TotalStats;
