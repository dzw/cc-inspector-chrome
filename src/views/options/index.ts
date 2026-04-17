import "@xuyanfeng/cc-ui/dist/ccui.css";
import "@xuyanfeng/cc-ui/iconfont/iconfont.css";
import CCP from "cc-plugin/src/ccp/entry-render";
import pluginConfig from "../../../cc-plugin.config";

export default CCP.init(pluginConfig, {
  ready: function (rootElement: any, args: any) {
    // const app = createApp(App);
    // app.use(ccui);
    // app.mount(rootElement);
  },
});
