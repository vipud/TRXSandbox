import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AdminSessionContainer from './AdminSessionContainer';
import {Link} from 'react-router-dom';
import * as firebase from 'firebase';

//gets user props from app.js

//This component is the admin homepage
//and renders the admin session Container
//as well as quick start,custom session,
//and manage admin buttons

class AdminHome extends Component {
  constructor(props) {
    super(props);
    this.createSession = this.createSession.bind(this)
  }


  //this function generates a quick session with default parameters
  createSession() {
    const sessionRef = firebase.database().ref().child(this.props.institution).child("Sessions");
    var newSessionRef = sessionRef.push();
    var timeCreated = new Date().toUTCString();
    var session = {
      //"Title": this.props.user.displayName + timeCreated,
      "UserCount": 0,
      "GameParams": {
        "StartPrice": "2100", //(this.state.StartPrice*100).toFixed(0),
        "msPerSec": 15,
        "numLiq": 100,
        "numInf": 50,
        "numMom": 50,
        "numPStar": 3,
        "FracOfDay": 1
      },
      "StartSim": {
        "SessionID":newSessionRef.key
      }
    }
    newSessionRef.set(session);
    newSessionRef.child("Info").child("Title").set(this.props.user.displayName + " " + timeCreated);
  }

  render() {
    const style = {
      marginTop: '5px',
      marginLeft: '20px'
    };

    return (
      <div>
        <Link to="/Home"><button onClick={this.createSession} style={style} className="btn btn-primary google">Quick Start</button></Link>
        <Link to="/CreateSession"><button style={style} className="btn btn-primary google">Custom Session</button></Link>
        <Link to="/ManageAdmin"><button style={{'float':'right','marginTop':'5px'}} className="btn btn-primary google">Manage Admins</button></Link>
        <AdminSessionContainer institution={this.props.institution} />
      </div>
    );
  }
}

AdminHome.propTypes = {
  user: PropTypes.object,
  authed: PropTypes.bool
};

export default AdminHome;
