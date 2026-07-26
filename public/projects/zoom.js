const video = Video('zoom', 30);

on('load', async () => {
  const [width, height] = [1920, 1080]
  const c = Canvas(width, height);
  const ctx = c.getContext('2d');
  
  const hash = Mulberry(42);

  function randomPane() {
    const pane = makeCanvas(width, height);

    const img = pane.getContext("2d").createImageData(width, height);

    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i + 0] = 0;
      img.data[i + 1] = 0;
      img.data[i + 2] = 0;
      img.data[i + 3] = 255;
    }

    pane.getContext("2d").putImageData(img, 0, 0);

    return pane;
  }

  function sample(img, x, y, width, height) {
    // clamp coordinates to image bounds
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    
    const tx = x - x0 + (Math.random()*2-1)/3;
    const ty = y - y0 + (Math.random()*2-1)/3;

    function pixel(px, py) {
      const i = 4 * (py * width + px);
      return [
        img.data[i + 0],
        img.data[i + 1],
        img.data[i + 2],
        img.data[i + 3]
      ];
    }

    const a = pixel(x0, y0);
    const b = pixel(x1, y0);
    const c = pixel(x0, y1);
    const d = pixel(x1, y1);

    // interpolate horizontally
    const top = [
      a[0] * (1 - tx) + b[0] * tx,
      a[1] * (1 - tx) + b[1] * tx,
      a[2] * (1 - tx) + b[2] * tx,
      a[3] * (1 - tx) + b[3] * tx
    ];

    const bottom = [
      c[0] * (1 - tx) + d[0] * tx,
      c[1] * (1 - tx) + d[1] * tx,
      c[2] * (1 - tx) + d[2] * tx,
      c[3] * (1 - tx) + d[3] * tx
    ];

    // interpolate vertically
    return [
      top[0] * (1 - ty) + bottom[0] * ty,
      top[1] * (1 - ty) + bottom[1] * ty,
      top[2] * (1 - ty) + bottom[2] * ty,
      top[3] * (1 - ty) + bottom[3] * ty
    ];
  }

  function makePane(parent) {
    const pane = makeCanvas(width, height);

    const src = parent.getContext("2d").getImageData(0, 0, width, height);

    const dst = pane.getContext("2d").createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = 4 * (y * width + x);

        const sx = width / 4 + x / 2;
        const sy = height / 4 + y / 2;

        const color = sample(src, sx, sy, width, height);


        dst.data[i + 0] = color[0] + 128*(Math.random()*2-1)/8;
        dst.data[i + 1] = color[1] + 128*(Math.random()*2-1)/8;
        dst.data[i + 2] = color[2] + 128*(Math.random()*2-1)/8;
        dst.data[i + 3] = 255;
      }
    }

    pane.getContext("2d").putImageData(dst, 0, 0);

    return pane;
  }

  let pane0 = randomPane();
  let pane1 = makePane(pane0); 

  let level = 0;
  function render(t) {
    const whole = Math.floor(t);

    while (level < whole) {
      pane0 = pane1;
      pane1 = makePane(pane0);
      level++;
    }

    const zoom = 2 ** (1+t - level);

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width/2, height/2);

    // current level
    ctx.scale(zoom, zoom);
    ctx.drawImage(pane0, -width/2, -height/2);

    // next level
    ctx.scale(0.5, 0.5);
    ctx.drawImage(pane1, -width/2, -height/2);

    ctx.restore();
  }

  while (video.time() < 100) {
    const t = video.time();
    const level = Math.floor(t);
    const zoom = Math.pow(2, t - level);

    render(video.time());
    await video.save(c);
    // await new Promise(requestAnimationFrame)
    // video.advance()
  }

  console.log('stopped')
});