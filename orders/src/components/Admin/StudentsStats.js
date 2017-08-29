import React, { Component } from 'react';
import PropTypes from 'prop-types';
//import {Link} from 'react-router-dom';
import * as firebase from 'firebase';

class StudentsStats extends Component {

  constructor(props){
    super(props);
    this.state = {
      students: [],
      user: this.props.user,
      MarketVWAP: ''
    };
    //this.props.sessionid = this.props.location.state.sessionid;
  }


  componentDidMount(){
    //TODO: needs the stats refactor
    this.userRef = firebase.database().ref("Sessions").child(this.props.location.state.sessionid).child("Users");
    this.vwapRef = firebase.database().ref("Sessions").child(this.props.location.state.sessionid).child("Assets").child("INTC").child("VWAP");
    var username, shares, cash, BuyVWAP, SellVWAP;

    this.vwapRef.on('value', snap => {
      if(snap.val()){
        this.setState({
          MarketVWAP:snap.val()
        });
      }else{
        this.setState({
          MarketVWAP:''
        });
      }
    });

    this.userRef.on('value', snap => {
      var rawData = snap.val();
      //console.log(rawData);
      var stdnts = [];
      for(var key in rawData){
        if(key !== '0'){
        username = rawData[key].DisplayName;
        shares = rawData[key].Assets.INTC.Stats.Shares;
        cash = rawData[key].Assets.Cash;
        BuyVWAP = rawData[key].Assets.INTC.Stats.BuyVWAP;
        SellVWAP = rawData[key].Assets.INTC.Stats.SellVWAP;
        //MarketVWAP = this.state.MarketVWAP;

        stdnts.push({
          //need to read user object i think
          "User":  username,
          "Shares": shares,
          "Cash": cash,
          "AverageBuyPrice": BuyVWAP,
          "AverageSellPrice": SellVWAP
          // "MarketVWAP": MarketVWAP
          });
        }
      }
      this.setState({
        students: stdnts
      });
      //console.log(this.state.students);
    })
  }

  componentWillUnmount(){
    this.vwapRef.off();
    this.userRef.off();
  }

  render(){
    const style = {
      border: '1px black solid',
      borderRadius: '5px',
      padding: '15px',
      margin: '5px',
      width:'80%'
    };

    return (
      <div>
      <div style={{"textAlign":"center", "fontSize":"20px"}} className='row'>Market VWAP: {this.state.MarketVWAP} </div>
      <div>
        {this.state.students.map(function(stdnt, index){
          return(
        <div className='row' key={index} style={style}>

          <div className='col-xs-2'>User: {stdnt.User}</div>
          {/* <div className='col-md-1'>Position: </div> */}
          <div className='col-xs-2'>ABC: {stdnt.Shares}</div>
          <div className='col-xs-2'>Cash: {stdnt.Cash}</div>
          <div className='col-xs-3'>Average Buy Price: {stdnt.AverageBuyPrice}</div>
          <div className='col-xs-3'>Average Sell Price: {stdnt.AverageSellPrice} </div>
          {/* <div className='col-md-2'>MarketVWAP: {stdnt.MarketVWAP} </div> */}

        </div>
        );})}
      </div>
    </div>
    );
  }
}

StudentsStats.propTypes = {
  user: PropTypes.object,
  authed: PropTypes.bool
  // this might not be right sessionid: PropTypes.string
};

export default StudentsStats;
