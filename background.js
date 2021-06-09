const defaultColors = {
	historyColor: "#DDE5F5",
	newColor: "#FCF2CC",
	starredColor: "#FFDAD7",
};

const defaultBlurs = {
	historyBlur: 3,
	starredBlur: 0,
};

chrome.runtime.onInstalled.addListener(function () {
	chrome.storage.sync.set({ newColor: "#FCF2CC" }, function () {
		console.log("newColor is " + defaultColors.newColor);
	});

	chrome.storage.sync.set({ historyColor: "#DDE5F5" }, function () {
		console.log("historyColor is " + defaultColors.historyColor);
	});
	chrome.storage.sync.set({ historyBlur: 3 }, function () {
		console.log("historyBlur is " + defaultBlurs.historyBlur);
	});

	chrome.storage.sync.set({ starredColor: "#FFDAD7" }, function () {
		console.log("starredColor is " + defaultColors.starredColor);
	});
	chrome.storage.sync.set({ starredBlur: 0 }, function () {
		console.log("starredBlur is " + defaultBlurs.starredBlur);
	});

	chrome.storage.sync.set({ sort: true }, function () {
		console.log("sort is " + defaultBlurs.starredBlur);
	});

	chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
		chrome.declarativeContent.onPageChanged.addRules([
			{
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						pageUrl: { hostEquals: "github.com" },
					}),
				],
				actions: [new chrome.declarativeContent.ShowPageAction()],
			},
		]);
	});
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	// detecct page update
	if ((changeInfo.status = "complete")) {
		chrome.tabs.sendMessage(tabId, {
			op: "refresh",
		});
	}
});
