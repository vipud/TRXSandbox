import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Session from './Session';
import {Link} from 'react-router-dom';
import * as firebase from 'firebase';

//this component reads from playable sessions
//loops through and maps props to session

class SessionContainer extends Component {

  constructor(props){
    super(props);
    this.state = {
      sessions: []
    };
  }

  componentDidMount(){
    //on mount, go to Playable Sessions, loop
    //through and grab sessionid and title.
    //then set that data to sessions state
    console.log("updating right");
    var sessionid, title; //users;
    this.playableRef = firebase.database().ref().child(this.props.institution).child("PlayableSessions");
    this.playableRef.on('value', snap =>{
      var rawData = snap.val();
      console.log(rawData);
      var sesses = [];
      for(var key in rawData){
        sessionid = key;
        //console.log(sessionid);
        title = rawData[key].Title;

        sesses.push({
          "SessionId": sessionid,
          "Title": title
        });
      }
       this.setState({
         sessions: sesses.reverse()
       });
     })
  }

componentWillUnmount(){
  this.playableRef.off();
}

  render() {
  return(
    <div style = {{"paddingTop":"10px","width":"100%"}}>
      <Link to={{
          pathname: '/AdminHome'
        }}><button style={{"marginLeft":"20px"}} className="btn btn-primary google">Admin Homepage</button></Link>
        <div className='container'>
          <div className='row'>
            <div className='col-md-1'></div>
            <div className='col-md-10 col-lg-12 col-xl-12 centered'>
              {this.state.sessions.map(function(sess, index){
                //map out all sessions
                console.log("remapping: ")
                return(
                  <div key={index}>
                    <Session key={sess.toString()+index} user={this.props.user}  sessionid={sess.SessionId}
                      title={sess.Title} institution={this.props.institution} />
                  </div>
                );
              }.bind(this))}
            </div>
            <div className='col-md-1'></div>
          </div>
        </div>
      </div>
    );
  }
}

SessionContainer.propTypes = {
  user: PropTypes.object,
  authed: PropTypes.bool
};

export default SessionContainer;
