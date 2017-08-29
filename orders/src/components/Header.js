import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import OAuth from './OAuth.js';
import LoginAvatar from './LoginAvatar';
import '../style/Header.css';


//gets user props from app.js
//Deals with the login avater and
//oauth

class Header extends Component {

  render() {
    return (
      <div>
        <div className = "header">
          <div><LoginAvatar user={this.props.user} /></div>
          <div><OAuth user={this.props.user} /></div>
          {
            //if user is authed, allow them to use the home button 
            this.props.user.authed
            ? <div style={{'float': 'left', 'marginTop': '14.25px', 'marginLeft': '25px'}}>
              <Link to={{
                  pathname: '/Home'
                  // state: { sessionid: this.props.sessionid }
                }}><button className="btn btn-danger">Home</button></Link>
              </div>
            : null
          }
        </div>
      </div>
    );
  }
}

Header.propTypes = {
  user: PropTypes.object
};

export default Header;
