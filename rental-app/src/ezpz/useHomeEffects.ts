/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Behaviour of the EZPZ home page, ported from the static design's inline
 * script: the painted guidance line, signage cursor, tilt/magnetic effects,
 * the tappable phone, the scroll-driven drive-through and freeway scenes,
 * the departure/return scan with its before/after slider, and the 3D sensor
 * point cloud (three.js, loaded on demand).
 *
 * The markup is static and never re-rendered by React, so everything here
 * works on the DOM directly. All listeners, observers, timers and animation
 * frames are released in the cleanup so React StrictMode's double mount and
 * navigating away leave nothing behind.
 */
export function useHomeEffects(rootRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const doc = document
    const disposers: Array<() => void> = []
    let alive = true

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches || /[?&]cur=1/.test(location.search)

    const on = (
      target: EventTarget,
      type: string,
      fn: (e: any) => void,
      opts?: AddEventListenerOptions | boolean,
    ) => {
      target.addEventListener(type, fn, opts)
      disposers.push(() => target.removeEventListener(type, fn, opts))
    }
    const raf = (fn: () => void) => {
      let t = false
      return () => {
        if (!t) {
          t = true
          requestAnimationFrame(() => {
            t = false
            if (alive) fn()
          })
        }
      }
    }
    const byId = (id: string) => doc.getElementById(id)

    // ---- painted line: the lead marker rides the scroll ----
    const lead = byId('lead')
    const line = lead?.parentElement as HTMLElement | null
    if (lead && line) {
      const updLead = raf(() => {
        const d = doc.documentElement
        const max = d.scrollHeight - window.innerHeight
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
        const h = line.offsetHeight - 34 - 72
        lead.style.transform = `translateY(${p * h}px)`
      })
      on(window, 'scroll', updLead, { passive: true })
      on(window, 'resize', updLead)
      updLead()
    }

    // ---- smooth in-page anchors ----
    doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      on(a, 'click', (ev) => {
        const id = (a.getAttribute('href') || '').slice(1)
        if (!id) return
        const el = byId(id)
        if (!el) return
        ev.preventDefault()
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
        history.replaceState(history.state, '', '#' + id)
      })
    })

    // ---- signage reticle cursor ----
    const cur = byId('cur')
    if (fine && cur) {
      doc.documentElement.classList.add('cur-on')
      disposers.push(() => {
        doc.documentElement.classList.remove('cur-on')
        cur.className = 'cur'
      })
      const dot = cur.querySelector<HTMLElement>('.dot')!
      const ring = cur.querySelector<HTMLElement>('.ring')!
      const dash = cur.querySelector<HTMLElement>('.dash')!
      const lbl = ring.querySelector('span')!
      let mx = -100
      let my = -100
      let rx = -100
      let ry = -100
      let shown = false
      let mode = ''
      const setMode = (m: string, text: string) => {
        if (m === mode) return
        mode = m
        cur.className = 'cur on' + (m ? ' ' + m : '')
        if (text) lbl.textContent = text
      }
      const modeFor = (t: any): [string, string] => {
        if (!t || !t.closest) return ['', '']
        if (t.closest('#cloud')) return ['drag', 'Drag']
        if (t.closest('#bay')) return ['scan', 'Scan']
        if (t.closest('.board .row')) return ['flip', 'Flip']
        if (t.closest('a,button,.toggle,.view')) return ['go', 'Go']
        return ['', '']
      }
      on(
        window,
        'pointermove',
        (e) => {
          mx = e.clientX
          my = e.clientY
          if (!shown) {
            shown = true
            cur.classList.add('on')
            rx = mx
            ry = my
          }
          const m = modeFor(e.target)
          setMode(m[0], m[1])
          dot.style.transform = `translate(${mx}px,${my}px)`
          if (reduce) {
            rx = mx
            ry = my
            ring.style.transform = `translate(${rx}px,${ry}px)`
            dash.style.transform = `translate(${rx}px,${ry}px)`
          }
        },
        { passive: true },
      )
      on(window, 'pointerdown', () => cur.classList.add('down'))
      on(window, 'pointerup', () => cur.classList.remove('down'))
      on(doc.documentElement, 'mouseleave', () => {
        cur.classList.remove('on')
        shown = false
      })
      if (!reduce) {
        let id = 0
        const follow = () => {
          rx += (mx - rx) * 0.16
          ry += (my - ry) * 0.16
          ring.style.transform = `translate(${rx}px,${ry}px)`
          dash.style.transform = `translate(${rx}px,${ry}px)`
          id = requestAnimationFrame(follow)
        }
        follow()
        disposers.push(() => cancelAnimationFrame(id))
      }
    }

    // ---- cursor tilt for the bay, the phone and the receipts ----
    const tilt = (el: HTMLElement | null, maxX: number, maxY: number) => {
      if (!fine || reduce || !el) return
      let rect: DOMRect | null = null
      let rx = 0
      let ry = 0
      const apply = raf(() => {
        el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`
      })
      on(el, 'pointerenter', () => {
        rect = el.getBoundingClientRect()
        el.classList.add('live')
      })
      on(el, 'pointermove', (e) => {
        if (!rect) rect = el.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width
        const py = (e.clientY - rect.top) / rect.height
        ry = (px - 0.5) * 2 * maxY
        rx = -(py - 0.5) * 2 * maxX
        apply()
      })
      on(el, 'pointerleave', () => {
        el.classList.remove('live')
        el.style.transform = ''
        rect = null
      })
      disposers.push(() => {
        el.classList.remove('live')
        el.style.transform = ''
      })
    }
    tilt(byId('bay'), 7, 9)
    tilt(byId('phone'), 10, 12)
    tilt(byId('ticket'), 4, 5)
    tilt(byId('ticket-dep'), 4, 5)

    // ---- magnetic buttons ----
    if (fine && !reduce) {
      doc.querySelectorAll<HTMLElement>('.btn').forEach((b) => {
        let r: DOMRect | null = null
        on(b, 'pointerenter', () => {
          r = b.getBoundingClientRect()
        })
        on(b, 'pointermove', (e) => {
          if (!r) r = b.getBoundingClientRect()
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height
          b.style.transform = `translate(${dx * 10}px,${dy * 8}px)`
          const a = b.querySelector<HTMLElement>('.arrow')
          if (a) a.style.transform = `translate(${dx * 8 + 3}px,${dy * 6 - 2}px)`
        })
        on(b, 'pointerleave', () => {
          b.style.transform = ''
          const a = b.querySelector<HTMLElement>('.arrow')
          if (a) a.style.transform = ''
          r = null
        })
        disposers.push(() => {
          b.style.transform = ''
        })
      })
    }

    // ---- split-flap airport codes ----
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    root.querySelectorAll<HTMLElement>('.board .row').forEach((row) => {
      const el = row.querySelector<HTMLElement>('.code')
      if (!el) return
      const final = el.textContent || ''
      let busy = false
      let id = 0
      on(row, 'pointerenter', () => {
        if (busy || reduce) return
        busy = true
        let i = 0
        id = window.setInterval(() => {
          i++
          el.textContent = final
            .split('')
            .map((c, k) => (i > k * 2 + 2 ? c : chars[(Math.random() * 26) | 0]))
            .join('')
          if (i > 9) {
            clearInterval(id)
            el.textContent = final
            busy = false
          }
        }, 42)
      })
      disposers.push(() => {
        clearInterval(id)
        el.textContent = final
      })
    })

    // ---- clock bars grow once when they scroll into view ----
    const clock = root.querySelector<HTMLElement>('.clock')
    if (clock && !reduce && 'IntersectionObserver' in window && clock.getBoundingClientRect().top > window.innerHeight) {
      clock.classList.add('armed')
      const io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (e.isIntersecting) {
              clock.classList.add('in')
              io.disconnect()
            }
          })
        },
        { threshold: 0.35 },
      )
      io.observe(clock)
      disposers.push(() => {
        io.disconnect()
        clock.classList.remove('armed', 'in')
      })
    }

    // ---- tappable phone demo ----
    const scr = byId('scr')
    if (scr) {
      scr.querySelectorAll<HTMLElement>('.carrow').forEach((b) => {
        on(b, 'click', () => {
          const c = b.getAttribute('data-car') || ''
          const a = byId('pick-car')
          const d = byId('bay-car')
          if (a) a.textContent = c
          if (d) d.textContent = c
          scr.setAttribute('data-screen', 'contract')
        })
      })
      scr.querySelectorAll<HTMLElement>('button.go').forEach((b) => {
        on(b, 'click', () => scr.setAttribute('data-screen', b.getAttribute('data-next') || 'cars'))
      })
      disposers.push(() => scr.setAttribute('data-screen', 'cars'))
    }

    // ---- scroll-driven drive-through ----
    const drive = byId('drive')
    const dcar = byId('drive-car')
    const dbeam = byId('drive-beam')
    const dstate = byId('drive-state')
    const dframes = byId('drive-frames')
    if (drive && dcar && dbeam && dstate && dframes) {
      const stage = drive.querySelector<HTMLElement>('.stage')!
      const updDrive = raf(() => {
        const r = drive.getBoundingClientRect()
        const sh = stage.offsetHeight
        const total = r.height - sh
        let p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1
        if (reduce) p = 0.55
        const x = -700 + p * 1900 // car travels from off-screen left to off-screen right, gantry at 800
        dcar.setAttribute('transform', `translate(${x.toFixed(1)} 0)`)
        const cx = x + 388 // car centre in viewBox units
        const under = cx > 600 && cx < 1000
        dbeam.setAttribute('opacity', under ? '1' : '0')
        dbeam.setAttribute('transform', `translate(${(under ? (cx - 800) * 0.6 : 0).toFixed(1)} 0)`)
        const frames = Math.round(Math.min(1, Math.max(0, (cx - 600) / 400)) * 1120)
        dframes.textContent = frames.toLocaleString()
        dstate.textContent = cx <= 600 ? 'Approaching gantry 2' : under ? 'Scanning · 360° · paint depth' : 'Departure baseline saved'
      })
      on(window, 'scroll', updDrive, { passive: true })
      on(window, 'resize', updDrive)
      updDrive()
    }

    // ---- freeway drive (scroll scrubbed): bay 26 -> ramp -> freeway ----
    const fw = byId('freeway')
    const fwWorld = byId('fw-world')
    const fwPath = byId('fw-path') as unknown as SVGPathElement | null
    const fwCar = byId('fw-carg')
    if (fw && fwWorld && fwPath && fwCar && fwPath.getTotalLength) {
      const fwStage = fw.querySelector<HTMLElement>('.fw-stage')!
      const fwState = byId('fw-state')
      const fwTime = byId('fw-time')
      const fwDash = byId('fw-dash')
      const fwLen = fwPath.getTotalLength()
      let fwLast = -1
      let fwActive = true
      const fwEase = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
      const updFw = raf(() => {
        if (!fwActive) return
        const r = fw.getBoundingClientRect()
        const sh = fwStage.offsetHeight
        const total = r.height - sh
        let p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1
        if (reduce) p = 0.86
        if (Math.abs(p - fwLast) < 0.0005) return
        fwLast = p
        // hold at the bay for the first beat, then drive; the last 8% is the car pulling away
        const d = fwEase(Math.min(1, Math.max(0, (p - 0.06) / 0.86))) * fwLen
        const pt = fwPath.getPointAtLength(d)
        const pt2 = fwPath.getPointAtLength(Math.min(fwLen, d + 18))
        const ang = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI
        fwCar.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${ang.toFixed(2)})`)
        // camera: keep the car in the left third once it starts moving, never scroll back past the bay.
        // Phones are portrait, so the world is scaled down and pushed toward the bottom of the frame.
        const mob = window.innerWidth < 760
        const K = mob ? 0.55 : 1
        const ty = mob ? 240 : 0
        const sc = Math.max(fwStage.clientWidth / 1600, fwStage.clientHeight / 900)
        const visW = fwStage.clientWidth / sc
        const leadX = mob ? visW * 0.3 : 560
        let cam = Math.max(0, pt.x * K - leadX)
        cam = Math.min(cam, 5200 * K - visW)
        fwWorld.setAttribute('transform', `translate(${(-cam).toFixed(1)} ${ty}) scale(${K})`)
        if (fwDash) fwDash.setAttribute('stroke-dashoffset', (-d * 0.4).toFixed(1))
        const out = pt.x > 2700
        fwStage.classList.toggle('is-out', out)
        fwStage.classList.toggle('is-driving', p > 0.12)
        const st =
          pt.x < 560 ? 'Bay 26, level P2'
          : pt.x < 1780 ? 'Leaving the structure'
          : pt.x < 2750 ? 'Exit ramp'
          : p < 0.9 ? 'Merging, 405 North'
          : 'On the 405, trip started'
        if (fwState && fwState.textContent !== st) fwState.textContent = st
        const mins = 12 + Math.round(p * 6)
        if (fwTime) fwTime.textContent = mins + ' min after wheels down'
      })
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (es) => {
            es.forEach((e) => {
              fwActive = e.isIntersecting
              if (fwActive) {
                fwLast = -1
                updFw()
              }
            })
          },
          { rootMargin: '200px 0px' },
        )
        io.observe(fw)
        disposers.push(() => io.disconnect())
      }
      on(window, 'scroll', updFw, { passive: true })
      on(window, 'resize', () => {
        fwLast = -1
        updFw()
      })
      updFw()
    }

    // ---- scan: departure / return state, before/after slider ----
    const lane = byId('scan')
    const scanner = byId('scanner')
    const cmp = byId('cmp')
    const cmpAfter = byId('cmp-after')
    const cmpHandle = byId('cmp-handle')
    const baseSvg = doc.querySelector('#scanner > .core > svg')
    const hud = byId('hud-state')
    const hud2 = byId('hud-state2')
    const tRet = byId('ticket')
    const tDep = byId('ticket-dep')
    const btns = doc.querySelectorAll<HTMLElement>('.toggle button')
    let state = 'departure'
    let cmpX = 90

    const setCmp = (v: number, animate: boolean) => {
      if (!cmp || !cmpHandle) return
      cmpX = Math.min(100, Math.max(0, v))
      if (animate) {
        cmp.style.transition = '--x .6s'
        cmp.classList.add('anim')
      } else cmp.classList.remove('anim')
      cmp.style.setProperty('--x', cmpX + '%')
      cmpHandle.setAttribute('aria-valuenow', String(Math.round(cmpX)))
    }
    const setState = (s: string, fromSlider = false) => {
      if (!lane || !scanner) return
      state = s
      lane.setAttribute('data-state', s)
      scanner.setAttribute('data-state', s)
      if (cmp && !fromSlider) setCmp(s === 'return' ? 12 : 90, true)
      const txt = s === 'return' ? 'Return · compared to baseline' : 'Departure baseline'
      if (hud) hud.textContent = txt
      if (hud2) hud2.textContent = txt
      if (tRet) tRet.hidden = s !== 'return'
      if (tDep) tDep.hidden = s === 'return'
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === s)))
    }

    if (cmp && cmpAfter && cmpHandle && baseSvg) {
      const clone = baseSvg.cloneNode(true) as SVGElement
      clone.removeAttribute('aria-label')
      clone.setAttribute('aria-hidden', 'true')
      clone.querySelectorAll('[id]').forEach((el) => el.setAttribute('id', el.getAttribute('id') + '-r'))
      clone.querySelectorAll('[fill^="url(#"],[stroke^="url(#"]').forEach((el) => {
        ;['fill', 'stroke'].forEach((a) => {
          const v = el.getAttribute(a)
          if (v && v.indexOf('url(#') === 0) el.setAttribute(a, v.replace(')', '-r)'))
        })
      })
      cmpAfter.appendChild(clone)
      disposers.push(() => clone.remove())
      let draggingCmp = false
      const posFrom = (e: PointerEvent) => {
        const r = cmp.getBoundingClientRect()
        return ((e.clientX - r.left) / r.width) * 100
      }
      on(cmpHandle, 'pointerdown', (e) => {
        draggingCmp = true
        cmpHandle.setPointerCapture(e.pointerId)
        e.preventDefault()
      })
      on(cmpHandle, 'pointermove', (e) => {
        if (draggingCmp) setCmp(posFrom(e), false)
      })
      const endCmp = () => {
        if (!draggingCmp) return
        draggingCmp = false
        setState(cmpX < 50 ? 'return' : 'departure', true)
      }
      on(cmpHandle, 'pointerup', endCmp)
      on(cmpHandle, 'pointercancel', endCmp)
      on(cmp, 'pointerdown', (e) => {
        if (e.target === cmpHandle || cmpHandle.contains(e.target)) return
        setCmp(posFrom(e), true)
        setState(cmpX < 50 ? 'return' : 'departure', true)
      })
      on(cmpHandle, 'keydown', (e) => {
        if (e.key === 'ArrowLeft') setCmp(cmpX - 5, false)
        if (e.key === 'ArrowRight') setCmp(cmpX + 5, false)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          setState(cmpX < 50 ? 'return' : 'departure', true)
        }
      })
    }

    // start from a known state (StrictMode mounts this effect twice)
    setCmp(90, false)
    setState('departure', true)
    btns.forEach((b) => on(b, 'click', () => setState(b.getAttribute('data-set') || 'departure')))

    let demoTimer = 0
    if (scanner && 'IntersectionObserver' in window && !reduce) {
      let demoed = false
      const io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (e.isIntersecting && !demoed) {
              demoed = true
              demoTimer = window.setTimeout(() => {
                if (state === 'departure') setState('return')
              }, 4200)
              io.disconnect()
            }
          })
        },
        { threshold: 0.5 },
      )
      io.observe(scanner)
      disposers.push(() => io.disconnect())
    }
    disposers.push(() => clearTimeout(demoTimer))

    // ---- 3D sensor point cloud (three.js, loaded on demand) ----
    const viewgroup = byId('viewgroup')
    const setView = (v: string) => {
      scanner?.setAttribute('data-view', v)
      viewgroup?.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)))
    }
    if (viewgroup) {
      viewgroup.querySelectorAll('button').forEach((b) => on(b, 'click', () => setView(b.getAttribute('data-view') || 'photo')))
      disposers.push(() => {
        viewgroup.hidden = true
        scanner?.setAttribute('data-view', 'photo')
      })
    }

    const initCloud = (THREE: any): boolean => {
      const wrap = byId('cloud')
      const canvas = wrap?.querySelector('canvas')
      if (!wrap || !canvas || !scanner) return false
      let renderer: any
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
      } catch {
        return false
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
      const target = new THREE.Vector3(0, 0.55, 0)

      // car surface sampling: side profile extruded with a narrower cabin
      const prof = [[-2.3, 0.42], [-2.34, 0.8], [-2.08, 0.98], [-1.35, 1.03], [-0.95, 1.42], [0.45, 1.44], [1.05, 1.02], [1.95, 0.92], [2.32, 0.78], [2.3, 0.42]]
      const top = (x: number) => {
        for (let i = 0; i < prof.length - 1; i++) {
          const a = prof[i]
          const b = prof[i + 1]
          if (x >= a[0] && x <= b[0]) {
            const t = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * t
          }
        }
        return 0.42
      }
      const halfW = (y: number) => {
        let s = Math.min(1, Math.max(0, (y - 0.98) / 0.2))
        s = s * s * (3 - 2 * s)
        return 0.92 - 0.2 * s
      }
      const pts: number[] = []
      let N = 0
      const add = (x: number, y: number, z: number) => {
        pts.push(x, y, z)
        N++
      }
      let i: number
      let x: number
      let y: number
      let z: number
      let w: number
      let t: number
      for (i = 0; i < 7800; i++) { x = -2.3 + Math.random() * 4.6; y = 0.42 + Math.random() * (top(x) - 0.42); w = halfW(y); add(x, y, Math.random() < 0.5 ? w : -w) }
      for (i = 0; i < 3200; i++) { x = -2.3 + Math.random() * 4.6; y = top(x); w = halfW(y); add(x, y, (Math.random() * 2 - 1) * w) }
      for (i = 0; i < 700; i++) { x = Math.random() < 0.5 ? -2.3 : 2.3; y = 0.42 + Math.random() * (top(x) - 0.42); w = halfW(y); add(x, y, (Math.random() * 2 - 1) * w) }
      for (i = 0; i < 900; i++) { x = -2.3 + Math.random() * 4.6; add(x, 0.42, (Math.random() * 2 - 1) * 0.9) }
      const wheelX = [-1.45, 1.45]
      const wheelZ = [-0.93, 0.93]
      wheelX.forEach((wx) => {
        wheelZ.forEach((wz) => {
          for (i = 0; i < 650; i++) { t = Math.random() * Math.PI * 2; const r = 0.16 + Math.random() * 0.27; const side = Math.sign(wz); add(wx + Math.cos(t) * r, 0.42 + Math.sin(t) * r, wz + side * Math.random() * 0.06) }
          for (i = 0; i < 260; i++) { t = Math.random() * Math.PI * 2; add(wx + Math.cos(t) * 0.43, 0.42 + Math.sin(t) * 0.43, wz - Math.sign(wz) * Math.random() * 0.26) }
        })
      })
      const pos = new Float32Array(pts)
      const col = new Float32Array(N * 3)
      const base = new Float32Array(N * 3)
      const hit = new Float32Array(N)
      const kind = new Uint8Array(N)
      const anchors: Record<string, number[]> = { chip: [2.3, 0.62, 0.35], scuff: [-1.45, 0.86, 0.93], scratch: [-0.55, 0.78, 0.92] }
      const normals: Record<string, number[]> = { chip: [1, 0, 0], scuff: [0, 0, 1], scratch: [0, 0, 1] }
      for (i = 0; i < N; i++) {
        x = pos[i * 3]; y = pos[i * 3 + 1]; z = pos[i * 3 + 2]
        const n = 0.36 + Math.random() * 0.08
        base[i * 3] = n; base[i * 3 + 1] = n + 0.03; base[i * 3 + 2] = n + 0.08
        let d = Math.hypot(x - anchors.chip[0], y - anchors.chip[1], z - anchors.chip[2])
        if (d < 0.13) kind[i] = 1
        d = Math.hypot(x - anchors.scuff[0], y - anchors.scuff[1], z - anchors.scuff[2])
        if (d < 0.14) kind[i] = 1
        if (Math.abs(y - anchors.scratch[1]) < 0.02 && Math.abs(x - anchors.scratch[0]) < 0.24 && z > 0.85) kind[i] = 2
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const mat = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true })
      scene.add(new THREE.Points(geo, mat))

      // gantry + floor
      const lm = new THREE.LineBasicMaterial({ color: 0x4de8b4, transparent: true, opacity: 0.45 })
      const g: number[] = []
      const seg = (a: number[], b: number[]) => { g.push(a[0], a[1], a[2], b[0], b[1], b[2]) }
      seg([0, 0, -1.75], [0, 2.3, -1.75]); seg([0, 0, 1.75], [0, 2.3, 1.75]); seg([0, 2.3, -1.75], [0, 2.3, 1.75])
      seg([0, 2.3, -1.2], [-1.6, 0, -2.4]); seg([0, 2.3, -1.2], [1.6, 0, -2.4]); seg([0, 2.3, 1.2], [-1.6, 0, 2.4]); seg([0, 2.3, 1.2], [1.6, 0, 2.4])
      const gg = new THREE.BufferGeometry()
      gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(g), 3))
      scene.add(new THREE.LineSegments(gg, lm))
      const grid = new THREE.GridHelper(9, 18, 0x3a3f47, 0x262a30)
      grid.position.y = 0
      scene.add(grid)
      const fl: number[] = []
      for (i = -4; i <= 4; i += 1) { fl.push(i, 0.005, -2.6, i + 0.55, 0.005, -2.6); fl.push(i, 0.005, 2.6, i + 0.55, 0.005, 2.6) }
      const fg = new THREE.BufferGeometry()
      fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fl), 3))
      scene.add(new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: 0xf2c400, transparent: true, opacity: 0.7 })))
      // beam
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshBasicMaterial({ color: 0x4de8b4, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }))
      beam.rotation.y = Math.PI / 2
      beam.position.y = 1.2
      scene.add(beam)
      const beamLine = new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -1.8, 0, 0, 1.8, 0, 2.4, -1.8, 0, 2.4, 1.8]), 3)),
        new THREE.LineBasicMaterial({ color: 0x4de8b4, transparent: true, opacity: 0.9 }),
      )
      scene.add(beamLine)

      // orbit
      let theta = -0.95
      let phi = 0.42
      const radius = 7.6
      let dragging = false
      let lx = 0
      let ly = 0
      let hover = false
      let hx = 0.5
      let lastInput = performance.now()
      const placeCamera = () => {
        camera.position.set(target.x + radius * Math.cos(phi) * Math.sin(theta), target.y + radius * Math.sin(phi), target.z + radius * Math.cos(phi) * Math.cos(theta))
        camera.lookAt(target)
      }
      on(wrap, 'pointerdown', (e) => {
        dragging = true
        lx = e.clientX
        ly = e.clientY
        wrap.setPointerCapture(e.pointerId)
        lastInput = performance.now()
      })
      on(wrap, 'pointermove', (e) => {
        const r = wrap.getBoundingClientRect()
        hx = (e.clientX - r.left) / r.width
        hover = true
        lastInput = performance.now()
        if (!dragging) return
        theta -= (e.clientX - lx) * 0.006
        phi = Math.min(1.2, Math.max(0.08, phi + (e.clientY - ly) * 0.004))
        lx = e.clientX
        ly = e.clientY
      })
      const up = () => { dragging = false }
      on(wrap, 'pointerup', up)
      on(wrap, 'pointercancel', up)
      on(wrap, 'pointerleave', () => { hover = false; dragging = false })

      const pins: Record<string, HTMLElement> = {}
      wrap.querySelectorAll<HTMLElement>('.pin').forEach((p) => { pins[p.getAttribute('data-pin') || ''] = p })
      let W = 1
      let H = 1
      const resize = () => {
        const r = wrap.getBoundingClientRect()
        W = Math.max(1, Math.round(r.width))
        H = Math.max(1, Math.round(r.height))
        renderer.setSize(W, H, false)
        camera.aspect = W / H
        camera.updateProjectionMatrix()
      }
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)
        disposers.push(() => ro.disconnect())
      }
      on(window, 'resize', resize)

      let running = false
      let frameId = 0
      let beamX = -2.8
      let dir = 1
      const tmp = new THREE.Vector3()
      const camDir = new THREE.Vector3()
      let t0 = performance.now()
      const green = [0.3, 0.91, 0.71]
      const red = [1.0, 0.35, 0.24]
      const cyan = [0.35, 0.8, 0.95]
      const frame = (now: number) => {
        if (!running) return
        frameId = requestAnimationFrame(frame)
        const dt = Math.min(0.05, (now - t0) / 1000)
        t0 = now
        if (hover && fine) {
          const tx = (hx - 0.5) * 6.2 * (Math.cos(theta) < 0 ? 1 : -1)
          beamX += (tx - beamX) * Math.min(1, dt * 9)
        } else if (!reduce) {
          beamX += dir * dt * 1.6
          if (beamX > 2.9) dir = -1
          if (beamX < -2.9) dir = 1
        }
        beam.position.x = beamX
        beamLine.position.x = beamX
        if (!dragging && !hover && !reduce && now - lastInput > 1200) theta += dt * 0.12
        placeCamera()
        const isRet = state === 'return'
        const pulse = 0.65 + 0.35 * Math.sin(now / 240)
        for (let k = 0; k < N; k++) {
          const px = pos[k * 3]
          if (Math.abs(px - beamX) < 0.07) hit[k] = 1
          else hit[k] *= 0.975
          const h = hit[k]
          const kd = kind[k]
          let r: number
          let g2: number
          let b: number
          if (kd === 1) { r = cyan[0]; g2 = cyan[1]; b = cyan[2] }
          else if (kd === 2 && isRet) { r = red[0] * pulse; g2 = red[1] * pulse; b = red[2] * pulse }
          else {
            r = base[k * 3] + (green[0] - base[k * 3]) * h
            g2 = base[k * 3 + 1] + (green[1] - base[k * 3 + 1]) * h
            b = base[k * 3 + 2] + (green[2] - base[k * 3 + 2]) * h
          }
          col[k * 3] = r
          col[k * 3 + 1] = g2
          col[k * 3 + 2] = b
        }
        geo.attributes.color.needsUpdate = true
        camDir.copy(camera.position)
        for (const key in anchors) {
          const a = anchors[key]
          const p = pins[key]
          const nrm = normals[key]
          if (!p) continue
          if (key === 'scratch' && !isRet) { p.classList.remove('on'); continue }
          tmp.set(a[0], a[1], a[2])
          const vis = (camDir.x - a[0]) * nrm[0] + (camDir.y - a[1]) * nrm[1] + (camDir.z - a[2]) * nrm[2] > 0.3
          tmp.project(camera)
          if (!vis || tmp.z > 1) { p.classList.remove('on'); continue }
          p.classList.add('on')
          p.style.transform = `translate(${((tmp.x + 1) / 2) * W - 7}px,${((1 - tmp.y) / 2) * H - 7}px)`
        }
        renderer.render(scene, camera)
      }
      const start = () => {
        if (running) return
        running = true
        t0 = performance.now()
        frameId = requestAnimationFrame(frame)
      }
      const stop = () => { running = false }
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (es) => {
            es.forEach((e) => {
              if (e.isIntersecting && scanner.getAttribute('data-view') === 'cloud') start()
              else stop()
            })
          },
          { threshold: 0.05 },
        )
        io.observe(wrap)
        disposers.push(() => io.disconnect())
      } else start()
      viewgroup?.querySelectorAll('button').forEach((b) => on(b, 'click', () => (b.getAttribute('data-view') === 'cloud' ? start() : stop())))
      resize()
      placeCamera()
      disposers.push(() => {
        running = false
        cancelAnimationFrame(frameId)
        geo.dispose()
        mat.dispose()
        renderer.dispose()
      })
      return true
    }

    import('three')
      .then((THREE) => {
        if (!alive) return
        if (initCloud(THREE) && viewgroup) {
          viewgroup.hidden = false
          setView(fine && window.innerWidth > 760 ? 'cloud' : 'photo')
        }
      })
      .catch(() => {
        /* no 3D: the camera view stays, as in the static design without WebGL */
      })

    return () => {
      alive = false
      disposers.splice(0).reverse().forEach((fn) => fn())
    }
  }, [rootRef])
}
