import React, {Component} from 'react';
import PropTypes from 'prop-types';
import * as firebase from 'firebase';

//gets sessionid props from MarketOrders

//this component checks (StartSim/ready)
//and conditionally renders the start
//button accordingly

class Button extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isPaused: true,
      ready: false
    }
    this.start = this.start.bind(this);
    this.pause = this.pause.bind(this);
  }

  //deals with starting and restarting a session
  start() {
    const simStateRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child('StartSim');
    simStateRef.child("start").set(true);
    simStateRef.child("State").set("Running");
    this.setState({
      isPaused: false
    })
    //console.log("true");
  }

  //deals with pausing a session
  pause() {
    const simStateRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child('StartSim');
    this.setState({
      isPaused: true
    })
    console.log("Changing state of running to 'Paused'");
    simStateRef.child("running").remove().then(function() {
      simStateRef.child("start").set(false);
    }).then(function() {
      simStateRef.child("State").set("Paused");
    });
  }

  componentDidMount() {
    console.log(this.props);
    this.buttonStateRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child('StartSim').child('Ready');
    this.buttonStateRef.on('value', snap => {
      if (snap.val()) {
        this.setState({
          isPaused: true,
          ready: true
        })
      }
    })
  }

  componentWillUnmount() {
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
      button = <button onClick={this.start} className="btn btn-danger start">Start</button>;
    } else {
      button = <button onClick={this.pause} className="btn btn-danger pause">Pause</button>;
    }

    return (
      <div className="col-xs-4">
        {
          this.state.ready
          ? button
          : <div></div>
        }
      </div>
    );
  }
}

Button.propTypes = {
  sessionid: PropTypes.string
};

export default Button;
