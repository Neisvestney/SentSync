import {log, error, warn} from './log'

Object.filter = (obj, predicate) =>
    Object.keys(obj)
        .filter( key => predicate(obj, key) )
        .reduce( (res, key) => (res[key] = obj[key], res), {} );

let data = {
    username: 'User' + Math.random(),
    room: '',
    serverUrl: 'wss://sentsync.senteristeam.ru',
    isConnected: false,
    isConnecting: false,
    error: null,
    selectedTab: null,
};

let notToSave = ['isConnected', 'isConnecting', 'isConnecting', 'selectedTab'];

let popupPort;

function setData(newData, sentToPopup = true) {
    data = {...data, ...newData};
    log('New data saved: ', data);
    chrome.storage.sync.set(Object.filter(data, (o, k) => !notToSave.includes(k)));
    if (popupPort && sentToPopup) popupPort.postMessage({data: data});
}

chrome.storage.sync.get(Object.keys(data), function(result) {
    setData(result);
});

function sendToContent(msg) {
    return new Promise((resolve, reject) => {
        if (data.selectedTab) {
            chrome.tabs.sendMessage(data.selectedTab.id, msg, function (response) {
                resolve(response);
            });
        } else {
            reject('notSelectedTab');
        }
    });
}

let socket;

function onSocketOpen(e) {
    log("Connected");
    setData({isConnected: true, isConnecting: false, error: null});
    sendToServer({user: data.username});
}

function onSocketMessage(event) {
    log(`Got update from server: ${event.data}`);
    let data = JSON.parse(event.data);
    if (data.action) handleControl(data.action);
}

function onSocketClose(event) {
    warn(`Disconnected from server`, event);
    setData({isConnected: false, isConnecting: false, error: event.code === 1000 ? null : 'network'});
}

function onSocketError(event) {
    error(`Websocket error!`, event);
    setData({isConnected: false});
}

function sendToServer(data) {
    log("Sending data to server...", data);
    if (socket && socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(data));
}

function handleControl(msg) {
    if (msg.from !== 'content') sendToContent(msg);
    if (msg.from !== 'server') sendToServer({action: msg});
    delete msg.from;
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
    sendResponse('OK');

    log(`Received message from content (tab id: ${sender.tab.id}): `, msg);
    if (data.selectedTab && sender.tab.id === data.selectedTab.id)  {
        switch (msg.action) {
            case 'pause':
            case 'play':
            case 'seek':
                handleControl(msg);
                break;
        }
    }
});

chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
        log('Received message: ', msg);
        switch (msg.action) {
            case 'pause':
            case 'play':
            case 'seek':
                port.postMessage("OK");
                handleControl(msg);
                break;
            case 'connect':
                setData({isConnecting: true, error: null}, false);
                port.postMessage({data: data});

                socket = new WebSocket(`${data.serverUrl}/ws/room/${data.room}/`);
                socket.onopen = onSocketOpen;
                socket.onmessage = onSocketMessage;
                socket.onclose = onSocketClose;
                socket.onerror = onSocketError;
                break;
            case 'disconnect':
                socket.close();
                break;
            case 'selectCurrentTab':
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    setData({selectedTab: tabs[0]})
                });
                break;
            case 'getData':
                port.postMessage({data: data});
                popupPort = port;
                break;
            case 'setData':
                let newData = {...data, ...msg.data};

                if (newData.username !== data.username && data.isConnected) sendToServer({user: newData.username});

                setData(newData, false);
                port.postMessage("OK");
                break;
        }
    });
});
