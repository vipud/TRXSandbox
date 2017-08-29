import React, { Component } from 'react';
import PropTypes from 'prop-types';
import OrderbookContainer from './OrderbookContainer'
import TransactionSwitcher from './TransactionSwitcher';
import TotalStats from './TotalStats.js';
import Switcher from '../Charts/Switcher';
import '../../style/Orderbook.css';
import '../../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import * as firebase from 'firebase';


//This component acts as the container for
//all components of the simulation receives
//user prop from app.js

class Container extends Component {
  constructor(props) {
    super(props);
    this.state = {
      renderplotly: false
    };
  }

  componentDidMount() {
    //goes to ref StartSim/Ready and
    //sets the state of renderplotly
    this.plotlyrenderRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.location.state.sessionid).child('StartSim').child("Ready");
    this.plotlyrenderRef.on('value', snap => {
      if (!!snap.val() & snap.val() === true) {
        this.setState({
          renderplotly: true
        });
      } else {
        this.setState({
          renderplotly: false
        });
      }
    })
  }

  componentWillUnmount() {
    this.plotlyrenderRef.off();
  }

  render() {
    //renders all components of the simulation here
    return (
      <div className="container">
        <div className="row">
            <div id="orderbook_test" className="col-xs-12 col-lg-5">
                <OrderbookContainer institution={this.props.institution} sessionid={this.props.location.state.sessionid} uid={this.props.user.uid} />
            </div>
            <div className='col-xs-12 col-lg-7'>
            <div id="assets" className="row">
              <TotalStats institution={this.props.institution} sessionid={this.props.location.state.sessionid} uid={this.props.user.uid} />
            </div>
            <div className='row'>
              {this.state.renderplotly
                //based on renderplotly(bool) conditionally
                //render plotly graph
              ?<div className='col-xs-12 col-lg-12' id="plotly-div">
                <Switcher institution={this.props.institution} sessionid={this.props.location.state.sessionid} />
              </div>
              :<div style={{'textAlign':'center', 'marginTop':'150px','fontSize':'26px'}}>Loading 3 Day Sim...</div>
            }
            </div>
          </div>
        </div>
        <div className="row">
            <div className="col-xs-12 col-lg-12" id="transactions">
              <TransactionSwitcher institution={this.props.institution} sessionid={this.props.location.state.sessionid} uid={this.props.user.uid} />
            </div>
        </div>
      </div>
    );
  }
}

Container.propTypes = {
  authed: PropTypes.bool,
  user: PropTypes.object,
  sessionid: PropTypes.string
};

export default Container;
