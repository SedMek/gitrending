const defaultColors = {
    newColor : "#FCF2CC",
    historyColor : "#DDE5F5",
    starredColor : "#FFDAD7",  
}

const defaultBlurs = {
    historyBlur : 3,
    starredBlur : 0,  
}

const defaultParams = {
    "new": typeParams("#FCF2CC", 0),
    "history": typeParams("#DDE5F5", 3),
    "starred": typeParams("#FFDAD7", 0),
}

function typeParams(color, blur){
    return {
        "color": color,
        "blur": blur
    }
}

// UTILS
function isNumeric(num){
    return !isNaN(num)
}

function logslider(position) {
    var minp = 0;
    var maxp = 10;
  
    var minv = Math.log(1);
    var maxv = Math.log(100);
  
    // calculate adjustment factor
    var scale = (maxv-minv) / (maxp-minp);
  
    return Math.exp(minv + scale*(position-minp))-1;
}

function sendMessage(op, options){
    let params = {
        "active": true,
        "currentWindow": true
    }
    chrome.tabs.query(params, function(tabs){
        msg = {"op":op};
        if (options) msg.options = options
        chrome.tabs.sendMessage(tabs[0].id, msg);
        console.log("Message should be sent");
    });
}

function watchPickerInput(event, pickerId) {
    // triggers when you move the color, even without closing the color selection
    console.log("new " + pickerId + " tested: " + event.target.value);
    // we want to minimize write operation on chrome storage, so here we only send a message to
    // update the page without storing
    sendMessage("apply", {[pickerId]: isNumeric(event.target.value) ? logslider(event.target.value) : event.target.value});
}

function watchPickerChange(event, pickerId) {
    // triggers only when closing the color selection
    console.log(pickerId + " updated");
    // we store the selected value
    console.log("set");
    chrome.storage.sync.set({[pickerId]: isNumeric(event.target.value) ? logslider(event.target.value) : event.target.value}, function() {
        if (chrome.runtime.lastError){
            console.log(chrome.runtime.lastError);
        } else {
            console.log(pickerId + ' is ' + event.target.value);
        }
    });
}

async function resetOptions(){
    colorPickers = document.getElementsByClassName("color picker"); 
    for (let colorPicker of colorPickers) {
        let colorPickerId = colorPicker.getAttribute("id");
        colorPicker.value = defaultColors[colorPickerId];
    }
    blurPickers = document.getElementsByClassName("blur picker"); 
    for (let blurPicker of blurPickers) {
        let blurPickerId = blurPicker.getAttribute("id");
        blurPicker.value = defaultBlurs[blurPickerId];
    }
    console.log("Using default options!");
    saveOptions();
}

function clearHistory(){
    if (confirm("Do you confirm deleting the history?")) {
        console.log("set");
        chrome.storage.sync.set({history : []}, function() {
            if (chrome.runtime.lastError)
                console.log(chrome.runtime.lastError);
            else
                // sendMessage("apply");
                console.log("History cleared successfully");
        });
    }
}

function saveOptions(){
    let selectedParams = {} 

    let pickers = document.getElementsByClassName("picker");     
    for (let picker of pickers) {
        let pickerId = picker.getAttribute("id");
        selectedParams[pickerId] = picker.value;
    }
    console.log("set");
    chrome.storage.sync.set(selectedParams, function() {
        if (chrome.runtime.lastError)
            console.log(chrome.runtime.lastError);
        else
            console.log("Parameters saved!");
            console.log(selectedParams);
    });
}


function displaySelectedOptions(){
    console.log("displaying options");
    let colorPickers = document.getElementsByClassName("color picker"); 

    for (let colorPicker of colorPickers) {
        let colorPickerId = colorPicker.getAttribute("id");

        chrome.storage.sync.get(colorPickerId, function(data){
            
            let color = data.hasOwnProperty(colorPickerId) ? data[colorPickerId] : defaultColors[colorPickerId];
            colorPicker.value = color;
        });
    }

    let blurPickers = document.getElementsByClassName("blur picker"); 

    for (let blurPicker of blurPickers) {
        let blurPickerId = blurPicker.getAttribute("id");

        chrome.storage.sync.get(blurPickerId, function(data){
            let blur = data.hasOwnProperty(blurPickerId) ? data[blurPickerId] : defaultBlurs[blurPickerId];
            blurPicker.value = blur;
        });
    }
}

function constructOptions() {

    // display stored color options
    displaySelectedOptions();

    // add event listeners
    let pickers = document.getElementsByClassName("picker");

    for (let picker of pickers) {
        let pickerId = picker.getAttribute("id");
        picker.addEventListener("input", function(event){watchPickerInput(event, pickerId)});
        picker.addEventListener("change", function(event){watchPickerChange(event, pickerId)});
        console.log(pickerId + "Listeners set");
    }

    let resetButton = document.getElementById("reset");
    resetButton.addEventListener("click", resetOptions); 
    
    let clearButton = document.getElementById("clear");
    clearButton.addEventListener("click", clearHistory); 
}

constructOptions();
