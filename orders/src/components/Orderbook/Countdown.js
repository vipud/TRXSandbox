import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as firebase from 'firebase';

class Countdown extends Component {

  constructor(props){
    super(props);
    this.state = {
      time: 315,
      displayTime: ""
    }
  }

  decreaseTime(){
    this.setState({
      time: this.state.time - 1
    });
    if(this.state.time >=0){
    this.convertTime(this.state.time);
    }else{
      clearInterval(this.interval);
    }
  }

  convertTime(time){
    let minutes = Math.floor(time/60);
    let seconds = time-(minutes*60);
    if(seconds<10){
      seconds = "0"+ seconds;
    }
    let displayTime = minutes+":"+seconds;
    this.setState({
      displayTime: displayTime
    });
  }

  componentDidMount(){
    this.timerRef = firebase.database().ref("Sessions").child(this.props.sessionid).child("StartSim").child("start");
     this.timerRef.on('value', snap =>{
       if(!!snap.val()){
       this.interval = setInterval(this.decreaseTime.bind(this),1000);
      }
     });
  }

  componentWillUnmount(){
    this.timerRef.off();
    clearInterval(this.interval);
  }

  render() {
    return (
      <div className="col-xs-2">Time:{this.state.displayTime}</div>
    );
  }
}

Countdown.propTypes = {
  sessionid: PropTypes.string
};

export default Countdown;
