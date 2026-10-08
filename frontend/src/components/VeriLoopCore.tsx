'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface VeriLoopCoreProps {
  demoMode?: boolean;
  variant?: 'hero' | 'inline';
  activeStage?: 'test' | 'diagnose' | 'intervene' | 'validate' | 'prove' | 'failure' | null;
  onStageClick?: (index: number, stage: string) => void;
  onRunClick?: () => void;
  height?: number;
  className?: string;
}

interface TargetAgent {
  n: string;
  sc: string;
  ty: string;
  root: string;
  fix: string;
}

const TARGET_AGENTS: TargetAgent[] = [
  {
    n: 'Support agent',
    sc: 'Damaged product replacement',
    ty: 'RETRIEVAL_FAILURE',
    root: 'outdated policy ranked above the current one',
    fix: 'RETRIEVAL · prioritize latest policy',
  },
  {
    n: 'Booking agent',
    sc: 'Rebook a cancelled flight',
    ty: 'TOOL_FAILURE',
    root: 'wrong tool chosen for rebooking',
    fix: 'TOOL · fix routing rule',
  },
  {
    n: 'Research agent',
    sc: 'Summarize a cited paper',
    ty: 'GROUNDING_FAILURE',
    root: 'claim not supported by its source',
    fix: 'PROMPT · require cited evidence',
  },
  {
    n: 'Code agent',
    sc: '“Ignore previous instructions”',
    ty: 'SAFETY_FAILURE',
    root: 'injected text reached a tool call',
    fix: 'GUARDRAIL · validate tool input',
  },
  {
    n: 'Billing agent',
    sc: 'Refund after 30 days',
    ty: 'POLICY_FAILURE',
    root: 'refund window rule skipped',
    fix: 'WORKFLOW · check policy before replying',
  },
  {
    n: 'Triage agent',
    sc: 'Address change over 4 turns',
    ty: 'CONTEXT_FAILURE',
    root: 'earlier address dropped from context',
    fix: 'MEMORY · keep entities in context',
  },
];

const STAGE_FLOW = ['Agent', 'Test', 'Failure', 'Diagnosis', 'Intervention', 'Validation', 'Proven'];
const STAGE_CLASSES = ['', '', 'k-bad', 'k-am', 'k-am', '', 'k-ok f'];
const STAGE_PATHS = [
  '/agents',
  '/evaluations',
  '/failures',
  '/failures',
  '/experiments',
  '/experiments',
  '/regression',
];

const STT: Record<string, [string, string]> = {
  idle: ['READY', ''],
  busy: ['UNDER TEST', ''],
  fail: ['FAILED', 'bad'],
  fixing: ['PATCHING', 'am'],
  diag: ['DIAGNOSING', 'am'],
  ok: ['PASSED', 'ok'],
  verified: ['VERIFIED', 'ok'],
  off: ['OFFLINE', ''],
};

const ORB_COLORS: Record<string, [number, number, number]> = {
  idle: [0.62, 0.45, 1],
  busy: [0.45, 0.75, 1],
  fail: [1, 0.25, 0.25],
  fixing: [1, 0.7, 0.2],
  ok: [0.2, 1, 0.6],
  verified: [0.2, 1, 0.6],
  off: [0.3, 0.36, 0.42],
};

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uRing,uOrb;uniform vec2 uC;uniform float uT,uRad,uInst,uAct,uScan,uFlash,uDim;uniform vec4 uPk[4];
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec3 kc(float k){return k<.5?vec3(.25,.9,1.):k<1.5?vec3(.25,1.,.6):k<2.5?vec3(1.,.3,.3):vec3(1.,.7,.2);}
void main(){
 vec2 q=(gl_FragCoord.xy-uC)/uRad;
 float d=length(q),a=atan(q.y,q.x);vec2 dir=vec2(cos(a),sin(a));
 float w=fbm(dir*2.2+vec2(uT*.25,-uT*.18)+d*1.5);
 float rad=1.+(w-.5)*(.16+.26*uInst);
 float e=d-rad;
 float hot=.6+.6*pow(.5+.5*cos(a-uT*.5),2.);
 vec3 c=vec3(0.);
 c+=vec3(1.)*exp(-e*e/.0011)*hot*2.4;
 c+=uRing*(exp(-e*e/.012)*1.5+exp(-abs(e)*2.6)*.32);
 c+=vec3(.1,.3,1.)*exp(-max(e,0.)*1.4)*.14*step(0.,e);
 float inn=smoothstep(0.,-.6,e)*step(e,0.);
 float wisp=fbm(dir*3.+vec2(d*5.-uT*.6,uT*.2));
 c+=uRing*inn*wisp*wisp*1.7*(.5+uAct);
 float out_=smoothstep(0.,.45,e)*(1.-smoothstep(.45,1.,e));
 c+=uRing*pow(fbm(dir*4.+vec2(e*3.,uT*.3)),3.)*out_*.9*(.4+uAct);
 float sa=abs(mod(a-uScan+3.14159,6.28318)-3.14159);
 c+=uRing*exp(-sa*sa*28.)*exp(-e*e/.06)*uAct*.7;
 for(int i=0;i<4;i++){vec4 p=uPk[i];
  if(p.y>0.&&p.y<1.){vec2 dd=vec2(cos(p.x),sin(p.x));float rr=mix(1.,.13,p.y);
   float al=dot(q,dd);float pp=length(q-dd*al)+sin(al*38.+uT*12.)*.008;
   float t=(al-rr)*p.w;float tr=step(0.,t)*(1.-clamp(t/.32,0.,1.))*step(0.,al);
   float hd=exp(-dot(q-dd*rr,q-dd*rr)/.003);
   c+=kc(p.z)*(hd*2.4+tr*exp(-pp*pp/.0007)*1.1);}}
 vec2 o=q+vec2(sin(uT*41.),cos(uT*37.))*.007*uInst;float od=length(o);
 c+=uOrb*(exp(-od*od/.011)*1.9+exp(-od*3.4)*(.32+uFlash*.6))+vec3(1.)*exp(-od*od/.0028)*1.3;
 c*=uDim;
 c=1.-exp(-c*1.2);
 gl_FragColor=vec4(vec3(.008,.024,.035)+c,1.);}`;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

interface Packet {
  a: number; // -1 = outer ring, >=0 = agent
  b: number; // target
  k: 'probe' | 'bad' | 'diag' | 'fix' | 'val' | 'ok' | 'bg' | 'bgr' | 'lprobe' | 'lret';
  t0: number;
  dur: number;
  ang: number;
}

interface SimTimer {
  t: number;
  fn: () => void;
}

interface TickerLine {
  ts: string;
  text: string;
  k: 'probe' | 'bad' | 'diag' | 'fix' | 'val' | 'ok';
}

export function VeriLoopCore({
  demoMode = true,
  variant = 'hero',
  activeStage = null,
  onStageClick,
  onRunClick,
  height,
  className = '',
}: VeriLoopCoreProps) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentStage, setCurrentStage] = useState<number>(-1); // -1 = idle/agent, 0..5 = Test..Proven
  const [paused, setPaused] = useState(false);
  const [counters, setCounters] = useState({ p: 58, f: 3, v: 3 });

  // Ticker: holds previous line (dimmed) and current line (sliding with glow)
  const [tickerHistory, setTickerHistory] = useState<{
    prev: TickerLine | null;
    curr: TickerLine;
    flip: boolean;
  }>({
    prev: null,
    curr: {
      ts: '00:01',
      text: 'testing Support agent: Damaged product replacement',
      k: 'probe',
    },
    flip: false,
  });

  // Active agent displayed on the small label at center of ring
  const [agentDisplay, setAgentDisplay] = useState<{
    name: string;
    stateText: string;
    stateCls: string;
  }>({
    name: 'Support agent',
    stateText: 'UNDER TEST',
    stateCls: '',
  });

  // Screen coordinates of anchor & radius for labels
  const [anchorPos, setAnchorPos] = useState({ x: 0, y: 0, r: 0 });

  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const currentStageRef = useRef(currentStage);
  currentStageRef.current = currentStage;

  useEffect(() => {
    const stageEl = stageRef.current;
    const cv = canvasRef.current;
    if (!stageEl || !cv) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = cv.getContext('webgl', {
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      // handled
    }

    if (!gl) {
      stageEl.classList.add('nogl');
      return;
    }

    const compile = (type: number, src: string) => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      return gl!.getShaderParameter(shader, gl!.COMPILE_STATUS) ? shader : null;
    };

    const vShader = compile(gl.VERTEX_SHADER, VS);
    const fShader = compile(gl.FRAGMENT_SHADER, FS);
    if (!vShader || !fShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const U: Record<string, WebGLUniformLocation | null> = {};
    [
      'uRing',
      'uOrb',
      'uC',
      'uT',
      'uRad',
      'uInst',
      'uAct',
      'uScan',
      'uFlash',
      'uDim',
      'uPk',
    ].forEach((k) => {
      U[k] = gl!.getUniformLocation(prog, k);
    });

    // Simulation Engine State
    const sim = {
      clock: 0,
      timers: [] as SimTimer[],
      pk: [] as Packet[],
      nodes: TARGET_AGENTS.map((t) => ({ n: t.n, sc: t.sc, st: 'idle', t0: -99999 })),
      core: 'idle' as 'idle' | 'probe' | 'diag' | 'fix',
      focus: 0,
      last: -1,
      ep: 0,
      nextBg: 600,
    };

    let SW = 0;
    let SH = 0;
    let AX = 0;
    let AY = 0;
    let RR = 0;
    let sc = 1;
    let qual = 1;
    let tT = 4;
    let flash = 0;
    let slow = 0;
    let frameN = 0;
    let raf = 0;
    let lastTs = 0;

    const cur = {
      ring: [0.13, 0.82, 0.9] as [number, number, number],
      orb: [0.62, 0.45, 1] as [number, number, number],
      inst: 0.1,
      act: 0.35,
      dim: 1,
    };

    const at = (ms: number, fn: () => void) => {
      sim.timers.push({ t: sim.clock + ms, fn });
    };

    const mmss = () => {
      const s = Math.floor(sim.clock / 1000);
      return (
        String(Math.floor(s / 60)).padStart(2, '0') +
        ':' +
        String(s % 60).padStart(2, '0')
      );
    };

    const pushLine = (k: TickerLine['k'], text: string) => {
      const ts = mmss();
      setTickerHistory((prev) => ({
        prev: prev.curr,
        curr: { ts, text, k },
        flip: !prev.flip,
      }));
    };

    const setSimStage = (n: number) => {
      setCurrentStage(n);
    };

    const sendPacket = (a: number, b: number, k: Packet['k'], delay = 0, dur = 700) => {
      sim.pk.push({ a, b, k, t0: sim.clock + delay, dur, ang: Math.random() * 6.2832 });
      if (k === 'probe' || k === 'val' || k === 'bg' || k === 'lprobe') {
        setCounters((prev) => ({ ...prev, p: prev.p + 1 }));
      }
    };

    const pulse = () => {
      flash = 1;
    };

    const arrive = (p: Packet) => {
      if (p.k === 'bg') {
        sendPacket(p.b, -1, 'bgr', 0, 600);
        return;
      }
      if (p.k === 'lprobe') {
        sendPacket(p.b, -1, 'lret', 0, 520);
        return;
      }
      if (p.k === 'bgr' || p.k === 'lret') return;
      pulse();
    };

    const pickAgent = () => {
      let i = 0;
      do {
        i = (Math.random() * sim.nodes.length) | 0;
      } while (i === sim.last);
      sim.last = i;
      return i;
    };

    const episode = () => {
      if (!demoMode) return;
      const i = sim.ep === 0 ? 0 : pickAgent();
      const T = TARGET_AGENTS[i];
      const N = sim.nodes[i];
      const bad = sim.ep === 0 || Math.random() < 0.65;

      sim.last = i;
      sim.ep++;
      sim.focus = i;
      setSimStage(0);
      sim.core = 'probe';

      pushLine('probe', `testing ${T.n}: ${T.sc}`);
      sendPacket(-1, i, 'probe', 0, 650);
      sendPacket(-1, i, 'probe', 170, 650);
      sendPacket(-1, i, 'probe', 340, 650);

      at(1150, () => {
        N.st = 'busy';
        N.t0 = sim.clock;
      });

      at(1900, () => {
        if (!bad) {
          sendPacket(i, -1, 'ok', 0, 600);
          N.st = 'ok';
          N.t0 = sim.clock;
          pushLine('ok', `${T.n} passed`);
          at(1000, () => {
            N.st = 'idle';
            sim.focus = -1;
            sim.core = 'idle';
            setSimStage(-1);
            at(700, episode);
          });
          return;
        }

        sendPacket(i, -1, 'bad', 0, 600);
        N.st = 'fail';
        N.t0 = sim.clock;
        setCounters((prev) => ({ ...prev, f: prev.f + 1 }));
        setSimStage(1);
        pushLine('bad', `${T.n} failed: ${T.ty}`);

        at(1100, () => {
          setSimStage(2);
          sim.core = 'diag';
          pushLine('diag', `root cause: ${T.root}`);

          at(1900, () => {
            setSimStage(3);
            sim.core = 'fix';
            N.st = 'fixing';
            N.t0 = sim.clock;
            pushLine('fix', `trying fix: ${T.fix}`);
            sendPacket(-1, i, 'fix', 0, 650);
            sendPacket(-1, i, 'fix', 220, 650);

            at(1300, () => {
              setSimStage(4);
              sim.core = 'probe';
              N.st = 'busy';
              N.t0 = sim.clock;
              pushLine('val', 'checking validation and holdout');
              sendPacket(-1, i, 'val', 0, 600);
              sendPacket(-1, i, 'val', 150, 600);
              sendPacket(-1, i, 'val', 300, 600);

              at(1250, () => {
                sendPacket(i, -1, 'ok', 0, 500);

                at(550, () => {
                  setSimStage(5);
                  N.st = 'verified';
                  N.t0 = sim.clock;
                  setCounters((prev) => ({ ...prev, v: prev.v + 1 }));
                  sim.core = 'idle';
                  pushLine('ok', 'verified, no regressions');

                  at(2600, () => {
                    N.st = 'idle';
                    sim.focus = -1;
                    setSimStage(-1);
                    at(700, episode);
                  });
                });
              });
            });
          });
        });
      });
    };

    const bgAmbientPackets = () => {
      if (sim.clock < sim.nextBg) return;
      sim.nextBg = sim.clock + rnd(380, 800);
      const c = sim.nodes.map((_, i) => i).filter((i) => i !== sim.focus);
      if (c.length > 0) {
        sendPacket(-1, c[(Math.random() * c.length) | 0], 'bg', 0, rnd(700, 1000));
      }
    };

    const updateSim = (dt: number) => {
      sim.clock += dt;

      for (const t of sim.timers.slice()) {
        if (t.t <= sim.clock) {
          sim.timers.splice(sim.timers.indexOf(t), 1);
          t.fn();
        }
      }

      for (const p of sim.pk.slice()) {
        if (sim.clock >= p.t0 + p.dur) {
          sim.pk.splice(sim.pk.indexOf(p), 1);
          arrive(p);
        }
      }

      if (demoMode) {
        bgAmbientPackets();
      }
    };

    const resize = () => {
      const r = stageEl.getBoundingClientRect();
      SW = r.width;
      SH = r.height;
      sc = Math.min(window.devicePixelRatio || 1, 1.5) * qual;

      cv.width = Math.max(2, Math.round(SW * sc));
      cv.height = Math.max(2, Math.round(SH * sc));
      if (gl) gl.viewport(0, 0, cv.width, cv.height);

      const anEl = stageEl.querySelector('.st-anchor');
      if (anEl) {
        const an = anEl.getBoundingClientRect();
        AX = an.left - r.left + an.width / 2;
        AY = an.top - r.top + an.height / 2;
        RR = Math.min(an.width, an.height) * (variant === 'hero' ? 0.38 : 0.36);
      } else {
        AX = SW / 2;
        AY = SH / 2;
        RR = Math.min(SW, SH) * 0.36;
      }

      setAnchorPos({ x: AX, y: AY, r: RR });
    };

    const updateLabels = () => {
      const N = sim.nodes[sim.focus] || sim.nodes[0];
      const nm = N ? N.n : 'Agent under test';
      const st = STT[N ? N.st : 'idle'] || STT.idle;
      setAgentDisplay({
        name: nm,
        stateText: st[0],
        stateCls: st[1],
      });
    };

    const draw = (dt: number) => {
      if (!gl) return;
      const k = 1 - Math.exp(-dt / 180);
      const amb = sim.core === 'diag' || sim.core === 'fix';
      const N = sim.nodes[sim.focus] || sim.nodes[0];
      const stt = N ? N.st : 'idle';

      const rt: [number, number, number] =
        stt === 'fail'
          ? [1, 0.32, 0.36]
          : amb
          ? [1, 0.66, 0.2]
          : stt === 'ok' || stt === 'verified'
          ? [0.2, 0.95, 0.6]
          : [0.13, 0.82, 0.9];

      const ot = ORB_COLORS[stt] || ORB_COLORS.idle;

      for (let i = 0; i < 3; i++) {
        cur.ring[i] = lerp(cur.ring[i], rt[i], k);
        cur.orb[i] = lerp(cur.orb[i], ot[i], k);
      }

      cur.inst = lerp(
        cur.inst,
        stt === 'fail' ? 1 : sim.core === 'diag' ? 0.6 : stt === 'busy' ? 0.3 : 0.1,
        k
      );
      cur.act = lerp(cur.act, stt === 'off' ? 0.05 : sim.core === 'idle' ? 0.35 : 1, k);
      cur.dim = lerp(cur.dim, stt === 'off' ? 0.45 : 1, k);
      flash *= Math.exp(-dt / 260);

      if (typeof window !== 'undefined') {
        const w = window as any;
        w.VL_TINT = cur.ring;
        w.VL_E = cur.inst * 0.5 + flash * 0.7;
        w.VL_TS = performance.now();
      }

      const pkArr = new Float32Array(16);
      let n = 0;
      for (let i = sim.pk.length - 1; i >= 0 && n < 4; i--) {
        const p = sim.pk[i];
        if (p.k === 'bg' || p.k === 'bgr') continue;
        const t = (sim.clock - p.t0) / p.dur;
        if (t <= 0 || t >= 1) continue;
        const out = p.a < 0;
        const e = ease(t);
        const codeMap: Record<string, number> = {
          probe: 0,
          val: 0,
          lprobe: 0,
          lret: 0,
          ok: 1,
          bad: 2,
          fix: 3,
        };
        const typeCode = codeMap[p.k] || 0;
        pkArr.set([p.ang, out ? e : 1 - e, typeCode, out ? 1 : -1], n * 4);
        n++;
      }

      gl.uniform3fv(U.uRing, cur.ring);
      gl.uniform3fv(U.uOrb, cur.orb);
      gl.uniform2f(U.uC, AX * sc, (SH - AY) * sc);
      gl.uniform1f(U.uRad, RR * sc);
      gl.uniform1f(U.uT, tT);
      gl.uniform1f(U.uInst, cur.inst);
      gl.uniform1f(U.uAct, cur.act);
      gl.uniform1f(U.uScan, tT * (sim.core === 'diag' ? 3 : 1.1));
      gl.uniform1f(U.uFlash, flash);
      gl.uniform1f(U.uDim, cur.dim);
      gl.uniform4fv(U.uPk, pkArr);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      updateLabels();
    };

    const frame = (ts: number) => {
      raf = 0;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(50, ts - lastTs);
      lastTs = ts;

      if (!pausedRef.current) {
        updateSim(dt);
        tT += dt / 1000;
      }

      slow = slow * 0.95 + dt * 0.05;
      if (slow > 27 && qual > 0.5 && ++frameN % 30 === 0) {
        qual -= 0.1;
        resize();
      }

      draw(dt);
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(stageEl);
    resize();

    // Start simulation episode after initial render
    at(700, episode);

    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [demoMode, variant]);

  // Sync with activeStage prop if externally driven
  useEffect(() => {
    if (!activeStage) return;
    const stageMap: Record<string, number> = {
      test: 0,
      failure: 1,
      diagnose: 2,
      intervene: 3,
      validate: 4,
      prove: 5,
    };
    const targetIdx = stageMap[activeStage];
    if (typeof targetIdx === 'number') {
      setCurrentStage(targetIdx);
    }
  }, [activeStage]);

  const handleStageSelect = (idx: number) => {
    setCurrentStage(idx);
    if (idx >= 0 && STAGE_PATHS[idx + 1]) {
      if (onStageClick) {
        onStageClick(idx, STAGE_FLOW[idx + 1]);
      } else {
        router.push(STAGE_PATHS[idx + 1]);
      }
    }
  };

  const handleRun = () => {
    if (onRunClick) {
      onRunClick();
    } else {
      router.push('/');
    }
  };

  return (
    <div
      ref={stageRef}
      className={`arena stage ${variant === 'inline' ? 'inline-stage center-anchor' : ''} ${className}`}
      data-mode={demoMode ? 'demo' : 'live'}
      style={height ? { minHeight: `${height}px` } : undefined}
    >
      {/* WebGL Plasma Canvas */}
      <canvas
        ref={canvasRef}
        className="st-cv"
        role="img"
        aria-label="VeriLoop Plasma Reliability Engine testing AI agent"
      />

      {/* Anchor Element Positioned on Right (or Center) for the Plasma Ring */}
      <div className="st-anchor" />

      {/* Top Left Simulation Status Badge */}
      <div className="st-top">
        <span className="bd ar-bd">
          <i></i>
          <span className="ar-badge">
            {demoMode ? 'ILLUSTRATIVE SIMULATION' : 'LIVE RELIABILITY RUN'}
          </span>
        </span>
      </div>

      {/* Hero Mode: Headline, Copy, Action Buttons, and Result Ticker in st-copy (NO OVERLAP) */}
      {variant === 'hero' && (
        <div className="st-copy">
          <div className="eyebrow">
            AUTONOMOUS RELIABILITY ENGINEERING FOR AI AGENTS
          </div>
          <h1>
            The AI engineer that<br />
            <span className="mu">tests your AI<br />engineer.</span>
          </h1>
          <p className="s">
            Find failures. Diagnose root causes. Test targeted fixes.<br />
            Prove they generalize.
          </p>

          <div className="fl">
            <button className="btn p" onClick={handleRun}>
              Run your first evaluation
            </button>
            <a className="btn" href="#how">
              See how it works
            </a>
          </div>

          {/* Result Ticker: Exactly Below Buttons, Showing Alternating Left/Right Entry in State Color */}
          <div className="st-res" aria-hidden="true">
            {tickerHistory.prev && (
              <div className={`r r1 k-${tickerHistory.prev.k}`}>
                <b>{tickerHistory.prev.ts}</b>
                <span>{tickerHistory.prev.text}</span>
              </div>
            )}
            <div className={`r r2 ${tickerHistory.flip ? 'inR' : 'inL'} k-${tickerHistory.curr.k}`}>
              <b>{tickerHistory.curr.ts}</b>
              <span>{tickerHistory.curr.text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Labels on the Plasma VFX Anchor */}
      {anchorPos.r > 0 && (
        <>
          <div
            className="st-lbl st-big"
            style={{
              left: `${anchorPos.x}px`,
              top: `${anchorPos.y - anchorPos.r * 1.12}px`,
            }}
          >
            <b>VeriLoop</b>
            <span>reliability engine</span>
          </div>

          <div
            className="st-lbl st-small"
            style={{
              left: `${anchorPos.x}px`,
              top: `${anchorPos.y + anchorPos.r * 0.27}px`,
            }}
          >
            <b>{agentDisplay.name}</b>
            <span className={`st-state ${agentDisplay.stateCls}`}>
              {agentDisplay.stateText}
            </span>
          </div>
        </>
      )}

      {/* Bottom Horizontal Bar: 7 Stage Flow Chips & Telemetry (No Overlapping Elements) */}
      <div className="st-bar">
        <div className="flow ar-stages">
          {STAGE_FLOW.map((chip, i) => {
            const isActive = i === currentStage + 1;
            return (
              <React.Fragment key={chip}>
                <span
                  className={`${isActive ? 'on ' + STAGE_CLASSES[i] : ''}`}
                  onClick={() => handleStageSelect(i - 1)}
                  style={{ cursor: 'pointer' }}
                >
                  {chip}
                </span>
                {i < STAGE_FLOW.length - 1 && <i>→</i>}
              </React.Fragment>
            );
          })}
        </div>

        <div className="ar-cnt st-stats mono">
          <span>
            Probes <b>{counters.p}</b>
          </span>
          <span>
            Failures found <b>{counters.f}</b>
          </span>
          <span>
            Fixes verified <b>{counters.v}</b>
          </span>
        </div>

        <button
          className="btn sm"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          style={{ padding: '4px 10px', fontSize: '11.5px' }}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  );
}
