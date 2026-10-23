/*
 * Phaser as the floor uses it, standing in for the whole package in the
 * browser build (next.config.ts aliases "phaser" here). The package's own
 * build carries both physics engines, tilemaps, particles, sound and more
 * that the floor never touches: about a third of what every first visit
 * downloaded. This is Phaser's own core build (phaser/src/phaser-core.js)
 * with what the floor adds: containers, zones, circles, and the maths it
 * reaches for. The switches its source is built with (WEBGL_RENDERER and the
 * rest) are set in next.config.ts.
 *
 * Using something of Phaser's that isn't here fails loudly in the browser
 * (Phaser.X is undefined, or this.add.x isn't a function): add it below.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Phaser's source is CommonJS, taken piece by piece as its own core build does. */
require("phaser/src/polyfills/requestVideoFrame");

const CONST = require("phaser/src/const");
const Extend = require("phaser/src/utils/object/Extend");

// What the floor makes with this.add: each registers itself with the factory as it's required.
require("phaser/src/gameobjects/container/ContainerFactory");
require("phaser/src/gameobjects/zone/ZoneFactory");
require("phaser/src/gameobjects/shape/arc/ArcFactory");

const Phaser = {
  Animations: require("phaser/src/animations"),
  BlendModes: require("phaser/src/renderer/BlendModes"),
  Cache: require("phaser/src/cache"),
  Cameras: { Scene2D: require("phaser/src/cameras/2d") },
  Core: require("phaser/src/core"),
  Class: require("phaser/src/utils/Class"),
  Data: require("phaser/src/data"),
  Display: { Masks: require("phaser/src/display/mask") },
  DOM: require("phaser/src/dom"),
  Events: require("phaser/src/events"),
  FX: require("phaser/src/fx"),
  Game: require("phaser/src/core/Game"),
  GameObjects: {
    DisplayList: require("phaser/src/gameobjects/DisplayList"),
    GameObjectCreator: require("phaser/src/gameobjects/GameObjectCreator"),
    GameObjectFactory: require("phaser/src/gameobjects/GameObjectFactory"),
    UpdateList: require("phaser/src/gameobjects/UpdateList"),
    Components: require("phaser/src/gameobjects/components"),
    Events: require("phaser/src/gameobjects/events"),
    BuildGameObject: require("phaser/src/gameobjects/BuildGameObject"),
    BuildGameObjectAnimation: require("phaser/src/gameobjects/BuildGameObjectAnimation"),
    GameObject: require("phaser/src/gameobjects/GameObject"),
    Arc: require("phaser/src/gameobjects/shape/arc/Arc"),
    Container: require("phaser/src/gameobjects/container/Container"),
    Graphics: require("phaser/src/gameobjects/graphics/Graphics"),
    Image: require("phaser/src/gameobjects/image/Image"),
    Layer: require("phaser/src/gameobjects/layer/Layer"),
    Sprite: require("phaser/src/gameobjects/sprite/Sprite"),
    Text: require("phaser/src/gameobjects/text/Text"),
    Zone: require("phaser/src/gameobjects/zone/Zone"),
    Factories: {
      Graphics: require("phaser/src/gameobjects/graphics/GraphicsFactory"),
      Image: require("phaser/src/gameobjects/image/ImageFactory"),
      Layer: require("phaser/src/gameobjects/layer/LayerFactory"),
      Sprite: require("phaser/src/gameobjects/sprite/SpriteFactory"),
      Text: require("phaser/src/gameobjects/text/TextFactory"),
    },
    Creators: {
      Graphics: require("phaser/src/gameobjects/graphics/GraphicsCreator"),
      Image: require("phaser/src/gameobjects/image/ImageCreator"),
      Layer: require("phaser/src/gameobjects/layer/LayerCreator"),
      Sprite: require("phaser/src/gameobjects/sprite/SpriteCreator"),
      Text: require("phaser/src/gameobjects/text/TextCreator"),
    },
  },
  Input: require("phaser/src/input"),
  Loader: {
    FileTypes: {
      ImageFile: require("phaser/src/loader/filetypes/ImageFile"),
      JSONFile: require("phaser/src/loader/filetypes/JSONFile"),
      SpriteSheetFile: require("phaser/src/loader/filetypes/SpriteSheetFile"),
    },
    File: require("phaser/src/loader/File"),
    FileTypesManager: require("phaser/src/loader/FileTypesManager"),
    GetURL: require("phaser/src/loader/GetURL"),
    LoaderPlugin: require("phaser/src/loader/LoaderPlugin"),
    MergeXHRSettings: require("phaser/src/loader/MergeXHRSettings"),
    MultiFile: require("phaser/src/loader/MultiFile"),
    XHRLoader: require("phaser/src/loader/XHRLoader"),
    XHRSettings: require("phaser/src/loader/XHRSettings"),
  },
  Math: {
    Between: require("phaser/src/math/Between"),
    Clamp: require("phaser/src/math/Clamp"),
    DegToRad: require("phaser/src/math/DegToRad"),
    Distance: require("phaser/src/math/distance"),
    FloatBetween: require("phaser/src/math/FloatBetween"),
    Linear: require("phaser/src/math/Linear"),
    RadToDeg: require("phaser/src/math/RadToDeg"),
    Vector2: require("phaser/src/math/Vector2"),
  },
  Plugins: require("phaser/src/plugins"),
  Renderer: require("phaser/src/renderer"),
  Scale: require("phaser/src/scale"),
  ScaleModes: require("phaser/src/renderer/ScaleModes"),
  Scene: require("phaser/src/scene/Scene"),
  Scenes: require("phaser/src/scene"),
  Structs: require("phaser/src/structs"),
  Textures: require("phaser/src/textures"),
  Time: require("phaser/src/time"),
  Tweens: require("phaser/src/tweens"),
};

module.exports = Extend(false, Phaser, CONST);
