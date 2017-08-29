import React, { Component } from 'react';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import * as firebase from 'firebase';

//receives user props from header

//This is the login button component
//and deals with google oauth

class OAuth extends Component {

  constructor(props) {
    super(props);
    this.authenticate = this.authenticate.bind(this);
    this.signout = this.signout.bind(this);
  }

  //redirects user to google oauth url
  authenticate(user) {
    let provider = new firebase.auth.GoogleAuthProvider();
    console.log("trying to login with " + provider);
    firebase.auth().signInWithRedirect(provider)
  }

  //logouts user from firebase app
  signout(user) {
    sessionStorage.clear();
    this.props.user.logout();
    return firebase.auth().signOut();
  }

  render() {
    return (
      <div>
        <div id='oauth'>
          {
            //conditionally renders based on authed status(userStore.authed)
            !this.props.user.authed
              ? <button onClick={this.authenticate} className=" btn btn-primary google">Login with Google</button>
              : <button onClick={this.signout} className="btn btn-danger logout">Logout</button>
          }
        </div>
      </div>
    );
  }
}
export default OAuth;
