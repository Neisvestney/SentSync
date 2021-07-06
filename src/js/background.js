const {log} = require("./log");

function sendToContent(msg) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, msg, function(response){
                resolve(response);
            });
        });
    });
}

function sendToServer(data) {
    return socket.send(JSON.stringify(data));
}

chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
        console.log('Received action: ', msg.action);
        switch (msg.action) {
            case 'pause':
            case 'play':
            case 'seek':
                if (msg.from !== 'content') sendToContent(msg);
                delete msg.from;
                sendToServer({action: msg});
                break;
        }
        port.postMessage("OK");
    });
});

let socket = new WebSocket("ws://127.0.0.1:8000/ws/room/2/");

socket.onopen = function(e) {
    log("Соединение установлено");
};

socket.onmessage = function(event) {
    log(`[message] Данные получены с сервера: ${event.data}`);
};