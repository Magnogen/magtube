const video = Video('poly', 30);
const audio = Audio('poly', 30);

const { n, sin, triangle, add, mul, expAdsr, delay, reverb } = Sound();

const env = (mod) => t => expAdsr({
  attack: 0.01,
  release: 1,
  gate: 0,
  curve: 4,
})(t % mod)

const tri = (note) => triangle(n(note));

const envs = [...Array(16)].map((e, i, a) => env(2*a.length/(a.length-i)));
const tris = envs.map((envelope, i) => mul(tri('ABCDEFG'[i%7] + '45678'[0|(i/7)]), envelope));

const melody = mul(add(
  ...tris,
), 1/tris.length);

const sound = delay(melody, 0.25, 0.5, 0.25);

on('load', async () => {
  const [width, height] = [1920, 1080];
  const c = Canvas(width, height);
  const ctx = c.getContext('2d');

  while (video.time() < 60) {
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