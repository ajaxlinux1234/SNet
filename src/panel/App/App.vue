<template>
  <div class="box">
    <div class="list">
      <div class="option-box">
        <el-input clearable @change="onFilter" size="small" class="input" placeholder="搜索请求和响应结果" v-model="filter" />
        <el-button class="space" size="small" type="primary" @click="onClear">清空所有</el-button>
        <img @click="onOpen" class="space" src="../../static/setting.svg" />
      </div>
      <el-dialog custom-class="dialog" title="设置" :visible.sync="visible" append-to-body>
        <el-switch active-text="开启名单缓存" inactive-text="关闭名单缓存"  @change="onSwitchLocalStore" v-model="localCache" />
        <div class="select-item">
          URL关键词黑名单：
          <el-tag
            :key="tag"
            v-for="tag in urlBlackList"
            closable
            class="round-space"
            :disable-transitions="false"
            @close="onCloseTag(tag, true)">
            {{tag}}
          </el-tag>
          <el-input
            class="top-space"
            v-if="urlIsAdding"
            v-model="urlAddVal"
            size="small"
            @keyup.enter.native="onAddTag(true)"
          >
          </el-input>
          <el-button v-else class="space" size="small" @click="onShowInput(true)">+ 添加</el-button>
        </div>
        <div class="select-item">
          Response type白名单：
          <el-tag
            :key="tag"
            v-for="(tag, index) in resTypeWhiteList"
            :closable="index !== 0"
            class="round-space"
            :disable-transitions="false"
            @close="onCloseTag(tag)">
            {{tag}}
          </el-tag>
          <el-input
            class="top-space"
            v-if="resIsAdding"
            v-model="resAddVal"
            size="small"
            @keyup.enter.native="onAddTag(false)"
          >
          </el-input>
          <el-button v-else class="space" size="small" @click="onShowInput(false)">+ 添加</el-button>
        </div>
      </el-dialog>     
      <el-table size="middle" class="table" highlight-current-row @current-change="onRowClick" height="calc(100vh - 100px)" :data="tableData" stripe>
        <el-table-column prop="action" label="Action" width="150"> </el-table-column>
        <el-table-column prop="url" label="Url" width="200"> </el-table-column>
        <el-table-column prop="method" label="Method" width="100"> </el-table-column>
        <el-table-column prop="status" label="Status" width="100"> 
           <template slot-scope="scope">
              <span :class="[scope.row.status !== 200 && 'danger']">{{scope.row.status}}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="resReq">
      <el-menu :default-active="activeIndex" class="el-menu-demo" mode="horizontal" @select="onSelect">
        <el-menu-item index="0">Response</el-menu-item>
        <el-menu-item index="1">Request</el-menu-item>
        <el-menu-item index="2">Response Header</el-menu-item>
        <el-menu-item index="3">Request Header</el-menu-item>
      </el-menu>
        <json-viewer
          v-if="showRes && activeIndex === '0'"
          :value="curData.res"
          :expand-depth="100"
          copyable
          boxed
          sort
        ></json-viewer>
        <json-viewer
          v-if="showReq && activeIndex === '1'"
          :value="curData.req"
          :expand-depth="100"
          copyable
          boxed
          sort
        ></json-viewer>
        <json-viewer
          v-if="showResHeader && activeIndex === '2'"
          :value="curData.resHeader"
          :expand-depth="100"
          copyable
          boxed
          sort
        ></json-viewer>
        <json-viewer
          v-if="showReqHeader && activeIndex === '3'"
          :value="curData.reqHeader"
          :expand-depth="100"
          copyable
          boxed
          sort
        ></json-viewer>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-undef */
/* eslint-disable no-console */
import JsonViewer from "vue-json-viewer";
import localforage from 'localforage'
export default {
  name: 'App',
  components: {
    JsonViewer
  },
  data() {
    return {
      filter: undefined,
      curData: {
        res: {},
        req: {},
        resHeader: {},
        reqHeader: {}
      },
      totalData: [], // 所有的数据，搜索用
      tableData: [],
      activeIndex: "0",
      visible: false,
      urlIsAdding: false,
      resIsAdding: false,
      urlAddVal: undefined,
      resAddVal: undefined,
      urlBlackList: [],
      resTypeWhiteList: ['fetch'],
      localCache: false,
      domain: null, 
    };
  },
  watch: {
    filter () {
      this.onHighlight()
    },
    activeIndex () {
      this.onHighlight()
    }
  },
  computed: {
    showRes () {
      return this.curData ? Object.keys(this.curData.res).length > 0 : false
    },
    showReq () {
      return this.curData ? Object.keys(this.curData.req).length > 0 : false
    },
    showResHeader () {
      return this.curData ? Object.keys(this.curData.resHeader).length > 0 : false
    },
    showReqHeader () {
      return this.curData ? Object.keys(this.curData.reqHeader).length > 0 : false
    },
  },
  async mounted () {
    await this.getDomain()
    await this.updateFromLocal()
    chrome.devtools.network.onRequestFinished.addListener(this.dealReqRes);
  },
  methods: {
    dealReqRes (reqRes) {
      reqRes.getContent((body) => {
        if (reqRes.request && reqRes.request.url) {
          if (this.urlBlackList.some(i => reqRes.request.url.includes(i))) {
            return
          }
          if (this.resTypeWhiteList.some(i => i === reqRes._resourceType)) {
            const { request, response } = reqRes
            let req = null
            let action = null
            let res = null
            const resHeader = response.headers.length ? 
              Object.fromEntries(response.headers.map(i => [i.name, i.value])) : {}
            const reqHeader = request.headers.length ? 
              Object.fromEntries(request.headers.map(i => [i.name, i.value])) : {}
            try {
              req = JSON.parse(request.postData.text).data ? 
                  JSON.parse(JSON.parse(request.postData.text).data):
                  JSON.parse(request.postData.text)
              action = JSON.parse(request.postData.text).action
              res = body ? JSON.parse(body): {}
            } catch (error) {
              req = request.postData ? request.postData.text : {}
              try {
                action = (request.postData && request.postData.text) ? JSON.parse(request.postData.text).action: null
              } catch (error) {
                console.log('no action')
              }
              try {
                res = JSON.parse(body)
              } catch (error) {
                res = body
              }
            }
            if (this.urlBlackList.some(i => i === action)) {
              return
            }
            console.log(reqRes)
            const obj = {
              res,
              req,
              resHeader,
              reqHeader,
              url: request.url.split(/^https?:\/\/([a-z0-9:.-])*\//).at(-1),
              action,
              method: request.method,
              status: response.status || response._error
            }
            this.tableData = [obj, ...this.tableData]
            if (this.tableData.length > 200) {
              this.tableData = this.tableData.filter((_, m) => (m < 200))
            }
            this.totalData = [obj, ...this.totalData]
            if (this.totalData.length > 200) {
              this.totalData = this.totalData.filter((_, m) => (m < 200))
            }
          }
        }
      });
    },
    getDomain () {
      return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          try {
            const tab = tabs[0];
            const url = new URL(tab.url)
            const domain = url.origin
            this.domain = domain
            resolve()
          } catch (error) {
            reject()
          }
        })
      })
    },
    async updateFromLocal () {
      const store = await localforage.getItem(this.domain)
      if (!store) {
        return
      }
      this.localCache = true
      this.urlBlackList = store.urlBlackList
      this.resTypeWhiteList = store.resTypeWhiteList
    },
    async onSwitchLocalStore () {
      if (this.localCache) {
        await localforage.setItem(this.domain, {
          urlBlackList: this.urlBlackList,
          resTypeWhiteList: this.resTypeWhiteList
        })
      } else {
        await localforage.removeItem(this.domain)
      }
    },
    onFilter(arg){
      if (!arg) {
        this.tableData = this.totalData
      }
      this.tableData = this.totalData.filter(i => JSON.stringify(i).includes(arg))
      
      this.$forceUpdate()
    },
    onClear() {
      this.totalData = []
      this.tableData = []
      this.curData = { res: {}, req: {}, resHeader: {}, reqHeader: {}}
      this.filter = undefined
    },
    onSelect(index) {
      this.activeIndex = index
    },
    getCoords(elem, other) {
      const box = elem.getBoundingClientRect();

      const docEl = document.documentElement;

      const scrollTop = other.scrollTop || 0;
      const scrollLeft = other.scrollLeft || 0;

      const clientLeft = docEl.clientLeft || 0;

      const top  = box.top + scrollTop - 100;
      const left = box.left + scrollLeft - clientLeft;
      return { top: Math.round(top), left: Math.round(left) };
    },
    initHighlight () {
      const box = [...document.getElementsByClassName('jv-container')]
      const highlightTags = box[0] ? [...box[0].querySelectorAll('.jv-item,.jv-key')].filter((i) => i.innerText.includes(this.filter)) : null
      setTimeout(() => highlightTags && highlightTags.forEach(i => {
        i.classList.remove('highlight')
      }), 500)
    },
    onHighlight() {
      this.initHighlight()
      if (!this.filter) {
        return
      }
      this.$nextTick(() => {
        setTimeout(() =>  {
          const box = [...document.getElementsByClassName('jv-container')]
          // box[0].scrollTo({
          //   top: 0,
          //   behavior: 'smooth'
          // })
          const highlightTags = box[0] ? [...box[0].querySelectorAll('.jv-item,.jv-key')].filter((i) => i.innerText.includes(this.filter)) : null
          if (highlightTags) {
            highlightTags.forEach(i => {
              i.classList.add('highlight')
            })
            const { top } = this.getCoords(highlightTags[0], box[0])
            box[0].scrollTo({
              top,
              behavior: 'smooth'
            })
          }
        }, 500)
      })
    },
    onRowClick(row) {
      this.curData = {
        res: row ? row.res : {},
        req: row ? row.req : {},
        resHeader: row ? row.resHeader : {},
        reqHeader: row ? row.reqHeader : {},
      }
      this.onHighlight()
    },
    onOpen () {
      this.visible = true
    },
    onClose () {
      this.visible = false
    },
    onAddTag (isFromUrl) {
      const cmpList = isFromUrl ? this.urlBlackList: this.resTypeWhiteList
      const cmpVal =  isFromUrl ? this.urlAddVal : this.resAddVal
      if (cmpList.some(i => i === cmpVal) || !cmpVal.trim()) {
        if (isFromUrl) {
          this.urlIsAdding = false
        } else {
          this.resIsAdding = false
        }
        return
      }
      cmpList.push(cmpVal)
      if (isFromUrl) {
        this.urlIsAdding = false
        this.urlAddVal = undefined
      } else {
        this.resIsAdding = false
        this.resAddVal = undefined
      }
      this.onSwitchLocalStore()
    },
    onCloseTag (val, isFromUrl) {
      const cmpList = isFromUrl ? this.urlBlackList: this.resTypeWhiteList
      cmpList.splice(cmpList.indexOf(val), 1);
      this.onSwitchLocalStore()
    },
    onShowInput (isFromUrl) {
      if (isFromUrl) {
        this.urlIsAdding = true
      } else {
        this.resIsAdding = true
      }
    }
  }
};
</script>

<style>
.box {
  display: flex;
  justify-content: space-between;
}

.option-box {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.option-box img {
  height: 24px;
}

.box .jv-container {
  overflow: scroll;
  height: 80vh;
}

.box .jv-code {
  max-height: none !important;
  overflow-x: scroll !important;
}

.list {
  position: fixed;
  left: 10px;
  top: 10px;
}

.table {
  position: relative;
  overflow-y: scroll;
}
.box table {
  width: 60vw !important;
}
.space {
  margin-left: 5px;
}

.danger {
  color: red;
}

.box .el-table__empty-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.copy {
  height: 16px;
  position: relative;
  top: 2px;
  cursor: pointer;
}
.input {
  width: 200px;
}

.resReq {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  left: 63vw;
}
.highlight {
  background-color: yellow;
}
.select-item {
  margin-top: 10px;
}
.top-space {
  margin-top: 10px;
}
.round-space {
  margin: 10px 0 0 5px ;
}

.dialog .el-dialog__body {
  padding-top: 0;
}
</style>
