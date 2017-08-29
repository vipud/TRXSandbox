import React, { Component } from 'react';
import PropTypes from 'prop-types';
//import firebase from 'firebase';

//receives transaction prop from transactionswitcher

//this component deals with displaying user transactions

class UserTransaction extends Component {
  constructor(props) {
    super(props);
    this.state = {
      transactions: []
    };
  }

  componentDidMount() {
    //allows transactions to persist
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
      <div className='row text-center' id='usertransaction'>
        {this.state.transactions.map(function(trn, index){
          var color;
          //mapping user transactions while rendering color
          //based on sell or buy
          if(trn.Type === "Ask"){
            color = {backgroundColor:'rgba(255,0,0,0.2)'};
          }else if(trn.Type === "Bid"){
            color = {backgroundColor:'rgba(0,255,0,0.2)'};
          }
          return (
          <div style={color} className='row' key={index}>
             <div className='col-xs-4'>{trn.Time}</div>
             <div className='col-xs-2'>{trn.Volume} shares of</div>
             <div className='col-xs-2'>ABC were</div>
             <div className='col-xs-2'>{trn.Type === "Ask" ? "Sold" : "Bought"} at</div>
             <div className='col-xs-2'>${(trn.Price/100).toFixed(2)}</div>
           </div>);
        })}
      </div>
    );
  }
}

UserTransaction.propTypes = {
  nextProps: PropTypes.array
};

export default UserTransaction;
