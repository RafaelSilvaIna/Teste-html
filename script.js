// Space Defender 3D - Main Game Script
// A professional 3D space shooter game using multiple libraries

// Import necessary libraries
import * as THREE from "three"
import Stats from "three/examples/jsm/libs/stats.module.js"
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import * as CANNON from "cannon-es"
import SimplexNoise from "simplex-noise"

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
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
    killCount: 0,
    asteroids: [],
    bullets: [],
    particles: [],
    stars: [],
    keys: {},
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
  let stats
  let clock
  let player, playerLight
  let world

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
  const gameUI = document.getElementById("game-ui")
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

  // Declare powerup functions
  function showPowerupNotification(title, description) {
    powerupTitle.textContent = title
    powerupDescription.textContent = description
    powerupNotification.style.display = "block"
    setTimeout(() => {
      powerupNotification.style.display = "none"
    }, 3000)
  }

  function addActivePowerup(name, duration) {
    // Placeholder for powerup logic
    console.log(`Powerup ${name} activated for ${duration}ms`)
  }

  function createShield() {
    // Placeholder for shield creation logic
    console.log("Shield created")
  }

  // Initialize the game
  function init() {
    // Show loading screen
    loadingScreen.style.display = "flex"

    // Initialize Three.js
    initThreeJS()

    // Initialize physics
    initPhysics()

    // Create game objects
    createPlayer()
    createStars()
    createLights()

    // Initialize UI
    initUI()

    // Initialize controls
    initControls()

    // Simulate loading progress
    simulateLoading().then(() => {
      // Hide loading screen and show start screen
      loadingScreen.style.display = "none"
      startScreen.style.display = "flex"

      // Start animation loop
      animate()
    })
  }

  // Initialize Three.js
  function initThreeJS() {
    // Create scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000a15)
    scene.fog = new THREE.FogExp2(0x000a15, 0.0025)

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 0, 5)

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Initialize stats
    stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom)

    // Initialize clock
    clock = new THREE.Clock()

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
    const gltfLoader = new GLTFLoader(manager)
    const dracoLoader = new DRACOLoader()
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
    const gradientParticle = particleCtx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradientParticle.addColorStop(0, "rgba(255, 255, 255, 1)")
    gradientParticle.addColorStop(1, "rgba(255, 255, 255, 0)")

    particleCtx.fillStyle = gradientParticle
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

    player = new THREE.Mesh(playerGeometry, playerMaterial)
    player.castShadow = true
    player.receiveShadow = true
    player.name = "player"
    scene.add(player)

    // Add engine glow
    playerLight = new THREE.PointLight(0x00ffff, 1, 5)
    playerLight.position.set(0, 0, 1)
    player.add(playerLight)
  }

  // Create stars for background
  function createStars() {
    const starCount = 1000
    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3

      // Position stars in a sphere around the camera
      const radius = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      starPositions[i3 + 2] = radius * Math.cos(phi)
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      sizeAttenuation: true,
    })

    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    // Store reference
    gameState.stars = stars
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
    scene.add(sunLight)

    // Add point lights for additional atmosphere
    const blueLight = new THREE.PointLight(0x0044ff, 1, 50)
    blueLight.position.set(-20, 5, -10)
    scene.add(blueLight)

    const redLight = new THREE.PointLight(0xff4400, 1, 50)
    redLight.position.set(15, -5, -15)
    scene.add(redLight)
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
  }

  // Initialize controls
  function initControls() {
    // Create pointer lock controls
    controls = new PointerLockControls(camera, document.body)

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
          gameState.keys.forward = true
          break
        case "KeyS":
          gameState.keys.backward = true
          break
        case "KeyA":
          gameState.keys.left = true
          break
        case "KeyD":
          gameState.keys.right = true
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
          gameState.keys.forward = false
          break
        case "KeyS":
          gameState.keys.backward = false
          break
        case "KeyA":
          gameState.keys.left = false
          break
        case "KeyD":
          gameState.keys.right = false
          break
        case "ShiftLeft":
        case "ShiftRight":
          gameState.isBoosting = false
          break
      }
    })

    // Mouse controls
    document.addEventListener("mousedown", (event) => {
      if (!gameState.isGameStarted || gameState.isGameOver) return

      if (event.button === 0) {
        // Left mouse button
        fireBullet()
      }
    })
  }

  // Simulate loading progress
  function simulateLoading() {
    return new Promise((resolve) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += 5
        loadingBar.style.width = progress + "%"
        loadingText.textContent = progress + "%"

        if (progress >= 100) {
          clearInterval(interval)
          setTimeout(resolve, 500) // Add a small delay for better UX
        }
      }, 100)
    })
  }

  // Start the game
  function startGame() {
    // Hide start screen
    startScreen.style.display = "none"

    // Show game UI
    gameUI.style.display = "block"
    crosshair.style.display = "block"
    weaponSelector.style.display = "flex"
    minimap.style.display = "block"
    damageOverlay.style.display = "block"

    // Initialize game state
    gameState.isGameStarted = true
    gameState.isPaused = false
    gameState.keys = { forward: false, backward: false, left: false, right: false }
    gameState.mouseDown = false

    // Reset player position
    player.position.set(0, 0, 0)

    // Lock pointer for mouse control
    document.body.requestPointerLock()

    // Set initial weapon
    switchWeapon(0)

    // Start spawning asteroids
    spawnAsteroids()
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

    // Clear all game objects
    clearGameObjects()

    // Reset UI
    gameState.score = 0
    gameState.health = gameState.maxHealth
    updateScoreDisplay()
    updateHealthBar()

    // Remove pause menu
    const pauseMenu = document.createElement("div")
    if (pauseMenu) {
      pauseMenu.remove()
    }

    // Hide game UI
    gameUI.style.display = "none"
    crosshair.style.display = "none"
    weaponSelector.style.display = "none"
    minimap.style.display = "none"
    damageOverlay.style.display = "none"

    // Show start screen
    startScreen.style.display = "flex"
  }

  // Game over
  function gameOver() {
    gameState.isGameOver = true

    // Show game over screen
    gameOverScreen.style.display = "flex"
    finalScore.textContent = `Score: ${gameState.score}`

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
  }

  // Start reload
  function startReload() {
    if (gameState.isReloading) return

    gameState.isReloading = true
    gameState.reloadStartTime = Date.now()

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
      if (gameState.ammo <= 0 && !gameState.isReloading) return
      startReload()
      return
    }

    const now = Date.now()
    const weapon = weapons[gameState.currentWeapon]

    // Check cooldown
    if (now - gameState.lastShotTime < weapon.shotCooldown) {
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
    bulletMesh.position.copy(player.position)

    // Calculate bullet direction based on camera direction
    const bulletDirection = new THREE.Vector3(0, 0, -1)
    bulletDirection.applyQuaternion(camera.quaternion)
    bulletDirection.normalize()

    // Add bullet to scene
    scene.add(bulletMesh)

    // Add bullet to game state
    gameState.bullets.push({
      mesh: bulletMesh,
      direction: bulletDirection,
      speed: weapon.projectileSpeed,
      damage: weapon.damage,
      timeLeft: 100,
    })

    // Create muzzle flash effect
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
    })

    const flash = new THREE.Mesh(flashGeometry, flashMaterial)

    // Position flash in front of player
    flash.position.copy(player.position)
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

    asteroidMesh.position.set(x + player.position.x, y + player.position.y, z + player.position.z)

    // Add random rotation
    asteroidMesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)

    // Add asteroid to scene
    scene.add(asteroidMesh)

    // Add asteroid to game state
    gameState.asteroids.push({
      mesh: asteroidMesh,
      size: size,
      health: size * 10,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
      ),
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02,
      },
    })
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
    })
    gameState.asteroids = []

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
  }

  // Handle window resize
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
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
      renderer.render(scene, camera)
      stats.end()
      return
    }

    // Update player
    updatePlayer(delta)

    // Update game objects
    updateBullets(delta)
    updateAsteroids(delta)
    updateParticles(delta)

    // Check for level up
    checkLevelUp()

    // Handle reloading
    if (gameState.isReloading) {
      const now = Date.now()
      if (now - gameState.reloadStartTime >= gameState.reloadTime) {
        completeReload()
      }
    }

    // Update FPS counter
    fpsCounter.textContent = `FPS: ${Math.round(1 / delta)}`

    // Render scene
    renderer.render(scene, camera)

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
    if (gameState.keys.forward) {
      player.position.x += forward.x * speed
      player.position.y += forward.y * speed
      player.position.z += forward.z * speed
    }

    if (gameState.keys.backward) {
      player.position.x -= forward.x * speed
      player.position.y -= forward.y * speed
      player.position.z -= forward.z * speed
    }

    if (gameState.keys.right) {
      player.position.x += right.x * speed
      player.position.y += right.y * speed
      player.position.z += right.z * speed
    }

    if (gameState.keys.left) {
      player.position.x -= right.x * speed
      player.position.y -= right.y * speed
      player.position.z -= right.z * speed
    }

    // Update player rotation to match camera
    player.rotation.y = camera.rotation.y
    player.rotation.x = camera.rotation.x

    // Update engine glow intensity based on boosting
    playerLight.intensity = gameState.isBoosting ? 2 : 1

    // Update camera position to follow player
    camera.position.copy(player.position)
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

        const dx = bullet.mesh.position.x - asteroid.mesh.position.x
        const dy = bullet.mesh.position.y - asteroid.mesh.position.y
        const dz = bullet.mesh.position.z - asteroid.mesh.position.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (distance < asteroid.size + 0.1) {
          // Damage asteroid
          asteroid.health -= bullet.damage

          // Create hit effect
          createExplosion(bullet.mesh.position.clone(), 0.2, 5)

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
            gameState.asteroids.splice(j, 1)
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

      // Move asteroid
      asteroid.mesh.position.x += asteroid.velocity.x
      asteroid.mesh.position.y += asteroid.velocity.y
      asteroid.mesh.position.z += asteroid.velocity.z

      // Update rotation
      asteroid.mesh.rotation.x += asteroid.rotationSpeed.x
      asteroid.mesh.rotation.y += asteroid.rotationSpeed.y
      asteroid.mesh.rotation.z += asteroid.rotationSpeed.z

      // Check for collision with player
      const dx = player.position.x - asteroid.mesh.position.x
      const dy = player.position.y - asteroid.mesh.position.y
      const dz = player.position.z - asteroid.mesh.position.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance < asteroid.size + 0.5) {
        // Create explosion
        createExplosion(asteroid.mesh.position.clone(), asteroid.size, 20)

        // Damage player
        gameState.health -= Math.floor(asteroid.size * 10)
        updateHealthBar()

        // Show damage effect
        damageOverlay.style.opacity = "0.5"
        setTimeout(() => {
          damageOverlay.style.opacity = "0"
        }, 300)

        // Check if player is dead
        if (gameState.health <= 0) {
          gameOver()
        }

        // Remove asteroid
        scene.remove(asteroid.mesh)
        gameState.asteroids.splice(i, 1)
      }

      // Remove asteroid if it's too far from player
      if (distance > 100) {
        scene.remove(asteroid.mesh)
        gameState.asteroids.splice(i, 1)
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

    // Add point light for explosion
    const explosionLight = new THREE.PointLight(0xff5500, 2, 10)
    explosionLight.position.copy(position)
    scene.add(explosionLight)

    // Remove light after short time
    setTimeout(() => {
      scene.remove(explosionLight)
    }, 500)
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
})

