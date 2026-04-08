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

  // 场景缓存
  private sceneCache: any = null;
  private sceneCacheTime: number = 0;
  
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
    
    // 递归查找子节点
    const findChildInTree = (root: any, name: string): any => {
      if (!root) return null;
      if (root.name === name) return root;
      const children = root?.children || [];
      for (let i = 0; i < children.length; i++) {
        const found = findChildInTree(children[i], name);
        if (found) return found;
      }
      return null;
    };
    
    // 在指定父节点下直接查找子节点
    const findDirectChild = (parent: any, name: string): any => {
      const children = parent?.children || [];
      return children.find((c: any) => c?.name === name) || null;
    };
    
    try {
      // Step 1: 获取场景层次结构（使用缓存或重新获取）
      const now = Date.now();
      if (!this.sceneCache || (now - this.sceneCacheTime > 5000)) {
        const sceneRes = await mcpCall("scene_get_scene_hierarchy", { includeComponents: false });
        this.sceneCache = sceneRes?.data || sceneRes;
        this.sceneCacheTime = now;
        console.log("[Sync] Scene cache updated, root:", this.sceneCache?.name, "uuid:", this.sceneCache?.uuid);
      }
      const scene = this.sceneCache;
      
      const pathArr: string[] = Array.isArray(syncData?.path) ? syncData.path : [];
      const targetName = syncData?.name;
      console.log("[Sync] Path:", pathArr, "Target:", targetName);
      
      // Step 2: 逐级查找/创建路径节点
      let parentUuid = scene?.uuid;
      let currentNode = scene;
      
      for (let i = 0; i < pathArr.length; i++) {
        const name = pathArr[i];
        let nextNode = findDirectChild(currentNode, name);
        
        if (!nextNode) {
          console.log(`[Sync] Creating path node: ${name}`);
          const createRes = await mcpCall("node_create_node", { parentUuid, name });
          const newUuid = createRes?.uuid || createRes?.data?.uuid;
          nextNode = { uuid: newUuid, name, children: [] };
          // 更新缓存
          if (!currentNode.children) currentNode.children = [];
          currentNode.children.push(nextNode);
        } else {
          console.log(`[Sync] Found path node: ${name} uuid: ${nextNode?.uuid}`);
        }
        
        parentUuid = nextNode.uuid;
        currentNode = nextNode;
      }
      
      // Step 3: 查找或创建目标节点
      let targetNode = findDirectChild(currentNode, targetName);
      if (!targetNode) {
        console.log(`[Sync] Creating target node: ${targetName}`);
        const createRes = await mcpCall("node_create_node", { parentUuid, name: targetName });
        const newUuid = createRes?.uuid || createRes?.data?.uuid;
        targetNode = { uuid: newUuid, name: targetName, children: [] };
        if (!currentNode.children) currentNode.children = [];
        currentNode.children.push(targetNode);
      } else {
        console.log(`[Sync] Found target node: ${targetName} uuid: ${targetNode?.uuid}`);
      }
      
      const targetUuid = targetNode.uuid;
      
      // Step 4: 同步 Transform (node_set_node_transform)
      if (syncData?.transform) {
        try {
          console.log("[Sync] Setting transform:", syncData.transform);
          await mcpCall("node_set_node_transform", {
            uuid: targetUuid,
            position: syncData.transform.position,
            rotation: syncData.transform.rotation,
            scale: syncData.transform.scale,
          });
        } catch (e) {
          console.log("[Sync] Failed to set transform:", e);
        }
      }
      
      // Step 5: 同步其他节点属性 (active/layer等)
      if (syncData?.nodeProps) {
        const props = syncData.nodeProps;
        for (const [key, value] of Object.entries(props)) {
          if (key === 'active' || key === 'layer') {
            try {
              await mcpCall("node_set_node_property", {
                uuid: targetUuid,
                property: key,
                value: value,
              });
            } catch (e) {
              console.log(`[Sync] Failed to set node property ${key}:`, e);
            }
          }
        }
      }
      
      // Step 6: 获取已有组件
      let compsRes: any = null;
      try {
        compsRes = await mcpCall("component_get_components", { nodeUuid: targetUuid });
      } catch (_) {}
      const existing = (compsRes?.components || compsRes?.data || compsRes || []) as any[];
      console.log("[Sync] Existing components:", existing.map(c => c?.type || c?.name));
      
      // Step 7: 比对并同步组件
      const components: any[] = Array.isArray(syncData?.components) ? syncData.components : [];
      
      // 找出需要添加的组件
      for (const comp of components) {
        const exists = existing.find((c: any) => 
          c?.type === comp?.name || c?.name === comp?.name
        );
        
        if (!exists) {
          console.log(`[Sync] Adding component: ${comp?.name}`);
          try {
            await mcpCall("component_add_component", { 
              nodeUuid: targetUuid, 
              componentType: comp?.name 
            });
            // 更新现有组件列表以便后续属性设置
            existing.push({ type: comp?.name, name: comp?.name });
          } catch (e) {
            console.log(`[Sync] Failed to add component ${comp?.name}:`, e);
          }
        }
      }
      
      // Step 8: 设置组件属性（逐个属性）
      for (const comp of components) {
        const existingComp = existing.find((c: any) => 
          c?.type === comp?.name || c?.name === comp?.name
        );
        const compType = existingComp?.type || comp?.name;
        
        if (comp?.props) {
          for (const [propName, propValue] of Object.entries(comp.props)) {
            try {
              console.log(`[Sync] Setting ${compType}.${propName}:`, propValue);
              await mcpCall("component_set_component_property", {
                nodeUuid: targetUuid,
                componentType: compType,
                property: propName,
                value: propValue,
              });
            } catch (e) {
              console.log(`[Sync] Failed to set ${compType}.${propName}:`, e);
            }
          }
        }
      }
      
      // Step 9: 保存场景
      try {
        await mcpCall("scene_save_scene", {});
        console.log("[Sync] Scene saved successfully");
      } catch (_) {}
      
      this.tabInfo.sendMsgToDevtool(Msg.ResponseSyncNode, { success: true });
    } catch (err) {
      console.error("[Sync] Error:", err);
      this.tabInfo.sendMsgToDevtool(Msg.ResponseSyncNode, { success: false, error: (err as any).message || String(err) });
    }
  }

  send(data: PluginEvent) {
    if (this.port) {
      this.port.postMessage(data);
    }
  }
}
