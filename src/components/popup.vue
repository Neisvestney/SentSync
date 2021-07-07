<template>
  <div id="main">
    <input v-model="username" placeholder="Ваше имя">
    <div v-if="!isConnected" class="connection">
      <input v-model="room" placeholder="Комната">
      <button @click="post({action: 'connect'})">Соедениться</button>

    </div>
    <div v-else class="connection">
      <p>Код комнаты: {{ room }}</p>
      <p>Соеденено</p>
      <button @click="post({action: 'disconnect'})">Отключиться</button>
    </div>
    <br>
    <div class="controls">
      <button @click="post({action: 'pause'})">Пауза</button>
      <button @click="post({action: 'play'})">Продолжить</button>
      <input type="number" v-model="seekTo" placeholder="отредактируй меня">
      <button @click="post({action: 'seek', to: seekTo})">Перейти</button>
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
      seekTo: 0,
      username: null,
      room: null,
      isConnected: false
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
    }
  },
  beforeMount: function(){
    this.port.onMessage.addListener((msg) => {
      console.log(msg);
      if (msg.data) {
        this.username = msg.data.username;
        this.room = msg.data.room;
        this.isConnected = msg.data.isConnected;
      }
    });
    this.post({action: 'getData'})
  }
}
</script>

<style lang="scss" src="../styles/popup.scss"></style>