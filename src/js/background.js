import {log, error, warn} from './log'

Object.filter = (obj, predicate) =>
    Object.keys(obj)
        .filter( key => predicate(obj, key) )
        .reduce( (res, key) => (res[key] = obj[key], res), {} );

let data = {
    username: 'User' + Math.random(),
    userId: null,
    userIsHost: null,
    room: '',
    serverUrl: 'wss://sentsync.senteristeam.ru',
    isConnected: false,
    isConnecting: false,
    error: null,
    selectedTab: {},
    usersList: [],
    tabUrl: null,

    showNotifications: true,
};

let notToSave = ['isConnected', 'isConnecting', 'isConnecting', 'selectedTab', 'userId', 'tabUrl', 'userIsHost'];

let popupPort;

function openOrCreateTab(url) {
    chrome.tabs.query({url}, function(tabs) {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            setData({selectedTab: tabs[0]});
        }
        else {
            if (data.selectedTab && data.selectedTab.id) {
                chrome.tabs.get(data.selectedTab.id, function (tab) {
                    if (tab) chrome.tabs.update(tab.id, {url: url}).then(t => setData({selectedTab: t}));
                    else chrome.tabs.create({url}, (t) => setData({selectedTab: t}));
                });
            } else {
                chrome.tabs.create({url}, (t) => setData({selectedTab: t}));
            }
        }
    });
}

function setData(newData, sentToPopup = true) {
    if (newData.username !== data.username && data.isConnected && newData.username)
        sendToServer({cmd: {action: 'setData', username: newData.username}});

    if (newData.selectedTab && newData.selectedTab.url !== data.selectedTab.url && data.isConnected) {
        sendToServer({cmd: {action: 'setData', tabUrl: newData.selectedTab.url}});
        console.log(newData.selectedTab)
    }

    if (newData.tabUrl && newData.tabUrl !== data.tabUrl) {
        if (!{...data, ...newData}.userIsHost) {
            log("Opening new url: ", newData.tabUrl);
            openOrCreateTab(newData.tabUrl);
        }
    }

    if ({...data, ...newData}.isConnected && newData.usersList && data.usersList) {
        let newUsers = newData.usersList.filter(x => !data.usersList.some(u => x.id === u.id));
        let disconnectedUsers = data.usersList.filter(x => !newData.usersList.some(u => x.id === u.id));

        for (const newUser of newUsers) {
            if (data.userId && newUser.id != data.userId) noification('notificationOnNewUser', [newUser.username])
        }
        for (const disconnectedUser of disconnectedUsers) {
            if (data.userId && disconnectedUser.id != data.userId) noification('notificationOnUserDisconnected', [disconnectedUser.username])
        }
    }

    data = {...data, ...newData};
    log('New data saved: ', data);
    chrome.storage.sync.set(Object.filter(data, (o, k) => !notToSave.includes(k))); // Saving data to storage
    if (popupPort && sentToPopup) popupPort.postMessage({data: data}); // Sending data to popup

    if (data.isConnected && data.selectedTab) chrome.browserAction.setIcon({path: '16x16.png'}); // Changing icon
    else chrome.browserAction.setIcon({path: '16x16_disabled.png'});
}

chrome.storage.sync.get(Object.keys(data), function(result) {
    setData(result);
});

function sendToContent(msg) {
    log('Sending message to contend', msg);
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

function noification(msg, addition) {
    if (data.showNotifications) {
        chrome.notifications.create({
            title: 'SentSync',
            message: chrome.i18n.getMessage(msg, addition),
            iconUrl: '/128x128.png',
            type: 'basic',
            silent: true
        }, function (id) {
            setTimeout(() => chrome.notifications.clear(id), 2000)
        });
    }
}

function connect(port) {
    setData({isConnecting: true, error: null}, false);
    if (port) port.postMessage({data: data});

    socket = new WebSocket(`${data.serverUrl}/ws/room/${data.room}/?u=${data.username}`);
    socket.onopen = onSocketOpen;
    socket.onmessage = onSocketMessage;
    socket.onclose = onSocketClose;
    socket.onerror = onSocketError;
}

let socket;

function onSocketOpen(e) {
    log("Connected");
    setData({isConnected: true, isConnecting: false, error: null});
}

function onSocketMessage(event) {
    log(`Got update from server: ${event.data}`);
    let d = JSON.parse(event.data);

    if (d.action && d.sender.id !== data.userId) handleControl(d.action, d.sender);
    if (d.data) setData({userId: d.data.you.id, userIsHost: d.data.you.isHost, usersList: d.data.room.users, tabUrl: d.data.room.tabUrl})
}

function onSocketClose(event) {
    warn(`Disconnected from server`, event);
    setData({userId: null, userIsHost: null, isConnected: false, isConnecting: false, selectedTab: {}, tabUrl: null, error: event.code === 1000 ? null : 'network', usersList: []});
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

function handleControl(msg, sender) {
    if (msg.from === 'server') {
        switch (msg.action) {
            case 'play':
                noification('notificationOnPlay', sender.username);
                break;
            case 'pause':
                noification('notificationOnPause', [sender.username, new Date(msg.at * 1000).toISOString().substr(11, 12)]);
                break;
            case 'seek':
                noification('notificationOnSeek', [sender.username, new Date(msg.to * 1000).toISOString().substr(11, 12)]);
                break;
        }
    }
    if (msg.from !== 'content') sendToContent(msg);
    if (msg.from !== 'server') sendToServer({action: msg});
    delete msg.from;
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
    log(`Received message from content (tab id: ${sender.tab.id}): `, msg);

    if (msg.connectTo) {
        log('Attempt to connect to', msg.connectTo);

        if (!data.isConnected) {
            sendResponse('OK');
            setData({room: msg.connectTo.code});
            connect(popupPort);
        } else {
            sendResponse('ALREADY_CONNECTED');
        }
    }

    if (data.selectedTab && sender.tab.id === data.selectedTab.id && msg.action)  {
        sendResponse('OK');
        switch (msg.action) {
            case 'pause':
            case 'play':
            case 'seek':
                handleControl(msg);
                break;
            case 'refreshTab':
                if (data.selectedTab) {
                    chrome.tabs.get(data.selectedTab.id, function(tab) {
                        setData({selectedTab: tab})
                    });
                }
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
                connect(port);
                break;
            case 'disconnect':
                socket.close();
                break;
            case 'selectCurrentTab':
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) setData({selectedTab: tabs[0]})
                });
                break;
            case 'openTab':
                openOrCreateTab(data.tabUrl);
            case 'getData':
                port.postMessage({data: data});
                popupPort = port;
                popupPort.onDisconnect.addListener(() => (popupPort = null));
                break;
            case 'setData':
                let newData = {...data, ...msg.data};

                setData(newData, false);
                port.postMessage("OK");
                break;
        }
    });
});
