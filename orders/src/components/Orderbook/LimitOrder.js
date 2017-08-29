import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as firebase from 'firebase';

class LimitOrder extends Component {

  constructor(props){
    super(props);
    this.state = {
      midAskStyle:false,
      midBidStyle:false,
      placeholderBid:"",
      placeholderAsk:"",
      paused: this.props.paused
    };
  }
  handleClear = (event) => {
  event.persist();
  const ordersRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Orders").child("INTC").child((this.props.Strike*100).toFixed(0));
  const deleteRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("DeletesPending");
    ordersRef.once('value', snap =>{
      let rawOrders = snap.val();
      if(rawOrders != null){
      //console.log(rawOrders);
      let keys = Object.keys(rawOrders);
      for(var i=0;i<keys.length;i++){
        if(rawOrders[keys[i]].Type==='Bid' && event.target.name==='userBidReset'){
          //ordersRef.child(keys[i]).child("DeleteThis").set(true);
          this.setState({
            placeholderBid:""
          });
          let newKey = deleteRef.push();
          newKey.set(rawOrders[keys[i]]);

        }else if(rawOrders[keys[i]].Type==='Ask' && event.target.name==='userAskReset'){
          //ordersRef.child(keys[i]).child("DeleteThis").set(true);
          this.setState({
            placeholderAsk:""
          });
          let newKey = deleteRef.push();
          newKey.set(rawOrders[keys[i]]);

        }
      }
     }
    });
  }
  handleKeyUp = (event) => {
  //let totVol = 0;
  const ordersPendingRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("OrdersPending");
  //needs updating
  const aheadRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Orders").child("INTC").child((this.props.Strike*100).toFixed(0));
    if(event.key === 'Enter'){
      if(event.target.value != null && !isNaN(event.target.value) && event.target.value % 1 === 0){
      var volumeInt = parseInt(event.target.value,10);
      if(volumeInt > 0 && volumeInt <= 999){
      if(event.target.name==='userBid'){

        let order = {
          AheadOfThis: 0,
          OrderId: -1,
          UserId: this.props.uid,
          Type: event.target.getAttribute("data-type"),
          Volume: volumeInt,
          AssetId: "INTC",
          Strike: (this.props.Strike*100).toFixed(0),
          Class: "Limit"

        }
        //console.log(order);
        event.target.value = "";
        let newOrderRef = ordersPendingRef.push();
        newOrderRef.set(order);
        aheadRef.on('value', snap =>{
           let totVolBid = 0;
           var rawData = snap.val();
           //console.log(rawData); //strikes
           for(var key in rawData){
             if(rawData[key].Type === "Bid" && rawData != null){
             totVolBid  += rawData[key].Volume;
             this.setState({
               placeholderBid:(totVolBid).toString()+" ("+(rawData[key].AheadOfThis).toString()+")",
               placeholderAsk:""
             });
             //console.log(rawData[key]);
            }
           }

         })
      }else{

        let order = {
          AheadOfThis: 0,
          OrderId: -1,
          UserId: this.props.uid,
          Type: event.target.getAttribute("data-type"),
          Volume: volumeInt,
          AssetId: "INTC",
          Strike: (this.props.Strike*100).toFixed(0),
          Class: "Limit"
        }
        //console.log(order);
        event.target.value = "";
        let newOrderRef = ordersPendingRef.push();
        newOrderRef.set(order);
        aheadRef.on('value', snap =>{
          let totVolAsk = 0;
           var rawData = snap.val();
           //console.log(rawData);
           for(var key in rawData){
             if(rawData[key].Type === "Ask"){
             totVolAsk  += rawData[key].Volume;
             this.setState({
               placeholderBid:"",
               placeholderAsk:(totVolAsk).toString()+" ("+(rawData[key].AheadOfThis).toString()+")"
             });
             //console.log(rawData[key].AheadOfThis);
           }
         }
        })
      }
    }else{
      alert("You must enter a number between 0 and 999");
      event.target.value = "";
    }
    }else{
      alert("You must enter a valid whole number");
      event.target.value = "";
    }
    };
  };

  componentDidMount(){

  }

  componentWillReceiveProps(nextProps){
    //TODO: this is the better way to do it
    //console.log(nextProps.midPoints[0]);
    var midBid, midAsk;
    midBid = (nextProps.midPoints[0].midBid).toFixed(2);
    midAsk = (nextProps.midPoints[0].midAsk).toFixed(2);
    if(midBid === this.props.Strike){
      this.setState({
        midBidStyle: true
      });
      //console.log(midBid, this.props.Strike, this.state.midBidStyle);
    }else{
      this.setState({
        midBidStyle: false
      });
    }

    if(midAsk === this.props.Strike){
      this.setState({
        midAskStyle: true
      });
    }else{
      this.setState({
        midAskStyle: false
      });
    }

    if(nextProps.paused === true){
      //console.log("paused:", nextProps.paused);
      this.setState({
        paused:true
      });
    }else{
      //console.log("else paused:", nextProps.paused);
      this.setState({
        paused:false
      });
    }
    //console.log(midBid,midAsk, this.props.Strike);
  }

  render(){
    return (

      <div>
        <div className='col-xs-3'><input disabled={this.state.paused} onClick={this.handleClear} className="btn-danger" name="userBidReset" type="reset" size="1" value="x" />
        <input disabled={this.state.paused} onKeyUp={this.handleKeyUp} data-type="Bid" name="userBid" className="userBid" type="text" size="4" placeholder={this.state.placeholderBid}  />
        </div>
        <div style={this.state.midBidStyle ? {'backgroundColor':'rgba(0,255,0,0.2)'} : {}} className='col-xs-2 bid'>{this.props.Bid}</div>
        <div className='col-xs-2 strike'>{this.props.Strike}</div>
        <div style={this.state.midAskStyle ? {'backgroundColor':'rgba(255,0,0,0.2)'} : {}} className='col-xs-2 ask'>{this.props.Ask}</div>
        <div className='col-xs-3' ><input disabled={this.state.paused} onKeyUp={this.handleKeyUp} data-type="Ask" className="userAsk" type="text" size="4" placeholder={this.state.placeholderAsk}  />
        <input disabled={this.state.paused} onClick={this.handleClear} className="btn-danger" name="userAskReset"  type="reset" size="1" value="x" />
        </div>
      </div>
    );
  }
}

LimitOrder.propTypes = {
  sessionid: PropTypes.string,
  uid: PropTypes.string,
  Bid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  Ask: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  Strike: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default LimitOrder;
