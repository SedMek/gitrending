const defaultParams = {
	new: typeParams("#FCF2CC", 0),
	history: typeParams("#DDE5F5", 3),
	starred: typeParams("#FFDAD7", 0),
};
let params = JSON.parse(JSON.stringify(defaultParams)); // deep clone

function typeParams(color, blur) {
	return {
		color: color,
		blur: blur,
	};
}

function applyParams(history, params, log) {
	console.debug("applying params in ", log);
	let articles = document.getElementsByTagName("article");
	for (article of articles) {
		let repo = article.getElementsByTagName("h1")[0].getElementsByTagName("a")[0].href;
		if (article.getElementsByClassName("on").length != 0) {
			// starred
			addEffects(article, params.starred);
			article = removeAllListeners(article);
			addBlurHandlers(article, params.starred.blur);
		} else if (history.includes(repo)) {
			// history
			addEffects(article, params.history);
			article = removeAllListeners(article);
			addBlurHandlers(article, params.history.blur);
		} else {
			// new
			addEffects(article, params.new);
		}
	}
}

function removeAllListeners(element) {
	console.debug("removing all listeners");
	elClone = element.cloneNode(true);
	element.parentNode.replaceChild(elClone, element);
	return elClone;
}

function addBlurHandlers(element, blurAmount) {
	console.debug("adding blur listeners");
	element.addEventListener(
		"mouseenter",
		function (event) {
			event.target.style["filter"] = null;
		},
		false
	);
	element.addEventListener(
		"mouseleave",
		function (event) {
			event.target.style["filter"] = "blur(" + blurAmount + "px)";
		},
		false
	);
}

function addEffects(element, typeParam) {
	console.debug("adding effects");
	if (typeParam.hasOwnProperty("color")) {
		element.style["background-color"] = typeParam.color;
	}
	if (typeParam.hasOwnProperty("blur")) {
		element.style["filter"] = "blur(" + typeParam.blur + "px)";
	}
}

function updateParams(object) {
	if (object.hasOwnProperty("newColor")) params.new.color = object.newColor;
	if (object.hasOwnProperty("historyColor")) params.history.color = object.historyColor;
	if (object.hasOwnProperty("starredColor")) params.starred.color = object.starredColor;
	if (object.hasOwnProperty("newBlur")) params.new.blur = object.newBlur;
	if (object.hasOwnProperty("historyBlur")) params.history.blur = object.historyBlur;
	if (object.hasOwnProperty("starredBlur")) params.starred.blur = object.starredBlur;
	if (object.hasOwnProperty("sort")) params.sort = object.sort;
}

function addToHistory(repo){
	console.log("Adding repository to history " + repo);
	syncFetch("history", function (data) {
		let history = data.hasOwnProperty("history") ? data.history : [];
		history.push(repo);
		syncStore("history", history, function () {
			if (chrome.runtime.lastError) {
				console.error(chrome.runtime.lastError);
			} else {
				console.debug("History saved successfully");
			}
		});
	});
}

function main() {
	// Add the header in the end of the list
	let headers = document.getElementsByClassName("Box-header");
	if (headers.length < 2) {
		let header = headers[0];
		let headerClone = header.cloneNode(true); // True to perform deep clone. i.e clone children too
		document.getElementsByClassName("Box")[1].appendChild(headerClone); // append the header to the end
	}

	let articles = document.getElementsByTagName("article");
	chrome.storage.sync.get(
		["newColor", "historyColor", "starredColor", "historyBlur", "starredBlur", "sort"],
		function (data) {
			console.debug("getting default settings");
			// read stored options
			updateParams(data);
			syncFetch("history", function (data) {
				let history = data.hasOwnProperty("history") ? data.history : [];
				applyParams(history, params, "main");

				for (article of articles) {
					let repo = article.getElementsByTagName("h1")[0].getElementsByTagName("a")[0].href;
					if (article.getElementsByClassName("on").length != 0) {
						// starred
						addBlurHandlers(article, params.starred.blur);
						article.style["border-style"] = "outset";
					} else if (history.includes(repo)) {
						// history
						addBlurHandlers(article, params.history.blur);
					} else {
						// new
						article.addEventListener(
							"click",
							function () {
								addToHistory(repo);
							},
							false
						);
						article.addEventListener(
							"auxclick",
							function () {
								addToHistory(repo);
							},
							false
						);
						// SORTING HERE, IMPLEMENTATION NOT FINISHED
						if (params.sort) {
							article.parentNode.prepend(article);
						}
					}
				}
			});
		}
	);
}

function addStarHandler(element) {
	console.edbug("adding star handler");
	element.addEventListener("click", function () {
		chrome.storage.sync.get("history", function (data) {
			let history = data.hasOwnProperty("history") ? data.history : [];
			applyParams(history, params, "addStarHandler");
		});
	});
}

function gotMessage(msg, sender, sendResponse) {
	console.debug("message received", msg);
	if (msg.op == "refresh") {
		main();
	} else {
		syncFetch("history", function (data) {
			let history = data.hasOwnProperty("history") ? data.history : [];
			if (msg.op === "apply") {
				if (msg.hasOwnProperty("options")) updateParams(msg.options);
				applyParams(history, params, "got apply message");
			} else if (msg.op === "reset") {
				applyParams(history, defaultParams, "got reset message");
			}
		});
	}
}

chrome.runtime.onMessage.addListener(gotMessage);

// refresh when an option in storage is updated
chrome.storage.onChanged.addListener(function () {
	chrome.storage.sync.get(
		["newColor", "historyColor", "starredColor", "historyBlur", "starredBlur"],
		function (data) {
			updateParams(data);
			syncFetch("history", function (data) {
				applyParams(data.history, params, "storage change");
			});
		}
	);
});

main();


// UTILS
function syncStore(key, objectToStore, callback) {
	let jsonstr = JSON.stringify(objectToStore);
	let i = 0;
	let storageObj = {};

	// split jsonstr into chunks and store them in an object indexed by `key_i`
	while (jsonstr.length > 0) {
		let index = key + "_" + i++;
		console.debug(index);
		// since the key uses up some per-item quota, see how much is left for the value
		// also trim off 2 for quotes added by storage-time `stringify`
		let valueLength = chrome.storage.sync.QUOTA_BYTES_PER_ITEM - index.length - 400;

		// trim down segment so it will be small enough even when run through `JSON.stringify` again at storage time
		let segment = jsonstr.substr(0, valueLength);

		storageObj[index] = segment;
		jsonstr = jsonstr.substr(valueLength);
	}
	// store all the chunks
	chrome.storage.sync.set(storageObj, callback);
}

function syncFetch(key, callback) {
	syncFetchSegment(key, 0, "", callback);
}

function syncFetchSegment(key, segmentNumber, fetchedStr, callback) {
	console.debug("getting "+ key + "_" + segmentNumber);
	chrome.storage.sync.get(key + "_" + segmentNumber, function (data) {
		let segment = data.hasOwnProperty(key + "_" + segmentNumber) ? data[key + "_" + segmentNumber] : "";
		if (!segment) {
			callback({ [key]: JSON.parse(fetchedStr || "[]") });
		} else {
			syncFetchSegment(key, segmentNumber + 1, fetchedStr + segment, callback);
		}
	});
}
