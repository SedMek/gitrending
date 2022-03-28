const defaultColors = {
	newColor: "#FCF2CC",
	historyColor: "#DDE5F5",
	starredColor: "#FFDAD7",
};
const defaultBlurs = {
	historyBlur: 3,
	starredBlur: 0,
};
const defaultSort = true; 


// UTILS
function isNumeric(num) {
	return !isNaN(num);
}

function logslider(position) {
	var minp = 0;
	var maxp = 10;
	var minv = Math.log(1);
	var maxv = Math.log(100);
	// calculate adjustment factor
	var scale = (maxv - minv) / (maxp - minp);
	return Math.exp(minv + scale * (position - minp)) - 1;
}

function sendMessage(op, options) {
	let params = {
		active: true,
		currentWindow: true,
	};
	chrome.tabs.query(params, function (tabs) {
		msg = { op: op };
		if (options) msg.options = options;
		chrome.tabs.sendMessage(tabs[0].id, msg);
		console.debug("Message should be sent" , msg);
	});
}

function watchPickerInput(event, pickerId) {
	// triggers when you move the color, even without closing the color selection
	console.debug("new " + pickerId + " tested: " + event.target.value);
	// we want to minimize write operation on chrome storage, so here we only send a message to
	// update the page without storing
	sendMessage("apply", {
		[pickerId]: isNumeric(event.target.value) ? logslider(event.target.value) : event.target.value,
	});
}

function watchPickerChange(event, pickerId) {
	// triggers only when closing the color selection
	console.debug(pickerId + " updated");
	// we store the selected value
	chrome.storage.sync.set(
		{ [pickerId]: isNumeric(event.target.value) ? logslider(event.target.value) : event.target.value },
		function () {
			if (chrome.runtime.lastError) {
				console.error(chrome.runtime.lastError);
			} else {
				console.log(pickerId + " is " + event.target.value);
			}
		}
	);
}

function watchCheckChange(event, checkId) {
	console.debug(checkId + " updated");
	// we store the selected value
	chrome.storage.sync.set(
		{ [checkId]: event.target.checked },
		function () {
			if (chrome.runtime.lastError) {
				console.error(chrome.runtime.lastError);
			} else {
				console.log(checkId + " is " + event.target.checked);
			}
		}
	);
	// we send a message to reflect the change immediately on the page
	sendMessage("refresh");
}

async function resetOptions() {
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
	document.getElementById("sort").checked = defaultSort;
	console.log("Using default options!");
	saveOptions();
}

function clearHistory() {
	if (confirm("Do you confirm deleting the history?")) {
		chrome.storage.sync.set({ history: [] }, function () {
			if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
			else console.log("History cleared successfully");
		});
	}
}

function saveOptions() {
	let selectedParams = {};

	let pickers = document.getElementsByClassName("picker");
	for (let picker of pickers) {
		let pickerId = picker.getAttribute("id");
		selectedParams[pickerId] = picker.value;
	}
	selectedParams["sort"] = document.getElementById("sort").checked;
	chrome.storage.sync.set(selectedParams, function () {
		if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
		else console.log("Parameters saved!");
		console.log(selectedParams);
	});
}

function displaySelectedOptions() {
	console.debug("displaying options");
	let colorPickers = document.getElementsByClassName("color picker");
	for (let colorPicker of colorPickers) {
		let colorPickerId = colorPicker.getAttribute("id");
		chrome.storage.sync.get(colorPickerId, function (data) {
			let color = data.hasOwnProperty(colorPickerId) ? data[colorPickerId] : defaultColors[colorPickerId];
			colorPicker.value = color;
		});
	}

	let blurPickers = document.getElementsByClassName("blur picker");
	for (let blurPicker of blurPickers) {
		let blurPickerId = blurPicker.getAttribute("id");
		chrome.storage.sync.get(blurPickerId, function (data) {
			let blur = data.hasOwnProperty(blurPickerId) ? data[blurPickerId] : defaultBlurs[blurPickerId];
			blurPicker.value = blur;
		});
	}

	let checks = document.getElementsByClassName("check");
	for (let check of checks) {
		let checkId = check.getAttribute("id");
		chrome.storage.sync.get(checkId, function (data) {
			let isChecked = data.hasOwnProperty(checkId) ? data[checkId] : true;
			check.checked = isChecked;
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
		picker.addEventListener("input", function (event) {
			watchPickerInput(event, pickerId);
		});
		picker.addEventListener("change", function (event) {
			watchPickerChange(event, pickerId);
		});
		console.debug(pickerId + "Listeners set");
	}

	let checks = document.getElementsByClassName("check");
	for (let check of checks) {
		let checkId = check.getAttribute("id");
		check.addEventListener("change", function (event) {
			watchCheckChange(event, checkId);
		});
		console.debug(checkId + "Listeners set");
	}

	let resetButton = document.getElementById("reset");
	resetButton.addEventListener("click", resetOptions);
	let clearButton = document.getElementById("clear");
	clearButton.addEventListener("click", clearHistory);
	console.debug("Button Listeners set");

}

constructOptions();
