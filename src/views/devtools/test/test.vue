<template>
  <div v-if="show" class="test">
    <CCSection name="功能测试" :expand="config.expandTest" @change="onExpandTest">
      <div>
        <CCProp name="tree" align="left">
          <CCButton @click="onTestTree1">tree1</CCButton>
          <CCButton @click="onTestTree2">tree2</CCButton>
          <CCButton @click="onTestNodeInfo">test node info</CCButton>
        </CCProp>
        <CCProp name="test" align="left">
          <CCButton @click="onFrames">test frame</CCButton>
          <CCButton @click="onNull">test null</CCButton>
          <CCButton @click="onTerminal">terminal</CCButton>
        </CCProp>
        <CCProp name="cocos game" align="left">
          <CCCheckBox :value="true" @change="onChangeCocosGame"></CCCheckBox>
        </CCProp>
        <CCProp name="timer" align="left">
          <CCCheckBox :value="true" @change="onChangeTimer"></CCCheckBox>
        </CCProp>
      </div>
    </CCSection>
  </div>
</template>
<script lang="ts">
import ccui from "@xuyanfeng/cc-ui";
import { storeToRefs } from "pinia";
import { defineComponent, ref } from "vue";
import { debugLog, Msg, Page, PluginEvent, ResponseUpdateFramesData } from "../../../core/types";
import { Terminal } from "../../../scripts/terminal";
import { bridge } from "../bridge";
import { Bus, BusMsg } from "../bus";
import { FrameDetails, Group, InvalidData, NodeInfoData, TreeData } from "../data";
import { appStore } from "../store";
import { testServer } from "./server";
const { CCButton, CCSection, CCCheckBox, CCProp } = ccui.components;
export default defineComponent({
  name: "test",
  components: { CCButton, CCSection, CCCheckBox, CCProp },
  emits: ["validGame"],
  props: {
    isCocosGame: { type: Boolean, default: false },
  },
  setup(props, { emit }) {
    const { config } = storeToRefs(appStore());
    // 仅在web环境显示
    const show = ref(__DEV__);
    // 测试发送的是纯数据
    const testData = {
      uuid: "d1NHXHs35F1rbFJZKeigkl",
      group: [
        {
          id: "d1NHXHs35F1rbFJZKeigkl",
          name: "cc.Scene",
          data: [
            {
              name: "position",
              value: {
                id: "b9068b6f-8c1c-4d88-ac52-52cc09b37c1c",
                type: "Vec3",
                readonly: false,
                path: [],
                data: [
                  { name: "x", value: { id: "be42ab63-d767-466e-8ba4-fb1b21201c54", type: "Number", readonly: false, path: ["d1NHXHs35F1rbFJZKeigkl", "x"], data: 0 } },
                  { name: "y", value: { id: "498db9b2-e4a5-4c91-a546-1c3233e9bb50", type: "Number", readonly: false, path: ["d1NHXHs35F1rbFJZKeigkl", "y"], data: 0 } },
                  { name: "z", value: { id: "400e184f-d754-4b66-aeb9-9f1feb1136a3", type: "Number", readonly: false, path: ["d1NHXHs35F1rbFJZKeigkl", "z"], data: 0 } },
                ],
              },
            },
          ],
        },
      ],
    };
    return {
      config,
      show,
      onExpandTest(v: boolean) {
        console.log(v);
        config.value.expandTest = v;
        appStore().save();
      },

      onChangeCocosGame(b: boolean) {
        testServer.support = b;
      },
      onChangeTimer(b: boolean) {
        Bus.emit(BusMsg.EnableSchedule, b);
      },
      onTerminal() {
        const t = new Terminal("flag");
        const event = new PluginEvent(Page.Background, Page.Background, Msg.ResponseTreeInfo, "");
        debugLog && console.log(...t.message("1"));
        debugLog && console.log(...t.log("newline", true));
        debugLog && console.log(...t.log("oneline", false));
        debugLog && console.log(...t.disconnect("disconnect"));
        debugLog && console.log(...t.connect("connect"));
        debugLog && console.log(...t.red("red"));
        debugLog && console.log(...t.green("green"));
        debugLog && console.log(...t.blue("blue"));
        debugLog && console.log(...t.chunkMessage(event.toChunk()));
      },
      onTestTree1() {
        const data: TreeData = {
          id: "11",
          color: "#ffffffff",
          icon: "icon_node",
          text: "11",
          active: true,
          children: [{ id: "22", text: "22", active: true, color: "#ffffffff", icon: "icon_node", children: [] }],
        };
        const event = new PluginEvent(Page.Inject, Page.Devtools, Msg.ResponseTreeInfo, data);
        bridge.emit(event);
      },
      onTestTree2() {
        const data: TreeData = {
          id: "1",
          text: "1",
          color: "#ffffffff",
          icon: "icon_node",
          active: true,
          children: [
            {
              id: "2",
              text: "2",
              color: "#ffffffff",
              icon: "icon_node",
              active: true,
              children: [{ id: "3", text: "3", active: true, color: "#ffffffff", icon: "icon_node", children: [] }],
            },
            { id: "4", text: "4", active: true, color: "#ffffffff", icon: "icon_node", children: [] },
          ],
        };
        const event = new PluginEvent(Page.Inject, Page.Devtools, Msg.ResponseTreeInfo, data);
        bridge.emit(event);
      },
      onFrames() {
        const data: FrameDetails[] = [
          { url: "url1", tabID: 1, frameID: 1 },
          { url: "url2", tabID: 1, frameID: 2 },
        ];
        const event = new PluginEvent(Page.Background, Page.Devtools, Msg.ResponseUpdateFrames, data as ResponseUpdateFramesData);
        testServer.send(event);
      },
      onTestNodeInfo() {
        const event = new PluginEvent(Page.Background, Page.Devtools, Msg.ResponseTreeInfo, testData);
        testServer.send(event);
      },
      onNull() {
        const data = new NodeInfoData("", [new Group("", "1").buildProperty("dependAssets", new InvalidData("Null"))]);
        const event = new PluginEvent(Page.Background, Page.Devtools, Msg.ResponseTreeInfo, data);
        testServer.send(event);
      },
    };
  },
});
</script>
<style scoped lang="less">
.test {
  color: rgb(192, 56, 56);
  font-size: 11%;
}
</style>
