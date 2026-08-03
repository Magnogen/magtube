const video = Video('voronoi', 30);
const audio = Audio('voronoi', 30);

const { n, sin, triangle, add, mul, expAdsr, delay, reverb } = Sound();

let start = 1;
let note = 440;

const env = t => expAdsr({
  attack: 0,
  release: 2,
  gate: 0,
  curve: 4,
})(t - start)

const sound = mul(sin(() => note), env);
// const sound = delay(music, 0.25, 0.25, 0.25);

on('load', async () => {
  const [width, height] = [1920, 1080];
  const c = Canvas(width, height);
  const ctx = c.getContext('2d');

  const circle = (x, y, radius, color) => {
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI);
    ctx.fill();
  };

  function rgb(hex) {
    return [
      (hex >> 16) & 255,
      (hex >> 8) & 255,
      hex & 255
    ];
  }

  const sites = [];
  function renderVoronoi(radius, dist = (x, y) => (x**2 + y**2)**(1/2)) {
    const img = ctx.createImageData(width, height);
    const data = img.data;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let best = Infinity;
        let color = 0x101010;

        for (const s of sites) {
          const dx = px - s.x;
          const dy = py - s.y;
          const d = dist(dx, dy);

          if (d < best && d < radius) {
            best = d;
            color = s.color;
          }
        }

        const i = (py * width + px) * 4;
        data[i+0] = (color >> 16) & 255;
        data[i+1] = (color >> 8) & 255;
        data[i+2] = color & 255;
        data[i+3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  const circles = [];
  async function renderAndSummon(x, y, time, noteName, color) {
    start = time;
    note = n(noteName);

    while (video.time() < time + 2) {
      renderVoronoi(height / 64);
      
      circle(x, y, (1 - env(video.time())) * height / 64, color);
      
      await video.save(c);
      audio.pushFrame(sound);
    }

    circles.push([x, y, color]);
    sites.push({ x, y, color });
  }

  await renderAndSummon(width*1/2, height*1/2,  0, 'A3', 0xa02020);
  await renderAndSummon(width*1/3, height*1/4,  2, 'B3', 0xa0a020);
  await renderAndSummon(width*1/4, height*3/4,  4, 'C4', 0x20a020);
  await renderAndSummon(width*3/4, height*2/3,  6, 'D4', 0x20a0a0);
  await renderAndSummon(width*5/6, height*1/3,  8, 'E4', 0x2020a0);
  await renderAndSummon(width*3/5, height*4/5, 10, 'F4', 0xa020a0);

  while (video.time() < 24) {
    renderVoronoi(height / 64 + (video.time() - 12) * width/32);
    
    await video.save(c);
    audio.pushFrame(sound);
  }

  audio.save();
});