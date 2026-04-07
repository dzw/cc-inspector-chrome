<template>
  <div class="right">
    <CCDock name="Inspector">
      <template v-slot:title>
        <Refresh :type="rotateType" @click="onClickRefresh"></Refresh>
      </template>
      <div class="inspector" @contextmenu.prevent.stop="onMenu">
        <Properties v-if="treeItemData" :data="treeItemData"></Properties>
      </div>
    </CCDock>
  </div>
</template>
<script lang="ts">
import ccui from "@xuyanfeng/cc-ui";
import { IUiMenuItem } from "@xuyanfeng/cc-ui/types/cc-menu/const";
import { storeToRefs } from "pinia";
import { defineComponent, onMounted, onUnmounted, ref } from "vue";
import { Msg, PluginEvent, RequestNodeInfoData, ResponseSupportData } from "../../core/types";
import { ga } from "../../ga";
import { GA_EventName } from "../../ga/type";
import { bridge } from "./bridge";
import { Bus, BusMsg } from "./bus";
import { RotateType } from "./const";
import { NodeInfoData } from "./data";
import Refresh from "./refresh.vue";
import { appStore } from "./store";
import { Timer } from "./timer";
import Properties from "./ui/propertys.vue";
const { CCDock } = ccui.components;
export default defineComponent({
  components: { Properties, CCDock, Refresh },
  setup() {
    function updateNodeInfo() {
      if (selectedUUID) {
        // console.log(`update node info: ${selectedUUID}`);
        bridge.send(Msg.RequestNodeInfo, { uuid: selectedUUID } as RequestNodeInfoData);
      } else {
        treeItemData.value = null;
      }
    }
    const { config } = storeToRefs(appStore());
    const timer = new Timer();
    timer.onWork = () => {
      rotateType.value = RotateType.Loop;
      config.value.refreshInspector = true;
      appStore().save();
      updateNodeInfo();
    };
    timer.onClean = () => {
      rotateType.value = RotateType.None;
      config.value.refreshInspector = false;
      appStore().save();
    };
    timer.name = "inspector";
    const treeItemData = ref<NodeInfoData | null>(null);
    const funcEnableSchedule = (b: boolean) => {
      if (b) {
        timer.create();
      } else {
        timer.clean();
      }
    };
    let selectedUUID: string | null = null;
    const funSelectNode = (uuid: string | null) => {
      selectedUUID = uuid;
      updateNodeInfo();
    };
    function changeContent() {
      selectedUUID = null;
      treeItemData.value = null;
    }

    onMounted(() => {
      Bus.on(BusMsg.ChangeContent, changeContent);
      Bus.on(BusMsg.SelectNode, funSelectNode);
      Bus.on(BusMsg.EnableSchedule, funcEnableSchedule);
      if (config.value.refreshInspector) {
        timer.create(true);
      } else {
        updateNodeInfo();
      }
    });
    onUnmounted(() => {
      Bus.off(BusMsg.ChangeContent, changeContent);
      Bus.off(BusMsg.SelectNode, funSelectNode);
      Bus.off(BusMsg.EnableSchedule, funcEnableSchedule);
      timer.destroy();
    });
    bridge.on(Msg.ResponseSupport, (event: PluginEvent) => {
      let data: ResponseSupportData = event.data;
      const isCocosGame: boolean = data.support;
      if (isCocosGame) {
      } else {
        treeItemData.value = null;
      }
    });
    let simpleProperties = true;
    bridge.on(Msg.ResponseNodeInfo, (event: PluginEvent) => {
      try {
        // 因为要用到class的一些属性，传递过来的是纯数据，所以需要重新序列化一下
        let eventData: NodeInfoData = event.data;
        const nodeInfo = new NodeInfoData(eventData.uuid, eventData.group).parse(eventData, simpleProperties);
        treeItemData.value = nodeInfo;
      } catch (error) {
        console.error(error);
        ccui.footbar.showError(error, { title: "parse property error" });
      }
    });
    bridge.on(Msg.ResponseSyncNode, (event: PluginEvent) => {
      const data = event.data;
      if (data.success) {
        ccui.footbar.showTips("Sync to editor success!");
      } else {
        ccui.footbar.showError(data.error || "Sync failed");
      }
    });
    const rotateType = ref<RotateType>(RotateType.None);
    if (config.value.refreshInspector) {
      rotateType.value = RotateType.Loop;
    }
    return {
      rotateType,
      treeItemData,
      onClickRefresh() {
        updateNodeInfo();
      },
      onMenu(evnet: MouseEvent) {
        const menus: IUiMenuItem[] = [];
        menus.push({
          name: "update node info",
          icon: "node",
          callback: (item) => {
            updateNodeInfo();
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        menus.push({
          name: "fresh auto",
          icon: "refresh_one",
          callback: (item) => {
            timer.create(true);
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
          },
        });
        menus.push({
          name: "fresh manual",
          icon: "refresh_one",
          callback: (item) => {
            timer.clean();
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        menus.push({
          name: simpleProperties ? "show more properties" : "show simple properties",
          icon: simpleProperties ? "many" : "one",
          callback: (item) => {
            simpleProperties = !simpleProperties;
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
          },
        });
        ccui.menu.showMenuByMouseEvent(evnet, menus);
      },
    };
  },
});
</script>
<style lang="less" scoped>
.right {
  flex: 1;
  display: flex;
  overflow-x: hidden;
  overflow-y: overlay;

  .inspector {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }
}
</style>
