import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const lightColor = 0xf4f7ff

const paintCache = new Map()

const shade = (hex, factor) => {
  const num = Number.parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) * factor))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) * factor))
  const b = Math.min(255, Math.max(0, (num & 255) * factor))
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`
}

const makePaintedTexture = (baseColor = '#888') => {
  if (paintCache.has(baseColor)) return paintCache.get(baseColor)
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.55)
  gradient.addColorStop(0, shade(baseColor, 1.2))
  gradient.addColorStop(1, shade(baseColor, 0.6))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  ctx.globalAlpha = 0.25
  ctx.strokeStyle = shade(baseColor, 0.9)
  for (let i = 0; i < 14; i += 1) {
    const y = Math.random() * size
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + Math.random() * 6 - 3)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  paintCache.set(baseColor, texture)
  return texture
}

const createPlanetMesh = (planet, textureLoader) => {
  const geometry = new THREE.SphereGeometry(planet.size, 48, 32)
  const material = new THREE.MeshStandardMaterial({
    color: planet.color,
    roughness: 0.55,
    metalness: 0.05,
  })

  if (planet.texture) {
    textureLoader.load(
      planet.texture,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        material.map = texture
        material.needsUpdate = true
      },
      undefined,
      () => {
        material.map = makePaintedTexture(planet.color)
        material.needsUpdate = true
      },
    )
  } else {
    material.map = makePaintedTexture(planet.color)
  }

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(planet.offset ?? 0, 0, 0)

  if (planet.ring) {
    const ringGeometry = new THREE.TorusGeometry(planet.size * 1.8, planet.size * 0.14, 2, 90)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xf9e3c7,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    })
    if (planet.ringTexture) {
      const ringTexture = textureLoader.load(planet.ringTexture)
      ringTexture.colorSpace = THREE.SRGBColorSpace
      ringMaterial.map = ringTexture
      ringMaterial.opacity = 0.9
    }
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = Math.PI / 2.2
    mesh.add(ring)
  }

  return mesh
}

export function ARViewer({ planets }) {
  const containerRef = useRef(null)
  const mindarRef = useRef(null)
  const rendererRef = useRef(null)
  const planetMeshesRef = useRef([])
  const anchorsRef = useRef([])
  const visibleSetRef = useRef(new Set())
  const [isStarting, setIsStarting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState('')
  const audioMapRef = useRef({})
  const mutedRef = useRef(muted)

  useEffect(() => {
    mutedRef.current = muted
    if (muted) stopAllAudio()
  }, [muted])

  useEffect(() => {
    return () => {
      stopAR()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ensureAudio = () => {
    planets.forEach((planet) => {
      if (!audioMapRef.current[planet.id]) {
        const audio = new Audio(planet.audio)
        audio.loop = true
        audio.preload = 'auto'
        audio.volume = 0.35
        audioMapRef.current[planet.id] = audio
      }
    })
  }

  const playAudioFor = (id) => {
    if (mutedRef.current) return
    ensureAudio()
    const clip = audioMapRef.current[id]
    if (!clip) return
    clip.currentTime = 0
    clip.play().catch(() => {
      /* ignore autoplay errors */
    })
  }

  const stopAudioFor = (id) => {
    const clip = audioMapRef.current[id]
    if (!clip) return
    try {
      clip.pause()
    } catch (err) {
      // ignore
    }
  }

  const stopAllAudio = () => {
    Object.values(audioMapRef.current).forEach((clip) => {
      try {
        clip.pause()
      } catch (err) {
        // ignore
      }
    })
  }

  const stopAR = async () => {
    stopAllAudio()
    setStatus('Idle')
    setIsRunning(false)
    planetMeshesRef.current = []
    anchorsRef.current = []
    visibleSetRef.current.clear()

    if (mindarRef.current) {
      try {
        await mindarRef.current.stop()
        mindarRef.current.reset()
      } catch (err) {
        // ignore stop errors
      }
      mindarRef.current = null
    }

    if (rendererRef.current) {
      rendererRef.current.setAnimationLoop(null)
      rendererRef.current.dispose()
      rendererRef.current = null
    }

    const node = containerRef.current
    if (node) {
      while (node.firstChild) {
        node.removeChild(node.firstChild)
      }
    }
  }

  const startAR = async () => {
    if (isStarting || isRunning) return
    setIsStarting(true)
    setStatus('Requesting camera...')
    setError('')

    try {
      const [{ MindARThree }] = await Promise.all([
        import('mind-ar/dist/mindar-image-three.prod.js'),
      ])

      const mindarThree = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: `/targets/SolarSys.mind?v=${import.meta.env.VITE_TARGET_VERSION ?? '1'}`,
        uiLoading: 'no',
        uiError: 'no',
        uiScanning: 'no',
      })
      const { renderer, scene, camera } = mindarThree
      rendererRef.current = renderer
      mindarRef.current = mindarThree
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor(0x000000, 0)

      const hemi = new THREE.HemisphereLight(lightColor, 0x1c2130, 1.25)
      scene.add(hemi)
      const dir = new THREE.DirectionalLight(lightColor, 1.1)
      dir.position.set(1.9, 2.3, 1.2)
      scene.add(dir)

      const textureLoader = new THREE.TextureLoader(mindarThree.loadingManager)
      anchorsRef.current = planets.map((planet, index) => {
        const anchor = mindarThree.addAnchor(planet.targetIndex ?? index)
        const base = new THREE.Group()

        const shadowGeometry = new THREE.CircleGeometry(0.55, 48)
        const shadowMaterial = new THREE.MeshBasicMaterial({
          color: 0x233049,
          transparent: true,
          opacity: 0.15,
        })
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
        shadow.rotation.x = -Math.PI / 2
        shadow.position.y = -0.1
        base.add(shadow)

        const mesh = createPlanetMesh(planet, textureLoader)
        base.add(mesh)
        planetMeshesRef.current.push({ mesh, rotationSpeed: planet.rotationSpeed })

        anchor.group.add(base)
        anchor.onTargetFound = () => {
          visibleSetRef.current.add(planet.id)
          setStatus(`Locked: ${planet.name}`)
          playAudioFor(planet.id)
        }
        anchor.onTargetLost = () => {
          visibleSetRef.current.delete(planet.id)
          setStatus(visibleSetRef.current.size ? 'Locked' : 'Looking for marker')
          stopAudioFor(planet.id)
        }
        return anchor
      })

      await mindarThree.start()
      setIsRunning(true)
      setStatus('Looking for marker')

      const clock = new THREE.Clock()
      renderer.setAnimationLoop(() => {
        const delta = clock.getDelta()
        planetMeshesRef.current.forEach(({ mesh, rotationSpeed }) => {
          mesh.rotation.y += rotationSpeed * delta
        })
        renderer.render(scene, camera)
      })
    } catch (err) {
      setError('Camera/AR failed to start. Check permissions and device support.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="ar-shell">
      <div className="ar-toolbar">
        <div>
          <p className="eyebrow">Live AR</p>
          <p className="status">
            Status: <span>{status}</span>
          </p>
        </div>
        <div className="ar-actions">
          <button className="pill ghost" onClick={() => setMuted((value) => !value)}>
            {muted ? 'Unmute' : 'Mute'} audio
          </button>
          <button className="pill primary" disabled={isStarting || isRunning} onClick={startAR}>
            {isStarting ? 'Starting...' : 'Start AR'}
          </button>
          {isRunning ? (
            <button className="pill danger" onClick={stopAR}>
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="ar-stage" ref={containerRef}>
        {!isRunning ? (
          <div className="ar-placeholder">
            <p className="eyebrow">Ready</p>
            <h3>Each planet is tied to its own marker.</h3>
            <p>Tap Start AR, allow camera access, then point at any planet marker to see its 3D planet and audio.</p>
          </div>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
