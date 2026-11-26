// Tiny Web Audio engine. No audio files needed. Everything is OFF until the visitor opts in, and nothing ever autoplays.
let ctx = null, master = null, hum = null
const S = { ui: false, hum: false }
function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone(freq, dur = 0.08, type = 'sine', vol = 0.06, when = 0) {
  const c = ensure(); if (!c) return
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03)
}
export const tick = () => { if (S.ui) tone(1250, 0.05, 'triangle', 0.045) }
export const chime = () => { if (S.ui) { tone(880, 0.28, 'sine', 0.06); tone(1320, 0.4, 'sine', 0.05, 0.13) } }
export const setUi = v => { S.ui = v; if (v) { ensure(); tone(1250, 0.05, 'triangle', 0.045) } }
export function setHum(v) {
  S.hum = v
  if (v) {
    const c = ensure(); if (!c || hum) return
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700
    const os = [[110, 'sine'], [164.8, 'sine'], [220.6, 'triangle']].map(([f, t]) => { const o = c.createOscillator(); o.type = t; o.frequency.value = f; o.connect(lp); o.start(); return o })
    lp.connect(g); g.connect(master); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.03, c.currentTime + 1.6)
    hum = { os, g }
  } else if (hum) {
    const h = hum; hum = null
    h.g.gain.cancelScheduledValues(ctx.currentTime); h.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    setTimeout(() => h.os.forEach(o => o.stop()), 800)
  }
}
export const pauseAudio = () => { if (ctx && ctx.state === 'running') ctx.suspend() }
export const resumeAudio = () => { if (ctx && (S.ui || S.hum)) ctx.resume() }
