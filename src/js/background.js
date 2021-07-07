import {log, error, warn} from './log'

let data = {
    username: 'User' + Math.random(),
    room: '',
    serverUrl: 'ws://senteristeam.ru:8003',
    isConnected: false,
    isConnecting: false,
    error: null
};

let popupPort;

function sendToContent(msg) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, msg, function(response){
                resolve(response);
            });
        });
    });
}

let socket;

function onSocketOpen(e) {
    log("Connected");
    data.isConnected = true;
    data.isConnecting = false;
    data.error = null;
    if (popupPort) popupPort.postMessage({data: data});
    sendToServer({user: data.username});
}

function onSocketMessage(event) {
    log(`Got update from server: ${event.data}`);
    let data = JSON.parse(event.data);
    if (data.action) handleControl(data.action);
}

function onSocketClose(event) {
    warn(`Disconnected from server`, event);
    data.isConnected = false;
    data.isConnecting = false;
    data.error = event.code === 1000 ? null : 'network';
    if (popupPort) popupPort.postMessage({data: data});
}

function onSocketError(event) {
    error(`Websocket error!`, event);
    data.isConnected = false;
    if (popupPort) popupPort.postMessage({data: data});
}

function sendToServer(data) {
    return socket.send(JSON.stringify(data));
}

function handleControl(msg) {
    if (msg.from !== 'content') sendToContent(msg);
    if (msg.from !== 'server') sendToServer({action: msg});
    delete msg.from;
}

chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
        log('Received action: ', msg.action);
        switch (msg.action) {
            case 'pause':
            case 'play':
            case 'seek':
                port.postMessage("OK");
                handleControl(msg);
                break;
            case 'connect':
                data.isConnecting = true;
                data.error = null;
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
            case 'getData':
                port.postMessage({data: data});
                popupPort = port;
                break;
            case 'setData':
                let newData = {...data, ...msg.data};

                if (newData.username !== data.username && data.isConnected) sendToServer({user: newData.username});

                data = newData;
                port.postMessage("OK");
                break;
        }
    });
});
