import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as firebase from 'firebase';


//Receives user,uid,sessionid, and
//title props from SessionContainer

//This component deals with
//joining, editing, and deleting
//a session

class Session extends Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
      text: ''
    };
    this.joinSession = this.joinSession.bind(this)
    this.edit = this.edit.bind(this)
    this.deleteSession = this.deleteSession.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)
    this.save = this.save.bind(this)
  }

  //post user data to Users Pending ref
  joinSession() {
    const UserPendingRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("UsersPending").child(this.props.user.uid);
    let user = {
      uid: this.props.user.uid,
      displayName: this.props.user.displayName
    }
    UserPendingRef.update(JSON.parse(JSON.stringify(user)));
  }

  //deletes session from Sessions and PlayableSessions
  deleteSession() {
    firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).remove();
    firebase.database().ref(this.props.institution).child("PlayableSessions").child(this.props.sessionid).remove();
    console.log(this.props.sessionid);
  }

  //handles "enter" for changing title
  handleKeyUp = (event) => {
    if (event.key === 'Enter') {
      var val = this.refs.newTitle.value;
      //alert(val)
      var newTitle = val; //this.refs.newTitle.innerHTML;
      const titleRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Info").child("Title");
      const playableRef = firebase.database().ref().child(this.props.institution).child("PlayableSessions").child(this.props.sessionid).child("Title");
      titleRef.set(newTitle);
      playableRef.set(newTitle);
      this.setState({
        // ** Update "text" property with new value (this fires render() again)
        editing: false
      });
    }
  }

  //allows user to edit title
  edit() {
    this.setState({
      editing: true
    });
  }

  //handles saving title using the save button
  save() {
    var val = this.refs.newTitle.value;
    //alert(val)
    var newTitle = val; //this.refs.newTitle.innerHTML;
    const titleRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Info").child("Title");
    const playableRef = firebase.database().ref().child(this.props.institution).child("PlayableSessions").child(this.props.sessionid).child("Title");
    titleRef.set(newTitle);
    playableRef.set(newTitle);
    this.setState({
      // ** Update "text" property with new value (this fires render() again)
      editing: false
    });
  }

  //this render is called when not editing
  renderNormal() {
    return (
      <div>
        <div className='row' style={{"border":"1px solid black","borderRadius":'5px',"padding":'15px', "margin":"5px"}}>
          <div ref="newTitle" className='col-md-5'>{this.props.title} </div>
             <Link to={{
              pathname: '/Simulation',
              state: { sessionid: this.props.sessionid }
              }}><div className='col-md-2'><button onClick={this.joinSession} className="btn btn-default">Join</button></div></Link>
          <div className='col-md-3'><button className='btn btn-default' onClick={this.edit}>Edit Title</button></div>
          <div className='col-md-2'><button onClick={this.deleteSession} className="btn btn-default">Delete</button></div>
        </div>
        </div>
    );
  }

  //this render is called when editing
  renderForm() {
    return (
      <div style={{'marginLeft':'15px'}} className='row'>
        <div className='col-xs-5'>
          <input onKeyUp={this.handleKeyUp} type='text' className='form-control mb-2 mr-sm-2 mb-sm-0' ref="newTitle" defaultValue={this.props.title} />
        </div>
        <div className='col-xs-2'>
          <button className='btn btn-default' onClick={this.save}>Save</button>
        </div>
        <br />
      </div>
    )
  }

  //conditionally renders based on editing
  render() {
    if (this.state.editing) {
      return this.renderForm()
    } else {
      return this.renderNormal()
    }
  }
}

Session.propTypes = {
  user: PropTypes.object,
  uid: PropTypes.string,
  sessionid: PropTypes.string,
  title: PropTypes.string
};

export default Session;
