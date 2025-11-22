import './App.css'
import { ARViewer } from './components/ARViewer'
import { planets } from './data/planets'

const features = [
  {
    title: 'Marker-first',
    copy: 'Printed target drives the scene. Lock-on animation, stable anchoring, and clean hide when lost.',
  },
  {
    title: 'Audio layer',
    copy: 'Per-planet ambient tone kicks in on detection; quick mute toggle keeps things classroom-friendly.',
  },
  {
    title: 'Performance tuned',
    copy: 'Low-poly geometry, capped textures, and renderer throttling to stay smooth on mid-range phones.',
  },
  {
    title: 'Education ready',
    copy: 'Fun facts, a marker pack, and a non-AR fallback message make it easy to hand off to visitors.',
  },
]

const instructions = [
  'Print the marker card at 10-12 cm on matte paper.',
  'Tap "Start AR", allow camera access, then aim at the marker in strong, even light.',
  'Move slowly; keep the full marker visible. Audio starts when locked.',
]

function App() {
  return (
    <div className="page">
      <div className="galaxy" />
      <header className="shell hero">
        <div className="hero-text">
          <p className="eyebrow">SolarSys - Marker AR</p>
          <h1>Bring the full Solar System onto any table.</h1>
          <p className="lede">
            MindAR + Three.js, tuned for smooth marker detection, spatial audio, and a quick educational overlay. No
            app store install - just print, scan, and go.
          </p>
          <div className="cta-row">
            <a className="pill primary" href="#live-ar">
              Launch AR
            </a>
            <a className="pill ghost" href="/markers/planet-marker.png" download>
              Download marker
            </a>
            <a className="pill ghost" href="#how-to">
              How it works
            </a>
          </div>
          <p className="meta">
            Works best on modern mobile Chrome/Android and Safari/iOS. Fallback messaging is built in for unsupported
            devices.
          </p>
        </div>
        <div className="hero-card">
          <div className="hero-card-inner">
            <div className="badge">Print-ready marker</div>
            <img src="/markers/planet-marker.png" alt="Marker preview" />
            <p>Use this for demos. Swap in your own markers by replacing the MindAR target file.</p>
          </div>
        </div>
      </header>

      <section className="shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">What's inside</p>
            <h2>High-value, smooth-tracking AR made for classrooms and events.</h2>
          </div>
          <p className="meta">Sun + eight planets with rings, texture maps or painted textures, ambient tones, and fun facts.</p>
        </div>
        <div className="feature-grid">
          {features.map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="live-ar" className="shell ar-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Live viewport</p>
            <h2>Start AR and keep the marker in frame.</h2>
          </div>
          <p className="meta">We pause audio and hide the planets when the marker drops out of view.</p>
        </div>
        <ARViewer planets={planets} />
      </section>

      <section id="how-to" className="shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Fun facts & prep</p>
            <h2>Planets you get out of the box.</h2>
          </div>
          <p className="meta">Swap or extend with your own GLB/GLTF and MindAR target file when ready.</p>
        </div>
        <div className="planet-list">
          {planets.map((planet) => (
            <article key={planet.id} className="planet-card">
              <div className="planet-chip" style={{ background: planet.color }} />
              <div>
                <p className="eyebrow">{planet.name}</p>
                <h3>{planet.funFact}</h3>
                <p className="meta">Audio: {planet.audio.replace('/audio/', '')}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="how-to">
          <div>
            <p className="eyebrow">Marker guidance</p>
            <ul>
              {instructions.map((step, idx) => (
                <li key={step}>
                  <span>{idx + 1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
          <div className="marker-card">
            <p className="eyebrow">Need more targets?</p>
            <p>
              Create a new <code>.mind</code> file for your own planet artwork using the MindAR CLI, then replace
              <code>public/targets/SolarSys.mind</code>. Keep the assets high-contrast with distinct borders.
            </p>
            <a className="pill primary" href="https://hiukim.github.io/mind-ar-js-doc/tools/compile/" target="_blank">
              Open MindAR target builder
            </a>
          </div>
        </div>
      </section>

      <section className="shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Marker pack in this repo</p>
            <h2>Sun plus eight planet targets - ready to print and compile.</h2>
          </div>
          <p className="meta">
            Use these images in the MindAR target builder to generate your combined <code>.mind</code> file, then replace
            <code> public/targets/SolarSys.mind</code>.
          </p>
        </div>
        <div className="marker-grid">
          {planets
            .filter((p) => p.marker)
            .map((planet) => (
              <div key={planet.id} className="marker-tile">
                <img src={planet.marker} alt={`${planet.name} marker`} />
                <div className="marker-body">
                  <h4>{planet.name}</h4>
                  <a className="pill ghost" href={planet.marker} download>
                    Download
                  </a>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}

export default App
