// Space Defender 3D - Main Game Script
// A professional 3D space shooter game using multiple libraries

// Game state and configuration
const gameState = {
  score: 0,
  health: 100,
  maxHealth: 100,
  ammo: 30,
  maxAmmo: 30,
  isGameOver: false,

  isGameStarted: false,
  isPaused: false,
  level: 1,
  difficulty: 1,
  currentWeapon: 0,
  isBoosting: false,
  isReloading: false,
  reloadStartTime: 0,
  reloadTime: 1500, // ms
  lastShotTime: 0,
  shotCooldown: 200, // ms
  lastAsteroidSpawn: 0,
  asteroidSpawnRate: 1500, // ms
  lastEnemySpawn: 0,
  enemySpawnRate: 3000, // ms
  lastPowerupSpawn: 0,
  powerupSpawnRate: 15000, // ms
  activePowerups: [],
  killCount: 0,
  asteroids: [],
  enemies: [],
  bullets: [],
  particles: [],
  powerups: [],
  stars: [],
  explosions: [],
}

// Weapon definitions
const weapons = [
  {
    name: "Laser Blaster",
    damage: 10,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 1500,
    shotCooldown: 200,
    projectileSpeed: 1.0,
    projectileColor: 0x00ffff,
    sound: "laser",
    model: "laserBlaster",
  },
  {
    name: "Plasma Cannon",
    damage: 25,
    ammo: 15,
    maxAmmo: 15,
    reloadTime: 2000,
    shotCooldown: 500,
    projectileSpeed: 0.8,
    projectileColor: 0xff00ff,
    sound: "plasma",
    model: "plasmaCannon",
  },
  {
    name: "Missile Launcher",
    damage: 50,
    ammo: 5,
    maxAmmo: 5,
    reloadTime: 3000,
    shotCooldown: 1000,
    projectileSpeed: 0.6,
    projectileColor: 0xff0000,
    sound: "missile",
    model: "missileLauncher",
  },
  {
    name: "Quantum Disruptor",
    damage: 100,
    ammo: 3,
    maxAmmo: 3,
    reloadTime: 4000,
    shotCooldown: 1500,
    projectileSpeed: 0.5,
    projectileColor: 0xffff00,
    sound: "quantum",
    model: "quantumDisruptor",
  },
]

// Power-up types
const powerupTypes = [
  {
    name: "Health Boost",
    color: 0x00ff00,
    effect: () => {
      gameState.health = Math.min(gameState.maxHealth, gameState.health + 50)
      updateHealthBar()
      showPowerupNotification("Health Boost", "Health +50")
    },
  },
  {
    name: "Ammo Refill",
    color: 0x0000ff,
    effect: () => {
      const weapon = weapons[gameState.currentWeapon]
      gameState.ammo = weapon.maxAmmo
      updateAmmoCounter()
      showPowerupNotification("Ammo Refill", "Ammo fully restored")
    },
  },
  {
    name: "Shield",
    color: 0xffff00,
    effect: () => {
      addActivePowerup("Shield", 15000)
      createShield()
      showPowerupNotification("Shield Activated", "15 seconds of protection")
    },
  },
  {
    name: "Rapid Fire",
    color: 0xff00ff,
    effect: () => {
      addActivePowerup("Rapid Fire", 10000)
      showPowerupNotification("Rapid Fire", "10 seconds of increased fire rate")
    },
  },
  {
    name: "Double Damage",
    color: 0xff0000,
    effect: () => {
      addActivePowerup("Double Damage", 10000)
      showPowerupNotification("Double Damage", "10 seconds of increased damage")
    },
  },
]

// Three.js variables
let scene, camera, renderer, controls
let composer, bloomPass, outlinePass
let stats
const clock = new THREE.Clock()
let mixer // Animation mixer

// Physics world
let world
let playerBody
const asteroidBodies = []
const enemyBodies = []

// Models and textures
const models = {}
const textures = {}
const materials = {}
const sounds = {}

// DOM elements
const canvas = document.getElementById("gameCanvas")
const loadingScreen = document.getElementById("loading-screen")
const loadingBar = document.getElementById("loading-bar")
const loadingText = document.getElementById("loading-text")
const startScreen = document.getElementById("start-screen")
const gameOverScreen = document.getElementById("game-over")
const levelUpNotification = document.getElementById("level-up")
const scoreElement = document.getElementById("score")
const healthFill = document.getElementById("health-fill")
const ammoCount = document.getElementById("ammo-count")
const weaponName = document.getElementById("weapon-name")
const fpsCounter = document.getElementById("fps-counter")
const finalScore = document.getElementById("final-score")
const levelNumber = document.getElementById("level-number")

// Create crosshair
const crosshair = document.createElement("div")
crosshair.className = "crosshair"
const crosshairDot = document.createElement("div")
crosshairDot.className = "crosshair-dot"
crosshair.appendChild(crosshairDot)
document.body.appendChild(crosshair)

// Create damage overlay
const damageOverlay = document.createElement("div")
damageOverlay.id = "damage-overlay"
document.body.appendChild(damageOverlay)

// Create weapon selector
const weaponSelector = document.createElement("div")
weaponSelector.id = "weapon-selector"
document.body.appendChild(weaponSelector)

// Create minimap
const minimap = document.createElement("div")
minimap.id = "minimap"
const minimapCanvas = document.createElement("canvas")
minimapCanvas.id = "minimap-canvas"
minimap.appendChild(minimapCanvas)
document.body.appendChild(minimap)

// Create powerup notification
const powerupNotification = document.createElement("div")
powerupNotification.id = "powerup-notification"
const powerupTitle = document.createElement("h4")
powerupNotification.appendChild(powerupTitle)
const powerupDescription = document.createElement("div")
powerupDescription.id = "powerup-description"
powerupNotification.appendChild(powerupDescription)
document.body.appendChild(powerupNotification)

// Initialize the game
function init() {
  // Show loading screen
  loadingScreen.style.display = "flex"

  // Initialize Three.js scene
  initScene()

  // Initialize physics
  initPhysics()

  // Load assets (models, textures, sounds)
  loadAssets().then(() => {
    // Create game objects
    createPlayer()
    createStars()
    createLights()
    createEnvironment()

    // Initialize UI
    initUI()

    // Initialize controls
    initControls()

    // Initialize audio
    initAudio()

    // Hide loading screen and show start screen
    loadingScreen.style.display = "none"
    startScreen.style.display = "flex"

    // Start animation loop
    animate()
  })
}

// Initialize Three.js scene
function initScene() {
  // Create scene
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000a15, 0.0025)

  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 0, 5)

  // Create renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // Set up post-processing
  composer = new THREE.EffectComposer(renderer)
  const renderPass = new THREE.RenderPass(scene, camera)
  composer.addPass(renderPass)

  // Add bloom effect
  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.85, // threshold
  )
  composer.addPass(bloomPass)

  // Add outline pass for highlighting objects
  outlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera)
  outlinePass.edgeStrength = 3.0
  outlinePass.edgeGlow = 0.5
  outlinePass.edgeThickness = 1.0
  outlinePass.pulsePeriod = 0
  outlinePass.visibleEdgeColor.set(0x00ffff)
  outlinePass.hiddenEdgeColor.set(0x00ffff)
  composer.addPass(outlinePass)

  // Add FXAA pass
  const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader)
  fxaaPass.material.uniforms["resolution"].value.x = 1 / (window.innerWidth * renderer.getPixelRatio())
  fxaaPass.material.uniforms["resolution"].value.y = 1 / (window.innerHeight * renderer.getPixelRatio())
  composer.addPass(fxaaPass)

  // Add gamma correction pass
  const gammaCorrectionPass = new THREE.ShaderPass(THREE.GammaCorrectionShader)
  composer.addPass(gammaCorrectionPass)

  // Initialize stats
  stats = new Stats()
  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom)

  // Handle window resize
  window.addEventListener("resize", onWindowResize, false)
}

// Initialize physics with Cannon.js
function initPhysics() {
  world = new CANNON.World()
  world.gravity.set(0, 0, 0) // Zero gravity in space
  world.broadphase = new CANNON.NaiveBroadphase()
  world.solver.iterations = 10
  world.defaultContactMaterial.contactEquationStiffness = 1e6
  world.defaultContactMaterial.contactEquationRelaxation = 3

  // Create materials
  const playerMaterial = new CANNON.Material("playerMaterial")
  const asteroidMaterial = new CANNON.Material("asteroidMaterial")
  const enemyMaterial = new CANNON.Material("enemyMaterial")

  // Create contact materials
  const playerAsteroidContact = new CANNON.ContactMaterial(playerMaterial, asteroidMaterial, {
    friction: 0.0,
    restitution: 0.5,
  })

  const playerEnemyContact = new CANNON.ContactMaterial(playerMaterial, enemyMaterial, {
    friction: 0.0,
    restitution: 0.3,
  })

  const asteroidAsteroidContact = new CANNON.ContactMaterial(asteroidMaterial, asteroidMaterial, {
    friction: 0.0,
    restitution: 0.7,
  })

  // Add contact materials to world
  world.addContactMaterial(playerAsteroidContact)
  world.addContactMaterial(playerEnemyContact)
  world.addContactMaterial(asteroidAsteroidContact)
}

// Load all game assets
function loadAssets() {
  return new Promise((resolve) => {
    const manager = new THREE.LoadingManager()
    const totalAssets = 50 // Approximate number of assets to load
    let loadedAssets = 0

    // Update loading progress
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      loadedAssets++
      const progress = Math.min(100, Math.floor((loadedAssets / totalAssets) * 100))
      loadingBar.style.width = progress + "%"
      loadingText.textContent = progress + "%"
    }

    manager.onLoad = () => {
      console.log("All assets loaded")
      resolve()
    }

    // Load models
    loadModels(manager)

    // Load textures
    loadTextures(manager)

    // Load audio
    loadAudio(manager)
  })
}

// Load 3D models
function loadModels(manager) {
  const gltfLoader = new THREE.GLTFLoader(manager)
  const dracoLoader = new THREE.DRACOLoader()
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")
  gltfLoader.setDRACOLoader(dracoLoader)

  // Load player ship model - using basic geometry instead of external model
  models.playerShip = new THREE.Group()
  const shipBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 2, 8),
    new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x0088ff,
      emissiveIntensity: 0.5,
    }),
  )
  shipBody.rotation.x = Math.PI / 2
  shipBody.castShadow = true
  shipBody.receiveShadow = true
  models.playerShip.add(shipBody)

  // Load asteroid models - using basic geometry
  for (let i = 1; i <= 3; i++) {
    models[`asteroid${i}`] = new THREE.Group()
    const asteroidMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5, 1),
      new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.2,
        roughness: 0.8,
      }),
    )
    asteroidMesh.castShadow = true
    asteroidMesh.receiveShadow = true
    models[`asteroid${i}`].add(asteroidMesh)
  }

  // Load enemy ship models - using basic geometry
  models.enemyShip = new THREE.Group()
  const enemyBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.5, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    }),
  )
  enemyBody.rotation.x = Math.PI / 2
  enemyBody.castShadow = true
  enemyBody.receiveShadow = true
  models.enemyShip.add(enemyBody)

  // Load weapon models - using basic geometry
  const weaponModels = ["laserBlaster", "plasmaCannon", "missileLauncher", "quantumDisruptor"]
  weaponModels.forEach((weaponName, index) => {
    models[weaponName] = new THREE.Group()
    const weaponMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.5),
      new THREE.MeshStandardMaterial({
        color: weapons[index].projectileColor,
        metalness: 0.7,
        roughness: 0.3,
        emissive: weapons[index].projectileColor,
        emissiveIntensity: 0.3,
      }),
    )
    weaponMesh.castShadow = true
    models[weaponName].add(weaponMesh)
  })

  // Load powerup model - using basic geometry
  models.powerup = new THREE.Group()
  const powerupMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    }),
  )
  powerupMesh.castShadow = true
  models.powerup.add(powerupMesh)
}

// Load textures
function loadTextures(manager) {
  const textureLoader = new THREE.TextureLoader(manager)

  // Create space background texture
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext("2d")

  // Fill with dark blue gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, "#000510")
  gradient.addColorStop(1, "#001030")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Add some stars
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = Math.random() * 1.5
    const opacity = Math.random() * 0.8 + 0.2

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
    ctx.fill()
  }

  // Create texture from canvas
  textures.spaceBackground = new THREE.CanvasTexture(canvas)
  textures.spaceBackground.encoding = THREE.sRGBEncoding

  // Create star field texture
  const starCanvas = document.createElement("canvas")
  starCanvas.width = 512
  starCanvas.height = 512
  const starCtx = starCanvas.getContext("2d")

  // Fill with transparent background
  starCtx.fillStyle = "rgba(0, 0, 0, 0)"
  starCtx.fillRect(0, 0, starCanvas.width, starCanvas.height)

  // Add stars
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * starCanvas.width
    const y = Math.random() * starCanvas.height
    const radius = Math.random() * 2 + 0.5

    starCtx.beginPath()
    starCtx.arc(x, y, radius, 0, Math.PI * 2)
    starCtx.fillStyle = "white"
    starCtx.fill()
  }

  textures.starField = new THREE.CanvasTexture(starCanvas)
  textures.starField.wrapS = THREE.RepeatWrapping
  textures.starField.wrapT = THREE.RepeatWrapping

  // Create planet texture
  const planetCanvas = document.createElement("canvas")
  planetCanvas.width = 512
  planetCanvas.height = 512
  const planetCtx = planetCanvas.getContext("2d")

  // Fill with blue base
  planetCtx.fillStyle = "#0066aa"
  planetCtx.fillRect(0, 0, planetCanvas.width, planetCanvas.height)

  // Add some land masses
  planetCtx.fillStyle = "#00aa44"
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * planetCanvas.width
    const y = Math.random() * planetCanvas.height
    const radius = Math.random() * 50 + 20

    planetCtx.beginPath()
    planetCtx.arc(x, y, radius, 0, Math.PI * 2)
    planetCtx.fill()
  }

  // Add some clouds
  planetCtx.fillStyle = "rgba(255, 255, 255, 0.5)"
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * planetCanvas.width
    const y = Math.random() * planetCanvas.height
    const radius = Math.random() * 40 + 10

    planetCtx.beginPath()
    planetCtx.arc(x, y, radius, 0, Math.PI * 2)
    planetCtx.fill()
  }

  textures.planet1 = new THREE.CanvasTexture(planetCanvas)
  textures.planet1.encoding = THREE.sRGBEncoding

  // Create particle texture
  const particleCanvas = document.createElement("canvas")
  particleCanvas.width = 32
  particleCanvas.height = 32
  const particleCtx = particleCanvas.getContext("2d")

  // Create a radial gradient for the particle
  const gradient = particleCtx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

  particleCtx.fillStyle = gradient
  particleCtx.fillRect(0, 0, 32, 32)

  textures.particle = new THREE.CanvasTexture(particleCanvas)

  // Create laser texture
  const laserCanvas = document.createElement("canvas")
  laserCanvas.width = 32
  laserCanvas.height = 32
  const laserCtx = laserCanvas.getContext("2d")

  // Create a radial gradient for the laser
  const laserGradient = laserCtx.createRadialGradient(16, 16, 0, 16, 16, 16)
  laserGradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  laserGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)")
  laserGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

  laserCtx.fillStyle = laserGradient
  laserCtx.fillRect(0, 0, 32, 32)

  textures.laser = new THREE.CanvasTexture(laserCanvas)

  // Create explosion texture
  const explosionCanvas = document.createElement("canvas")
  explosionCanvas.width = 64
  explosionCanvas.height = 64
  const explosionCtx = explosionCanvas.getContext("2d")

  // Create a radial gradient for the explosion
  const explosionGradient = explosionCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
  explosionGradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  explosionGradient.addColorStop(0.2, "rgba(255, 200, 50, 0.8)")
  explosionGradient.addColorStop(0.4, "rgba(255, 100, 50, 0.6)")
  explosionGradient.addColorStop(1, "rgba(255, 50, 0, 0)")

  explosionCtx.fillStyle = explosionGradient
  explosionCtx.fillRect(0, 0, 64, 64)

  textures.explosion = new THREE.CanvasTexture(explosionCanvas)

  // Create materials from textures
  materials.laserMaterial = new THREE.SpriteMaterial({
    map: textures.laser,
    color: 0x00ffff,
    blending: THREE.AdditiveBlending,
    transparent: true,
  })

  materials.plasmaMaterial = new THREE.SpriteMaterial({
    map: textures.laser,
    color: 0xff00ff,
    blending: THREE.AdditiveBlending,
    transparent: true,
  })

  materials.explosionMaterial = new THREE.SpriteMaterial({
    map: textures.explosion,
    color: 0xff5500,
    blending: THREE.AdditiveBlending,
    transparent: true,
  })

  // Set scene background
  scene.background = textures.spaceBackground
}

// Load audio
function loadAudio(manager) {
  // Create audio objects with fallback sounds
  const createAudio = (name, volume = 0.5, rate = 1.0) => {
    return {
      play: () => {
        // Create oscillator for sound effect
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()

        // Configure oscillator based on sound type
        switch (name) {
          case "laser":
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
            break
          case "plasma":
            oscillator.type = "sawtooth"
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.2)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
            break
          case "missile":
            oscillator.type = "square"
            oscillator.frequency.setValueAtTime(220, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.3)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
            break
          case "quantum":
            oscillator.type = "triangle"
            oscillator.frequency.setValueAtTime(660, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.4)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
            break
          case "explosion":
            oscillator.type = "sawtooth"
            oscillator.frequency.setValueAtTime(100, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
            break
          case "hit":
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(220, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.1)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
            break
          case "playerHit":
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(110, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.2)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
            break
          case "reload":
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
            break
          case "powerup":
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2)
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.4)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
            break
          case "levelUp":
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2)
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.4)
            oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.6)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6)
            break
          default:
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
        }

        // Connect nodes
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        // Start and stop
        oscillator.start()
        setTimeout(() => {
          oscillator.stop()
          audioCtx.close()
        }, 500)
      },
    }
  }

  // Create sound effects
  sounds.laser = createAudio("laser", 0.5, 1.5)
  sounds.plasma = createAudio("plasma", 0.6)
  sounds.missile = createAudio("missile", 0.7)
  sounds.quantum = createAudio("quantum", 0.8)
  sounds.explosion = createAudio("explosion", 0.6)
  sounds.hit = createAudio("hit", 0.5)
  sounds.playerHit = createAudio("playerHit", 0.7, 0.8)
  sounds.reload = createAudio("reload", 0.6)
  sounds.powerup = createAudio("powerup", 0.7)
  sounds.levelUp = createAudio("levelUp", 0.8)

  // Background music using simple oscillator
  const backgroundMusic = {
    isPlaying: false,
    audioCtx: null,
    oscillator: null,
    gainNode: null,

    start: function () {
      if (this.isPlaying) return

      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      this.oscillator = this.audioCtx.createOscillator()
      this.gainNode = this.audioCtx.createGain()

      // Create a low ambient hum
      this.oscillator.type = "sine"
      this.oscillator.frequency.setValueAtTime(55, this.audioCtx.currentTime)
      this.gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime)

      // Connect nodes
      this.oscillator.connect(this.gainNode)
      this.gainNode.connect(this.audioCtx.destination)

      // Start
      this.oscillator.start()
      this.isPlaying = true
    },

    pause: function () {
      if (!this.isPlaying) return

      this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5)
      setTimeout(() => {
        if (this.oscillator) {
          this.oscillator.stop()
          this.oscillator = null
        }
        if (this.audioCtx) {
          this.audioCtx.close()
          this.audioCtx = null
        }
        this.isPlaying = false
      }, 500)
    },

    stop: function () {
      this.pause()
    },
  }

  sounds.backgroundMusic = backgroundMusic
}

// Create player ship
function createPlayer() {
  // Create player mesh
  const playerGeometry = new THREE.ConeGeometry(0.5, 2, 8)
  playerGeometry.rotateX(Math.PI / 2)
  const playerMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x0088ff,
    emissiveIntensity: 0.5,
  })

  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial)
  playerMesh.castShadow = true
  playerMesh.receiveShadow = true
  playerMesh.name = "player"
  scene.add(playerMesh)

  // Add engine glow
  const engineGlow = new THREE.PointLight(0x00ffff, 1, 5)
  engineGlow.position.set(0, 0, 1)
  playerMesh.add(engineGlow)

  // Create engine particles
  const engineParticles = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.1,
      map: textures.particle,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )

  const particleCount = 50
  const particlePositions = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    particlePositions[i3] = (Math.random() - 0.5) * 0.2
    particlePositions[i3 + 1] = (Math.random() - 0.5) * 0.2
    particlePositions[i3 + 2] = 1 + Math.random() * 0.5
  }

  engineParticles.geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))
  playerMesh.add(engineParticles)

  // Create physics body for player
  const playerShape = new CANNON.Sphere(0.5)
  playerBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(0, 0, 0),
    shape: playerShape,
    material: new CANNON.Material("playerMaterial"),
    linearDamping: 0.5,
    angularDamping: 0.99,
  })

  world.addBody(playerBody)

  // Store references
  gameState.player = {
    mesh: playerMesh,
    body: playerBody,
    engineGlow: engineGlow,
    engineParticles: engineParticles,
  }
}

// Create stars for background
function createStars() {
  const starCount = 2000
  const starGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  const starSizes = new Float32Array(starCount)

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3

    // Position stars in a sphere around the camera
    const radius = 50 + Math.random() * 50
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    starPositions[i3 + 2] = radius * Math.cos(phi)

    // Random star colors (white to blue to yellow)
    const colorChoice = Math.random()
    if (colorChoice > 0.8) {
      // Yellow-ish
      starColors[i3] = 1.0
      starColors[i3 + 1] = 0.9
      starColors[i3 + 2] = 0.6
    } else if (colorChoice > 0.5) {
      // Blue-ish
      starColors[i3] = 0.6
      starColors[i3 + 1] = 0.8
      starColors[i3 + 2] = 1.0
    } else {
      // White-ish
      starColors[i3] = 0.9
      starColors[i3 + 1] = 0.9
      starColors[i3 + 2] = 1.0
    }

    // Random star sizes
    starSizes[i] = Math.random() * 2
  }

  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3))
  \
    starGeometry.setAttribute('size\', new THREE.BufferAttribute(starSizes, 1));  3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))

  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: textures.particle },
    },
    vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
    fragmentShader: `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
            }
        `,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
  })

  const stars = new THREE.Points(starGeometry, starMaterial)
  scene.add(stars)

  // Store reference
  gameState.backgroundStars = stars
}

// Create lights
function createLights() {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x333333)
  scene.add(ambientLight)

  // Directional light (sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5)
  sunLight.position.set(10, 10, 10)
  sunLight.castShadow = true

  // Configure shadow properties
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 50
  sunLight.shadow.camera.left = -20
  sunLight.shadow.camera.right = 20
  sunLight.shadow.camera.top = 20
  sunLight.shadow.camera.bottom = -20

  scene.add(sunLight)

  // Add lens flare for sun
  const textureLoader = new THREE.TextureLoader()
  const textureFlare0 = textureLoader.load("https://threejs.org/examples/textures/lensflare/lensflare0.png")
  const textureFlare1 = textureLoader.load("https://threejs.org/examples/textures/lensflare/lensflare1.png")

  const lensflare = new THREE.Lensflare()
  lensflare.addElement(new THREE.LensflareElement(textureFlare0, 700, 0, sunLight.color))
  lensflare.addElement(new THREE.LensflareElement(textureFlare1, 60, 0.6))
  lensflare.addElement(new THREE.LensflareElement(textureFlare1, 120, 0.9))
  sunLight.add(lensflare)

  // Add point lights for additional atmosphere
  const blueLight = new THREE.PointLight(0x0044ff, 1, 50)
  blueLight.position.set(-20, 5, -10)
  scene.add(blueLight)

  const redLight = new THREE.PointLight(0xff4400, 1, 50)
  redLight.position.set(15, -5, -15)
  scene.add(redLight)
}

// Create environment (planets, nebulae, etc.)
function createEnvironment() {
  // Create a distant planet
  const planetGeometry = new THREE.SphereGeometry(5, 32, 32)
  const planetMaterial = new THREE.MeshStandardMaterial({
    map: textures.planet1,
    metalness: 0.0,
    roughness: 1.0,
  })

  const planet = new THREE.Mesh(planetGeometry, planetMaterial)
  planet.position.set(-30, 10, -60)
  scene.add(planet)

  // Add atmosphere to planet
  const atmosphereGeometry = new THREE.SphereGeometry(5.2, 32, 32)
  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide,
  })

  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
  planet.add(atmosphere)

  // Create a nebula using particles
  const nebulaParticleCount = 1000
  const nebulaGeometry = new THREE.BufferGeometry()
  const nebulaPositions = new Float32Array(nebulaParticleCount * 3)
  const nebulaColors = new Float32Array(nebulaParticleCount * 3)
  const nebulaSizes = new Float32Array(nebulaParticleCount)

  // Create a simplex noise generator
  const simplex = new SimplexNoise()

  // Create a nebula shape
  for (let i = 0; i < nebulaParticleCount; i++) {
    const i3 = i * 3

    // Position in a cloud-like formation
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 20 + simplex.noise3D(theta, phi, 0) * 10

    nebulaPositions[i3] = r * Math.sin(phi) * Math.cos(theta) + 40
    nebulaPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) - 10
    nebulaPositions[i3 + 2] = r * Math.cos(phi) - 50

    // Purple/blue nebula colors
    nebulaColors[i3] = 0.5 + Math.random() * 0.5 // R
    nebulaColors[i3 + 1] = 0.2 + Math.random() * 0.3 // G
    nebulaColors[i3 + 2] = 0.8 + Math.random() * 0.2 // B

    // Random particle sizes
    nebulaSizes[i] = 1 + Math.random() * 3
  }

  nebulaGeometry.setAttribute("position", new THREE.BufferAttribute(nebulaPositions, 3))
  nebulaGeometry.setAttribute("color", new THREE.BufferAttribute(nebulaColors, 3))
  nebulaGeometry.setAttribute("size", new THREE.BufferAttribute(nebulaSizes, 1))

  const nebulaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: textures.particle },
    },
    vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
    fragmentShader: `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 0.7) * texture2D(pointTexture, gl_PointCoord);
            }
        `,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
  })

  const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial)
  scene.add(nebula)

  // Create asteroid belt
  const asteroidBeltCount = 200
  const asteroidBelt = new THREE.Group()

  for (let i = 0; i < asteroidBeltCount; i++) {
    const size = 0.1 + Math.random() * 0.3
    const asteroidGeometry = new THREE.IcosahedronGeometry(size, 1)
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.2,
      roughness: 0.8,
    })

    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial)

    // Position in a ring
    const radius = 40 + Math.random() * 5
    const angle = Math.random() * Math.PI * 2
    const height = (Math.random() - 0.5) * 3

    asteroid.position.set(radius * Math.cos(angle), height, radius * Math.sin(angle))

    asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)

    asteroidBelt.add(asteroid)
  }

  scene.add(asteroidBelt)

  // Store references
  gameState.environment = {
    planet: planet,
    nebula: nebula,
    asteroidBelt: asteroidBelt,
  }
}

// Initialize UI elements
function initUI() {
  // Create weapon selector UI
  for (let i = 0; i < weapons.length; i++) {
    const weaponOption = document.createElement("div")
    weaponOption.className = "weapon-option"
    if (i === 0) weaponOption.classList.add("selected")

    const weaponKey = document.createElement("div")
    weaponKey.className = "weapon-key"
    weaponKey.textContent = i + 1

    weaponOption.textContent = weapons[i].name.charAt(0)
    weaponOption.appendChild(weaponKey)
    weaponOption.addEventListener("click", () => {
      switchWeapon(i)
    })

    weaponSelector.appendChild(weaponOption)
  }

  // Set up difficulty selection
  document.getElementById("easy-button").addEventListener("click", () => {
    setDifficulty("easy")
  })

  document.getElementById("medium-button").addEventListener("click", () => {
    setDifficulty("medium")
  })

  document.getElementById("hard-button").addEventListener("click", () => {
    setDifficulty("hard")
  })

  // Set up start and restart buttons
  document.getElementById("start-button").addEventListener("click", startGame)
  document.getElementById("restart-button").addEventListener("click", restartGame)

  // Initialize minimap
  initMinimap()
}

// Initialize minimap
function initMinimap() {
  const minimapCtx = minimapCanvas.getContext("2d")
  minimapCanvas.width = 200
  minimapCanvas.height = 200

  // Draw initial minimap
  updateMinimap()
}

// Update minimap
function updateMinimap() {
  if (!gameState.isGameStarted) return

  const minimapCtx = minimapCanvas.getContext("2d")
  const width = minimapCanvas.width
  const height = minimapCanvas.height
  const centerX = width / 2
  const centerY = height / 2

  // Clear minimap
  minimapCtx.clearRect(0, 0, width, height)

  // Draw background
  minimapCtx.fillStyle = "rgba(0, 20, 40, 0.7)"
  minimapCtx.beginPath()
  minimapCtx.arc(centerX, centerY, width / 2, 0, Math.PI * 2)
  minimapCtx.fill()

  // Draw grid
  minimapCtx.strokeStyle = "rgba(0, 255, 255, 0.2)"
  minimapCtx.lineWidth = 1

  // Draw concentric circles
  for (let r = 20; r <= width / 2; r += 20) {
    minimapCtx.beginPath()
    minimapCtx.arc(centerX, centerY, r, 0, Math.PI * 2)
    minimapCtx.stroke()
  }

  // Draw crosshairs
  minimapCtx.beginPath()
  minimapCtx.moveTo(centerX, 0)
  minimapCtx.lineTo(centerX, height)
  minimapCtx.moveTo(0, centerY)
  minimapCtx.lineTo(width, centerY)
  minimapCtx.stroke()

  // Draw player (center)
  minimapCtx.fillStyle = "rgba(0, 255, 255, 1)"
  minimapCtx.beginPath()
  minimapCtx.arc(centerX, centerY, 4, 0, Math.PI * 2)
  minimapCtx.fill()

  // Draw direction indicator
  const dirX = Math.sin(camera.rotation.y) * 10
  const dirZ = Math.cos(camera.rotation.y) * 10

  minimapCtx.strokeStyle = "rgba(0, 255, 255, 1)"
  minimapCtx.lineWidth = 2
  minimapCtx.beginPath()
  minimapCtx.moveTo(centerX, centerY)
  minimapCtx.lineTo(centerX + dirX, centerY - dirZ)
  minimapCtx.stroke()

  // Draw asteroids
  minimapCtx.fillStyle = "rgba(200, 200, 200, 0.7)"
  gameState.asteroids.forEach((asteroid) => {
    // Calculate relative position to player
    const relX = asteroid.mesh.position.x - gameState.player.mesh.position.x
    const relZ = asteroid.mesh.position.z - gameState.player.mesh.position.z

    // Scale and draw on minimap
    const mapX = centerX + relX * 0.5
    const mapY = centerY - relZ * 0.5

    // Only draw if within minimap bounds
    if (Math.abs(relX) < 50 && Math.abs(relZ) < 50) {
      minimapCtx.beginPath()
      minimapCtx.arc(mapX, mapY, 2 + asteroid.size * 0.5, 0, Math.PI * 2)
      minimapCtx.fill()
    }
  })

  // Draw enemies
  minimapCtx.fillStyle = "rgba(255, 50, 50, 0.8)"
  gameState.enemies.forEach((enemy) => {
    // Calculate relative position to player
    const relX = enemy.mesh.position.x - gameState.player.mesh.position.x
    const relZ = enemy.mesh.position.z - gameState.player.mesh.position.z

    // Scale and draw on minimap
    const mapX = centerX + relX * 0.5
    const mapY = centerY - relZ * 0.5

    // Only draw if within minimap bounds
    if (Math.abs(relX) < 50 && Math.abs(relZ) < 50) {
      minimapCtx.beginPath()
      minimapCtx.arc(mapX, mapY, 3, 0, Math.PI * 2)
      minimapCtx.fill()
    }
  })

  // Draw powerups
  minimapCtx.fillStyle = "rgba(255, 255, 0, 0.8)"
  gameState.powerups.forEach((powerup) => {
    // Calculate relative position to player
    const relX = powerup.mesh.position.x - gameState.player.mesh.position.x
    const relZ = powerup.mesh.position.z - gameState.player.mesh.position.z

    // Scale and draw on minimap
    const mapX = centerX + relX * 0.5
    const mapY = centerY - relZ * 0.5

    // Only draw if within minimap bounds
    if (Math.abs(relX) < 50 && Math.abs(relZ) < 50) {
      minimapCtx.beginPath()
      minimapCtx.arc(mapX, mapY, 3, 0, Math.PI * 2)
      minimapCtx.fill()
    }
  })
}

// Initialize controls
function initControls() {
  // Create pointer lock controls
  controls = new THREE.PointerLockControls(camera, document.body)

  // Handle pointer lock change
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === document.body) {
      controls.enabled = true
      if (gameState.isPaused) {
        resumeGame()
      }
    } else {
      controls.enabled = false
      if (gameState.isGameStarted && !gameState.isGameOver) {
        pauseGame()
      }
    }
  })

  // Keyboard controls
  document.addEventListener("keydown", (event) => {
    if (!gameState.isGameStarted || gameState.isGameOver) return

    switch (event.code) {
      case "KeyW":
        gameState.keys = { ...gameState.keys, forward: true }
        break
      case "KeyS":
        gameState.keys = { ...gameState.keys, backward: true }
        break
      case "KeyA":
        gameState.keys = { ...gameState.keys, left: true }
        break
      case "KeyD":
        gameState.keys = { ...gameState.keys, right: true }
        break
      case "ShiftLeft":
      case "ShiftRight":
        gameState.isBoosting = true
        break
      case "Space":
        // Reload
        if (!gameState.isReloading && gameState.ammo < weapons[gameState.currentWeapon].maxAmmo) {
          startReload()
        }
        break
      case "Digit1":
        switchWeapon(0)
        break
      case "Digit2":
        switchWeapon(1)
        break
      case "Digit3":
        switchWeapon(2)
        break
      case "Digit4":
        switchWeapon(3)
        break
      case "Escape":
        if (gameState.isGameStarted && !gameState.isGameOver) {
          if (gameState.isPaused) {
            resumeGame()
          } else {
            pauseGame()
          }
        }
        break
    }
  })

  document.addEventListener("keyup", (event) => {
    if (!gameState.isGameStarted) return

    switch (event.code) {
      case "KeyW":
        gameState.keys = { ...gameState.keys, forward: false }
        break
      case "KeyS":
        gameState.keys = { ...gameState.keys, backward: false }
        break
      case "KeyA":
        gameState.keys = { ...gameState.keys, left: false }
        break
      case "KeyD":
        gameState.keys = { ...gameState.keys, right: false }
        break
      case "ShiftLeft":
      case "ShiftRight":
        gameState.isBoosting = false
        break
    }
  })

  // Mouse controls
  document.addEventListener("mousedown", (event) => {
    if (!gameState.isGameStarted || gameState.isGameOver || gameState.isPaused) return

    if (event.button === 0) {
      // Left mouse button
      fireBullet()
    }
  })

  // Continuous firing with mouse held down
  setInterval(() => {
    if (gameState.isGameStarted && !gameState.isGameOver && !gameState.isPaused && gameState.mouseDown) {
      fireBullet()
    }
  }, 100)

  document.addEventListener("mousedown", () => {
    gameState.mouseDown = true
  })
  document.addEventListener("mouseup", () => {
    gameState.mouseDown = false
  })
}

// Initialize audio
function initAudio() {
  // Set up audio context
  if (typeof Tone !== "undefined") {
    Tone.start()

    // Create audio analyzer for visualization if Tone.js is available
    const analyzer = new Tone.Analyser("waveform", 256)
    if (sounds.backgroundMusic && sounds.backgroundMusic.connect) {
      sounds.backgroundMusic.connect(analyzer)
    }

    // Store reference
    gameState.audioAnalyzer = analyzer
  }
}

// Start the game
function startGame() {
  // Hide start screen
  startScreen.style.display = "none"

  // Initialize game state
  gameState.isGameStarted = true
  gameState.isPaused = false
  gameState.keys = { forward: false, backward: false, left: false, right: false }
  gameState.mouseDown = false

  // Reset player position
  gameState.player.mesh.position.set(0, 0, 0)
  gameState.player.body.position.set(0, 0, 0)
  gameState.player.body.velocity.set(0, 0, 0)

  // Start audio
  sounds.backgroundMusic.start()

  // Lock pointer for mouse control
  document.body.requestPointerLock()

  // Set initial weapon
  switchWeapon(0)

  // Start spawning asteroids and enemies
  spawnAsteroids()
  spawnEnemies()
  spawnPowerups()
}

// Restart the game
function restartGame() {
  // Hide game over screen
  gameOverScreen.style.display = "none"

  // Reset game state
  gameState.score = 0
  gameState.health = gameState.maxHealth
  gameState.level = 1
  gameState.difficulty = getDifficultyMultiplier()
  gameState.isGameOver = false
  gameState.killCount = 0

  // Clear all game objects
  clearGameObjects()

  // Reset UI
  updateScoreDisplay()
  updateHealthBar()

  // Start the game
  startGame()
}

// Pause the game
function pauseGame() {
  if (gameState.isGameOver) return

  gameState.isPaused = true
  sounds.backgroundMusic.pause()

  // Show pause menu
  const pauseMenu = document.createElement("div")
  pauseMenu.id = "pause-menu"
  pauseMenu.innerHTML = `
        <h2>Game Paused</h2>
        <button id="resume-button">Resume Game</button>
        <button id="quit-button">Quit Game</button>
    `

  document.body.appendChild(pauseMenu)

  document.getElementById("resume-button").addEventListener("click", resumeGame)
  document.getElementById("quit-button").addEventListener("click", quitGame)
}

// Resume the game
function resumeGame() {
  gameState.isPaused = false
  sounds.backgroundMusic.start()

  // Remove pause menu
  const pauseMenu = document.getElementById("pause-menu")
  if (pauseMenu) {
    pauseMenu.remove()
  }

  // Lock pointer again
  document.body.requestPointerLock()
}

// Quit the game
function quitGame() {
  gameState.isGameStarted = false
  gameState.isPaused = false

  // Stop audio
  sounds.backgroundMusic.stop()

  // Clear all game objects
  clearGameObjects()

  // Reset UI
  gameState.score = 0
  gameState.health = gameState.maxHealth
  updateScoreDisplay()
  updateHealthBar()

  // Remove pause menu
  const pauseMenu = document.getElementById("pause-menu")
  if (pauseMenu) {
    pauseMenu.remove()
  }

  // Show start screen
  startScreen.style.display = "flex"
}

// Game over
function gameOver() {
  gameState.isGameOver = true

  // Show game over screen
  gameOverScreen.style.display = "flex"
  finalScore.textContent = `Score: ${gameState.score}`

  // Play game over sound
  sounds.playerHit.play()

  // Stop background music
  sounds.backgroundMusic.stop()

  // Release pointer lock
  document.exitPointerLock()
}

// Set difficulty
function setDifficulty(level) {
  // Remove selected class from all buttons
  document.querySelectorAll(".difficulty-button").forEach((button) => {
    button.classList.remove("selected")
  })

  // Add selected class to chosen button
  document.getElementById(`${level}-button`).classList.add("selected")

  // Store difficulty
  gameState.difficultyLevel = level
}

// Get difficulty multiplier
function getDifficultyMultiplier() {
  switch (gameState.difficultyLevel) {
    case "easy":
      return 0.7
    case "medium":
      return 1.0
    case "hard":
      return 1.5
    default:
      return 1.0
  }
}

// Switch weapon
function switchWeapon(index) {
  if (index < 0 || index >= weapons.length) return

  // Update current weapon
  gameState.currentWeapon = index
  const weapon = weapons[index]

  // Update ammo
  gameState.ammo = weapon.ammo
  gameState.maxAmmo = weapon.maxAmmo
  gameState.reloadTime = weapon.reloadTime
  gameState.shotCooldown = weapon.shotCooldown

  // Update UI
  weaponName.textContent = weapon.name
  updateAmmoCounter()

  // Update weapon selector UI
  document.querySelectorAll(".weapon-option").forEach((option, i) => {
    if (i === index) {
      option.classList.add("selected")
    } else {
      option.classList.remove("selected")
    }
  })

  // Play weapon switch sound
  sounds.reload.play()
}

// Start reload
function startReload() {
  if (gameState.isReloading) return

  gameState.isReloading = true
  gameState.reloadStartTime = Date.now()

  // Play reload sound
  sounds.reload.play()

  // Update UI
  ammoCount.textContent = "Reloading..."
}

// Complete reload
function completeReload() {
  gameState.isReloading = false
  gameState.ammo = weapons[gameState.currentWeapon].maxAmmo

  // Update UI
  updateAmmoCounter()
}

// Fire bullet
function fireBullet() {
  if (gameState.isReloading || gameState.ammo <= 0) {
    if (gameState.ammo <= 0 && !gameState.isReloading) {
      startReload()
    }
    return
  }

  const now = Date.now()
  const weapon = weapons[gameState.currentWeapon]

  // Check cooldown
  let effectiveCooldown = weapon.shotCooldown

  // Apply rapid fire powerup if active
  if (hasActivePowerup("Rapid Fire")) {
    effectiveCooldown *= 0.5
  }

  if (now - gameState.lastShotTime < effectiveCooldown) {
    return
  }

  gameState.lastShotTime = now

  // Decrease ammo
  gameState.ammo--
  updateAmmoCounter()

  // Create bullet
  const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8)
  const bulletMaterial = new THREE.MeshBasicMaterial({
    color: weapon.projectileColor,
    emissive: weapon.projectileColor,
    emissiveIntensity: 1.0,
  })

  const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial)

  // Position bullet at player position
  bulletMesh.position.copy(gameState.player.mesh.position)

  // Calculate bullet direction based on camera direction
  const bulletDirection = new THREE.Vector3(0, 0, -1)
  bulletDirection.applyQuaternion(camera.quaternion)
  bulletDirection.normalize()

  // Add bullet to scene
  scene.add(bulletMesh)

  // Add point light to bullet for glow effect
  const bulletLight = new THREE.PointLight(weapon.projectileColor, 1, 5)
  bulletLight.position.set(0, 0, 0)
  bulletMesh.add(bulletLight)

  // Add bullet to game state
  gameState.bullets.push({
    mesh: bulletMesh,
    direction: bulletDirection,
    speed: weapon.projectileSpeed,
    damage: weapon.damage * (hasActivePowerup("Double Damage") ? 2 : 1),
    light: bulletLight,
    timeLeft: 100,
  })

  // Play weapon sound
  sounds[weapon.sound].play()

  // Add muzzle flash
  createMuzzleFlash()
}

// Create muzzle flash effect
function createMuzzleFlash() {
  const flashGeometry = new THREE.PlaneGeometry(0.5, 0.5)
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })

  const flash = new THREE.Mesh(flashGeometry, flashMaterial)

  // Position flash in front of player
  flash.position.copy(gameState.player.mesh.position)
  const flashDirection = new THREE.Vector3(0, 0, -1)
  flashDirection.applyQuaternion(camera.quaternion)
  flash.position.add(flashDirection.multiplyScalar(1.5))

  // Orient flash to face camera
  flash.lookAt(camera.position)

  // Add flash to scene
  scene.add(flash)

  // Add point light for flash
  const flashLight = new THREE.PointLight(0xffff00, 2, 3)
  flashLight.position.copy(flash.position)
  scene.add(flashLight)

  // Remove flash after short time
  setTimeout(() => {
    scene.remove(flash)
    scene.remove(flashLight)
  }, 50)
}

// Spawn asteroids
function spawnAsteroids() {
  if (!gameState.isGameStarted || gameState.isGameOver || gameState.isPaused) return

  // Calculate spawn rate based on difficulty
  const spawnRate = gameState.asteroidSpawnRate / (gameState.difficulty * 1.2)

  // Create a new asteroid
  createAsteroid()

  // Schedule next spawn
  setTimeout(spawnAsteroids, spawnRate)
}

// Create a single asteroid
function createAsteroid() {
  // Determine asteroid size
  const size = 0.5 + Math.random() * 1.5 * gameState.difficulty

  // Create asteroid mesh
  const asteroidGeometry = new THREE.IcosahedronGeometry(size, 1)
  const asteroidMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.2,
    roughness: 0.8,
  })

  const asteroidMesh = new THREE.Mesh(asteroidGeometry, asteroidMaterial)

  // Position asteroid at random location around player
  const distance = 50
  const angle = Math.random() * Math.PI * 2
  const elevation = (Math.random() - 0.5) * Math.PI * 0.5

  const x = distance * Math.cos(angle) * Math.cos(elevation)
  const y = distance * Math.sin(elevation)
  const z = distance * Math.sin(angle) * Math.cos(elevation)

  asteroidMesh.position.set(
    x + gameState.player.mesh.position.x,
    y + gameState.player.mesh.position.y,
    z + gameState.player.mesh.position.z,
  )

  // Add random rotation
  asteroidMesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)

  // Add asteroid to scene
  scene.add(asteroidMesh)

  // Create physics body for asteroid
  const asteroidShape = new CANNON.Sphere(size)
  const asteroidBody = new CANNON.Body({
    mass: size * 10,
    position: new CANNON.Vec3(asteroidMesh.position.x, asteroidMesh.position.y, asteroidMesh.position.z),
    shape: asteroidShape,
    material: new CANNON.Material("asteroidMaterial"),
  })

  // Calculate velocity towards player with some randomness
  const dirX = gameState.player.mesh.position.x - asteroidMesh.position.x
  const dirY = gameState.player.mesh.position.y - asteroidMesh.position.y
  const dirZ = gameState.player.mesh.position.z - asteroidMesh.position.z

  const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
  const speed = 0.05 + Math.random() * 0.05 * gameState.difficulty

  asteroidBody.velocity.set((dirX / length) * speed * 60, (dirY / length) * speed * 60, (dirZ / length) * speed * 60)

  // Add random rotation
  asteroidBody.angularVelocity.set(
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2,
  )

  // Add body to world
  world.addBody(asteroidBody)
  asteroidBodies.push(asteroidBody)

  // Add asteroid to game state
  gameState.asteroids.push({
    mesh: asteroidMesh,
    body: asteroidBody,
    size: size,
    health: size * 10,
    rotationSpeed: {
      x: (Math.random() - 0.5) * 0.02,
      y: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.02,
    },
  })
}

// Spawn enemies
function spawnEnemies() {
  if (!gameState.isGameStarted || gameState.isGameOver || gameState.isPaused) return

  // Calculate spawn rate based on difficulty and level
  const spawnRate = gameState.enemySpawnRate / (gameState.difficulty * (1 + gameState.level * 0.1))

  // Create a new enemy
  createEnemy()

  // Schedule next spawn
  setTimeout(spawnEnemies, spawnRate)
}

// Create a single enemy
function createEnemy() {
  // Create enemy mesh
  const enemyGeometry = new THREE.ConeGeometry(0.5, 1.5, 8)
  enemyGeometry.rotateX(Math.PI / 2)
  const enemyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  })

  const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial)

  // Position enemy at random location around player
  const distance = 60
  const angle = Math.random() * Math.PI * 2
  const elevation = (Math.random() - 0.5) * Math.PI * 0.5

  const x = distance * Math.cos(angle) * Math.cos(elevation)
  const y = distance * Math.sin(elevation)
  const z = distance * Math.sin(angle) * Math.cos(elevation)

  enemyMesh.position.set(
    x + gameState.player.mesh.position.x,
    y + gameState.player.mesh.position.y,
    z + gameState.player.mesh.position.z,
  )

  // Add enemy to scene
  scene.add(enemyMesh)

  // Add engine glow
  const engineGlow = new THREE.PointLight(0xff0000, 1, 3)
  engineGlow.position.set(0, 0, 0.75)
  enemyMesh.add(engineGlow)

  // Create physics body for enemy
  const enemyShape = new CANNON.Sphere(0.5)
  const enemyBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(enemyMesh.position.x, enemyMesh.position.y, enemyMesh.position.z),
    shape: enemyShape,
    material: new CANNON.Material("enemyMaterial"),
  })

  // Add body to world
  world.addBody(enemyBody)
  enemyBodies.push(enemyBody)

  // Add enemy to game state
  gameState.enemies.push({
    mesh: enemyMesh,
    body: enemyBody,
    health: 30 * gameState.difficulty,
    speed: 0.08 + gameState.level * 0.01,
    fireRate: 2000 / gameState.difficulty,
    lastFired: 0,
    engineGlow: engineGlow,
  })
}

// Spawn powerups
function spawnPowerups() {
  if (!gameState.isGameStarted || gameState.isGameOver || gameState.isPaused) return

  // Calculate spawn rate
  const spawnRate = gameState.powerupSpawnRate

  // Create a new powerup
  createPowerup()

  // Schedule next spawn
  setTimeout(spawnPowerups, spawnRate)
}

// Create a single powerup
function createPowerup() {
  // Select random powerup type
  const powerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)]

  // Create powerup mesh
  const powerupGeometry = new THREE.IcosahedronGeometry(0.5, 1)
  const powerupMaterial = new THREE.MeshStandardMaterial({
    color: powerupType.color,
    metalness: 0.9,
    roughness: 0.1,
    emissive: powerupType.color,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
  })

  const powerupMesh = new THREE.Mesh(powerupGeometry, powerupMaterial)

  // Position powerup at random location around player
  const distance = 30 + Math.random() * 20
  const angle = Math.random() * Math.PI * 2
  const elevation = (Math.random() - 0.5) * Math.PI * 0.5

  const x = distance * Math.cos(angle) * Math.cos(elevation)
  const y = distance * Math.sin(elevation)
  const z = distance * Math.sin(angle) * Math.cos(elevation)

  powerupMesh.position.set(
    x + gameState.player.mesh.position.x,
    y + gameState.player.mesh.position.y,
    z + gameState.player.mesh.position.z,
  )

  // Add powerup to scene
  scene.add(powerupMesh)

  // Add glow light
  const powerupLight = new THREE.PointLight(powerupType.color, 1, 5)
  powerupLight.position.set(0, 0, 0)
  powerupMesh.add(powerupLight)

  // Add powerup to game state
  gameState.powerups.push({
    mesh: powerupMesh,
    light: powerupLight,
    type: powerupType,
    timeLeft: 600, // 10 seconds * 60 frames
    rotationSpeed: 0.03,
  })
}

// Create shield effect
function createShield() {
  // Create shield mesh
  const shieldGeometry = new THREE.SphereGeometry(1.5, 32, 32)
  const shieldMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  })

  const shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial)
  gameState.player.mesh.add(shieldMesh)

  // Store shield reference
  gameState.shield = shieldMesh

  // Remove shield when powerup expires
  setTimeout(() => {
    if (gameState.shield) {
      gameState.player.mesh.remove(gameState.shield)
      gameState.shield = null
    }
  }, 15000)
}

// Add active powerup
function addActivePowerup(name, duration) {
  gameState.activePowerups.push({
    name: name,
    endTime: Date.now() + duration,
  })
}

// Check if a powerup is active
function hasActivePowerup(name) {
  const now = Date.now()
  return gameState.activePowerups.some((powerup) => powerup.name === name && powerup.endTime > now)
}

// Update active powerups
function updateActivePowerups() {
  const now = Date.now()
  gameState.activePowerups = gameState.activePowerups.filter((powerup) => powerup.endTime > now)
}

// Show powerup notification
function showPowerupNotification(title, description) {
  powerupTitle.textContent = title
  powerupDescription.textContent = description
  powerupNotification.style.display = "block"

  // Hide notification after 3 seconds
  setTimeout(() => {
    powerupNotification.style.display = "none"
  }, 3000)
}

// Create explosion effect
function createExplosion(position, size, count) {
  // Create explosion particles
  for (let i = 0; i < count; i++) {
    // Random direction
    const angle = Math.random() * Math.PI * 2
    const elevation = Math.random() * Math.PI - Math.PI / 2
    const speed = 0.05 + Math.random() * 0.1

    const dirX = Math.cos(angle) * Math.cos(elevation)
    const dirY = Math.sin(elevation)
    const dirZ = Math.sin(angle) * Math.cos(elevation)

    // Create particle
    const particleGeometry = new THREE.SphereGeometry(0.1 * size, 4, 4)
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        0.8 + Math.random() * 0.2, // R
        0.2 + Math.random() * 0.4, // G
        0.0 + Math.random() * 0.2, // B
      ),
      transparent: true,
      opacity: 1.0,
    })

    const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial)
    particleMesh.position.copy(position)

    // Add particle to scene
    scene.add(particleMesh)

    // Add particle to game state
    gameState.particles.push({
      mesh: particleMesh,
      velocity: new THREE.Vector3(dirX * speed, dirY * speed, dirZ * speed),
      timeLeft: 30 + Math.random() * 30,
    })
  }

  // Create explosion light
  const explosionLight = new THREE.PointLight(0xff5500, 2, 10)
  explosionLight.position.copy(position)
  scene.add(explosionLight)

  // Store explosion light
  gameState.explosions.push({
    light: explosionLight,
    timeLeft: 20,
  })

  // Play explosion sound
  sounds.explosion.play()
}

// Check collision between two objects
function checkCollision(obj1, obj2, distance) {
  const dx = obj1.position.x - obj2.position.x
  const dy = obj1.position.y - obj2.position.y
  const dz = obj1.position.z - obj2.position.z

  return Math.sqrt(dx * dx + dy * dy + dz * dz) < distance
}

// Update score display
function updateScoreDisplay() {
  scoreElement.textContent = gameState.score
}

// Update health bar
function updateHealthBar() {
  healthFill.style.width = `${gameState.health}%`

  // Change health bar color based on health
  if (gameState.health < 30) {
    healthFill.style.backgroundColor = "#f00"
  } else if (gameState.health < 60) {
    healthFill.style.backgroundColor = "#ff0"
  } else {
    healthFill.style.background = "linear-gradient(to right, #00ff00, #7fff00)"
  }
}

// Update ammo counter
function updateAmmoCounter() {
  ammoCount.textContent = gameState.ammo
}

// Show level up notification
function showLevelUp() {
  levelNumber.textContent = `Level ${gameState.level}`
  levelUpNotification.style.display = "block"

  // Play level up sound
  sounds.levelUp.play()

  // Hide notification after 3 seconds
  setTimeout(() => {
    levelUpNotification.style.display = "none"
  }, 3000)
}

// Clear all game objects
function clearGameObjects() {
  // Remove all asteroids
  gameState.asteroids.forEach((asteroid) => {
    scene.remove(asteroid.mesh)
    world.remove(asteroid.body)
  })
  gameState.asteroids = []

  // Remove all enemies
  gameState.enemies.forEach((enemy) => {
    scene.remove(enemy.mesh)
    world.remove(enemy.body)
  })
  gameState.enemies = []

  // Remove all bullets
  gameState.bullets.forEach((bullet) => {
    scene.remove(bullet.mesh)
  })
  gameState.bullets = []

  // Remove all particles
  gameState.particles.forEach((particle) => {
    scene.remove(particle.mesh)
  })
  gameState.particles = []

  // Remove all powerups
  gameState.powerups.forEach((powerup) => {
    scene.remove(powerup.mesh)
  })
  gameState.powerups = []

  // Remove all explosions
  gameState.explosions.forEach((explosion) => {
    scene.remove(explosion.light)
  })
  gameState.explosions = []

  // Clear active powerups
  gameState.activePowerups = []

  // Remove shield if exists
  if (gameState.shield) {
    gameState.player.mesh.remove(gameState.shield)
    gameState.shield = null
  }
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)

  // Update FXAA pass
  const fxaaPass = composer.passes.find((pass) => pass instanceof THREE.ShaderPass && pass.material.uniforms.resolution)
  if (fxaaPass) {
    fxaaPass.material.uniforms.resolution.value.x = 1 / (window.innerWidth * renderer.getPixelRatio())
    fxaaPass.material.uniforms.resolution.value.y = 1 / (window.innerHeight * renderer.getPixelRatio())
  }
}

// Main animation loop
function animate() {
  requestAnimationFrame(animate)

  // Start stats monitoring
  stats.begin()

  // Get delta time
  const delta = clock.getDelta()

  // Skip updates if game is paused or not started
  if (gameState.isPaused || !gameState.isGameStarted) {
    // Still render the scene
    composer.render()
    stats.end()
    return
  }

  // Update physics world
  world.step(1 / 60)

  // Update player
  updatePlayer(delta)

  // Update game objects
  updateBullets(delta)
  updateAsteroids(delta)
  updateEnemies(delta)
  updateParticles(delta)
  updatePowerups(delta)
  updateExplosions(delta)

  // Check for level up
  checkLevelUp()

  // Update active powerups
  updateActivePowerups()

  // Update minimap
  updateMinimap()

  // Update FPS counter
  fpsCounter.textContent = `FPS: ${Math.round(1 / delta)}`

  // Render scene
  composer.render()

  // End stats monitoring
  stats.end()
}

// Update player
function updatePlayer(delta) {
  if (gameState.isGameOver) return

  // Get movement speed
  const speed = gameState.isBoosting ? 0.3 : 0.15

  // Calculate movement direction based on camera orientation
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)

  // Apply movement based on keys
  if (gameState.keys && gameState.keys.forward) {
    gameState.player.body.velocity.x += forward.x * speed
    gameState.player.body.velocity.y += forward.y * speed
    gameState.player.body.velocity.z += forward.z * speed
  }

  if (gameState.keys && gameState.keys.backward) {
    gameState.player.body.velocity.x -= forward.x * speed
    gameState.player.body.velocity.y -= forward.y * speed
    gameState.player.body.velocity.z -= forward.z * speed
  }

  if (gameState.keys && gameState.keys.right) {
    gameState.player.body.velocity.x += right.x * speed
    gameState.player.body.velocity.y += right.y * speed
    gameState.player.body.velocity.z += right.z * speed
  }

  if (gameState.keys && gameState.keys.left) {
    gameState.player.body.velocity.x -= right.x * speed
    gameState.player.body.velocity.y -= right.y * speed
    gameState.player.body.velocity.z -= right.z * speed
  }

  // Apply damping
  gameState.player.body.velocity.x *= 0.95
  gameState.player.body.velocity.y *= 0.95
  gameState.player.body.velocity.z *= 0.95

  // Update mesh position from physics body
  gameState.player.mesh.position.copy(gameState.player.body.position)

  // Update player rotation to match camera
  gameState.player.mesh.rotation.y = camera.rotation.y
  gameState.player.mesh.rotation.x = camera.rotation.x

  // Update engine particles based on movement
  const engineParticles = gameState.player.engineParticles
  const positions = engineParticles.geometry.attributes.position.array

  for (let i = 0; i < positions.length; i += 3) {
    // Reset particle position if it's too far back
    if (positions[i + 2] > 1.5) {
      positions[i] = (Math.random() - 0.5) * 0.2
      positions[i + 1] = (Math.random() - 0.5) * 0.2
      positions[i + 2] = 1 + Math.random() * 0.5
    }

    // Move particle back
    positions[i + 2] += 0.05
  }

  engineParticles.geometry.attributes.position.needsUpdate = true

  // Update engine glow intensity based on boosting
  gameState.player.engineGlow.intensity = gameState.isBoosting ? 2 : 1

  // Handle reloading
  if (gameState.isReloading) {
    const now = Date.now()
    if (now - gameState.reloadStartTime >= gameState.reloadTime) {
      completeReload()
    }
  }

  // Update camera position to follow player
  camera.position.copy(gameState.player.mesh.position)
}

// Update bullets
function updateBullets(delta) {
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i]

    // Move bullet
    bullet.mesh.position.x += bullet.direction.x * bullet.speed
    bullet.mesh.position.y += bullet.direction.y * bullet.speed
    bullet.mesh.position.z += bullet.direction.z * bullet.speed

    // Decrease lifetime
    bullet.timeLeft--

    // Remove bullet if lifetime is over
    if (bullet.timeLeft <= 0) {
      scene.remove(bullet.mesh)
      gameState.bullets.splice(i, 1)
      continue
    }

    // Check for collisions with asteroids
    for (let j = gameState.asteroids.length - 1; j >= 0; j--) {
      const asteroid = gameState.asteroids[j]

      if (checkCollision(bullet.mesh, asteroid.mesh, asteroid.size + 0.1)) {
        // Damage asteroid
        asteroid.health -= bullet.damage

        // Create hit effect
        createExplosion(bullet.mesh.position.clone(), 0.2, 5)

        // Play hit sound
        sounds.hit.play()

        // Remove bullet
        scene.remove(bullet.mesh)
        gameState.bullets.splice(i, 1)

        // Check if asteroid is destroyed
        if (asteroid.health <= 0) {
          // Create explosion
          createExplosion(asteroid.mesh.position.clone(), asteroid.size, 20)

          // Add score
          gameState.score += Math.floor(asteroid.size * 10)
          updateScoreDisplay()

          // Increment kill count
          gameState.killCount++

          // Remove asteroid
          scene.remove(asteroid.mesh)
          world.remove(asteroid.body)
          gameState.asteroids.splice(j, 1)
        }

        break
      }
    }

    // Check for collisions with enemies
    for (let j = gameState.enemies.length - 1; j >= 0; j--) {
      const enemy = gameState.enemies[j]

      if (checkCollision(bullet.mesh, enemy.mesh, 0.7)) {
        // Damage enemy
        enemy.health -= bullet.damage

        // Create hit effect
        createExplosion(bullet.mesh.position.clone(), 0.3, 8)

        // Play hit sound
        sounds.hit.play()

        // Remove bullet
        scene.remove(bullet.mesh)
        gameState.bullets.splice(i, 1)

        // Check if enemy is destroyed
        if (enemy.health <= 0) {
          // Create explosion
          createExplosion(enemy.mesh.position.clone(), 1.0, 30)

          // Add score
          gameState.score += 50
          updateScoreDisplay()

          // Increment kill count
          gameState.killCount++

          // Remove enemy
          scene.remove(enemy.mesh)
          world.remove(enemy.body)
          gameState.enemies.splice(j, 1)
        }

        break
      }
    }
  }
}

// Update asteroids
function updateAsteroids(delta) {
  for (let i = gameState.asteroids.length - 1; i >= 0; i--) {
    const asteroid = gameState.asteroids[i]

    // Update mesh position from physics body
    asteroid.mesh.position.copy(asteroid.body.position)

    // Update rotation
    asteroid.mesh.rotation.x += asteroid.rotationSpeed.x
    asteroid.mesh.rotation.y += asteroid.rotationSpeed.y
    asteroid.mesh.rotation.z += asteroid.rotationSpeed.z

    // Check for collision with player
    if (checkCollision(asteroid.mesh, gameState.player.mesh, asteroid.size + 0.5)) {
      // Create explosion
      createExplosion(asteroid.mesh.position.clone(), asteroid.size, 20)

      // Damage player
      if (!hasActivePowerup("Shield")) {
        gameState.health -= Math.floor(asteroid.size * 10)
        updateHealthBar()

        // Show damage effect
        damageOverlay.style.opacity = "0.5"
        setTimeout(() => {
          damageOverlay.style.opacity = "0"
        }, 300)

        // Play hit sound
        sounds.playerHit.play()

        // Check if player is dead
        if (gameState.health <= 0) {
          gameOver()
        }
      }

      // Remove asteroid
      scene.remove(asteroid.mesh)
      world.remove(asteroid.body)
      gameState.asteroids.splice(i, 1)
    }

    // Remove asteroid if it's too far from player
    const distanceToPlayer = asteroid.mesh.position.distanceTo(gameState.player.mesh.position)
    if (distanceToPlayer > 100) {
      scene.remove(asteroid.mesh)
      world.remove(asteroid.body)
      gameState.asteroids.splice(i, 1)
    }
  }
}

// Update enemies
function updateEnemies(delta) {
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i]

    // Calculate direction to player
    const dirToPlayer = new THREE.Vector3().subVectors(gameState.player.mesh.position, enemy.mesh.position).normalize()

    // Update velocity to follow player
    enemy.body.velocity.x = dirToPlayer.x * enemy.speed * 60
    enemy.body.velocity.y = dirToPlayer.y * enemy.speed * 60
    enemy.body.velocity.z = dirToPlayer.z * enemy.speed * 60

    // Update mesh position from physics body
    enemy.mesh.position.copy(enemy.body.position)

    // Make enemy face player
    enemy.mesh.lookAt(gameState.player.mesh.position)

    // Fire at player
    const now = Date.now()
    if (now - enemy.lastFired > enemy.fireRate) {
      enemy.lastFired = now

      // Create enemy bullet
      const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8)
      const bulletMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.0,
      })

      const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial)
      bulletMesh.position.copy(enemy.mesh.position)

      // Add bullet to scene
      scene.add(bulletMesh)

      // Add bullet to game state
      gameState.bullets.push({
        mesh: bulletMesh,
        direction: dirToPlayer,
        speed: 0.3,
        damage: 10,
        timeLeft: 100,
        isEnemyBullet: true,
      })

      // Play enemy fire sound
      sounds.plasma.play()
    }

    // Check for collision with player
    if (checkCollision(enemy.mesh, gameState.player.mesh, 1.0)) {
      // Create explosion
      createExplosion(enemy.mesh.position.clone(), 1.0, 30)

      // Damage player
      if (!hasActivePowerup("Shield")) {
        gameState.health -= 20
        updateHealthBar()

        // Show damage effect
        damageOverlay.style.opacity = "0.5"
        setTimeout(() => {
          damageOverlay.style.opacity = "0"
        }, 300)

        // Play hit sound
        sounds.playerHit.play()

        // Check if player is dead
        if (gameState.health <= 0) {
          gameOver()
        }
      }

      // Remove enemy
      scene.remove(enemy.mesh)
      world.remove(enemy.body)
      gameState.enemies.splice(i, 1)
    }

    // Remove enemy if it's too far from player
    const distanceToPlayer = enemy.mesh.position.distanceTo(gameState.player.mesh.position)
    if (distanceToPlayer > 100) {
      scene.remove(enemy.mesh)
      world.remove(enemy.body)
      gameState.enemies.splice(i, 1)
    }
  }
}

// Update particles
function updateParticles(delta) {
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const particle = gameState.particles[i]

    // Move particle
    particle.mesh.position.x += particle.velocity.x
    particle.mesh.position.y += particle.velocity.y
    particle.mesh.position.z += particle.velocity.z

    // Decrease lifetime
    particle.timeLeft--

    // Fade out particle
    if (particle.timeLeft < 10) {
      particle.mesh.material.opacity = particle.timeLeft / 10
    }

    // Remove particle if lifetime is over
    if (particle.timeLeft <= 0) {
      scene.remove(particle.mesh)
      gameState.particles.splice(i, 1)
    }
  }
}

// Update powerups
function updatePowerups(delta) {
  for (let i = gameState.powerups.length - 1; i >= 0; i--) {
    const powerup = gameState.powerups[i]

    // Rotate powerup
    powerup.mesh.rotation.x += powerup.rotationSpeed
    powerup.mesh.rotation.y += powerup.rotationSpeed * 1.5

    // Decrease lifetime
    powerup.timeLeft--

    // Fade out powerup
    if (powerup.timeLeft < 60) {
      powerup.mesh.material.opacity = powerup.timeLeft / 60
      powerup.light.intensity = powerup.timeLeft / 60
    }

    // Remove powerup if lifetime is over
    if (powerup.timeLeft <= 0) {
      scene.remove(powerup.mesh)
      gameState.powerups.splice(i, 1)
      continue
    }

    // Check for collision with player
    if (checkCollision(powerup.mesh, gameState.player.mesh, 1.0)) {
      // Apply powerup effect
      powerup.type.effect()

      // Play powerup sound
      sounds.powerup.play()

      // Remove powerup
      scene.remove(powerup.mesh)
      gameState.powerups.splice(i, 1)
    }
  }
}

// Update explosions
function updateExplosions(delta) {
  for (let i = gameState.explosions.length - 1; i >= 0; i--) {
    const explosion = gameState.explosions[i]

    // Decrease lifetime
    explosion.timeLeft--

    // Fade out light
    explosion.light.intensity = explosion.timeLeft / 10

    // Remove explosion if lifetime is over
    if (explosion.timeLeft <= 0) {
      scene.remove(explosion.light)
      gameState.explosions.splice(i, 1)
    }
  }
}

// Check for level up
function checkLevelUp() {
  const killsForNextLevel = gameState.level * 10

  if (gameState.killCount >= killsForNextLevel) {
    // Level up
    gameState.level++
    gameState.killCount = 0

    // Increase difficulty
    gameState.difficulty += 0.2

    // Show level up notification
    showLevelUp()

    // Restore some health
    gameState.health = Math.min(gameState.maxHealth, gameState.health + 20)
    updateHealthBar()
  }
}

// Create a simplex noise generator
const simplex = new SimplexNoise()

// Initialize the game
init()

