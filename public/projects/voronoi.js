const video = Video('voronoi', 30);
const audio = Audio('voronoi', 30);

const { n, sin, triangle, add, mul, expAdsr, delay, reverb } = Sound();
// also use <script src="https://d3js.org/d3-voronoi.v1.min.js"></script>

let start = 1;
let note = 440;

const env = t => expAdsr({
  attack: 0.01,
  release: 1,
  gate: 0,
  curve: 4,
})(t - start) * 0.6;

const sound = mul(sin(() => note), env);

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

  const sites = [];
  function renderVoronoi(radius) {
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);

    const voronoi = d3.voronoi().size([width, height]).x(d => d.x).y(d => d.y);
    const polys = voronoi(sites).polygons();
    
    for (const poly of polys) {
      if (!poly) continue;
      
      ctx.save();
      ctx.beginPath();
      for (const [x, y] of poly) {
        ctx.lineTo(x, y);
      }
      ctx.clip();
      
      circle(poly.data.x, poly.data.y, radius, poly.data.color);
      ctx.restore();
    }
  }

  const circles = [];
  async function renderAndSummon(x, y, time, noteName, color) {
    start = time;
    note = n(noteName);

    while (video.time() < time + 2) {
      renderVoronoi(height / 64);
      
      circle(x, y, (1 - env(video.time())) * height / 64, color);
      
      const ringRadius = (video.time() - time) * 300;
      ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.lineWidth = 4 * env(video.time());
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      await video.save(c);
      audio.pushFrame(sound);
    }

    circles.push([ x, y, color ]);
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

  while (video.time() < 42) {
    const t = Math.min(video.time() - 24, 1);
    sites.forEach((site, i) => {
      site.x += Math.sin(video.time() + i*2) * t**2;
      site.y += Math.cos(video.time() + i*2) * t**2;
    });

    renderVoronoi(height);

    await video.save(c);
    audio.pushFrame(sound);
  }



  audio.save();
});