const color = (l, a, b, t = 1) => ({
  l, a, b, t,
  lightness(v) { return color(v, this.a, this.b, this.t); },
  lighten(d) { return this.lightness(this.l + d); },
  darken(d)  { return this.lightness(this.l - d); },
  chroma(v) {
    const h = Math.atan2(this.b, this.a);
    return color(
      this.l,
      v * Math.cos(h),
      v * Math.sin(h),
      this.t,
    );
  },
  sat(d)   { return this.chroma(Math.max(0, Math.sqrt(this.a ** 2 + this.b ** 2) + d)); },
  desat(d) { return this.chroma(Math.max(0, Math.sqrt(this.a ** 2 + this.b ** 2) - d)); },
  hue(deg) {
    const c = Math.sqrt(this.a ** 2 + this.b ** 2);
    const rad = deg * Math.PI / 180;
    return color(
      this.l,
      c * Math.cos(rad),
      c * Math.sin(rad),
      this.t
    );
  },
  rotate(d) { return this.hue(Math.atan2(this.b, this.a)*180/Math.PI  + d); },
  alpha(v) { return color(this.l, this.a, this.b, v); },
  css() { return `oklab(${this.l} ${this.a} ${this.b} / ${this.t})`; }
});

const red     = color(0.5, 0, 0).chroma(0.2).hue(20 +  0*360/12);
const orange  = color(0.6, 0, 0).chroma(0.2).hue(20 +  1*360/12);
const yellow  = color(0.7, 0, 0).chroma(0.2).hue(20 +  2*360/12);
const lime    = color(0.6, 0, 0).chroma(0.2).hue(20 +  3*360/12);
const green   = color(0.5, 0, 0).chroma(0.2).hue(20 +  4*360/12);
const teal    = color(0.5, 0, 0).chroma(0.2).hue(20 +  5*360/12);
const cyan    = color(0.5, 0, 0).chroma(0.2).hue(20 +  6*360/12);
const azure   = color(0.5, 0, 0).chroma(0.2).hue(20 +  7*360/12);
const blue    = color(0.5, 0, 0).chroma(0.2).hue(20 +  8*360/12);
const purple  = color(0.5, 0, 0).chroma(0.2).hue(20 +  9*360/12);
const magenta = color(0.5, 0, 0).chroma(0.2).hue(20 + 10*360/12);
const rose    = color(0.5, 0, 0).chroma(0.2).hue(20 + 11*360/12);

const black   = color(0, 0, 0);
const white   = color(1, 0, 0);
const gray    = (l) => color(l, 0, 0);

const Video = (name = 'project', width = 1920, height = 1080, fps = 30) => {
  let frame = 0;
  let widgets = [];

  const canvas = document.querySelector('canvas');
  canvas.width = width;
  canvas.height = height;
  const advance = () => {
    const ctx = canvas.getContext('2d');
    for (const widget of widgets) {
      widget.drawTo(ctx);
      widget.advance(1 / fps);
    }
    frame++;
    const $progress = document.querySelector('#video-progress');
    $progress.textContent = `${frame} frame${frame == 1 ? '' : 's'} rendered (${(frame / fps).toFixed(2)}s)`;
  };
  const capture = async () => {
    advance();
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    await fetch(`/upload?name=${name}&frame=${frame}`, {
      method: "POST",
      body: blob,
    });
  };
  const wait = async (time, doCapture = true) => {
    const start = frame / fps;
    while (frame / fps < start + time) {
      if (doCapture) {
        await capture();
      } else {
        advance();
        await new Promise(requestAnimationFrame);
      }
    }
  }

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
    let stiffness = options.stiffness ?? 1;
    let response = options.response ?? 0;

    let k1, k2, k3;
    const updateConstants = () => {
      k1 = stiffness / (Math.PI * frequency);
      k2 = 1 / ((2 * Math.PI * frequency) ** 2);
      k3 = response * stiffness / (2 * Math.PI * frequency);
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
      get stiffness() { return stiffness; },
      set stiffness(v) { stiffness = v; updateConstants(); },
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
    let yd = color(0, 0, 0, 0);

    let frequency = options.frequency ?? 1;
    let stiffness = options.stiffness ?? 0.5;
    let response = options.response ?? 0;

    let k1, k2, k3;
    const updateConstants = () => {
      k1 = stiffness / (Math.PI * frequency);
      k2 = 1 / ((2 * Math.PI * frequency) ** 2);
      k3 = response * stiffness / (2 * Math.PI * frequency);
    };
    updateConstants();
    
    const update = (dt) => {
      if (dt <= 0) return;
      const xd = color(
        (x.l - xp.l) / dt,
        (x.a - xp.a) / dt,
        (x.b - xp.b) / dt,
        (x.t - xp.t) / dt
      );
      xp = x;
      const k2_stable = Math.max(
        k2,
        1.1 * (dt * dt / 4 + dt * k1 / 2)
      );
      y = color(
        y.l + dt * yd.l,
        y.a + dt * yd.a,
        y.b + dt * yd.b,
        y.t + dt * yd.t
      );

      yd = color(
        yd.l + dt * (x.l + k3 * xd.l - y.l - k1 * yd.l) / k2_stable,
        yd.a + dt * (x.a + k3 * xd.a - y.a - k1 * yd.a) / k2_stable,
        yd.b + dt * (x.b + k3 * xd.b - y.b - k1 * yd.b) / k2_stable,
        yd.t + dt * (x.t + k3 * xd.t - y.t - k1 * yd.t) / k2_stable
      );
    };

    return {
      [IS_SPRING]: true,
      update,
      get value() { return y; },
      set value(v) {
        y = xp = x = v;
        yd = color(0, 0, 0, 0);
      },
      get target() { return x; },
      set target(v) { x = v; },
      get velocity() { return yd; },
      set velocity(v) { yd = v; },
      get frequency() { return frequency; },
      set frequency(v) { frequency = v; updateConstants(); },
      get stiffness() { return stiffness; },
      set stiffness(v) { stiffness = v; updateConstants(); },
      get response() { return response; },
      set response(v) { response = v; updateConstants(); },
      set(v) { this.value = v; return this; },
      animate(v) { this.target = v; return this; },
      impulse(v) {
        this.velocity = color(
          this.velocity.l + (v.l ?? 0),
          this.velocity.a + (v.a ?? 0),
          this.velocity.b + (v.b ?? 0),
          this.velocity.t + (v.t ?? 0)
        );
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
        style: {
          size: spring(16),
          family: "sans-serif",
          weight: spring(400),
          color: springColor(black),
        },
        x: spring(0),
        y: spring(0),
        anchorX: spring(0.5),
        anchorY: spring(0.5),
        transform: {
          scale: spring(1),
          squash: spring(0),
          lean: spring(0),
          rotation: spring(0),
        },
        advance(dt) {
          this.progress.update(dt);
          this.style.size.update(dt);
          this.style.weight.update(dt);
          this.style.color.update(dt);
          this.x.update(dt);
          this.y.update(dt);
          this.anchorX.update(dt);
          this.anchorY.update(dt);
          this.transform.scale.update(dt);
          this.transform.squash.update(dt);
          this.transform.lean.update(dt);
          this.transform.rotation.update(dt);
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

          ctx.translate(this.x, this.y);

          ctx.scale(this.transform.scale, this.transform.scale);

          const scaleX = 1 - this.transform.squash;
          const scaleY = 1 + this.transform.squash;
          ctx.scale(scaleX, scaleY);

          ctx.transform(
            1, 0,
            this.transform.lean, 1,
            0, 0
          );

          ctx.rotate(this.transform.rotation * Math.PI / 180);

          const x = -width * this.anchorX;
          const y = -height * this.anchorY + ascent;

          ctx.fillText(text, x, y);

          ctx.restore();
        },
      })),
    },
    time: () => frame / fps,
    frame: () => frame,
    advance,
    capture,
    wait,
  }
};
