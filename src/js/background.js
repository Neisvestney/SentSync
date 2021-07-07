const {log} = require("./log");

let data = {
    username: 'User' + Math.random(),
    room: '',
    isConnected: false
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
    if (popupPort) popupPort.postMessage({data: data});
    sendToServer({user: data.username});
}

function onSocketMessage(event) {
    log(`Got update from server: ${event.data}`);
    let data = JSON.parse(event.data);
    if (data.action) handleControl(data.action);
}

function onSocketClose(event) {
    log(`Disconnected from server`);
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
                socket = new WebSocket(`ws://127.0.0.1:8000/ws/room/${data.room}/`);
                socket.onopen = onSocketOpen;
                socket.onmessage = onSocketMessage;
                socket.onclose = onSocketClose;
                port.postMessage("OK");
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
