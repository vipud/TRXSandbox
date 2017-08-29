import React, { Component } from 'react';
import PropTypes from 'prop-types';
//import firebase from 'firebase';

//receives transaction prop from transactionswitcher

//this component deals with market transactions
class MarketTransaction extends Component {
  constructor(props) {
    super(props);
    this.state = {
      transactions: []
    };
  }

// componentWillMount() {
//
// }

  componentDidMount() {
    //allows transactions to persist

    //console.log("mounted",this.props,this.state);
    this.setState({
      transactions: this.props.transaction
    });
  }

  componentWillReceiveProps(nextProps) {
    //on nextProps, set the state to be rendered

    //console.log(nextProps);
    let trns = [];
    trns.push(nextProps);
    //console.log("trns",trns);
    //console.log("trns[0]",trns[0]);
    this.setState({
      transactions: trns[0]['transaction']
    });
  }


  render() {

    //console.log(this.state.transactions, "in render");
    return (
      <div className='row text-center' id='markettransaction'>
        {this.state.transactions.map(function(trn, index){
          var color;
          //mapping market transactions while rendering color
          //based on sell or buy
          if(trn.Type === "Sell"){
            color = {backgroundColor:'rgba(255,0,0,0.08)'};
          }else if(trn.Type === "Buy"){
            color = {backgroundColor:'rgba(0,255,0,0.08)'};
          }
          return (
          <div style={color} className='row' key={index}>
             <div className='col-xs-4'>{trn.Time}</div>
             <div className='col-xs-2'>{trn.Volume} shares of</div>
             <div className='col-xs-2'>ABC were</div>
             <div className='col-xs-2'>{trn.Type === "Sell" ? "Sold" : "Bought"} at</div>
             <div className='col-xs-2'>${(trn.Price/100).toFixed(2)}</div>
           </div>
          );
        })}
      </div>
    );
  }
}

MarketTransaction.propTypes = {
  nextProps: PropTypes.array
};

export default MarketTransaction;
