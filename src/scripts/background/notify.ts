import { gt } from "semver";
import PKG from "../../../cc-plugin.config";
import { ga } from "../../ga";
import { GA_EventName } from "../../ga/type";
import { githubMirrorMgr } from "../inject-view/github";
import { getAdData, NotifyButton } from "../inject-view/loader";

export const TipUpdate = "tip-update";
(async () => {
  interface ConfigItem {
    id: string;
    click?: Function;
    closed?: Function;
    title: string;
    message: string;
    /**
     * 检查是否可以创建通知
     * @returns 返回true，则会创建通知
     */
    check: (item: ConfigItem) => Promise<boolean>;
    buttons?: Array<{ title: string; click?: Function }>;
  }
  function goRate() {
    const url = PKG.manifest.chrome.url;
    if (url) {
      // chrome.windows.create({
      //   url: url,
      //   type: "normal",
      // });
      chrome.tabs.create({ url: url });
      ga.fireEventWithParam(GA_EventName.Rate, "go");
    }
  }
  const KeyHasRate = "has-rate";
  const config: ConfigItem[] = [
    {
      id: "rate",
      title: "Hi",
      message: "如果不是真爱，你也不会使用这么长时间，求五星好评！",
      click: () => {
        goRate();
      },
      closed: () => {
        console.log("closed");
      },
      check: async (cfg: ConfigItem) => {
        const result = await chrome.storage.local.get(KeyHasRate);
        if (result[KeyHasRate]) {
          // 已经评价过了
          return false;
        }
        const KeyInstallTime = "install-time";
        const KeyLatestShowTime = "latest-show-time";

        let res1 = await chrome.storage.local.get(KeyInstallTime);
        const time1 = res1[KeyInstallTime];
        if (!time1) {
          // 首次安装
          chrome.storage.local.set({ [KeyInstallTime]: new Date().getTime() });
          return false;
        }

        const diff = (new Date().getTime() - time1) / 1000;
        const afterInstall = 60 * 60 * 24 * 3; // 安装3天后
        if (diff <= afterInstall) {
          // 安装后一段时间不显示
          return false;
        }
        let canShow = false;
        const res = await chrome.storage.local.get(KeyLatestShowTime);
        const time = res[KeyLatestShowTime];
        if (time) {
          // 检查距离上次弹出是否超过指定时间
          const diff = (new Date().getTime() - time) / 1000;
          const afterLatestShow = 60 * 60 * 24 * 1; // 一天一次
          canShow = diff > afterLatestShow;
        } else {
          // 首次弹出
          canShow = true;
        }
        if (!canShow) {
          return false;
        }
        chrome.storage.local.set({ [KeyLatestShowTime]: new Date().getTime() });
        return true;
      },
      buttons: [
        {
          title: "我已评价",
          click: () => {
            chrome.storage.local.set({ [KeyHasRate]: true });
            ga.fireEventWithParam(GA_EventName.Rate, "has rate");
          },
        },
        {
          title: "前往评价",
          click: () => {
            goRate();
          },
        },
      ],
    },
  ];
  try {
    await githubMirrorMgr.init();
    // 版本检查
    const data = await githubMirrorMgr.getData("version.json");
    if (data) {
      const info = data as { ver: string };
      const b = gt(info.ver || "0.0.0", PKG.manifest.version);
      if (info.ver && b) {
        config.push({
          id: "update",
          title: `${PKG.manifest.name}发现新版本${info.ver || ""}`,
          message: `点击查看`,
          click: () => {
            goRate();
          },
          check: async () => {
            return true;
          },
        });
      }
    }
    // 广告分析
    const adData = await getAdData();
    if (adData && adData.notify.length) {
      adData.notify.forEach((el) => {
        const KeyIKnow = `i-know-${el.id}`;
        config.push({
          id: el.id,
          title: el.title,
          message: el.msg,
          buttons: el.buttons.map((btn) => {
            const map = {};
            map[NotifyButton.IKnow] = "我知道了";
            map[NotifyButton.Go] = "前往";
            return {
              title: map[btn],
              click: () => {
                if (btn === NotifyButton.Go) {
                  chrome.tabs.create({ url: el.url });
                } else if (btn === NotifyButton.IKnow) {
                  chrome.storage.local.set({ [`${KeyIKnow}`]: true });
                }
              },
            };
          }),
          click: () => {
            chrome.tabs.create({ url: el.url });
          },
          check: async () => {
            // 检查是否已经过期
            const now = new Date().getTime();
            if (el.deadTime && now > new Date(el.deadTime).getTime()) {
              return false;
            }
            // 检查是否已经取消了
            const result = await chrome.storage.local.get(KeyIKnow);
            if (result[KeyIKnow]) {
              return false;
            }
            // 距离上次是否已经过去了指定的时间间隔
            const KeyLatestShowTime = `latest-show-${el.id}`;
            const res = await chrome.storage.local.get(KeyLatestShowTime);
            const time = res[KeyLatestShowTime];
            if (time) {
              const diff = (new Date().getTime() - time) / 1000 / 60; // 过去了多少分钟
              if (diff <= el.duration) {
                return false;
              }
            }
            chrome.storage.local.set({ [KeyLatestShowTime]: new Date().getTime() });
            return true;
          },
        });
      });
    }
  } catch (e) {
    console.error(e);
  }
  if (chrome?.notifications?.onClicked) {
    chrome.notifications.onClicked.addListener((id) => {
      const ret = config.find((el) => el.id === id);
      if (ret) {
        ret.click && ret.click();
      }
    });
  }
  if (chrome?.notifications?.onClosed) {
    chrome.notifications.onClosed.addListener((id) => {
      const ret = config.find((el) => el.id === id);
      if (ret) {
        ret.closed && ret.closed();
      }
    });
  }
  if (chrome?.notifications?.onButtonClicked) {
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      const ret = config.find((el) => el.id === notificationId);
      if (!ret?.buttons) {
        return;
      }
      const btn = ret.buttons[buttonIndex];
      if (!btn) {
        return;
      }
      btn.click && btn.click();
    });
  }

  for (let i = 0; i < config.length; i++) {
    await createNotification(config[i]);
  }

  async function createNotification(config: ConfigItem) {
    const b = await config.check(config);
    if (!b) {
      return;
    }
    const { title, buttons, message, id } = config;
    if (chrome?.notifications?.create) {
      chrome.notifications.create(
        id,
        {
          type: "basic",
          iconUrl: "icons/48.png",
          title: title,
          message: message,
          buttons: buttons ? buttons.map((el) => ({ title: el.title })) : [],
        },
        (id: string) => {}
      );
    } else {
      // 无通知权限或不可用，降级为打开 tab
      if (config.click) {
        config.click();
      }
    }
  }
})();
