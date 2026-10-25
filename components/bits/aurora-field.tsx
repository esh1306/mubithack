"use client";

import { useEffect, useRef } from "react";

/*
 * Full-page WebGL backdrop: soft aurora ribbons over a light sky gradient, with three
 * parallax sparkle layers that drift with the pointer and the scroll position.
 * Inspired by Vanta / react-bits Aurora + Galaxy, written raw so it doesn't
 * pull in a second copy of three.js.
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uScroll;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }

float ribbon(vec2 p, float y0, float speed, float seed){
  float t = uTime * speed;
  float wave = fbm(vec2(p.x * 0.9 + t + seed, t * 0.6 + seed)) - 0.5;
  float d = p.y - y0 - wave * 0.55 - 0.08 * sin(p.x * 2.2 + t * 2.0 + seed);
  float band = exp(-d * d * 26.0);
  float curtain = fbm(vec2(p.x * 7.0 + seed, p.y * 1.5 - t * 3.0));
  float rays = 0.55 + 0.45 * curtain;
  return band * rays * smoothstep(-0.02, 0.25, d + 0.25);
}

float stars(vec2 p, float scale, float thresh){
  vec2 q = p * scale; vec2 c = floor(q); vec2 f = fract(q) - 0.5;
  float h = hash(c);
  if (h < thresh) return 0.0;
  vec2 o = (vec2(hash(c + 3.1), hash(c + 7.7)) - 0.5) * 0.6;
  float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
  return smoothstep(0.09, 0.0, length(f - o)) * tw * (h - thresh) / (1.0 - thresh);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float s = uScroll;

  vec3 top = vec3(0.93, 0.965, 1.0);
  vec3 bot = vec3(0.70, 0.83, 1.0);
  vec3 col = mix(bot, top, smoothstep(0.0, 1.0, uv.y + s * 0.25));
  col = mix(col, vec3(1.0), 0.45 * exp(-length(p - vec2(0.45, 0.05)) * 2.2));

  vec2 ap = p + uMouse * 0.04 + vec2(0.0, s * 0.35);
  float r1 = ribbon(ap, 0.22, 0.045, 0.0);
  float r2 = ribbon(ap, -0.05, 0.035, 4.3);
  float r3 = ribbon(ap * vec2(1.2, 1.0), 0.42, 0.05, 9.1);
  vec3 sky = vec3(0.45, 0.72, 1.0), periwinkle = vec3(0.62, 0.64, 1.0), coral = vec3(1.0, 0.72, 0.66);
  col = mix(col, sky, clamp(r1 * 0.45, 0.0, 1.0));
  col = mix(col, periwinkle, clamp(r2 * 0.4, 0.0, 1.0));
  col = mix(col, mix(vec3(1.0), coral, 0.35 + 0.25 * sin(uTime * 0.2)), clamp(r3 * 0.5, 0.0, 1.0));

  for (int l = 1; l <= 3; l++){
    float fl = float(l);
    vec2 sp = p + uMouse * 0.012 * fl + vec2(uTime * 0.004 * fl, s * 0.12 * fl - uTime * 0.006 * fl);
    col = mix(col, vec3(1.0), clamp(stars(sp, 14.0 + fl * 16.0, 0.95 + fl * 0.01) * (1.1 - fl * 0.2), 0.0, 1.0));
  }

  col *= 1.0 - 0.12 * pow(length(uv - vec2(0.5, 0.6)) * 1.2, 2.0);
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.01;
  gl_FragColor = vec4(col, 1.0);
}`;

export function AuroraField({ className, reduced }: { className?: string; reduced?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uScroll = gl.getUniformLocation(prog, "uScroll");

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.floor(canvas!.clientWidth * dpr),
        h = Math.floor(canvas!.clientHeight * dpr);
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
      }
      gl!.viewport(0, 0, w, h);
      gl!.uniform2f(uRes, w, h);
    }

    function draw(t: number) {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      gl!.uniform1f(uTime, t);
      gl!.uniform2f(uMouse, mouse.x, mouse.y);
      gl!.uniform1f(uScroll, window.scrollY / max);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      draw((now - start) / 1000);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(12);
    });
    ro.observe(canvas);
    resize();

    if (reduced) {
      draw(12);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
