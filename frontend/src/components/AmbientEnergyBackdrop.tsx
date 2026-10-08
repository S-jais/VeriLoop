'use client';

import React, { useEffect, useRef } from 'react';

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision mediump float;uniform vec3 uTint;uniform vec2 uR;uniform float uT,uS,uL,uE;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
 vec2 p=gl_FragCoord.xy/uR.y*1.5;p.y+=uS;float t=uT*.045;
 vec2 q=vec2(fbm(p+vec2(t,0.)),fbm(p+vec2(5.2,1.3)-t));
 vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*1.6),fbm(p+3.*q+vec2(8.3,2.8)-t*1.2));
 float f=fbm(p+3.*r);
 float d=smoothstep(.32,.95,f);
 vec3 cy=uTint,bl=mix(vec3(.1,.32,1.),uTint*.8,.55),hi=mix(uTint,vec3(1.),.6);
 vec3 c=mix(bl,cy,smoothstep(.3,.85,f));c=mix(c,hi,smoothstep(.55,1.,r.x*f*2.2)*.5);
 float a=d*.42*(1.+uE*1.1);
 if(uL>.5){c=mix(uTint*.45,uTint*.72,smoothstep(.3,.85,f));a=d*.22*(1.+uE*1.1);}
 gl_FragColor=vec4(c*a,a);}`;

export function AmbientEnergyBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const RM = window.matchMedia('(prefers-reduced-motion: reduce)');

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = cv.getContext('webgl', {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
      });
    } catch {
      // handled
    }

    if (!gl) {
      cv.classList.add('nogl');
      return;
    }

    const mk = (t: number, x: string) => {
      const o = gl!.createShader(t);
      if (!o) return null;
      gl!.shaderSource(o, x);
      gl!.compileShader(o);
      return gl!.getShaderParameter(o, gl!.COMPILE_STATUS) ? o : null;
    };

    const v = mk(gl.VERTEX_SHADER, VS);
    const fs = mk(gl.FRAGMENT_SHADER, FS);
    if (!v || !fs) {
      cv.classList.add('nogl');
      return;
    }

    const pg = gl.createProgram();
    if (!pg) {
      cv.classList.add('nogl');
      return;
    }

    gl.attachShader(pg, v);
    gl.attachShader(pg, fs);
    gl.linkProgram(pg);

    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) {
      cv.classList.add('nogl');
      return;
    }

    gl.useProgram(pg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const al = gl.getAttribLocation(pg, 'p');
    gl.enableVertexAttribArray(al);
    gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);

    const U: Record<string, WebGLUniformLocation | null> = {};
    ['uR', 'uT', 'uS', 'uL', 'uTint', 'uE'].forEach((k) => {
      U[k] = gl!.getUniformLocation(pg, k);
    });

    gl.clearColor(0, 0, 0, 0);

    let T = 6;
    let raf = 0;
    let light = 0;
    let lt = 0;
    let q = 0.5;
    const tc: [number, number, number] = [0.13, 0.82, 0.9];
    const CY: [number, number, number] = [0.13, 0.82, 0.9];
    let ev = 0;
    let frameLastTs = 0;
    let slow = 0;
    let fn = 0;

    const isLight = () => {
      const t = document.documentElement.dataset.t;
      return (
        t === 'light' ||
        (t !== 'dark' &&
          window.matchMedia('(prefers-color-scheme: light)').matches)
      );
    };

    const size = () => {
      if (!cv || !gl) return;
      cv.width = Math.max(2, Math.round(window.innerWidth * q));
      cv.height = Math.max(2, Math.round(window.innerHeight * q));
      gl.viewport(0, 0, cv.width, cv.height);
    };

    const tint = (dt: number) => {
      const w = window as any;
      const live = performance.now() - (w.VL_TS || 0) < 400;
      const tg = live && w.VL_TINT ? w.VL_TINT : CY;
      const k = 1 - Math.exp(-dt / 260);
      for (let i = 0; i < 3; i++) {
        tc[i] += (tg[i] - tc[i]) * k;
      }
      ev += ((live ? w.VL_E || 0 : 0) - ev) * k;
    };

    const draw = () => {
      if (!gl) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3fv(U.uTint, tc);
      gl.uniform1f(U.uE, ev);
      gl.uniform2f(U.uR, cv.width, cv.height);
      gl.uniform1f(U.uT, T);
      gl.uniform1f(U.uS, window.scrollY * 0.0009);
      gl.uniform1f(U.uL, light);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (ts: number) => {
      raf = 0;
      if (document.hidden) return;
      if (!frameLastTs) frameLastTs = ts;
      const dt = Math.min(60, ts - frameLastTs);
      frameLastTs = ts;

      T += dt / 1000;
      tint(dt);

      if (ts - lt > 600) {
        lt = ts;
        light = isLight() ? 1 : 0;
      }

      slow = slow * 0.95 + dt * 0.05;
      if (slow > 30 && q > 0.3 && ++fn % 40 === 0) {
        q -= 0.08;
        size();
      }

      draw();
      raf = requestAnimationFrame(frame);
    };

    const go = () => {
      if (!raf && !RM.matches) {
        frameLastTs = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const handleResize = () => {
      size();
      if (!raf) draw();
    };

    const handleScroll = () => {
      if (!raf) draw();
    };

    const handleVisibility = () => {
      go();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    size();
    light = isLight() ? 1 : 0;
    draw();
    go();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas id="smoke" ref={canvasRef} aria-hidden="true" />;
}
