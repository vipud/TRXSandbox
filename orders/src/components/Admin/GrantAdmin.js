import React, { Component } from 'react';
import {Redirect} from 'react-router-dom';
//import * as firebase from 'firebase';


//this component will eventually allow an admin to
//grant other users admin access

class GrantAdmin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      "user": '',
      "Submitted": false
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  //handles typing into text input and
  //sets to corresponding state
  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      //SessionId: sessionref.push(),
      [name]: value
    });
  }

  handleSubmit(event) {

  }

  render() {
    return (
      <div>
        <div style={{'margin':'0 auto', 'width':'300px'}}><p>Enter the user you wish to grant admin access</p></div>
          <form style={{'margin':'0 auto', 'width':'300px'}} onSubmit={this.handleSubmit}>
            <div className='form-group'>
              <label>
                User:
                <input
                  name="user"
                  className='form-control'
                  id="user"
                  type="text"
                  required
                  value={this.state.value}
                  onChange={this.handleInputChange} />
              </label>
              <br />
                <input className='btn btn-success' type="submit" value="Submit" />
                {this.state.Submitted && (<Redirect to="/Home" />)}
              </div>
            </form>
        </div>
    );
  }
}

export default GrantAdmin;
