export enum CompType {
  Node = "cc.Node",
  Prefab = "cc.Prefab",
  Spirte = "cc.Sprite",
  Label = "cc.Label",
  Layout = "cc.Layout",
  Graphics = "cc.Graphics",
  Widget = "cc.Widget",
  Camera = "cc.Camera",
  Canvas = "cc.Canvas",
  Mask = "cc.Mask",
  ScrollView = "cc.ScrollView",
  UITransform = "cc.UITransform",
  ParticleSystem = "cc.ParticleSystem",
  ParticleSystem2D = "cc.ParticleSystem2D",
  EditBox = "cc.EditBox",
  TiledTile = "cc.TiledTile",
  Light = "cc.Light",
  VideoPlayer = "cc.VideoPlayer",
  MeshRenderer = "cc.MeshRenderer",
  ProgressBar = "cc.ProgressBar",
  RichText = "cc.RichText",
  Slider = "cc.Slider",
  PageView = "cc.PageView",
  Webview = "cc.WebView",
  ToggleGroup = "cc.ToggleGroup",
  ToggleContainer = "cc.ToggleContainer",
  Toggle = "cc.Toggle",
  Button = "cc.Button",
  AudioSource = "cc.AudioSource",
  Opacity = "cc.UIOpacity",
  BlockInputEvents = "cc.BlockInputEvents",
  Scene = "cc.Scene",
  Animation = "cc.Animation",
}

export function getSimpleProperties(typeName: string): string[] {
  const config = {};
  config[CompType.Animation] = [
    "defaultClip", //
    "clips",
    "playOnLoad",
  ];
  config[CompType.Scene] = [
    "autoReleaseAssets",
    "position",
    "scale",
    "rotation",
    "color", //
  ];
  config[CompType.BlockInputEvents] = ["enabled"];
  config[CompType.Button] = [
    "target", //
    "interactable",
    "enableAutoGrayEffect",
    "transition",
    "duration",
    "zoomScale",
    "normalColor",
    "normalSprite",
    "pressedColor",
    "pressedSprite",
    "disabledColor",
    "disabledSprite",
    "hoverColor",
    "hoverSprite",
    "duration",
  ];
  config[CompType.Toggle] = [
    "target",
    "interactable",
    "enableAutoGrayEffect",
    "transition", //
    "duration",
    "zoomScale",
    "isChecked",
    "checkMark",
    "toggleGroup",
  ];
  config[CompType.ToggleContainer] = ["allowSwitchOff"];
  config[CompType.ToggleGroup] = ["allowSwitchOff"];
  config[CompType.Webview] = ["url"];
  config[CompType.PageView] = [
    "content",
    "sizeMode",
    "direction",
    "scrollThreshold",
    "autoPageTurningThreshold", //
    "inertia",
    "brake",
    "elastic",
    "bounceDuration",
    "indicator",
    "pageTurningSpeed",
    "pageTurningEventTiming",
    "cancelInnerEvents",
  ];
  config[CompType.Slider] = ["handle", "direction", "progress"];
  config[CompType.RichText] = [
    "string",
    "horizontalAlign",
    "verticalAlign",
    "fontSize",
    "font",
    "fontFamily",
    "useSystemFont",
    "cacheMode",
    "maxWidth",
    "lineHeight",
    "imageAtlas",
    "handleTouchEvent", //
  ];
  config[CompType.ProgressBar] = [
    "barSprite",
    "mode",
    "totalLength",
    "progress",
    "reverse", //
  ];
  config[CompType.MeshRenderer] = [
    "materials", //
    "mesh",
    "receiveShadows",
    "shadowCastingMode",
    "enableAutoBatch",
  ];
  config[CompType.VideoPlayer] = [
    "resourceType",
    "clip",
    "currentTime",
    "volume",
    "mute",
    "keepAspectRatio",
    "isFullscreen",
    "stayOnBottom", //
  ];
  config[CompType.Light] = [
    "type",
    "color",
    "intensity", //
    "range",
    "shadowType",
    "range",
    "spotAngle",
    "spotExp",
  ];
  config[CompType.TiledTile] = ["x", "y", "grid"];
  config[CompType.EditBox] = [
    "string",
    "placeholder", //
    "background",
    "textLabel",
    "placeholderLabel",
    "keyboardReturnType",
    "inputFlag",
    "inputMode",
    "maxLength",
    "tabIndex",
  ];
  config[CompType.ParticleSystem] = [
    "playOnLoad", //
    "autoRemoveOnFinish",
  ];
  config[CompType.Node] = [
    "position", //
    "rotation",
    "scale",
    "anchor",
    "size",
    "color",
    "opacity",
    "skew",
    "group",
    "angle",
    //----------
    "worldPosition",
    "worldScale",
    "layer",
    "mobility",
    // "worldRotation",// 渲染有问题，暂时先不支持这个属性
  ];
  config[CompType.UITransform] = [
    "anchorPoint", //vec2类型，step会正确处理
    // "anchor",// FIXME: 会被Inspector属性配对，无法正确处理step
    "size",
  ];
  config[CompType.Widget] = [
    "left",
    "right",
    "top",
    "bottom",
    "alignMode", //
    "isAlignLeft",
    "isAlignRight",
    "isAlignTop",
    "isAlignBottom",
  ];
  config[CompType.Label] = [
    "color",
    "isBold",
    "isItalic",
    "isUnderline",
    "spaceX",
    "string", //
    "horizontalAlign",
    "verticalAlign",
    "fontSize",
    "lineHeight",
    "overflow",
    "font",
    "fontFamily",
    "ebableBold",
    "enableItalic",
    "enableUnderline",
    "underlineHeight",
    "cacheMode",
    "useSystemFont",
  ];

  config[CompType.Graphics] = [
    "lineWidth",
    "lineJoin", //
    "lineCap",
    "strokeColor",
    "fillColor",
    "miterLimit",
  ];
  config[CompType.Camera] = [
    "clearColor", //
    "clearFlags",
    "cullingMask",
    "depth",
    "zoomRatio",
    "priority",
    "alignWithScreen",
    "visibility",
    "projection",
    "far",
    "near",
    "clearDepth",
    "clearStencil",
    "orthoHeight",
    "aperture",
    "shutter",
    "iso",
  ];
  config[CompType.Spirte] = [
    "atlas",
    "spriteFrame",
    "type",
    "sizeMode", //
    "fillCenter",
    "fillRange",
    "fillRange",
    "fillStart",
    "fillType",
    "grayscale",
    "color",
    "spriteAtlas",
    "trim",
    "type",
  ];
  config[CompType.ScrollView] = [
    "bounceDuration",
    "content", //
    "horizontal",
    "vertical",
    "inertia",
    "brake",
    "elastic",
    "bounceDuration",
    "verticalScrollBar",
  ];
  config[CompType.Mask] = [
    "alphaThreshold",
    "inverted",
    "segments", //
    "spriteFrame",
    "type",
  ];
  config[CompType.Canvas] = [
    "fitWidth",
    "fitHeight", //
    "designResolution",
    "cameraComponent",
    "alignCanvasWithScreen",
  ];
  return config[typeName] || [];
}
export const VisibleProp = {
  Active: "active",
  Enabled: "enabled",
};

export function getNodeIcon(comp: CompType): string {
  const map = {};
  map[CompType.Spirte] = "icon_picture";
  map[CompType.Label] = "icon_text";
  map[CompType.Node] = "icon_node";
  map[CompType.Prefab] = "icon_prefab";
  map[CompType.Animation] = "icon_animation";
  map[CompType.Button] = "icon_button";
  map[CompType.EditBox] = "icon_inputbox";
  map[CompType.Scene] = "icon_cocos";
  map[CompType.ScrollView] = "icon_scroll_view";
  map[CompType.Canvas] = "icon_canvas";
  map[CompType.Camera] = "icon_camera";
  map[CompType.Mask] = "icon_mask";
  map[CompType.Widget] = "icon_widget";
  map[CompType.ProgressBar] = "icon_progress";
  map[CompType.ParticleSystem] = "icon_effect";
  map[CompType.ParticleSystem2D] = "icon_effect";
  map[CompType.Layout] = "icon_layout";
  map[CompType.Graphics] = "icon_graphics";
  map[CompType.Opacity] = "icon_opacity";
  map[CompType.BlockInputEvents] = "icon_block";
  map[CompType.RichText] = "icon_rich_text";
  map[CompType.AudioSource] = "icon_audio";
  let ret = map[comp];
  if (!ret) {
    //debugger;
    console.log(`get node icon fail: ${comp}, please check.`);
    ret = map[CompType.Node];
  }
  return ret;
}
