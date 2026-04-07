import { Msg, Page, PluginEvent, ResponseUpdateFramesData, ResponseUseFrameData } from "../../core/types";
import { FrameDetails } from "../../views/devtools/data";
import { Content } from "./content";
import { Devtools } from "./devtools";

export class TabInfo {
  /**
   * 标签的ID
   */
  public tabID: number;
  constructor(tabID: number) {
    this.tabID = tabID;
  }
  /**
   * 因为iframe的原因，可能对应多个，主iframe的id是0
   */
  public contentArray: Array<Content> = [];
  addContent(tab: chrome.tabs.Tab, port: chrome.runtime.Port) {
    // 新的content连上来，需要更新devtools
    let portContent: Content = new Content(tab, port, this);
    this.contentArray.push(portContent);
    this.updateFrames();
    // 之前持有的链接会断开，content会重新发起链接，重新连上之后，如果只有一个人链接，需要设置using状态，否则devtools找不到content
    if (this.contentArray.length === 1) {
      const id = this.contentArray[0].frameID;
      this.useFrame(id);
    }
  }
  public removePort(item: Content) {
    let index = this.contentArray.findIndex((el) => el === item);
    if (index > -1) {
      this.contentArray.splice(index, 1);
      this.updateFrames();

      // 使用第一个frame
      if (this.contentArray.length) {
        const id = this.contentArray[0].frameID;
        this.useFrame(id);
      }
    }
  }
  public removeDevtools(item: Devtools) {
    this.devtool = null;
  }
  useFrame(id: number) {
    this.contentArray.map((content) => {
      content.using = content.frameID === id;
    });
    this.sendMsgToDevtool(Msg.ResponseUseFrame, { id } as ResponseUseFrameData);
  }
  /**
   * 通知devtools更新
   */
  private updateFrames() {
    const data: FrameDetails[] = [];
    this.contentArray.forEach((item) => {
      const frame = (item as Content).getFrameDetais();
      data.push(frame);
    });
    this.sendMsgToDevtool(Msg.ResponseUpdateFrames, data as ResponseUpdateFramesData);
  }
  public sendMsgToDevtool(msg: Msg, data: any) {
    if (this.devtool) {
      const event = new PluginEvent(Page.Background, Page.Devtools, msg, data);
      this.devtool.send(event);
    }
  }
  public sendMsgToContent(data: PluginEvent) {
    const content = this.contentArray.find((el) => el.using);
    if (content) {
      content.send(data);
    } else {
      // 当页面没有完成刷新状态时，conent并没有using，就会触发此处逻辑
      // 在页面完成刷新后，会主动设置为using
    }
  }
  public devtool: Devtools | null = null;
  addDevtools(port: chrome.runtime.Port) {
    if (this.devtool === null) {
      this.devtool = new Devtools(port, this);
    } else {
      debugger;
    }
  }
}
