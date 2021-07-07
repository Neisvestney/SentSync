<template>
  <div id="main">
    <h1>SentSync</h1>
    <div class="form-group">
      <label>Имя</label>
      <input v-model="username"/>
      <!--      <button>Сохранить</button>-->
    </div>

    <div v-if="!isConnected" class="connection">
      <div class="form-group">
        <label>Комната</label>
        <input v-model="room">
        <button @click="post({action: 'connect'})">Соедениться</button>
      </div>

    </div>
    <div v-else class="connection">
      <div class="form-group">
        <label>Код комнаты</label>
        <p>{{ room }}</p>
        <button @click="post({action: 'disconnect'})" class="danger">Отключиться</button>
      </div>

    </div>
    <br>
    <!--    <div class="controls">-->
    <!--      <button @click="post({action: 'pause'})">Пауза</button>-->
    <!--      <button @click="post({action: 'play'})">Продолжить</button>-->
    <!--    </div>-->
    <span class="footer">Made by <a target="_blank" href="https://github.com/Neisvestney">Neisvestney</a></span>
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
  beforeMount: function () {
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