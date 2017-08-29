import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Default_avatar from '../style/default_avatar.svg';

//gets user prop from header

//This component deals with
//the user displayName and picture

class LoginAvatar extends Component {

  render() {
    return (
      <div className="clearfix" id ="Avatar">
        {/* renders google email name and photo or null */}
        <div id = "displayName">{this.props.user.displayName || " "}</div>
        <img src={this.props.user.photoURL || Default_avatar} id = "photo" alt=""/>
      </div>
    );
  }
}

LoginAvatar.propTypes = {
  user: PropTypes.object
};

export default LoginAvatar;
