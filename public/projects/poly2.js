const video = Video('poly2', 30);
const audio = Audio('poly2', 30);

const { n, sin, triangle, add, mul, expAdsr, delay, reverb } = Sound();

const env = (mod) => t => expAdsr({
  attack: 0.01,
  release: 1,
  gate: 0,
  curve: 4,
})(t % mod)

const osc = (note) => sin(n(note));

const envs = [...Array(60)].map((e, i, a) => env(4*a.length/(a.length-i)));
const oscs = envs.map((envelope, i) => mul(osc('CDEFGAB'[i%7] + [...'0123456789','10'][0|(i/7)]), envelope));

const melody = mul(add(
  ...oscs,
), 1/oscs.length);

const delayed = delay(melody, 0.25, 0.5, 0.25);
const sound = reverb(delayed);

on('load', async () => {
  const [width, height] = [1920, 1080];
  const c = Canvas(width, height);
  const ctx = c.getContext('2d');

  while (video.time() < 120) {
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);

    const t = video.time();

    envs.forEach((env, i) => {
      const v = env(t); // 0..1

      const angle = i / envs.length * Math.PI * 2 + t * 0.3;
      const radius = height/4;

      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius;

      const r = 10 + v * 40;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);

      ctx.fillStyle = `hsla(${i * 22}, 80%, ${30 + v * 50}%, ${0.15 + v * 0.55})`;
      ctx.fill();
    });

    await video.save(c);
    audio.pushFrame( sound );
  }

  audio.save();
});