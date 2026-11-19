// Shared registry for the Karna animation frames.
// Each visual cue has a three-frame action cycle. The Node renderer preloads
// them with @napi-rs/canvas; the browser preview preloads the same files as
// Image objects. drawFrame() stays synchronous and blends frames by time.
export const SCENE_IMAGE_FILES = Object.freeze({
  wheel: ['wheel.jpg', 'wheel-2.jpg', 'wheel-3.jpg'],
  ghee: ['ghee.jpg', 'ghee-2.jpg', 'ghee-3.jpg'],
  squeeze: ['squeeze.jpg', 'squeeze-2.jpg', 'squeeze-3.jpg'],
  curse: ['curse.jpg', 'curse-2.jpg', 'curse-3.jpg'],
  arrow: ['arrow.jpg', 'arrow-2.jpg', 'arrow-3.jpg'],
});

const frames = new Map();

export function setSceneFrames(key, images) {
  const valid = (images || []).filter(Boolean);
  if (valid.length) frames.set(key, valid);
}

export function getSceneFrames(key) {
  return frames.get(key) || frames.get('wheel') || [];
}

export function getSceneImage(key) {
  return getSceneFrames(key)[0] || null;
}

export function sceneImageKeys() {
  return Object.keys(SCENE_IMAGE_FILES);
}
