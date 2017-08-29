import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as firebase from 'firebase';

class JoinTest extends Component {



  constructor(props){
    super(props);
    this.state = {
      ready: false
    };
  }

  deleteSession(){
    firebase.database().ref("Sessions").child(this.props.sessionid).remove();
    firebase.database().ref("PlayableSessions").child(this.props.sessionid).remove();
    console.log(this.props.sessionid);
    console.log("State ready",this.state,this.props.sessionid)
  }


componentDidMount(){
  this.readyRef = firebase.database().ref("Sessions").child(this.props.sessionid).child("StartSim").child("Ready");
  this.readyRef.on("value", snap => {
    console.log(snap.val());
    if(snap.val()===true){
      console.log("true");
      this.setState({
        ready: true
      });
      console.log("State ready",this.state,this.props.sessionid, this.props.title);
    }
    else if(snap.val() === null){
      this.setState({
        ready: false
      });
      console.log("State ready",this.state,this.props.sessionid)
    }
  });
}

componentWillUnmount(){
  this.readyRef.off();
}

render(){
  const ready = this.state.ready;
  let button = null;
  if (ready) {
    button = <Link to={{
        pathname: '/Simulation',
        state: { sessionid: this.props.sessionid }
      }}><div className='col-xs-2'><button  className="btn-basic">Join</button></div></Link> ;
  } else {
    button = null; //<button onClick={this.pause.bind(this)} className="btn-basic pause">Pause</button>;
  }
  return (
    <div>
      <div className='row' id='session'>
        <div  className='col-xs-5'>{this.props.title}</div>
        <Link to={{
            pathname: '/Simulation',
            state: { sessionid: this.props.sessionid }
          }}><div className='col-xs-2'><button  className="btn-basic">Join</button></div></Link>
        <div className='col-xs-2' onClick={this.deleteSession.bind(this)}><button  className="btn-basic">Delete</button></div>
        <div className='col-xs-3'>{this.props.sessionid}</div>
      </div>
    </div>
  );
}
}



export default JoinTest;
