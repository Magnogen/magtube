const video = Video('pluck', 30);
const audio = Audio('pluck', 30);

const hash = Mulberry(42)
const { choose } = Rng(hash);

const { n, sin, triangle, add, mul, exp } = Sound();
const amp0 = t => mul(exp(4), 0.5)(t < 5 ? Infinity : t % 5);
const amp1 = t => exp(1)(t < 2 ? Infinity : t % 2);
const amp2 = t => mul(exp(4), 0.5)(t < 7.5 ? Infinity : t % 7.5);

const amps = [...Array(32)].map((e, i) => {
  const modulo = hash(i) * 10 + 5;
  return {
    i,
    fn: t => mul(exp(16), 0.25)(t < modulo ? Infinity : t % modulo),
  };
});
const amps2 = [...Array(8)].map((e, i) => {
  const modulo = hash(i, 1) * 15 + 5;
  return {
    i,
    fn: t => mul(exp(16), 0.25)(t < modulo ? Infinity : t % modulo),
  };
});

const sound = mul(
  add(
    mul(sin(n('A4')), amp0),
    mul(triangle(n('C3')), amp1),
    mul(sin(n('E4')), amp2),
    ...amps.map((amp) => mul(sin(n(choose('CDEFGAB') + '5')), amp.fn)),
    ...amps.map((amp) => mul(sin(n(choose('CDEFGAB') + '6')), amp.fn)),
  ),
  1 / (0.5 + 1 + 0.5 + amps.length*0.25 + amps.length*0.25),
);

on('load', async () => {
  const [width, height] = [1920, 1080];
  const c = Canvas(width, height);
  const ctx = c.getContext('2d');

  while (video.time() < 120) {
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    ctx.translate(width/2, height/2);
    ctx.scale(height/2, height/2);

    for (const amp of amps2) {
      const x = hash(amp.i, 0) * 2 - 1;
      const y = 0.8*hash(amp.i, 1) * 2 - 1;
      ctx.fillStyle = '#606060';
      ctx.beginPath();
      ctx.arc(x, y, amp.fn(video.time())*0.3, 0, 2*Math.PI);
      ctx.fill();
    }

    for (const amp of amps) {
      const x = hash(amp.i, 0) * 2 - 1;
      const y = 0.8*hash(amp.i, 1) * 2 - 1;
      ctx.fillStyle = '#404040';
      ctx.beginPath();
      ctx.arc(x, y, amp.fn(video.time())*0.4, 0, 2*Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = '#20a020';
    ctx.beginPath();
    ctx.arc(-1, 0, amp0(video.time())*0.4, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = '#2020a0';
    ctx.beginPath();
    ctx.arc(0, 0, amp1(video.time())*0.4, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = '#a02020';
    ctx.beginPath();
    ctx.arc(1, 0, amp2(video.time())*0.4, 0, 2*Math.PI);
    ctx.fill();

    ctx.restore();

    await video.save(c);
    audio.pushFrame( sound );
  }

  audio.save();
  
});