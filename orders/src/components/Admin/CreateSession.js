import React, { Component } from 'react';
import trending from '../../style/SVGs/trending.svg';
import gap from '../../style/SVGs/gap.svg';
import meanreverting from '../../style/SVGs/meanreverting.svg';
import trendingmeanreverting from '../../style/SVGs/trendingmeanreverting.svg';
import PropTypes from 'prop-types';
import {Redirect} from 'react-router-dom';
import * as firebase from 'firebase';

//receives user prop from app.js

//this component is the form for
//custom session creation
//also deals with the market behavior buttons


class CreateSession extends Component {
  constructor(props) {
    super(props);
    this.state = {
      "StartPrice": 21.00,
      "UserCount": 0,
      "msPerSec": 15,
      "numLiq": 100,
      "numInf": 50,
      "numMom": 50,
      "numPStar": 3,
      "FracOfDay": 1,
      "Submitted": false
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.trending = this.trending.bind(this)
    this.gap = this.gap.bind(this)
    this.meanReverted = this.meanReverted.bind(this)
    this.trendingMeanReverted = this.trendingMeanReverted.bind(this)
  }

  //handles typing into inputs and sets the
  //corresponding state
  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;
    this.setState({
      [name]: value
    });
  }

  //on submit, sends session data to firebase
  handleSubmit(event) {
    const sessionRef = firebase.database().ref().child(this.props.institution).child("Sessions");
    event.preventDefault();
    var newSessionRef = sessionRef.push();
    var timeCreated = new Date().toUTCString();
    var session = {
      "UserCount": 0,
      "GameParams": {
        "StartPrice": (this.state.StartPrice * 100).toFixed(0),
        "msPerSec": parseInt(this.state.msPerSec, 10),
        "numLiq": parseInt(this.state.numLiq, 10),
        "numInf": parseInt(this.state.numInf, 10),
        "numMom": parseInt(this.state.numMom, 10),
        "numPStar": parseInt(this.state.numPStar, 10),
        "FracOfDay": parseInt(this.state.FracOfDay, 10)
      },
      "StartSim": {
        "SessionID": newSessionRef.key
      }
    }
    if (this.state.msPerSec % 1 === 0 && this.state.msPerSec > 0 && this.state.msPerSec <= 30) {
      newSessionRef.set(session);
      newSessionRef.child("Info").child("Title").set(this.props.user.displayName + timeCreated);
      this.setState({
        Submitted: true
      })
    } else {
      alert("You must input an integer between 0 and 30 here");
    }
  }

  //preset for trending market
  trending(event) {
    document.getElementById("StartPrice").value = "21.00";
    document.getElementById("msPerSec").value = "15";
    document.getElementById("numLiq").value = "100";
    document.getElementById("numInf").value = "50";
    document.getElementById("numMom").value = "50";
    document.getElementById("numPStar").value = "3";
    document.getElementById("FracOfDay").value = "1";
  }

  //preset for gap market
  gap(event) {
    document.getElementById("StartPrice").value = "21.00";
    document.getElementById("msPerSec").value = "15";
    document.getElementById("numLiq").value = "100";
    document.getElementById("numInf").value = "50";
    document.getElementById("numMom").value = "50";
    document.getElementById("numPStar").value = "3";
    document.getElementById("FracOfDay").value = "1";
  }

  //preset for meanReverted market
  meanReverted(event) {
    document.getElementById("StartPrice").value = "21.00";
    document.getElementById("msPerSec").value = "15";
    document.getElementById("numLiq").value = "100";
    document.getElementById("numInf").value = "50";
    document.getElementById("numMom").value = "50";
    document.getElementById("numPStar").value = "3";
    document.getElementById("FracOfDay").value = "1";
  }

  //preset for trendingMeanReverted market
  trendingMeanReverted(event) {
    document.getElementById("StartPrice").value = "21.00";
    document.getElementById("msPerSec").value = "15";
    document.getElementById("numLiq").value = "100";
    document.getElementById("numInf").value = "50";
    document.getElementById("numMom").value = "50";
    document.getElementById("numPStar").value = "3";
    document.getElementById("FracOfDay").value = "1";
  }

  render() {
    return (
      <div>
        <form style={{'margin':'0 auto', 'width':'200px'}} >
          <div className='form-group'>
            <label>
              Starting Price:
              </label>
              <input
                name="StartPrice"
                className='form-control'
                id="StartPrice"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
            <label>
              Ms/s:
              </label>
              <input
                id="msPerSec"
                className='form-control'
                name="msPerSec"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
            <label>
              Number of Liquidity:
              </label>
              <input
                id="numLiq"
                className='form-control'
                name="numLiq"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
            <label>
              Number of Informed:
              </label>
              <input
                id="numInf"
                className='form-control'
                name="numInf"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
            <label>
              Number of Momentum:
              </label>
              <input
                id="numMom"
                className='form-control'
                name="numMom"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
            <label>
              Number of P* Changes:
                </label>
              <input
                id="numPStar"
                className='form-control'
                name="numPStar"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
            <label>
              Fraction of Day:
              </label>
              <input
                id="FracOfDay"
                className='form-control'
                name="FracOfDay"
                type="text"
                required
                value={this.state.value}
                onChange={this.handleInputChange} />
            <br />
          </div>
      </form>
      <div style={{'display':'flex','justifyContent':'center'}}>
        <button className='btn btn-default' type="button" onClick = {this.trending}>Trending <img src={trending} alt='trending' /></button>
        <button className='btn btn-default' type="button" onClick = {this.gap}>Gap <img src={gap} alt='gap' /></button>
        <button className='btn btn-default' type="button" onClick = {this.meanReverted}>Mean-Reverted <img src={meanreverting} alt='meanreverting' /></button>
        <button className='btn btn-default' type="button" onClick = {this.trendingMeanReverted}>Trending-Mean-Reverted <img src={trendingmeanreverting} alt='trendingmeanreverting' /></button>
        <br />
      </div>
      <div style={{'display':'flex','justifyContent':'center'}}>
        <input onClick={this.handleSubmit} className='btn btn-success' type="submit" value="Submit" />
        {this.state.Submitted && (<Redirect to="/Home" />)}
      </div>
    </div>
    );
  }
}

CreateSession.propTypes = {
  user: PropTypes.object,
  authed: PropTypes.bool
};

export default CreateSession;
