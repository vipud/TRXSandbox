//First component rendered:
//Sets up user store
//Also declares what a private route is
//and deals with routing throughout the app


// service
import React, { Component } from 'react';
import firebase from 'firebase';
import { observer } from "mobx-react";
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';

// page component
import Header from './components/Header';
import GrantAdmin from './components/Admin/GrantAdmin';
import StudentStats from './components/Admin/StudentStats.js';
import SessionContainer from './components/Sessions/SessionContainer.js';
import AdminSessionContainer from './components/Admin/AdminSessionContainer.js';
import AdminHome from './components/Admin/AdminHome.js';
import CreateSession from './components/Admin/CreateSession.js';
import userStore from './stores/UserStore';
import Container from './components/Orderbook/Container.js';

//Screen seen if not authed
const Home = () => (
  <div>
    <h2>Home</h2>
    <p>Please sign-in with your UDel email using the button in the top right corner</p>
  </div>
)

//Deals with private routes and passing props through routes
const renderMergedProps = (component, ...rest) => {
  const finalProps = Object.assign({}, ...rest);
  return (
    React.createElement(component, finalProps)
  );
}

const PrivateRoute = ({component: Component, authed, ...rest}) => (
  <Route {...rest}
    render={(props) => authed === true
      ? (renderMergedProps(Component, props, rest))
      : <Redirect to={
        {pathname: '/',
        state: {from: props.location}
        }} />}
  />
)

var institution;
@observer
class App extends Component {
  constructor() {
    super()
    this.state = {
      shouldRedirect: false,
      redirectPath: ""
    }
  }
  componentDidMount() {
    this.userStateChange = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        //Deals with sending data to mobX
        userStore.login();
        userStore.fetchUserInfo(user.email, user.displayName, user.photoURL, user.uid);
        institution = userStore.email.replace(/.*@/,"");
        institution = institution.replace(/\..*/,"");
        if (!sessionStorage.getItem("loggedin")) {
          this.setState({
            shouldRedirect: true,
            redirectPath: "/Home"
          })
        } else {
          sessionStorage.setItem('loggedin', true);
        }
      } else {
        userStore.logout();
        // this.setState({
        //   shouldRedirect: true,
        //   redirectPath: "/"
        // })
        console.log("logged out")
      }

    })
  }

  componentWillUnmount() {
    this.userStateChange()
    sessionStorage.clear();
  }

  render() {
    return (
      <Router>
        <div>
          <Header user={userStore} />
              <div className="App">
                <Route exact path="/" component={Home}/>
                <PrivateRoute authed={userStore.authed} institution={institution} path="/CreateSession" user={userStore} component={CreateSession} />
                <PrivateRoute authed={userStore.authed} institution={institution} path="/AdminHome" user={userStore} component={AdminHome} />
                <PrivateRoute authed={userStore.authed} institution={institution} path="/Home" user={userStore}  component={SessionContainer} />
                {/* <PrivateRoute authed={userStore.authed} path="/AdminSessionContainer" component={AdminSessionContainer} /> */}
                <PrivateRoute authed={userStore.authed} institution={institution} path="/ManageAdmin" component={GrantAdmin} />
                <PrivateRoute authed={userStore.authed} institution={institution} path="/Stats" user={userStore}  component={StudentStats} />
                <PrivateRoute authed={userStore.authed} institution={institution} path="/Simulation" user={userStore} component={Container} />
                {this.state.shouldRedirect && (
                  <Redirect to={this.state.redirectPath} />
                )}
              </div>
        </div>
      </Router>
    );
  }
}

export default App;
