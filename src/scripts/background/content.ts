import { debugLog, Msg, Page, PluginEvent } from "../../core/types";
import { FrameDetails } from "../../views/devtools/data";
import { Terminal } from "../terminal";
import { TabInfo } from "./tabInfo";

export class Content {
  public frameID: number = 0;
  /**
   * port的名字标识
   */
  public name: string = Page.None;
  /**
   * tab.id作为唯一标识
   */
  public tabID: number | null = null;
  public title: string = "";
  public url: string = "";
  protected port: chrome.runtime.Port | null = null;
  public tab: chrome.tabs.Tab | null = null;
  public terminal: Terminal = null;
  /**
   * 是否正在使用
   */
  public using: boolean = false;
  private tabInfo: TabInfo | null = null;
  constructor(tab: chrome.tabs.Tab, port: chrome.runtime.Port, tabInfo: TabInfo) {
    this.tabInfo = tabInfo;
    this.port = port;
    this.tab = tab;
    this.name = port.name;
    this.tabID = tab.id;
    this.url = port.sender.url;
    this.title = tab.title;
    this.terminal = new Terminal(`Port-${this.name}`);
    port.onMessage.addListener((data: any, port: chrome.runtime.Port) => {
      const event = PluginEvent.create(data);
      debugLog && console.log(...this.terminal.chunkMessage(event.toChunk()));
      if (event.valid && this.onMessage) {
        this.onMessage(event);
      } else {
        debugLog && console.log(...this.terminal.log(JSON.stringify(data)));
      }
    });
    port.onDisconnect.addListener((port: chrome.runtime.Port) => {
      const ret = ["localhost", "127.0.0.1"].find((el) => port.sender.url.includes(el));
      if (ret) {
        console.log("local port disconnect");
        // debugger;
      }
      debugLog && console.log(...this.terminal.disconnect(""));
      this.onDisconnect(port);
    });
    this.frameID = port.sender.frameId || 0;
  }
  getFrameDetais(): FrameDetails {
    return {
      tabID: this.tabID,
      url: this.url,
      frameID: this.frameID,
    };
  }
  private onDisconnect(disPort: chrome.runtime.Port) {
    this.tabInfo.removePort(this);
  }

  public onMessage(data: PluginEvent) {
    // content的数据一般都是要同步到devtools
    if (data.isTargetDevtools()) {
      if (data.msg === Msg.ResponseSyncNode) {
        this.handleSyncToEditor(data.data);
        return;
      }
      if (this.tabInfo.devtool) {
        this.tabInfo.devtool.send(data);
      } else {
        debugger;
      }
    } else {
      debugger;
    }
  }

  private async handleSyncToEditor(syncData: any) {
    const mcpCall = async (name: string, args: any = {}) => {
      const body = { jsonrpc: "2.0", method: "tools/call", params: { name, arguments: args }, id: Date.now() };
      const res = await fetch("http://localhost:3000/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json && json.error) {
        throw new Error(json.error.message || "mcp error");
      }
      return json.result;
    };
    try {
      const sceneRes = await mcpCall("scene_get_scene_hierarchy", { includeComponents: false });
      const scene = sceneRes?.data || sceneRes;
      const findChildByName = (parent: any, name: string) => {
        const arr = parent?.children || [];
        for (let i = 0; i < arr.length; i++) {
          if (arr[i]?.name === name) return arr[i];
        }
        return null;
      };
      let current = scene;
      const pathArr: string[] = Array.isArray(syncData?.path) ? syncData.path : [];
      for (let i = 0; i < pathArr.length; i++) {
        const name = pathArr[i];
        let next = findChildByName(current, name);
        if (!next) {
          const createRes = await mcpCall("node_create_node", { parentUuid: current.uuid, name });
          const newUuid = createRes?.uuid || createRes?.data?.uuid;
          next = { uuid: newUuid, name, children: [] };
          const ch = current.children || [];
          ch.push(next);
          current.children = ch;
        }
        current = next;
      }
      let target = findChildByName(current, syncData?.name);
      if (!target) {
        const createTargetRes = await mcpCall("node_create_node", { parentUuid: current.uuid, name: syncData?.name });
        const newUuid = createTargetRes?.uuid || createTargetRes?.data?.uuid;
        target = { uuid: newUuid, name: syncData?.name, children: [] };
      }
      const nodeUuid = target.uuid;
      let compsRes: any = null;
      try {
        compsRes = await mcpCall("component_get_components", { nodeUuid });
      } catch (_) {}
      const existing = (compsRes?.components || compsRes?.data || compsRes || []) as any[];
      const components: any[] = Array.isArray(syncData?.components) ? syncData.components : [];
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const exists = existing.find((c: any) => c?.name === comp?.name || c?.type === comp?.name || c?.displayName === comp?.name);
        if (!exists) {
          let added = false;
          try {
            await mcpCall("component_add_component", { nodeUuid, componentType: comp?.name });
            added = true;
          } catch (_) {
            try {
              const avail = await mcpCall("component_get_available_components", {});
              const list = avail?.components || avail || [];
              const found = list.find((x: any) => x?.name === comp?.name) || list.find((x: any) => x?.displayName === comp?.name) || list.find((x: any) => x?.type === comp?.name);
              if (found) {
                await mcpCall("component_add_component", { nodeUuid, componentType: found?.type || found?.cid || found?.name });
                added = true;
              }
            } catch (_) {}
          }
          if (added) {
            try {
              await mcpCall("component_set_component_property", {
                nodeUuid,
                componentType: comp?.name,
                properties: comp?.props || {},
              });
            } catch (_) {}
          } else {
            try {
              await mcpCall("component_set_component_property", {
                nodeUuid,
                componentType: comp?.name,
                properties: comp?.props || {},
              });
            } catch (_) {}
          }
        } else {
          try {
            await mcpCall("component_set_component_property", {
              nodeUuid,
              componentType: comp?.name,
              properties: comp?.props || {},
            });
          } catch (_) {}
        }
      }
      try {
        await mcpCall("scene_save_scene", {});
      } catch (_) {}
      this.tabInfo.sendMsgToDevtool(Msg.ResponseSyncNode, { success: true });
    } catch (err) {
      this.tabInfo.sendMsgToDevtool(Msg.ResponseSyncNode, { success: false, error: (err as any).message || String(err) });
    }
  }

  send(data: PluginEvent) {
    if (this.port) {
      this.port.postMessage(data);
    }
  }
}
