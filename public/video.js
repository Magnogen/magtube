const Video = (name = 'project', fps = 30) => {
  let frame = 0;
  return {
    time: () => frame / fps,
    frame: () => frame,
    save: async (canvas) => {
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      await fetch(`http://localhost:8080/upload?name=${name}&frame=${frame}`, {
        method: "POST",
        body: blob,
      });
      frame++;
      const $progress = document.querySelector('#progress')
      $progress.textContent = `${frame} frame${frame == 1 ? '' : 's'} rendered (${(frame / fps).toFixed(2)}s)`
    },
    advance: () => frame++,
  }
};

const Canvas = (width, height) => {
  const c = document.querySelector('canvas');
  c.width = width;
  c.height = height;
  return c;
};

const makeCanvas = (width, height) => {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
};

(() => {
  const log = console.log;
  console.log = (...data) => {
    log(...data);
  };
})();