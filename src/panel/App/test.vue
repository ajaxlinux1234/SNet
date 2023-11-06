<template>
  <div class="box">
    <el-date-picker type="datetime" v-model="date">

    </el-date-picker>
  </div>
</template>

<script>
/* eslint-disable no-undef */
/* eslint-disable no-console */
// import JSONEditor from '@json-editor/json-editor'
/**
 * @typedef {Object} State
 * @property {number} [highlightTotal=0] 搜索结果中共有几个dom高亮
 * @property {number} [highlightCurrent=0] 搜索结果高亮dom的索引
 */
export default {
  name: 'App',
  data() {
    return {
      date: ''
    }
  }
};
</script>

<style>
.box {
  width: 294px;
  height: 550px;
  margin: 0 auto;
  overflow: auto;
  position: relative;
  background-color: blueviolet;
}
</style>
