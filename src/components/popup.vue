<template>
  <div id="main">
    <h1>SentSync</h1>
    <div class="form-group">
      <label>{{ $t("username") }}</label>
      <input v-model="username"/>
      <!--      <button>Сохранить</button>-->
    </div>
    <div class="form-group">
      <label>{{ $t("tabs.tab") }}</label>
      <p v-if="Object.keys(selectedTab).length > 0">{{ selectedTab.title }}</p>
      <p v-else-if="tabUrl">{{ tabUrl }}</p>
      <p v-else>{{ $t("tabs.notselected") }}</p>
      <button v-if="!isConnected || userIsHost" :disabled="!userIsHost" @click="post({action: 'selectCurrentTab'})">{{ $t("tabs.select") }}</button>
      <button v-else :disabled="!tabUrl" @click="post({action: 'openTab'})">{{ $t("tabs.open") }}</button>
    </div>

    <div v-if="!isConnected" class="connection">
      <div class="form-group">
        <label>{{ $t("room.enter") }}</label>
        <input v-model="room">
        <button :disabled="isConnecting" @click="post({action: 'connect'})">{{ $t("network.connect") }}</button>
      </div>
    </div>
    <div v-else class="connection">
      <div class="form-group">
        <label>{{ $t("room.code") }}</label>
        <p>
          {{ room }}
          <button :title="$t('room.copy')" @click="copyCode" class="small"><i class="icon copy"></i></button>
          <button :title="$t('room.link')" @click="copyInvite" class="small"><i class="icon link"></i></button>
        </p>
        <button @click="post({action: 'disconnect'})" class="danger">{{ $t("network.disconnect") }}</button>
      </div>
      <div v-if="usersList.length > 0" class="form-group">
        <label>{{ $t("users.title") }}</label>
        <ul>
          <li v-for="user in usersList">{{ user.username }}
            <span :title="$t('users.you')" v-if="user.id === userId">⍚</span>
            <span :title="$t('users.host')" v-if="user.isHost">☆</span>
          </li>
        </ul>
      </div>
    </div>
    <p v-if="error === 'network'" class="danger">{{ $t("error.network") }}</p>
    <br>
    <!--    <div class="controls">-->
    <!--      <button @click="post({action: 'pause'})">Пауза</button>-->
    <!--      <button @click="post({action: 'play'})">Продолжить</button>-->
    <!--    </div>-->
    <div v-if="more" class="more">
      <div class="form-group">
        <label>{{ $t("more.server") }}</label>
        <input v-model="serverUrl">
      </div>
      <div class="form-group">
        <label>{{ $t("more.notifications.title") }}</label>
        <label role="checkbox">
          <input type="checkbox" id="showNotifications" v-model="showNotifications">
          <span>{{ $t("more.notifications.show") }}</span>
        </label>
      </div>
    </div>
    <div class="footer">
      <a href="#" @click="more = !more">{{ $t("more.settings") }}</a>
      <span class="credits">{{ $t("madeby") }} <a target="_blank" href="https://github.com/Neisvestney">Neisvestney</a></span>
    </div>
  </div>
</template>

<script>

export default {
  name: "Popup",
  data() {
    console.log(this);
    const port = chrome.extension.connect({
      name: "Communication"
    });

    return {
      port: port,
      more: false,

      seekTo: 0,
      username: null,
      userId: null,
      userIsHost: null,
      room: null,
      serverUrl: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      selectedTab: null,
      tabUrl: null,
      usersList: [],

      showNotifications: true,
    }
  },
  methods: {
    post(data) {
      console.log('post')
      this.port.postMessage(data);
    },
    copyCode() {
      navigator.clipboard.writeText(this.room)
    },
    copyInvite() {
      const url = `${this.serverUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/invite/${this.room}/`;
      navigator.clipboard.writeText(url)
    }
  },
  watch: {
    username: function (newUsername, old) {
      if (newUsername)
        this.post({action: 'setData', data: {username: newUsername}})
    },
    room: function (newRoom, old) {
      if (newRoom)
        this.post({action: 'setData', data: {room: newRoom}})
    },
    serverUrl: function (newUrl, old) {
      if (newUrl)
        this.post({action: 'setData', data: {serverUrl: newUrl}})
    },
    showNotifications: function (newSet, old) {
      this.post({action: 'setData', data: {showNotifications: newSet}})
    },
  },
  beforeMount: function () {
    this.port.onMessage.addListener((msg) => {
      console.log(msg);
      if (msg.data) {
        this.username = msg.data.username;
        this.userId = msg.data.userId;
        this.userIsHost = msg.data.userIsHost;
        this.room = msg.data.room;
        this.serverUrl = msg.data.serverUrl;
        this.isConnected = msg.data.isConnected;
        this.isConnecting = msg.data.isConnecting;
        this.error = msg.data.error;
        this.selectedTab = msg.data.selectedTab;
        this.tabUrl = msg.data.tabUrl;
        this.usersList = msg.data.usersList;
        this.showNotifications = msg.data.showNotifications;
      }
    });
    this.post({action: 'getData'})
  }
}
</script>

<style lang="scss" src="../styles/styles.scss"></style>