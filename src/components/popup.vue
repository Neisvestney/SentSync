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
      <p v-if="selectedTab">{{ selectedTab.title }}</p>
      <p v-else>{{ $t("tabs.notselected") }}</p>
      <button @click="post({action: 'selectCurrentTab'})">{{ $t("tabs.select") }}</button>
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
        <p>{{ room }}</p>
        <button @click="post({action: 'disconnect'})" class="danger">{{ $t("network.disconnect") }}</button>
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
      room: null,
      serverUrl: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      selectedTab: null,
    }
  },
  methods: {
    post(data) {
      this.port.postMessage(data);
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
  },
  beforeMount: function () {
    this.port.onMessage.addListener((msg) => {
      console.log(msg);
      if (msg.data) {
        this.username = msg.data.username;
        this.room = msg.data.room;
        this.serverUrl = msg.data.serverUrl;
        this.isConnected = msg.data.isConnected;
        this.isConnecting = msg.data.isConnecting;
        this.error = msg.data.error;
        this.selectedTab = msg.data.selectedTab;
      }
    });
    this.post({action: 'getData'})
  }
}
</script>

<style lang="scss" src="../styles/popup.scss"></style>