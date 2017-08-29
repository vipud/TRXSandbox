import React, { Component } from 'react';
import AdminSession from './AdminSession';
import * as firebase from 'firebase';


//this component is the Container for admins
//which holds all sessions
//reads from playable sessions

class AdminSessionContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sessions: []
    };
  }

  componentDidMount() {
    //on mount, go to Playable Sessions, loop
    //through and grab sessionid and title.
    //then set that data to sessions state
    console.log(this.props);
    var sessionid, title;
    var self = this;
    this.playableRef = firebase.database().ref().child(this.props.institution).child("PlayableSessions");
    this.playableRef.on('value', snap => {
      var rawData = snap.val();
      console.log(rawData);
      var sesses = [];
      for (var key in rawData) {
        sessionid = key;
        title = rawData[key].Title;
        sesses.push({
          "SessionId": sessionid,
          "Title": title,
        });
      }
      self.setState({
        sessions: sesses
      });
    })
  }

  componentWillUnmount() {
    this.playableRef.off();
  }

  render() {
    return (
      <div style={{'paddingTop': '10px', "width":"100%"}}>
        <div className='container'>
          <div className='row'>
            <div className='col-md-12 col-lg-12 col-xl-12 centered'>
              {this.state.sessions.reverse().map(function(sess, index){
                return(
                  <div key={index}>
                    <AdminSession key={sess.toString()} sessionid={sess.SessionId}
                    institution={this.props.institution} title={sess.Title}  />
                  </div>
                );
              }.bind(this))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default AdminSessionContainer;
