// Shared registry for the five cinematic Karna scene plates.
// The Node renderer preloads these with @napi-rs/canvas; the browser preview
// preloads the same files as Image objects. drawFrame() stays synchronous.
export const SCENE_IMAGE_FILES = Object.freeze({
  wheel: 'wheel.jpg',
  ghee: 'ghee.jpg',
  squeeze: 'squeeze.jpg',
  curse: 'curse.jpg',
  arrow: 'arrow.jpg',
});

const images = new Map();

export function setSceneImage(key, image) {
  if (image) images.set(key, image);
}

export function getSceneImage(key) {
  return images.get(key) || images.get('wheel') || null;
}

export function sceneImageKeys() {
  return Object.keys(SCENE_IMAGE_FILES);
}
