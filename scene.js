(() => {
  "use strict";

  const canvas = document.querySelector("[data-scene-canvas]");
  const loading = document.querySelector("[data-scene-loading]");
  const loadingBar = document.querySelector("[data-scene-progress-bar]");
  const loadingLabel = document.querySelector("[data-scene-loading-label]");
  const sceneLabel = document.querySelector("[data-scene-label]");
  const sceneProgress = document.querySelector("[data-scene-progress]");
  if (!canvas) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
  const fallback = () => {
    document.body.classList.add("scene-fallback");
    canvas.hidden = true;
    if (loading) loading.remove();
  };
  if (!gl) { fallback(); return; }

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){ v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_frame0;
    uniform sampler2D u_frame1;
    uniform sampler2D u_frame2;
    uniform sampler2D u_frame3;
    uniform sampler2D u_mobile;
    uniform float u_progress;
    uniform float u_time;
    uniform float u_aspect;
    uniform float u_mobileMode;

    vec2 coverUv(vec2 uv, float imageAspect){
      float ratio = u_aspect / imageAspect;
      if (ratio > 1.0) uv.y = (uv.y - .5) * ratio + .5;
      else uv.x = (uv.x - .5) / ratio + .5;
      return uv;
    }
    vec3 sampleFrame(sampler2D tex, vec2 uv, float imageAspect){
      return texture2D(tex, coverUv(uv, imageAspect)).rgb;
    }
    vec3 frameAt(float index, vec2 uv){
      if(index < .5) return mix(sampleFrame(u_frame0, uv, 1.7778), sampleFrame(u_mobile, uv, .5625), u_mobileMode);
      if(index < 1.5) return sampleFrame(u_frame1, uv, 1.7778);
      if(index < 2.5) return sampleFrame(u_frame2, uv, 1.7778);
      return sampleFrame(u_frame3, uv, 1.7778);
    }
    float hash21(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float starField(vec2 uv){
      vec2 grid = uv * vec2(86.0, 48.0);
      vec2 cell = floor(grid);
      vec2 local = fract(grid) - .5;
      float seed = hash21(cell);
      float radius = mix(.018, .065, hash21(cell + 7.2));
      float dotShape = smoothstep(radius, 0.0, length(local));
      float active = step(.955, seed) * mix(.3, 1.0, hash21(cell + 2.4));
      return dotShape * active;
    }
    void main(){
      vec2 uv = v_uv;
      float p = clamp(u_progress, 0.0, 1.0);
      float stage = min(p * 3.0, 2.999);
      float index = floor(stage);
      float blend = smoothstep(0.0, 1.0, fract(stage));
      float drift = sin(u_time * .08 + p * 5.0) * .0025;
      uv += vec2(drift, cos(u_time * .06 + p * 4.0) * .0015);
      vec3 color = mix(frameAt(index, uv), frameAt(index + 1.0, uv), blend);
      float starVisibility = smoothstep(.42, .68, p);
      float stars = starField(uv + vec2(u_time * .0007 * (1.0 - p), 0.0)) * starVisibility;
      color += vec3(.78, .82, .9) * stars;
      float atmosphere = smoothstep(.55, .1, uv.y) * smoothstep(.2, .75, p);
      color += vec3(.025, .018, .01) * atmosphere;
      float vignette = smoothstep(1.08, .22, distance(uv, vec2(.5)));
      color *= mix(.72, 1.0, vignette);
      gl_FragColor = vec4(color, 1.0);
    }
  `;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn("Verto scene fallback:", error);
    fallback();
    return;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    progress: gl.getUniformLocation(program, "u_progress"),
    time: gl.getUniformLocation(program, "u_time"),
    aspect: gl.getUniformLocation(program, "u_aspect"),
    mobile: gl.getUniformLocation(program, "u_mobileMode")
  };
  const frameLocations = [0, 1, 2, 3, 4].map((index) => gl.getUniformLocation(program, ["u_frame0", "u_frame1", "u_frame2", "u_frame3", "u_mobile"][index]));
  const textures = [];
  const sources = [
    "./assets/rocket-sequence/web/01-rocket-before-launch.jpg",
    "./assets/rocket-sequence/web/02-rocket-takeoff.jpg",
    "./assets/rocket-sequence/web/03-rocket-atmosphere.jpg",
    "./assets/rocket-sequence/web/04-rocket-space.jpg",
    "./assets/rocket-sequence/web/01-rocket-before-launch-mobile.jpg"
  ];
  const makeTexture = (image, index) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(frameLocations[index], index);
    textures[index] = texture;
  };
  let loaded = 0;
  const images = sources.map((src, index) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      makeTexture(image, index);
      loaded += 1;
      const percent = Math.round((loaded / sources.length) * 100);
      if (loadingBar) loadingBar.style.width = `${percent}%`;
      if (loadingLabel) loadingLabel.textContent = `${percent}%`;
      if (loaded === sources.length && loading) {
        loading.classList.add("is-ready");
        window.setTimeout(() => loading.remove(), reducedMotion ? 0 : 420);
      }
    };
    image.onerror = () => {
      loaded += 1;
      if (loadingLabel) loadingLabel.textContent = "Ожидание ассетов";
    };
    image.src = src;
    return image;
  });
  void images;

  let progress = 0;
  let ticking = false;
  const labels = [
    [0, "01 / ЗЕМЛЯ"], [0.12, "02 / ЗАПУСК"], [0.25, "03 / ОБЛАКА"],
    [0.38, "04 / АТМОСФЕРА"], [0.52, "05 / ОРБИТА"], [0.65, "06 / СИГНАЛ"],
    [0.8, "07 / ЦЕНТР УПРАВЛЕНИЯ"], [0.88, "08 / СЛЕДУЮЩАЯ ТОЧКА"]
  ];
  const readProgress = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    const current = [...labels].reverse().find(([point]) => progress >= point) || labels[0];
    if (sceneLabel) sceneLabel.textContent = current[1];
    if (sceneProgress) sceneProgress.textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
  };
  const resize = () => {
    const cap = window.innerWidth < 700 ? 1.25 : 1.75;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uniforms.aspect, window.innerWidth / Math.max(1, window.innerHeight));
    readProgress();
  };
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => { readProgress(); ticking = false; });
      ticking = true;
    }
  };
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) ticking = false; });
  resize();

  const render = (timestamp) => {
    if (!document.hidden) {
      gl.uniform1f(uniforms.progress, progress);
      gl.uniform1f(uniforms.time, reducedMotion ? 0 : timestamp * .001);
      gl.uniform1f(uniforms.mobile, window.innerWidth < 700 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    window.requestAnimationFrame(render);
  };
  window.requestAnimationFrame(render);
})();
