import { debugLog, Msg, Page, PluginEvent, RequestUseFrameData } from "../../core/types";
import { Terminal } from "../terminal";
import { TabInfo } from "./tabInfo";

export class Devtools {
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
  public tabInfo: TabInfo | null = null;
  constructor(port: chrome.runtime.Port, tabInfo: TabInfo) {
    this.tabInfo = tabInfo;
    this.port = port;
    this.name = port.name;
    this.url = port.sender.url;
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
        debugger;
      }
      debugLog && console.log(...this.terminal.disconnect(""));
      this.onDisconnect(port);
    });
  }
  public onDisconnect(port: chrome.runtime.Port) {
    this.tabInfo.removeDevtools(this);
  }
  public onMessage(data: PluginEvent) {
    if (data.msg === Msg.RequestUseFrame) {
      // 因为devtool是定时器驱动，这里改变了content，后续就会将数据派发到对应的content中去
      this.tabInfo.useFrame((data.data as RequestUseFrameData).id);
    } else if (data.msg === Msg.RequestDisconnectDevtools) {
      if (this.port) {
        this.port.disconnect();
        this.tabInfo.devtool = null;
      }
    } else if (data.msg === Msg.RequestSyncNode) {
      // 转发同步请求到内容脚本以收集最新数据
      data.reset(Page.Background, Page.Content);
      this.tabInfo.sendMsgToContent(data);
    } else {
      // 从devtools过来的消息统一派发到目标content中
      if (data.check(Page.Devtools, Page.Background)) {
        data.reset(Page.Background, Page.Content);
        this.tabInfo.sendMsgToContent(data);
      }
    }
  }
  send(data: PluginEvent) {
    if (this.port) {
      this.port.postMessage(data);
    }
  }
}
