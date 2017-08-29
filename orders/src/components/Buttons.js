import React, { Component } from 'react';
import PropTypes from 'prop-types';
//import OAuth from './OAuth';
import * as firebase from 'firebase';

class Button extends Component {

constructor(props){
  super(props);
  this.state = {
    isPaused: true,
    ready: false
  }
}

start(){
  const simStateRef = firebase.database().ref().child("Sessions").child(this.props.sessionid).child('StartSim');
  simStateRef.child("start").set(true);
  simStateRef.child("State").set("Running");
  this.setState({
    isPaused: false
  })
  //console.log("true");
}

pause(){
  const simStateRef = firebase.database().ref().child("Sessions").child(this.props.sessionid).child('StartSim');
  this.setState({
    isPaused: true
  })
  console.log("Changing state of running to 'Paused'");
  simStateRef.child("running").remove().then(function(){
    simStateRef.child("start").set(false);
  }).then(function(){
    simStateRef.child("State").set("Paused");
  });
}
//TODO: probably shouldnt be WillMount
componentWillMount(){
  this.buttonStateRef = firebase.database().ref().child("Sessions").child(this.props.sessionid).child('StartSim').child('Ready');
  this.buttonStateRef.on('value', snap => {
    if(snap.val()){
      this.setState({
        isPaused: true,
        ready: true
      })
    }
  })
}

componentWillUnmount(){
  this.buttonStateRef.off();
  console.log("Unmounting");
  this.setState({
    isPaused: false,
    ready: true
  });
}

  render() {
    const isPaused = this.state.isPaused;
    let button = null;
    if (isPaused) {
      button = <button onClick={this.start.bind(this)} className="btn-basic start">Start</button> ;
    } else {
      button = <button onClick={this.pause.bind(this)} className="btn-basic pause">Pause</button>;
    }

    return (
      <div className="col-xs-2">
      {
        button
      }
      </div>
    );
  }
}

Button.propTypes = {
  sessionid: PropTypes.string
};

export default Button;
