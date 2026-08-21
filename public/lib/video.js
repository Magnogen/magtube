const color = (l, c, h, a = 1) => ({
  l: ((l % 360) + 360) % 360, c, h, a,
  chroma(v) { return color(this.l, v, this.h, this.a); },
  lightness(v) { return color(v, this.c, this.h, this.a); },
  hue(v) { return color(this.l, this.c, v, this.a); },
  alpha(v) { return color(this.l, this.c, this.h, v); },
  css() { return `oklch(${this.l} ${this.c} ${this.h} / ${this.a})`; }
});

const red   = color(0.5, 0.5, 29);
const green = color(0.5, 0.5, 145);
const blue  = color(0.5, 0.5, 260);
const black = color(0, 0, 0);
const white = color(1, 0, 0);
const gray  = (l) => color(l, 0, 0);

const Video = (name = 'project', width = 1920, height = 1080, fps = 30) => {
  let frame = 0;
  let widgets = [];

  const canvas = document.querySelector('canvas');
  canvas.width = width;
  canvas.height = height;
  const advance = () => {
    frame++;
    const $progress = document.querySelector('#video-progress');
    $progress.textContent = `${frame} frame${frame == 1 ? '' : 's'} rendered (${(frame / fps).toFixed(2)}s)`;
  };

  const IS_SPRING = Symbol();
  const isPlainObject = (value) => (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  );
  const proxify = (object) => {
    if (!isPlainObject(object)) return object;
    if (object[IS_SPRING]) return object;
    for (const key of Object.keys(object)) {
      object[key] = proxify(object[key]);
    }
    return new Proxy(object, {
      set(target, property, value) {
        const current = target[property];
        if (target[property]?.[IS_SPRING]) {
          current.value = value;
          return true;
        }
        target[property] = proxify(value);
        return true;
      }
    });
  };
  const createWidget = (widgetFn) => (...args) => {
    const widget = proxify(widgetFn(...args));
    widgets.push(widget);
    return widget;
  };
  const spring = (initial, options = {}) => {
    let x = initial;
    let xp = initial;
    let y = initial;
    let yd = 0;

    let frequency = options.frequency ?? 1;
    let springiness = options.springiness ?? 1;
    let response = options.response ?? 0;

    let k1, k2, k3;
    const updateConstants = () => {
      k1 = springiness / (Math.PI * frequency);
      k2 = 1 / ((2 * Math.PI * frequency) ** 2);
      k3 = response * springiness / (2 * Math.PI * frequency);
    };
    updateConstants();

    const update = (dt) => {
      if (dt <= 0) return;
      const xd = (x - xp) / dt;
      xp = x;
      const k2_stable = Math.max(k2, 1.1 * (dt * dt / 4 + dt * k1 / 2));
      y += dt * yd;
      yd += dt * (x + k3 * xd - y - k1 * yd) / k2_stable;
    };

    return {
      [IS_SPRING]: true,
      update,
      get value() { return y; },
      set value(v) { y = xp = x = v; yd = 0; },
      get target() { return x; },
      set target(v) { x = v; },
      get velocity() { return yd; },
      set velocity(v) { yd = v; },
      get frequency() { return frequency; },
      set frequency(v) { frequency = v; updateConstants(); },
      get springiness() { return springiness; },
      set springiness(v) { springiness = v; updateConstants(); },
      get response() { return response; },
      set response(v) { response = v; updateConstants(); },
      set(v) { this.value = v; return this; },
      animate(v) { this.target = v; return this; },
      impulse(v) { this.velocity += v; return this; },
      stop() { this.value = y; return this; },
      valueOf() { return y; },
      toString() { return String(y); },
      [Symbol.toPrimitive]() { return y; },
    };
  };
  const springColor = (initial, options = {}) => {
    let x = initial;
    let xp = initial;
    let y = initial;
    let yd = { l: 0, c: 0, h: 0, a: 0 };

    let frequency = options.frequency ?? 1;
    let springiness = options.springiness ?? 0.5;
    let response = options.response ?? 0;

    let k1, k2, k3;
    const updateConstants = () => {
      k1 = springiness / (Math.PI * frequency);
      k2 = 1 / ((2 * Math.PI * frequency) ** 2);
      k3 = response * springiness / (2 * Math.PI * frequency);
    };
    updateConstants();

    const hueDelta = (a, b) => ((b - a + 540) % 360) - 180;

    const update = (dt) => {
      if (dt <= 0) return;
      const xd = color(
        (x.l - xp.l) / dt,
        (x.c - xp.c) / dt,
        hueDelta(xp.h, x.h) / dt,
        (x.a - xp.a) / dt
      );
      xp = x;
      const k2_stable = Math.max(
        k2,
        1.1 * (dt * dt / 4 + dt * k1 / 2)
      );
      y = color(
        y.l + dt * yd.l,
        y.c + dt * yd.c,
        y.h + dt * yd.h,
        y.a + dt * yd.a
      );

      yd = color(
        yd.l + dt * (x.l + k3 * xd.l - y.l - k1 * yd.l) / k2_stable,
        yd.c + dt * (x.c + k3 * xd.c - y.c - k1 * yd.c) / k2_stable,
        yd.h + dt * (x.h + k3 * xd.h - y.h - k1 * yd.h) / k2_stable,
        yd.a + dt * (x.a + k3 * xd.a - y.a - k1 * yd.a) / k2_stable
      );
    };

    return {
      [IS_SPRING]: true,
      update,
      get value() { return y; },
      set value(v) {
        y = xp = x = v;
        yd = { l: 0, c: 0, h: 0, a: 0 };
      },
      get target() { return x; },
      set target(v) { x = v; },
      get velocity() { return yd; },
      set velocity(v) { yd = v; },
      get frequency() { return frequency; },
      set frequency(v) { frequency = v; updateConstants(); },
      get springiness() { return springiness; },
      set springiness(v) { springiness = v; updateConstants(); },
      get response() { return response; },
      set response(v) { response = v; updateConstants(); },
      set(v) { this.value = v; return this; },
      animate(v) { this.target = v; return this; },
      impulse(v) {
        this.velocity = {
          l: this.velocity.l + (v.l ?? 0),
          c: this.velocity.c + (v.c ?? 0),
          h: this.velocity.h + (v.h ?? 0),
          a: this.velocity.a + (v.a ?? 0)
        };
        return this;
      },
      stop() { this.value = y; return this; },
      valueOf() { return y; },
      toString() { return String(y); },
      [Symbol.toPrimitive]() { return y; },
    };
  };

  return {
    canvas,
    widgets,
    Widget: {
      Background: createWidget((color) => ({
        color: springColor(color),
        advance(dt) {
          this.color.update(dt);
        },
        drawTo(ctx) {
          ctx.fillStyle = this.color.value.css();
          ctx.fillRect(0, 0, width, height);
        }
      })),
      Text: createWidget((content) => ({
        content,
        progress: spring(1),
        x: spring(0),
        y: spring(0),
        width: 0,
        height: 0,
        anchorX: spring(0.5),
        anchorY: spring(0.5),
        style: {
          size: spring(16),
          family: "sans-serif",
          weight: spring(400),
          color: springColor(black),
        },
        advance(dt) {
          this.progress.update(dt);
          this.x.update(dt);
          this.y.update(dt);
          this.anchorX.update(dt);
          this.anchorY.update(dt);
          this.style.size.update(dt);
          this.style.weight.update(dt);
          this.style.color.update(dt);
        },
        drawTo(ctx) {
          ctx.save();

          ctx.font = `${this.style.weight} ${this.style.size}px ${this.style.family}`;
          ctx.fillStyle = this.style.color.value.css();

          const count = Math.floor(this.content.length * this.progress);
          const text = this.content.slice(0, count);

          const metrics = ctx.measureText(text);

          const width = metrics.width;
          const ascent = metrics.actualBoundingBoxAscent;
          const descent = metrics.actualBoundingBoxDescent;
          const height = ascent;

          const x = this.x - width * this.anchorX;
          const y = this.y - height * this.anchorY + ascent;

          ctx.fillText(text, x, y);

          ctx.restore();
        }
      })),
    },
    time: () => frame / fps,
    frame: () => frame,
    advance,
    capture: async () => {
      const ctx = canvas.getContext('2d');
      for (const widget of widgets) {
        widget.drawTo(ctx);
        widget.advance(1 / fps);
      }
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      await fetch(`/upload?name=${name}&frame=${frame}`, {
        method: "POST",
        body: blob,
      });
      advance();
    },
  }
};
