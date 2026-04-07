<template>
  <div class="left">
    <CCDock name="Hierarchy">
      <template v-slot:tab-name-before> </template>
      <template v-slot:title>
        <Refresh @click="onClickRefresh" :type="rotateType"></Refresh>
        <div class="engine-version" v-if="engineVersion">Cocos Creator V{{ engineVersion }}</div>
      </template>
      <CCInput style="flex: none" placeholder="enter keywords to filter" :data="filterText" v-if="false">
        <slot>
          <i class="matchCase iconfont icon_font_size" @click.stop="onChangeCase" title="match case" :style="{ color: matchCase ? 'red' : '' }"></i>
        </slot>
      </CCInput>
      <CCTree :show-icon="config.showTreeIcon"
       @do-search="doSearch" :search="true"
       @node-menu="onMenu"
       @click-subfix="onClickSubfix"
       @contextmenu.prevent.stop="onMenu" style="flex: 1" ref="elTree" :expand-keys="expandedKeys" :default-expand-all="false" :value="treeData"
       @node-expand="onNodeExpand"
       @node-collapse="onNodeCollapse"
       @node-click="handleNodeClick"
       @node-unclick="handleNodeUnclick"
       @node-enter="handleNodeEnter"
       @node-leave="handleNodeLeave" :draggable="true"
       @node-drop="handleNodeDrop"></CCTree>
    </CCDock>
  </div>
</template>
<script lang="ts">
import ccui from "@xuyanfeng/cc-ui";
import { IUiMenuItem } from "@xuyanfeng/cc-ui/types/cc-menu/const";
import { HandExpandOptions } from "@xuyanfeng/cc-ui/types/cc-tree/const";
import Mousetrap, { MousetrapInstance } from "mousetrap";
import { storeToRefs } from "pinia";
import { defineComponent, nextTick, onMounted, onUnmounted, ref, toRaw, watch } from "vue";
import { BreakOnType, Msg, PluginEvent, RequestBreakOnData, RequestOpenNodeTouchFuntionData, RequestOpenScriptData, RequestTreeInfoData, RequestUseFrameData, ResponseSetPropertyData, ResponseSupportData } from "../../core/types";
import { ga } from "../../ga";
import { GA_EventName } from "../../ga/type";
import { ShowCode } from "../../scripts/inject/types";
import { bridge } from "./bridge";
import { Bus, BusMsg } from "./bus";
import { RotateType } from "./const";
import { EngineData, FunctionInfo, TreeData } from "./data";
import GameInfo from "./game-info.vue";
import Refresh from "./refresh.vue";
import { appStore } from "./store";
import { Timer } from "./timer";
import { execInspect } from "./util";
const { CCTree, CCFootBar, CCDock, CCDialog, CCInput, CCButton, CCInputNumber, CCSelect, CCButtonGroup, CCCheckBox, CCColor, CCDivider } = ccui.components;
export default defineComponent({
  name: "hierarchy",
  components: { Refresh, CCButtonGroup, CCInput, CCTree, CCDock },
  setup() {
    const funcShowPlace = (data: EngineData) => {
      console.log(data);
      const uuid = data.engineNode;
      nextTick(() => {
        if (elTree.value) {
          elTree.value.handExpand(uuid, { highlight: true, scroll: true } as HandExpandOptions);
        }
      });
    };
    const funcEnableSchedule = (b: boolean) => {
      if (b) {
        timer.create();
      } else {
        timer.clean();
      }
    };
    const timer: Timer = new Timer();
    timer.onWork = () => {
      rotateType.value = RotateType.Loop;
      config.value.refreshHirarchy = true;
      appStore().save();
      updateTree();
    };
    timer.onClean = () => {
      rotateType.value = RotateType.None;
      config.value.refreshHirarchy = false;
      appStore().save();
    };
    timer.name = "hierarchy";
    let ins: MousetrapInstance | null = null;
    function onQuickVisible() {
      ga.fireEvent(GA_EventName.SpaceVisible);
      console.log("onQuickVisible");
      if (selectedUUID) {
        bridge.send(Msg.RequestVisible, selectedUUID);
      }
    }
    function changeContent(data: RequestUseFrameData) {
      treeData.value = [];
      selectedUUID = null;
    }
    function onInspectNode(data: PluginEvent) {
      const uuid = data.data as string;
      if (!uuid) {
        return;
      }
      updateSelect(uuid);
      nextTick(() => {
        if (elTree.value) {
          elTree.value.handExpand(uuid, { highlight: true, select: true, scroll: true } as HandExpandOptions);
        }
      });
    }
    onMounted(() => {
      if (elTree.value) {
        const el = toRaw(elTree.value);
        ins = new Mousetrap(el.treeElement);
        ins.bind(["space"], onQuickVisible, "keydown");
      }
      Bus.on(BusMsg.ChangeContent, changeContent);
      Bus.on(BusMsg.ShowPlace, funcShowPlace);
      Bus.on(BusMsg.EnableSchedule, funcEnableSchedule);
      bridge.on(Msg.InspectNode, onInspectNode);
      if (config.value.refreshHirarchy) {
        timer.create(true);
      } else {
        updateTree();
      }
    });
    onUnmounted(() => {
      if (ins) {
        ins.unbind(["space"], "keydown");
      }
      Bus.off(BusMsg.ChangeContent, changeContent);
      Bus.off(BusMsg.ShowPlace, funcShowPlace);
      Bus.off(BusMsg.EnableSchedule, funcEnableSchedule);
      bridge.off(Msg.InspectNode, onInspectNode);
      timer.destroy();
    });
    function updateTree() {
      // console.log("update tree info");
      const id = toRaw(frameID.value);
      bridge.send(Msg.RequstTreeInfo, { frameID: id } as RequestTreeInfoData);
    }

    function updateFilterText(val: any) {
      (elTree.value as any)?.filter(val);
    }
    const filterText = ref<string>("");
    watch(filterText, (val) => {
      // TODO: 过滤树
      updateFilterText(val);
    });
    const { config, frameID } = storeToRefs(appStore());
    const matchCase = ref<boolean>(false);
    const elTree = ref<typeof CCTree>(null);
    const treeData = ref<TreeData[]>([]);
    let selectedUUID: string | null = null;
    const engineVersion = ref("");
    bridge.on(Msg.ResponseSupport, (event: PluginEvent) => {
      let data: ResponseSupportData = event.data;
      const isCocosGame: boolean = data.support;
      if (isCocosGame) {
        engineVersion.value = data.version;
      } else {
        engineVersion.value = "";
      }
    });
    bridge.on(Msg.ResponseTreeInfo, (event: PluginEvent) => {
      let data: Array<TreeData> = event.data;
      if (!Array.isArray(data)) {
        data = [data];
      }
      treeData.value = data;
      nextTick(() => {
        if (elTree.value) {
          elTree.value.handChoose(selectedUUID);
        }
      });
    });

    bridge.on(Msg.ResponseSetProperty, (event: PluginEvent) => {
      let data: ResponseSetPropertyData = event.data;
      const uuid = data.path[0];
      const key = data.path[1];
      const value = data.data;
      let treeArray: Array<TreeData> = [];

      function circle(array: Array<TreeData>) {
        array.forEach((item) => {
          treeArray.push(item);
          circle(item.children);
        });
      }

      // 更新指定uuid节点的tree的name
      circle(treeData.value);
      let ret = treeArray.find((el) => el.id === uuid);
      if (ret) {
        if (key === "name") {
          ret.text = value;
        }
        if (key === "active") {
          ret.active = !!value;
        }
      }
    });
    const expandedKeys = ref<Array<string>>([]);
    function updateSelect(uuid: string | null) {
      selectedUUID = uuid;
      Bus.emit(BusMsg.SelectNode, uuid);
      if (config.value.clickInspect) {
        bridge.send(Msg.SelectNode, uuid);
      }
    }
    const rotateType = ref<RotateType>(RotateType.None);
    if (config.value.refreshHirarchy) {
      rotateType.value = RotateType.Loop;
    }
    let preSearch = "";
    return {
      config,
      doSearch(v: string) {
        if (v && preSearch !== v) {
          ga.fireEventWithParam(GA_EventName.TreeSearch, v);
          preSearch = v;
        }
      },
      onClickRefresh() {
        updateTree();
      },
      rotateType,
      engineVersion,
      expandedKeys,
      elTree,
      filterText,
      treeData,
      matchCase,
      frameID,
      handleNodeUnclick() {
        updateSelect(null);
      },
      handleNodeDrop(dragNode: TreeData, targetNode: TreeData) {
        if (dragNode && targetNode && dragNode.id !== targetNode.id) {
          bridge.send(Msg.RequestMoveNode, {
            uuid: dragNode.id,
            targetUUID: targetNode.id,
          } as RequestMoveNodeData);
        }
      },
      handleNodeEnter(data: TreeData | null) {
        if (!config.value.hoverInspect) {
          return;
        }
        if (data) {
          bridge.send(Msg.HoverNode, data.id);
        }
      },
      handleNodeLeave(data: TreeData | null) {
        if (data) {
          bridge.send(Msg.HoverNode, null);
        }
      },
      handleNodeClick(data: TreeData | null) {
        if (data) {
          updateSelect(data.id);
        } else {
          updateSelect(null);
        }
      },

      onNodeExpand(data: TreeData) {
        if (data.id) {
          expandedKeys.value.push(data.id);
          ga.fireEventWithParam(GA_EventName.Hierarchy, "node expand");
        }
      },
      onNodeCollapse(data: TreeData) {
        if (data.id) {
          ga.fireEventWithParam(GA_EventName.Hierarchy, "node collapse");
          const keys = toRaw(expandedKeys.value);
          const index = keys.findIndex((el) => el === data.id);
          if (index !== -1) {
            keys.splice(index, 1);
          }
          expandedKeys.value = keys;
        }
      },
      // TODO: 暂时这个版本先不实现
      filterNode(value: any, data: any) {
        if (!value) {
          return true;
        } else {
          if (matchCase) {
            // 严格匹配大写
            return data?.name?.indexOf(value) !== -1;
          } else {
            return data?.name?.toLowerCase().indexOf(value.toLowerCase()) !== -1;
          }
        }
      },
      onClickSubfix(event: MouseEvent, data: TreeData) {
        function inspectScript(scriptName: string) {
          bridge.send(Msg.RequestOpenScript, { uuid: data.id, script: scriptName } as RequestOpenScriptData);
          execInspect();
        }
        if (data.subfixIconTip) {
          const arr = data.subfixIconTip.split("\n");
          const multiple = [...new Set(arr)];
          if (multiple.length >= 2) {
            const menus: IUiMenuItem[] = [];
            for (let i = 0; i < multiple.length; i++) {
              const item = multiple[i];
              menus.push({
                name: item,
                callback: (item) => {
                  console.log(item.name);
                  inspectScript(item.name);
                },
              });
            }
            ccui.menu.showMenuByMouseEvent(event, menus);
          } else {
            inspectScript(multiple[0]);
          }
        }
      },
      onMenu(event: MouseEvent, data: TreeData) {
        const menus: IUiMenuItem[] = [];
        // 现在只有prefab才会有颜色，暂时可以这么判断
        if (data && data.color) {
          menus.push({
            name: "open",
            icon: "cocos",
            callback: (item) => {
              ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
              bridge.send(Msg.RequestOpenInCocos, data.id);
            },
          });
          menus.push({ type: ccui.menu.MenuType.Separator });
        }
        if (data) {
          function doInspect(type: ShowCode, index: number) {
            bridge.send(Msg.RequestOpenNodeTouchFuntion, { uuid: data.id, code: type, index } as RequestOpenNodeTouchFuntionData);
            execInspect();
          }
          function hintCode(type: ShowCode, cbArray: FunctionInfo[], event: MouseEvent) {
            if (cbArray.length === 1) {
              doInspect(type, 0);
            } else {
              const subMenu: IUiMenuItem[] = [];
              for (let i = 0; i < cbArray.length; i++) {
                const item = cbArray[i];
                subMenu.push({
                  name: item.name,
                  tip: item.desc,
                  callback: (item) => {
                    doInspect(type, i);
                  },
                });
              }
              nextTick(() => {
                ccui.menu.showMenuByMouseEvent(event, subMenu);
              });
            }
          }

          let hasCallback = false;
          function codeMenu(info: FunctionInfo[], type: ShowCode) {
            if (info.length) {
              hasCallback = true;
            }
            menus.push({
              name: `code ${type} [${info.length}]`,
              visible: !!info.length,
              tip: info.length === 1 ? info[0].desc : "",
              callback: (item, event: MouseEvent) => {
                ga.fireEventWithParam(GA_EventName.MouseMenu, type);
                hintCode(type, info, event);
              },
            });
          }
          codeMenu(data.codeButtonClick, ShowCode.ButtonClick);
          codeMenu(data.codeButtonEvents, ShowCode.ButtonClickEvents);
          codeMenu(data.codeTouchStart, ShowCode.TouchStart);
          codeMenu(data.codeTouchMove, ShowCode.TouchMove);
          codeMenu(data.codeTouchEnd, ShowCode.TouchEnd);
          codeMenu(data.codeTouchCancel, ShowCode.TouchCancel);
          if (hasCallback) {
            menus.push({ type: ccui.menu.MenuType.Separator });
          }
        }

        menus.push({
          name: "update hierarchy",
          icon: "tree",
          enabled: true,
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            updateTree();
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        menus.push({
          name: "fresh auto",
          icon: "refresh_one",
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            timer.create(true);
          },
        });
        menus.push({
          name: "fresh manual",
          icon: "refresh_one",
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            timer.clean();
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        menus.push({
          name: "fps show",
          icon: "fps",
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            bridge.send(Msg.VisibleFPS, true);
          },
        });

        menus.push({
          name: "fps hide",
          icon: "fps",
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            bridge.send(Msg.VisibleFPS, false);
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        if (engineVersion.value.startsWith("3.x") && false) {
          menus.push({
            name: "add UIOpacity",
            callback(item) {
              ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
              bridge.send(Msg.AddOpactiy, data.id);
            },
          });
          menus.push({ type: ccui.menu.MenuType.Separator });
        }
        menus.push({
          name: "game info",
          callback(item) {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            ccui.dialog.showDialog({
              comp: GameInfo,
              title: "Game Info",
            });
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        menus.push({
          name: "tree icon",
          selected: config.value.showTreeIcon,
          callback(item) {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            config.value.showTreeIcon = !config.value.showTreeIcon;
            appStore().save();
          },
        });
        menus.push({ type: ccui.menu.MenuType.Separator });
        menus.push({
          name: "hover inspect",
          selected: config.value.hoverInspect,
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            config.value.hoverInspect = !config.value.hoverInspect;
            appStore().save();
          },
        });
        menus.push({
          name: "click inspect",
          selected: config.value.clickInspect,
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            config.value.clickInspect = !config.value.clickInspect;
            appStore().save();
          },
        });
        if (data) {
          menus.push({ type: ccui.menu.MenuType.Separator });
          menus.push({
            name: "copy name",
            icon: "print",
            enabled: true,
            callback(item) {
              ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
              console.log(data.text);

              if (!data.text) {
                return;
              }
              navigator.clipboard
                .writeText(data.text)
                .then(() => {
                  ccui.footbar.showTips("copy success");
                })
                .catch((e) => {
                  console.log(e);
                  bridge.send(Msg.RequestLogCustom, data.text);
                  // bridge.send(Msg.ReqWriteClipboard, data.text);
                });
            },
          });
          menus.push({
            name: "visible",
            shortKey: "space",
            icon: "view_on",
            enabled: true,
            callback: (item) => {
              ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
              onQuickVisible();
            },
          });
          menus.push({
            name: "destroy",
            icon: "trash",
            enabled: true,
            callback: (item) => {
              ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
              bridge.send(Msg.RequestDestroy, data.id);
            },
          });
        }
        // 断点功能
        menus.push({ type: ccui.menu.MenuType.Separator });
        if (data) {
          const breakMenus: IUiMenuItem[] = [];
          const iconMap = {};
          iconMap[BreakOnType.ActiveChanged] = "view_on";
          iconMap[BreakOnType.ChildRemoved] = "node";
          iconMap[BreakOnType.ChildAdded] = "node";
          iconMap[BreakOnType.CompAdded] = "component";
          iconMap[BreakOnType.CompRemoved] = "component";
          iconMap[BreakOnType.ColorChanged] = "color";
          iconMap[BreakOnType.Destroyed] = "trash";
          iconMap[BreakOnType.LayerChanged] = "layer";
          iconMap[BreakOnType.ParentChanged] = "parent";
          iconMap[BreakOnType.SiblingOrderChanged] = "order";
          iconMap[BreakOnType.SizeChanged] = "size";
          iconMap[BreakOnType.TransformChanged] = "widget";
          for (let key in BreakOnType) {
            const v = BreakOnType[key];
            breakMenus.push({
              name: `${v}`,
              icon: iconMap[v] || "",
              enabled: true,
              callback: (item) => {
                ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
                bridge.send(Msg.RequestBreakOn, { uuid: data.id, type: v } as RequestBreakOnData);
              },
            });
          }
          menus.push({
            name: "break on",
            icon: "circle",
            enabled: true,
            items: breakMenus,
          });
        }
        menus.push({
          name: "break clean",
          icon: "break_off",
          enabled: true,
          callback: (item) => {
            ga.fireEventWithParam(GA_EventName.MouseMenu, item.name);
            bridge.send(Msg.RequestBreakClean);
          },
        });
        ccui.menu.showMenuByMouseEvent(event, menus);
      },
      onChangeCase() {
        matchCase.value = !matchCase.value;
        updateFilterText(filterText);
      },
    };
  },
});
</script>
<style lang="less" scoped>
.left {
  display: flex;
  flex-direction: column;
  min-width: 200px;
  width: 300px;
  .engine-version {
    flex: 1;
    text-align: right;
    padding-right: 5px;
    font-size: 10px;
    user-select: none;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  .matchCase {
    width: 30px;
    height: 26px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
}
</style>
