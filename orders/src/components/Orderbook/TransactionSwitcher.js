import Switch, {Case, Default} from 'react-switch-case';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import UserTransaction from './UserTransactions'
import MarketTransaction from './MarketTransactions'
import * as firebase from 'firebase';

//receives sessionid and uid props from container.js

//this component is the parent component of both
//user and market transactions, and passes a transaction
//prop to both

class TransactionSwitcher extends Component {
  constructor() {
    super()
    this.state = {
      value: "Market",
      usertrans: [],
      markettrans: []
    }
  }

  //handles the change between user and market render
  handleChange(event) {
    this.setState({
      value: event.target.value
    })
  }

  componentDidMount() {
    //:TODO should be child_added
    //this listener grabs all of the user transactions and pushes them to
    //state.usertrns
    this.userTransRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Users").child(this.props.uid).child("Transactions");
    this.userTransRef.on('value', snap => {
      var userdata = snap.val();
      //console.log(data);
      var usertrns = [];
      if (!!userdata) {
        for (var key in userdata) {
          if (userdata.hasOwnProperty(key)) {
            usertrns.push(userdata[key]);
          }
        }
      }
      //console.log(this.state,"User");
      this.setState({
        usertrans: usertrns.reverse()
      });

    });

    //this listener grabs all of the user transactions and pushes them to
    //state.usertrns
    this.marketTransRef = firebase.database().ref().child(this.props.institution).child("Sessions").child(this.props.sessionid).child("Transactions");
    this.marketTransRef.on('value', snap => {
      var marketdata = snap.val();
      //console.log(marketdata);
      var markettrns = [];
      if (!!marketdata) {
        for (var key in marketdata) {
          if (marketdata.hasOwnProperty(key)) {
            markettrns.push(marketdata[key]);
          }

        }
      }
      //console.log(this.state,"market");
      this.setState({
        markettrans: markettrns.reverse()
      });

    });
  }

  componentWillUnmount() {
    this.userTransRef.off();
    this.marketTransRef.off();
  }



  render() {
    return (
      <div>
		     <select className='form-control' id='transactionswitcher' ref="selectOption" onChange={(e) => this.handleChange(e)}>
             <option  defaultValue="Market" >Market</option>
             <option value="User" >User</option>
          </select>
           <Switch condition={this.state.value}>
              <Case value='User'>
                <UserTransaction transaction={this.state.usertrans} />
              </Case>
              <Case value='Market'>
                 <MarketTransaction transaction={this.state.markettrans} />
              </Case>
              <Default>
                 <span>Nothing!</span>
              </Default>
          </Switch>
      </div>
    );
  }
}

TransactionSwitcher.propTypes = {
  sessionid: PropTypes.string,
  uid: PropTypes.string
};

export default TransactionSwitcher;
