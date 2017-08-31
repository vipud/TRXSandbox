import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';
import { BrowserRouter } from 'react-router-dom';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import registerServiceWorker from './registerServiceWorker';
//import './style/index.css';
import * as firebase from 'firebase';

var config = {
    apiKey: "AIzaSyCtZ4oVZFRCRN2juh4smbUJCoMpszPuYTQ",
    authDomain: "traderxsandbox.firebaseapp.com",
    databaseURL: "https://traderxsandbox.firebaseio.com",
    projectId: "traderxsandbox",
    storageBucket: "traderxsandbox.appspot.com",
    messagingSenderId: "242933715708"
};


firebase.initializeApp(config);

ReactDOM.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
    , document.getElementById('root'));


registerServiceWorker();
