console.log("Hello world");
// Initialize Firebase
var config = {
    apiKey: "AIzaSyC4umbQ3Av0bWfRGYMWZe9CJMv6A7Esbc4",
    authDomain: "traderx-a41b3.firebaseapp.com",
    databaseURL: "https://traderx-a41b3.firebaseio.com",
    projectId: "traderx-a41b3",
    storageBucket: "traderx-a41b3.appspot.com",
    messagingSenderId: "64491605877"
};

firebase.initializeApp(config);

const database = firebase.database();
const ref = database.ref('Points/');
const newPointKey = database.ref('NewPoints/').push().key;


function pushdata(point){
    // pushing to new point element
    database.ref('newPoints/').child(newPointKey).child("New Point").update(point);
    
    // pushing to all point list
    console.log("Point entered: " + point.x + ", " + point.y);
    let key = database.ref('Points/').push().key;
    ref.child(key).child("Point").update(point);
}

let xp = 0;
let yp = 0;

let point = {
        x: xp,
        y: xp
}
// var pushEveryFive = window.setInterval(function(){pushdata(point)}, 1000);
let increaseXandY = window.setInterval(function() {
    xp++; 
    yp++;
    point = {
        x: xp,
        y: yp
    }
}, 4999);
//let pushEveryFive = window.setInterval(function(){pushdata(point)}, //5000); 

//function initPush() {
//    let pushEveryFive = 
//    console.log("Start button pushed");
//}

function stopPush() {
    window.clearInterval(pushEveryFive);
    console.log("Stop button pushed");
}

//pushdata(point);

ref.on('value', function(snapshot) {
  console.log("Working listener")
});