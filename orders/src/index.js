import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';
import { BrowserRouter } from 'react-router-dom';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import registerServiceWorker from './registerServiceWorker';
//import './style/index.css';
import * as firebase from 'firebase';

var config = {
   apiKey: "AIzaSyC4umbQ3Av0bWfRGYMWZe9CJMv6A7Esbc4",
   authDomain: "traderx-a41b3.firebaseapp.com",
   databaseURL: "https://traderx-a41b3.firebaseio.com",
   projectId: "traderx-a41b3",
   storageBucket: "traderx-a41b3.appspot.com",
   messagingSenderId: "64491605877"
};

firebase.initializeApp(config);

ReactDOM.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
    , document.getElementById('root'));


registerServiceWorker();
