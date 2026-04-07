<template>
  <div class="ad" ref="rootEl" v-show="!picking" @contextmenu.prevent="onContextMenuRoot" @mouseleave="onMouseLeaveRoot" @mouseenter="onMouseEnterCocosLogo">
    <div class="title">
      <div class="btns" v-show="showBtns">
        <div v-for="(item, index) in listArray" :key="index" class="list" @click="item.click($event, item)" :title="getTitle(item)" v-show="item.visible">
          <i class="iconfont icon" :class="item.icon" @contextmenu.prevent.stop="item.contextmenu"></i>
        </div>
      </div>
      <i ref="elIcon" class="iconfont icon_cocos cocos" @mousedown="onMouseDown" @click="onCocosLogoClick"></i>
    </div>
    <!-- <Memory></Memory> -->
    <CCDialog></CCDialog>
    <CCMenu></CCMenu>
  </div>
  <div class="game-tip" v-if="showGameTip">
    <div class="text" title="" @click="onClickTip">游戏暂停中</div>
  </div>
</template>
<script lang="ts">
import ccui from "@xuyanfeng/cc-ui";
import { IUiMenuItem } from "@xuyanfeng/cc-ui/types/cc-menu/const";
import { storeToRefs } from "pinia";
import { defineComponent, onMounted, onUnmounted, ref, toRaw } from "vue";
import { GA_EventName } from "../../ga/type";
import { DocumentEvent } from "../const";
import { } from "../inject/hint";
import { inspectTarget } from "../inject/inspect-list";
import { freshEditor } from "../inject/util";
import Ad from "./ad.vue";
import Banner from "./banner.vue";
import Memory from "./memory.vue";
import Shortkeys from "./shortkeys.vue";
import { appStore } from "./store";
import { sendGaEvent } from "./util";
declare const cc: any;
const { CCDialog, CCMenu } = ccui.components;
interface ListItem {
  icon: string;
  txt: string | Function;
  visible: boolean;
  /**
   * 点击回调
   */
  click: (event: MouseEvent, item: ListItem) => void;
  contextmenu: (event: MouseEvent) => void;
}
export default defineComponent({
  name: "app",
  components: { CCDialog, Banner, Memory, CCMenu },
  setup() {
    function randomSupport(): { icon: string; title: string } {
      const arr = [
        { icon: "icon_shop_cart", title: "冲冲冲" },
        { icon: "icon_good", title: "赞一个" },
        { icon: "icon_coffe", title: "请我喝杯咖啡" },
      ];
      const idx = Math.floor(Math.random() * arr.length);
      return arr[idx];
    }
    const store = appStore();
    store.init();
    const rnd = randomSupport();
    const { config } = storeToRefs(appStore());
    function doInspector() {
      unregisterShortKey();
      sendGaEvent(GA_EventName.GameInspector);
      if (config.value.autoHide) {
        showBtns.value = false;
      }
      picking.value = true;
      if (typeof cc === "undefined") {
        testInspector();
      } else {
        const event = new CustomEvent(DocumentEvent.GameInspectorBegan);
        document.dispatchEvent(event);
      }
    }
    const listArray = ref<ListItem[]>([
      {
        icon: `${rnd.icon} ani_shop_cart`,
        txt: rnd.title,
        contextmenu: () => {},
        visible: true,
        click: () => {
          ccui.dialog.showDialog({
            title: "Recommended Plugins",
            comp: Ad,
            width: 310,
            height: 500,
            closeCB: () => {
              sendGaEvent(GA_EventName.CloseAd);
            },
          });
        },
      },
      {
        icon: "icon_settings",
        txt: "Settings",
        visible: true,
        contextmenu: () => {},
        click: () => {
          ccui.dialog.showDialog({
            title: "Settings",
            comp: Shortkeys,
            width: 400,
            height: 150,
            closeCB: () => {},
          });
        },
      },
      {
        icon: "icon_book",
        txt: "插件完整功能介绍(Gif动画)",
        contextmenu: () => {},
        visible: true,
        click: () => {
          sendGaEvent(GA_EventName.OpenDoc);
          window.open("https://juejin.cn/post/7463836172559024179");
        },
      },
      {
        icon: "icon_do_play",
        click: (event: MouseEvent, item: ListItem) => {
          sendGaEvent(GA_EventName.GamePlayer);
          if (typeof cc !== "undefined") {
            cc.game.resume();
          }
        },
        visible: true,
        txt: () => {
          return `game resume (${config.value.shortKeyGamePauseResume})`;
        },
        contextmenu: () => {},
      },
      {
        icon: "icon_do_pause",
        visible: true,
        txt: () => {
          return `game pause (${config.value.shortKeyGamePauseResume})`;
        },
        click: () => {
          sendGaEvent(GA_EventName.GamePause);
          if (typeof cc !== "undefined") {
            cc.game.pause();
          }
        },
        contextmenu: () => {},
      },
      {
        icon: "icon_do_step",
        visible: true,
        txt: () => {
          return `game step (${config.value.shortKeyGameStep})`;
        },
        click: () => {
          sendGaEvent(GA_EventName.GameStep);
          if (typeof cc !== "undefined") {
            cc.game.step();
          }
        },
        contextmenu: () => {},
      },
      {
        icon: "icon_target",
        txt: () => {
          return `Inspect Game (${config.value.shortKeyPick})`;
        },
        visible: true,
        click: () => {
          doInspector();
        },
        contextmenu: (event: MouseEvent) => {
          const arr = [
            { name: "Inspect Label", type: typeof cc !== "undefined" ? cc.Label : "cc.Label" }, //
            { name: "Inspect Sprite", type: typeof cc !== "undefined" ? cc.Sprite : "cc.Sprite" },
            { name: "Inspect Button", type: typeof cc !== "undefined" ? cc.Button : "cc.Button" },
            { name: "Inspect RichText", type: typeof cc !== "undefined" ? cc.RichText : "cc.RichText" },
          ];
          const compMenu: IUiMenuItem[] = arr.map((item) => {
            return {
              name: item.name,
              enabled: inspectTarget.enabled,
              selected: inspectTarget.isContainInspectType(item.type),
              callback: (menu: IUiMenuItem) => {
                sendGaEvent(GA_EventName.MouseMenu, menu.name);
                if (menu.selected) {
                  inspectTarget.removeInspectType(item.type);
                } else {
                  inspectTarget.addInspectType(item.type);
                }
              },
            };
          });
          ccui.menu.showMenuByMouseEvent(event, [
            {
              name: "Clear",
              callback: (menu: IUiMenuItem) => {
                const event = new CustomEvent(DocumentEvent.InspectorClear);
                document.dispatchEvent(event);
                sendGaEvent(GA_EventName.MouseMenu, menu.name);
              },
            },
            {
              name: "Pick Top",
              selected: config.value.pickTop,
              callback: (menu: IUiMenuItem) => {
                config.value.pickTop = !config.value.pickTop;
                appStore().save();
                sendGaEvent(GA_EventName.MouseMenu, menu.name);
              },
            },
            { type: ccui.menu.MenuType.Separator },
            {
              name: "Filter Enabled",
              selected: inspectTarget.enabled,
              callback: (menu: IUiMenuItem) => {
                sendGaEvent(GA_EventName.MouseMenu, menu.name);
                inspectTarget.enabled = !inspectTarget.enabled;
              },
            },
            ...compMenu,
          ]);
        },
      },
    ]);
    document.addEventListener(DocumentEvent.GameInspectorEnd, () => {
      picking.value = false;
      registerShortKey();
    });
    function testInspector() {
      const cursor = document.body.style.cursor;
      document.body.style.cursor = "zoom-in";
      function test(event: MouseEvent) {
        document.removeEventListener("mousedown", test, true);
        document.body.style.cursor = cursor;
        picking.value = false;
      }
      document.addEventListener("mousedown", test, true);
    }
    function recoverAssistantTop() {
      const top = toRaw(config.value.pos);
      updateAssistantTop(top);
    }

    function updateAssistantTop(top: number) {
      if (!rootEl.value) {
        return;
      }
      // @ts-ignore
      const root = toRaw(rootEl.value) as HTMLDivElement | null;
      if (!root) {
        return;
      }
      if (top < 0) {
        top = 0;
      }
      const maxTop = document.body.clientHeight - root.clientHeight;
      if (top > maxTop) {
        top = maxTop;
      }
      root.style.top = `${top}px`;
      config.value.pos = top;
      appStore().save();
    }
    let tipTimer = null;
    onUnmounted(() => {
      if (tipTimer) {
        clearInterval(tipTimer);
        tipTimer = null;
      }
    });
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    onMounted(async () => {
      tipTimer = setInterval(() => {
        showGameTip.value = !!cc.game.isPaused();
      }, 1000);
      recoverAssistantTop();
      window.addEventListener("resize", () => {
        const root = toRaw(rootEl.value) as HTMLDivElement;
        if (!root) {
          return;
        }
        updateAssistantTop(root.offsetTop);
      });
      onDocEventOnMobile();
      onDocEventOnPc();
      return;
    });
    function onDocEventOnMobile() {
      const root = toRaw(rootEl.value) as HTMLDivElement | null;
      if (!root) {
        return;
      }
      root.addEventListener("touchstart", (event: TouchEvent) => {
        // event.preventDefault();
        // event.stopPropagation();
        // @ts-ignore
        const root = toRaw(rootEl.value) as HTMLDivElement | null;
        if (!root) {
          return;
        }
        const startY = event.changedTouches[0].pageY;
        const startTop = root.offsetTop;
        function onTouchMove(e: TouchEvent) {
          isDraging = true;
          const dy = e.changedTouches[0].pageY - startY;
          const top = startTop + dy;
          updateAssistantTop(top);
        }

        function onTouchEnd(e: TouchEvent) {
          isDraging = false;
          document.removeEventListener("touchmove", onTouchMove, true);
          document.removeEventListener("touchend", onTouchEnd, true);
        }
        document.addEventListener("touchmove", onTouchMove, true);
        document.addEventListener("touchend", onTouchEnd, true);
      });
    }
    function onDocEventOnPc() {
      const root = toRaw(rootEl.value) as HTMLDivElement | null;
      if (!root) {
        return;
      }
      root.addEventListener("mousedown", (event: MouseEvent) => {
        // event.preventDefault();
        // event.stopPropagation();
        // @ts-ignore
        const root = toRaw(rootEl.value) as HTMLDivElement | null;
        if (!root) {
          return;
        }
        const startY = event.pageY;
        const startTop = root.offsetTop;
        function onMouseMove(e: MouseEvent) {
          isDraging = true;
          const dy = e.pageY - startY;
          const top = startTop + dy;
          updateAssistantTop(top);
        }

        function onMouseUp(e: MouseEvent) {
          isDraging = false;
          document.removeEventListener("mousemove", onMouseMove, true);
          document.removeEventListener("mouseup", onMouseUp, true);
        }
        document.addEventListener("mousemove", onMouseMove, true);
        document.addEventListener("mouseup", onMouseUp, true);
      });
    }
    const picking = ref(false);

    const keydownFunc = (e: KeyboardEvent) => {
      const { shortKeyPick, shortKeyGameFresh, shortKeyGameStep, shortKeyGamePauseResume } = config.value;
      switch (e.code) {
        case shortKeyPick: {
          if (picking.value === false) {
            doInspector();
          }
          break;
        }
        case shortKeyGameStep: {
          cc.game.step();
          break;
        }
        case shortKeyGamePauseResume: {
          if (cc.game.isPaused()) {
            cc.game.resume();
          } else {
            cc.game.pause();
          }
          showGameTip.value = !!cc.game.isPaused();
          break;
        }
        case shortKeyGameFresh: {
          freshEditor();
          break;
        }
      }
    };
    /**是否显示游戏暂停的提示 */
    const showGameTip = ref(false);
    function registerShortKey() {
      if (picking.value === false) {
        document.addEventListener("keydown", keydownFunc, true);
      }
    }
    function unregisterShortKey() {
      document.removeEventListener("keydown", keydownFunc, true);
    }
    registerShortKey();

    const rootEl = ref<HTMLDivElement>(null);
    const showBtns = ref(true);
    if (config.value.autoHide) {
      showBtns.value = false;
    }
    let autoHideTimer = null;
    let isDraging = false;
    const elIcon = ref<HTMLDivElement>(null);
    return {
      elIcon,
      showGameTip,
      showBtns,
      listArray,
      rootEl,
      picking,
      onClickTip() {
        showGameTip.value = false;
      },
      getTitle(item: ListItem) {
        if (typeof item.txt === "function") {
          return item.txt();
        } else {
          return item.txt;
        }
      },
      onMouseEnterCocosLogo() {
        clearTimeout(autoHideTimer);
        showBtns.value = true;
      },
      onCocosLogoClick() {
        showBtns.value = !showBtns.value;
      },
      onContextMenuRoot(event: MouseEvent) {
        const arr: IUiMenuItem[] = [
          {
            name: "auto hide",
            selected: config.value.autoHide,
            callback: (item) => {
              config.value.autoHide = !config.value.autoHide;
              appStore().save();
              sendGaEvent(GA_EventName.MouseMenu, item.name);
              if (!config.value.autoHide) {
                clearTimeout(autoHideTimer);
                showBtns.value = true;
              }
            },
          },
        ];
        ccui.menu.showMenuByMouseEvent(event, arr);
      },
      onMouseLeaveRoot(event: MouseEvent) {
        if (isDraging) {
          return;
        }
        if (!config.value.autoHide) {
          return;
        }
        autoHideTimer = setTimeout(() => {
          showBtns.value = false;
        }, 500);
      },
      onMouseDown(event: MouseEvent) {},
    };
  },
});
</script>

<style scoped lang="less">
@x: 1px;
@r: 8deg;
@keyframes color-change {
  0% {
    color: #f00;
    transform: rotate(0) translateX(0px);
  }
  20% {
    transform: rotate(-@r) translateX(-@x);
  }
  40% {
    transform: rotate(@r) translateX(@x);
  }
  50% {
    color: #0f0;
  }
  60% {
    transform: rotate(-@r) translateX(-@x);
  }
  80% {
    transform: rotate(@r) translateX(@x);
  }
  100% {
    color: #f00;
    transform: rotate(0) translateX(0px);
  }
}
@keyframes colorChange {
  0% {
    background-color: red;
    color: white;
  }
  40% {
    background-color: rgb(0, 0, 255);
    color: yellow;
  }
  60% {
    background-color: rgb(180, 31, 255);
    color: rgb(0, 255, 64);
  }
  100% {
    background-color: rgb(0, 248, 91);
    color: rgb(255, 0, 0);
  }
}
.game-tip {
  position: absolute;
  pointer-events: none;
  right: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  .text {
    background-color: red;
    border-radius: 4px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    padding: 0 10px;
    color: white;
    font-size: 14px;
    font-weight: bold;
    animation: colorChange 3s infinite;
  }
}
.ad {
  position: fixed;
  box-shadow: 0px 0px 6px 1px rgb(255, 255, 255);
  //z-index: 99999;
  top: 0px;
  right: 0px;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  // overflow: hidden;
  .title {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 14px;
    user-select: none;
    background-color: rgb(0, 0, 0);
    border: 1px solid black;
    color: white;
    padding: 2px 4px;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;

    .btns {
      color: white;
      display: flex;
      flex-direction: row;
      .list {
        display: flex;
        flex-direction: row;
        align-items: center;
        color: white;
        user-select: none;
        &:hover {
          color: rgb(101, 163, 249);
        }
        &:active {
          color: rgb(255, 187, 0);
        }
        .icon {
          font-size: 20px;
        }
        .ani_shop_cart {
          animation: color-change 2s infinite;
        }
      }
    }
    .cocos {
      cursor: move;
      font-size: 20px;
      color: rgb(85, 192, 224);
    }
  }
}
</style>
