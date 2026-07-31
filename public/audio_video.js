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
      const $progress = document.querySelector('#video-progress');
      $progress.textContent = `${frame} frame${frame == 1 ? '' : 's'} rendered (${(frame / fps).toFixed(2)}s)`;
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
        
        data.push(fn(t, n, sampleRate)); 
        samples++;
      }

      const $progress = document.querySelector('#audio-progress');
      $progress.textContent = `${samples} sample${samples == 1 ? '' : 's'} rendered (${(samples / sampleRate).toFixed(2)}s)`;
    },

    async save() {
      const wav = encodeWav(Float32Array.from(data), sampleRate, channels);
      await fetch(`http://localhost:8080/audio?name=${name}`, {
        method: 'POST',
        body: wav
      });
    }
  };
};

const Sound = () => {
  const parseParam = (p) => (typeof p === 'function' ? p : () => p);
  const wrap = (p) => ((p % 1) + 1) % 1;

  const createOscillator = (waveShapeFn) => (freqParam, phaseOffset = 0) => {
    const f = parseParam(freqParam);
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
  
  return {
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
    exp: (beta) => (t) => Math.exp(-beta * t),
  };
};