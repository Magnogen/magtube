const Audio = (name = "project", fps = 30, { sampleRate = 48000, channels = 1 } = {}) => {
  const samplesPerFrame = sampleRate / fps;
  const data = [];
  let samples = 0;

  function encodeWav(samples, sampleRate = 48000, channels = 1) {
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    let offset = 0;

    const writeString = (s) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset++, s.charCodeAt(i));
      }
    };

    // RIFF header
    writeString('RIFF');
    view.setUint32(offset, 36 + dataSize, true); offset += 4;
    writeString('WAVE');

    // fmt chunk
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4; // PCM chunk size
    view.setUint16(offset, 1, true); offset += 2;  // PCM format
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2; // bits per sample

    // data chunk
    writeString('data');
    view.setUint32(offset, dataSize, true); offset += 4;

    // PCM samples
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      // convert float [-1,1] to signed 16-bit
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  }

  return {
    pushFrame(fn) {
      const startSample = data.length;

      for (let i = 0; i < samplesPerFrame; i++) {
        const n = startSample + i;
        const t = n / sampleRate;
        
        const value = fn(t, n, sampleRate);

        if (typeof value != 'number') {
          console.error(value);
          throw new Error('Expected number, but got above ^');
        }

        data.push(value);
        samples++;
      }

      const $progress = document.querySelector('#audio-progress');
      $progress.textContent = `${samples} sample${samples == 1 ? '' : 's'} rendered (${(samples / sampleRate).toFixed(2)}s)`;
    },

    async save() {
      const wav = encodeWav(Float32Array.from(data), sampleRate, channels);
      await fetch(`/audio?name=${name}`, {
        method: 'POST',
        body: wav
      });
    }
  };
};

const Sound = () => {
  const parseParam = (p) => (typeof p === 'function' ? p : () => p);
  const wrap = (p) => ((p % 1) + 1) % 1;

  const createOscillator = (waveShapeFn) => (freq, phaseOffset = 0) => {
    const f = parseParam(freq);
    const offset = parseParam(phaseOffset);

    let phase = 0;
    let lastN = -1;

    return (t, n, sampleRate) => {
      if (n > lastN) {
        const dt = 1 / sampleRate;
        phase = wrap(phase + f(t, n, sampleRate) * dt);
        lastN = n;
      }
      const currentOffset = offset(t, n, sampleRate);
      return waveShapeFn(wrap(phase + currentOffset), t, n, sampleRate);
    };
  };
  
  const NOTE_MAP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  
  const api = {
    n: (str) => {
      const [_, name, accidental, oct] = str.match(/([A-G])([#b]?)(-?\d+)/);
      let semitone = NOTE_MAP[name];
      if (accidental === '#') semitone += 1;
      if (accidental === 'b') semitone -= 1;
      
      const midi = (parseInt(oct) + 1) * 12 + semitone;
      return 440 * Math.pow(2, (midi - 69) / 12);
    },
    sin: createOscillator((p) => Math.sin(2 * Math.PI * p)),
    saw: createOscillator((p) => 2 * p - 1),
    triangle: createOscillator((p) => Math.abs(4 * p - 2) - 1),
    square: (freqParam, dutyParam = 0.5, phaseOffset = 0) => {
      const duty = parseParam(dutyParam);
      return createOscillator((p, t, n, sampleRate) => 
        p < duty(t, n, sampleRate) ? 1 : -1
      )(freqParam, phaseOffset);
    },
    add: (...params) => {
      const fns = params.map(parseParam);
      return (t, n, sampleRate) => fns.reduce((acc, fn) => acc + fn(t, n, sampleRate), 0);
    },
    mul: (...params) => {
      const fns = params.map(parseParam);
      return (t, n, sampleRate) => fns.reduce((acc, fn) => acc * fn(t, n, sampleRate), 1);
    },
    exp: (curve) => (t) => Math.exp(-curve * t),
    adsr: ({
      attack = 0.01,
      decay = 0.1,
      sustain = 0.7,
      release = 0.2,
      gate = 1.0,
    } = {}) => (t) => {
      if (t < 0) return 0;
      if (t < attack) return t / attack;
      t -= attack;
      if (t < decay) return 1 - (1 - sustain) * (t / decay);
      t -= decay;
      const sustainTime = Math.max(0, gate - attack - decay);
      if (t < sustainTime) return sustain;
      t -= sustainTime;
      if (t < release) return sustain * (1 - t / release);
      return 0;
    },
    expAdsr: ({
      attack = 0.01,
      decay = 0.1,
      sustain = 0.7,
      release = 0.2,
      gate = 1.0,
      curve = 6,
    } = {}) => {
      const rise = (x) =>
        (1 - Math.exp(-curve * x)) /
        (1 - Math.exp(-curve));
      const fall = (x) => Math.exp(-curve * x);
      return (t) => {
        if (t < 0) return 0;
        if (t < attack) return rise(t / attack);
        t -= attack;
        if (t < decay) return sustain + (1 - sustain) * fall(t / decay);
        t -= decay;
        const sustainTime = Math.max(0, gate - attack - decay);
        if (t < sustainTime) return sustain;
        t -= sustainTime;
        if (t < release) return sustain * fall(t / release);
        return 0;
      };
    },
    delay: (
      input,
      delayTime = 0.3,
      feedback = 0.4,
      mix = 0.5
    ) => {
      const src = parseParam(input);

      let buffer = null;
      let index = 0;
      let lastSampleRate = null;

      return (t, n, sampleRate) => {
        if (!buffer || sampleRate !== lastSampleRate) {
          const size = Math.max(1, Math.round(delayTime * sampleRate));
          buffer = new Float32Array(size);
          index = 0;
          lastSampleRate = sampleRate;
        }

        const dry = src(t, n, sampleRate);
        const delayed = buffer[index];

        buffer[index] = dry + delayed * feedback;

        index++;
        if (index >= buffer.length) index = 0;

        return dry * (1 - mix) + delayed * mix;
      };
    },
    comb: (input, delayTime, feedback) => {
      const src = parseParam(input);
      let buffer = null, index = 0, lastSR = 0;

      return (t, n, sr) => {
        if (!buffer || sr !== lastSR) {
          buffer = new Float32Array(Math.max(1, Math.round(delayTime * sr)));
          index = 0;
          lastSR = sr;
        }

        const x = src(t, n, sr);
        const y = buffer[index];

        buffer[index] = x + y * feedback;

        index = (index + 1) % buffer.length;
        return y;
      };
    },
    allpass: (input, delayTime, gain = 0.5) => {
      const src = parseParam(input);
      let buffer = null, index = 0, lastSR = 0;

      return (t, n, sr) => {
        if (!buffer || sr !== lastSR) {
          buffer = new Float32Array(Math.max(1, Math.round(delayTime * sr)));
          index = 0;
          lastSR = sr;
        }

        const x = src(t, n, sr);
        const buf = buffer[index];

        const y = -gain * x + buf;
        buffer[index] = x + gain * y;

        index = (index + 1) % buffer.length;
        return y;
      };
    },
    reverb: (input, { room = 0.8, damp = 0.6, mix = 0.3 } = {}) => {
      const src = parseParam(input);
      const combs = [
        api.comb(src, 0.0371, room * damp),
        api.comb(src, 0.0411, room * damp),
        api.comb(src, 0.0437, room * damp),
        api.comb(src, 0.0297, room * damp),
      ];

      const combSum = (t, n, sr) =>
        combs.reduce((s, c) => s + c(t, n, sr), 0) / combs.length;

      const ap1 = api.allpass(combSum, 0.005, 0.7);
      const ap2 = api.allpass(ap1,    0.0017, 0.7);

      return (t, n, sr) => {
        const dry = src(t, n, sr);
        const wet = ap2(t, n, sr);

        return dry * (1 - mix) + wet * mix;
      };
    },
  };

  return api;
};