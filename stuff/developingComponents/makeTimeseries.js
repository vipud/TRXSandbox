//Model:
let trans = {
  "-Kndp9DlXBbbnh-wT22U" : {
    "AssetId" : "INTC",
    "Price" : "2250",
    "Time" : "9:31:00 AM",
    "Type" : "Sell",
    "Volume" : 20
  },
  "-Kndp9E8yVqCQHFZxyN5" : {
    "AssetId" : "INTC",
    "Price" : "2250",
    "Time" : "9:30:00 AM",
    "Type" : "Sell",
    "Volume" : 20
  },
}
let getTimes = function(transArray){
    let timeArray = [];
    for(let key in transArray){
        timeArray.push([transArray[key].Time, transArray[key].Price])
    }
    return timeArray;
}
var list = getTimes(trans);
console.log(list)

let updateCandles = function(transArray){
    let ordered = transArray.sort(function(a,b){
        return (a[0] - b[0]); //TODO: GIVE THE TRANSACTION ARRAY
    });                       //      BETTER TIME STAMPS TO TEST
}
console.log(updateCandles(list));
