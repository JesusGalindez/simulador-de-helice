// Toroidal Propeller Lab - Main Application Logic
// Built with Three.js for 3D physics rendering and Vanilla HTML5/CSS for premium dashboard control

const App = {
  // --- STATE ---
  state: {
    rpm: 3200,
    pitch: 25, // degrees
    inflow: 4.5, // m/s
    fluid: 'air', // 'air' or 'water'
    propType: 'toroidal', // 'toroidal' or 'standard'
    visualizeFlow: true,
    viewPreset: 'persp',
    
    // Physics constants
    diameter: 0.25, // meters
    airDensity: 1.225, // kg/m^3
    waterDensity: 997.0, // kg/m^3
  },

  // --- THREE.JS GRAPHICS OBJECTS ---
  graphics: {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    
    // Meshes
    hub: null,
    toroidalProp: null,
    standardProp: null,
    activePropGroup: null,
    
    // Lighting
    cyanLight: null,
    orangeLight: null,
    
    // Particle flow
    particles: null,
    particleCount: 4000,
    particlePositions: null,
    particleVelocities: null,
    particleColors: null,
    particleAges: null,
  },

  // --- INTERACTIVE CANVASES ---
  canvases: {
    chart: null,
    chartCtx: null,
    sound: null,
    soundCtx: null,
    soundPhase: 0,
  },

  // --- INITIALIZATION ---
  init() {
    this.initThree();
    this.initCanvases();
    this.bindEvents();
    this.createPropellers();
    this.createFlowParticles();
    this.updatePhysics();
    this.animate();
    
    // Trigger initial window resize to fit canvas
    window.dispatchEvent(new Event('resize'));
  },

  initThree() {
    const container = document.getElementById('canvas-container');
    
    // Scene & Deep space styling
    this.graphics.scene = new THREE.Scene();
    this.graphics.scene.background = new THREE.Color(0x0a0b0e);
    this.graphics.scene.fog = new THREE.FogExp2(0x0a0b0e, 0.08);

    // Camera
    this.graphics.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    this.graphics.camera.position.set(0.6, 0.4, 0.8);

    // Renderer
    this.graphics.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.graphics.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.graphics.renderer.setSize(container.clientWidth, container.clientHeight);
    this.graphics.renderer.shadowMap.enabled = true;
    this.graphics.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.graphics.renderer.domElement);

    // OrbitControls
    this.graphics.controls = new THREE.OrbitControls(this.graphics.camera, this.graphics.renderer.domElement);
    this.graphics.controls.enableDamping = true;
    this.graphics.controls.dampingFactor = 0.05;
    this.graphics.controls.maxPolarAngle = Math.PI * 0.85;
    this.graphics.controls.minDistance = 0.2;
    this.graphics.controls.maxDistance = 3.0;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.graphics.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(2, 4, 3);
    this.graphics.scene.add(dirLight);

    // Glow accent studio lights
    this.graphics.cyanLight = new THREE.PointLight(0x00f0ff, 1.2, 5);
    this.graphics.cyanLight.position.set(-1, 0.5, -0.5);
    this.graphics.scene.add(this.graphics.cyanLight);

    this.graphics.orangeLight = new THREE.PointLight(0xff5500, 0.8, 5);
    this.graphics.orangeLight.position.set(1, -0.5, 0.5);
    this.graphics.scene.add(this.graphics.orangeLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 40, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.5;
    gridHelper.material.opacity = 0.35;
    gridHelper.material.transparent = true;
    this.graphics.scene.add(gridHelper);

    // Axis Helper (Visual guide, sutil)
    const activeGroup = new THREE.Group();
    this.graphics.activePropGroup = activeGroup;
    this.graphics.scene.add(activeGroup);
  },

  initCanvases() {
    // 2D Chart Canvas
    this.canvases.chart = document.getElementById('chartCanvas');
    this.canvases.chartCtx = this.canvases.chart.getContext('2d');
    
    // Acoustic Wave Canvas
    this.canvases.sound = document.getElementById('soundCanvas');
    this.canvases.soundCtx = this.canvases.sound.getContext('2d');
    
    // Scale canvases for high DPI screens
    const resizeCanvas = (c) => {
      const rect = c.getBoundingClientRect();
      c.width = rect.width * window.devicePixelRatio;
      c.height = rect.height * window.devicePixelRatio;
    };
    resizeCanvas(this.canvases.chart);
    resizeCanvas(this.canvases.sound);
  },

  bindEvents() {
    // Sliders
    const rpmSlider = document.getElementById('rpm-slider');
    const pitchSlider = document.getElementById('pitch-slider');
    const inflowSlider = document.getElementById('inflow-slider');

    rpmSlider.addEventListener('input', (e) => {
      this.state.rpm = parseInt(e.target.value);
      document.getElementById('rpm-val').innerText = `${this.state.rpm} RPM`;
      this.updatePhysics();
    });

    pitchSlider.addEventListener('input', (e) => {
      this.state.pitch = parseInt(e.target.value);
      document.getElementById('pitch-val').innerText = `${this.state.pitch}°`;
      this.updatePropellerGeometry();
      this.updatePhysics();
    });

    inflowSlider.addEventListener('input', (e) => {
      this.state.inflow = parseFloat(e.target.value);
      document.getElementById('inflow-val').innerText = `${this.state.inflow.toFixed(1)} m/s`;
      this.updatePhysics();
    });

    // Propeller Switcher (Toroidal vs Standard)
    const selectorBtns = document.querySelectorAll('.selector-btn');
    selectorBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type || btn.closest('.selector-btn').dataset.type;
        selectorBtns.forEach(b => b.classList.remove('active'));
        btn.closest('.selector-btn').classList.add('active');
        
        this.state.propType = type;
        this.updateActivePropeller();
        
        // CSS Style update according to active mode
        const root = document.documentElement;
        if (type === 'toroidal') {
          root.style.setProperty('--accent-active', 'var(--accent-toroidal)');
          root.style.setProperty('--accent-active-rgb', 'var(--accent-toroidal-rgb)');
          root.style.setProperty('--accent-active-dark', 'var(--accent-toroidal-dark)');
          root.style.setProperty('--border-glow-active', 'var(--border-glow-toroidal)');
          document.querySelector('header h1').style.background = 'linear-gradient(90deg, #ffffff 40%, var(--accent-toroidal) 100%)';
          document.querySelector('header h1').style.webkitBackgroundClip = 'text';
        } else {
          root.style.setProperty('--accent-active', 'var(--accent-standard)');
          root.style.setProperty('--accent-active-rgb', 'var(--accent-standard-rgb)');
          root.style.setProperty('--accent-active-dark', 'var(--accent-standard-dark)');
          root.style.setProperty('--border-glow-active', 'var(--border-glow-standard)');
          document.querySelector('header h1').style.background = 'linear-gradient(90deg, #ffffff 40%, var(--accent-standard) 100%)';
          document.querySelector('header h1').style.webkitBackgroundClip = 'text';
        }
        
        this.updatePhysics();
      });
    });

    // Fluid Switcher
    const fluidOptions = document.querySelectorAll('.switch-option');
    fluidOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        fluidOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.state.fluid = opt.dataset.fluid;
        this.updatePhysics();
      });
    });

    // Camera presets & Toggle Flow
    document.getElementById('view-persp').addEventListener('click', (e) => {
      this.setActiveCameraPreset('persp');
    });
    document.getElementById('view-front').addEventListener('click', (e) => {
      this.setActiveCameraPreset('front');
    });
    document.getElementById('view-side').addEventListener('click', (e) => {
      this.setActiveCameraPreset('side');
    });
    
    const toggleFlowBtn = document.getElementById('toggle-flow');
    toggleFlowBtn.addEventListener('click', () => {
      this.state.visualizeFlow = !this.state.visualizeFlow;
      toggleFlowBtn.classList.toggle('active', this.state.visualizeFlow);
      this.graphics.particles.visible = this.state.visualizeFlow;
    });

    // Window resize
    window.addEventListener('resize', () => {
      const container = document.getElementById('canvas-container');
      
      this.graphics.camera.aspect = container.clientWidth / container.clientHeight;
      this.graphics.camera.updateProjectionMatrix();
      
      this.graphics.renderer.setSize(container.clientWidth, container.clientHeight);
      
      resizeCanvas(this.canvases.chart);
      resizeCanvas(this.canvases.sound);
      this.drawChart();
    });
  },

  setActiveCameraPreset(preset) {
    this.state.viewPreset = preset;
    document.querySelectorAll('.preset-grid .btn-secondary').forEach(b => {
      if (b.id !== 'toggle-flow') b.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`view-${preset}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Smoothly interpolate controls target and camera position
    const targetPos = new THREE.Vector3(0, 0, 0);
    let cameraPos = new THREE.Vector3();
    
    if (preset === 'persp') {
      cameraPos.set(0.6, 0.4, 0.8);
    } else if (preset === 'front') {
      cameraPos.set(0, 0, 1.0); // Facing the propeller face (looking along Z-axis)
    } else if (preset === 'side') {
      cameraPos.set(1.0, 0, 0); // Looking along X-axis
    }

    // Set immediately or animate
    this.graphics.controls.target.copy(targetPos);
    this.graphics.camera.position.copy(cameraPos);
    this.graphics.controls.update();
  },

  // --- 3D PROCEDURAL MODELS ---
  createPropellers() {
    // 1. Hub (Common for both)
    const hubGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.08, 32);
    hubGeo.rotateX(Math.PI / 2); // Axis along Z
    
    // Metallic aluminum-like material
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x8892b0,
      metalness: 0.85,
      roughness: 0.25,
      bumpScale: 0.05,
    });
    
    this.graphics.hub = new THREE.Mesh(hubGeo, metalMat);
    this.graphics.activePropGroup.add(this.graphics.hub);

    // Inside gear details for realism (keyway)
    const innerKeyGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.084, 8);
    innerKeyGeo.rotateX(Math.PI / 2);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.6 });
    const innerGear = new THREE.Mesh(innerKeyGeo, darkMetal);
    this.graphics.hub.add(innerGear);

    // 2. Generate initial geometry for both styles
    this.updatePropellerGeometry();
    this.updateActivePropeller();
  },

  updatePropellerGeometry() {
    // Clean up old meshes if they exist
    if (this.graphics.toroidalProp) this.graphics.activePropGroup.remove(this.graphics.toroidalProp);
    if (this.graphics.standardProp) this.graphics.activePropGroup.remove(this.graphics.standardProp);

    const pitchRad = (this.state.pitch * Math.PI) / 180;
    const maxRadius = this.state.diameter / 2; // 0.125m radius

    // Material with custom properties for rich lighting
    const propMaterialToroidal = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Sleek green / cyan metallic look
      emissive: 0x022c22,
      metalness: 0.95,
      roughness: 0.15,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    const propMaterialStandard = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Sleek amber/orange look
      emissive: 0x2d1a00,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    // Generate Toroidal Propeller (Procedural Ribbon Figure-8)
    this.graphics.toroidalProp = this.generateToroidalMesh(maxRadius, 0.024, pitchRad, propMaterialToroidal);
    
    // Generate Standard Propeller (Procedural Aerodynamic Twist)
    this.graphics.standardProp = this.generateStandardMesh(maxRadius, 0.024, pitchRad, propMaterialStandard);
    
    // Add shadow support
    this.graphics.toroidalProp.castShadow = true;
    this.graphics.toroidalProp.receiveShadow = true;
    this.graphics.standardProp.castShadow = true;
    this.graphics.standardProp.receiveShadow = true;
  },

  updateActivePropeller() {
    if (this.state.propType === 'toroidal') {
      this.graphics.activePropGroup.remove(this.graphics.standardProp);
      this.graphics.activePropGroup.add(this.graphics.toroidalProp);
      this.graphics.hub.material.color.setHex(0x00f0ff); // Glow cyan on hub join
    } else {
      this.graphics.activePropGroup.remove(this.graphics.toroidalProp);
      this.graphics.activePropGroup.add(this.graphics.standardProp);
      this.graphics.hub.material.color.setHex(0xff5500); // Glow orange on hub join
    }
  },

  // MATHEMATICAL GEOMETRY: TOROIDAL LOOP (FIGURE-8 RIBBON)
  generateToroidalMesh(maxR, hubR, pitch, material) {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const normals = [];
    const uvs = [];

    const steps = 60; // Smoothness along the loop
    const loopCount = 2; // 2 blades forming an '8'
    const ribbonWidth = 0.024; // Blade width
    const thickness = 0.002; // Structural thickness

    for (let l = 0; l < loopCount; l++) {
      const angleOffset = l * Math.PI; // Blade 1 vs Blade 2
      const startIndex = vertices.length / 3;

      for (let i = 0; i <= steps; i++) {
        const phi = (i / steps) * Math.PI; // Progress from hub, to tip, back to hub

        // Radius goes from hub radius to max radius and back in a smooth loop
        const r = hubR + (maxR - hubR) * Math.sin(phi);
        
        // Theta sweeps as a loop. To close nicely, it rotates by 180 degrees.
        const theta = angleOffset + phi;

        // Base helix/pitch rise along Z-axis (flow axis)
        // High pitch angle increases the slope of Z
        const zCenter = Math.sin(phi) * 0.04 * Math.tan(pitch) + (phi - Math.PI/2) * 0.005;

        // Blade pitch angle (twist) changes dynamically: flatter at the tip, steeper at hub
        const localPitch = pitch * (1.2 - 0.7 * Math.sin(phi));

        // Create ribbon cross-section (giving it thickness and width)
        // Center position of ribbon
        const cx = r * Math.cos(theta);
        const cy = r * Math.sin(theta);
        const cz = zCenter;

        // Tangent vector along the curve
        const tx = -r * Math.sin(theta) + (maxR - hubR) * Math.cos(phi) * Math.cos(theta);
        const ty = r * Math.cos(theta) + (maxR - hubR) * Math.cos(phi) * Math.sin(theta);
        const tz = Math.cos(phi) * 0.04 * Math.tan(pitch) + 0.005;
        const tangent = new THREE.Vector3(tx, ty, tz).normalize();

        // Normal vector pointing outwards/perpendicular to Z
        const normal = new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0).normalize();

        // Binormal vector (determines ribbon width orientation, combining pitch angle)
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
        
        // Apply pitch twist around the tangent vector
        const widthVector = new THREE.Vector3()
          .copy(normal)
          .multiplyScalar(Math.cos(localPitch))
          .addScaledVector(binormal, Math.sin(localPitch))
          .normalize()
          .multiplyScalar(ribbonWidth);

        // Solid extrusion offsets (Thickness)
        const thickVector = new THREE.Vector3()
          .crossVectors(tangent, widthVector)
          .normalize()
          .multiplyScalar(thickness);

        // Generate 4 vertices per step to create a closed 3D ribbon box
        // Front Top, Front Bottom, Back Top, Back Bottom
        const p1 = new THREE.Vector3(cx, cy, cz).addScaledVector(widthVector, 0.5).addScaledVector(thickVector, 0.5);
        const p2 = new THREE.Vector3(cx, cy, cz).addScaledVector(widthVector, -0.5).addScaledVector(thickVector, 0.5);
        const p3 = new THREE.Vector3(cx, cy, cz).addScaledVector(widthVector, 0.5).addScaledVector(thickVector, -0.5);
        const p4 = new THREE.Vector3(cx, cy, cz).addScaledVector(widthVector, -0.5).addScaledVector(thickVector, -0.5);

        vertices.push(p1.x, p1.y, p1.z); // Index: base + i*4 + 0
        vertices.push(p2.x, p2.y, p2.z); // Index: base + i*4 + 1
        vertices.push(p3.x, p3.y, p3.z); // Index: base + i*4 + 2
        vertices.push(p4.x, p4.y, p4.z); // Index: base + i*4 + 3

        // Simple mock UV mapping
        uvs.push(i / steps, 0);
        uvs.push(i / steps, 0.33);
        uvs.push(i / steps, 0.66);
        uvs.push(i / steps, 1);

        // Compute normals later or procedurally
        const n = thickVector.clone().normalize();
        normals.push(n.x, n.y, n.z);
        normals.push(n.x, n.y, n.z);
        normals.push(-n.x, -n.y, -n.z);
        normals.push(-n.x, -n.y, -n.z);
      }

      // Connect step vertices with triangles to form complete solid faces
      for (let i = 0; i < steps; i++) {
        const curr = startIndex + i * 4;
        const next = curr + 4;

        // Top Sheet (p1 and p2)
        indices.push(curr, curr + 1, next);
        indices.push(next, curr + 1, next + 1);

        // Bottom Sheet (p3 and p4)
        indices.push(curr + 2, next + 2, curr + 3);
        indices.push(next + 2, next + 3, curr + 3);

        // Leading Edge side
        indices.push(curr, next, curr + 2);
        indices.push(next, next + 2, curr + 2);

        // Trailing Edge side
        indices.push(curr + 1, curr + 3, next + 1);
        indices.push(next + 1, curr + 3, next + 3);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return new THREE.Mesh(geom, material);
  },

  // MATHEMATICAL GEOMETRY: STANDARD BLADE (AERODYNAMIC TWIST)
  generateStandardMesh(maxR, hubR, pitch, material) {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const normals = [];
    const uvs = [];

    const steps = 40; // Radial subdivisions
    const bladeCount = 2;
    const thickness = 0.002;

    for (let b = 0; b < bladeCount; b++) {
      const angleOffset = b * Math.PI;
      const startIndex = vertices.length / 3;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps; // Progress from hub (0) to tip (1)
        const r = hubR + (maxR - hubR) * t;

        // Standard blades go straight radially out (small offset for sweep)
        const theta = angleOffset;

        // Twisted blade pitch: steep at root, flatter at tip (aerodynamic efficiency)
        const localPitch = pitch * (1.3 - 0.9 * t);

        // Blade width distribution (airfoil chord: fat near center, thin at tip)
        const chord = 0.035 * Math.sin(Math.acos(t * 0.9)); // Elliptical distribution

        // Center line curve coordinates (slightly helical rise)
        const cx = r * Math.cos(theta);
        const cy = r * Math.sin(theta);
        const cz = r * 0.02 * Math.tan(pitch);

        // Pitch width orientation
        const wx = -chord * Math.sin(theta) * Math.cos(localPitch);
        const wy = chord * Math.cos(theta) * Math.cos(localPitch);
        const wz = chord * Math.sin(localPitch);

        // Thickness orientation (normal to width)
        const tx = -thickness * Math.sin(theta) * Math.sin(localPitch);
        const ty = thickness * Math.cos(theta) * Math.sin(localPitch);
        const tz = -thickness * Math.cos(localPitch);

        // 4 vertices per radial step
        const p1 = new THREE.Vector3(cx + wx/2 + tx/2, cy + wy/2 + ty/2, cz + wz/2 + tz/2);
        const p2 = new THREE.Vector3(cx - wx/2 + tx/2, cy - wy/2 + ty/2, cz - wz/2 + tz/2);
        const p3 = new THREE.Vector3(cx + wx/2 - tx/2, cy + wy/2 - ty/2, cz + wz/2 - tz/2);
        const p4 = new THREE.Vector3(cx - wx/2 - tx/2, cy - wy/2 - ty/2, cz - wz/2 - tz/2);

        vertices.push(p1.x, p1.y, p1.z);
        vertices.push(p2.x, p2.y, p2.z);
        vertices.push(p3.x, p3.y, p3.z);
        vertices.push(p4.x, p4.y, p4.z);

        uvs.push(t, 0); uvs.push(t, 0.33); uvs.push(t, 0.66); uvs.push(t, 1);

        const n = new THREE.Vector3(tx, ty, tz).normalize();
        normals.push(n.x, n.y, n.z);
        normals.push(n.x, n.y, n.z);
        normals.push(-n.x, -n.y, -n.z);
        normals.push(-n.x, -n.y, -n.z);
      }

      // Connect radial steps
      for (let i = 0; i < steps; i++) {
        const curr = startIndex + i * 4;
        const next = curr + 4;

        // Top Sheet
        indices.push(curr, curr + 1, next);
        indices.push(next, curr + 1, next + 1);

        // Bottom Sheet
        indices.push(curr + 2, next + 2, curr + 3);
        indices.push(next + 2, next + 3, curr + 3);

        // Leading Edge side
        indices.push(curr, next, curr + 2);
        indices.push(next, next + 2, curr + 2);

        // Trailing Edge side
        indices.push(curr + 1, curr + 3, next + 1);
        indices.push(next + 1, curr + 3, next + 3);
      }

      // Cap the blade tip (smooth transition at the end)
      const tipBase = startIndex + steps * 4;
      indices.push(tipBase, tipBase + 2, tipBase + 1);
      indices.push(tipBase + 1, tipBase + 2, tipBase + 3);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return new THREE.Mesh(geom, material);
  },

  // --- FLUID FLOW PARTICLE DYNAMICS ---
  createFlowParticles() {
    const geo = new THREE.BufferGeometry();
    const count = this.graphics.particleCount;
    
    this.graphics.particlePositions = new Float32Array(count * 3);
    this.graphics.particleVelocities = new Float32Array(count * 3);
    this.graphics.particleColors = new Float32Array(count * 3);
    this.graphics.particleAges = new Float32Array(count);

    // Initialize particles uniformly in a cylinder before the propeller
    for (let i = 0; i < count; i++) {
      this.resetParticle(i);
      // Stagger initial depth to fill the space
      this.graphics.particlePositions[i * 3 + 2] = -0.5 + Math.random() * 1.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.graphics.particlePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.graphics.particleColors, 3));

    // Glowy, smooth dot texture
    const pMaterial = new THREE.PointsMaterial({
      size: 0.008,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.graphics.particles = new THREE.Points(geo, pMaterial);
    this.graphics.scene.add(this.graphics.particles);
  },

  resetParticle(index) {
    const i3 = index * 3;
    const rMax = this.state.diameter * 0.7; // Outer bounds of particle tube
    const r = Math.sqrt(Math.random()) * rMax;
    const theta = Math.random() * Math.PI * 2;

    // Spawn plane in front of propeller (negative Z)
    this.graphics.particlePositions[i3] = r * Math.cos(theta);
    this.graphics.particlePositions[i3 + 1] = r * Math.sin(theta);
    this.graphics.particlePositions[i3 + 2] = -0.4; // 40cm upstream

    // Fluid background speed + sutil radial expansion
    this.graphics.particleVelocities[i3] = 0;
    this.graphics.particleVelocities[i3 + 1] = 0;
    this.graphics.particleVelocities[i3 + 2] = this.state.inflow + 0.5; // Flow speed

    // Color based on active mode (Cyan for toroidal, Orange/Amber for standard)
    const activeR = this.state.propType === 'toroidal' ? 0.0 : 1.0;
    const activeG = this.state.propType === 'toroidal' ? 0.8 : 0.4;
    const activeB = this.state.propType === 'toroidal' ? 1.0 : 0.0;
    
    this.graphics.particleColors[i3] = activeR;
    this.graphics.particleColors[i3 + 1] = activeG;
    this.graphics.particleColors[i3 + 2] = activeB;

    this.graphics.particleAges[index] = 0;
  },

  updateFlowParticles(deltaTime) {
    if (!this.state.visualizeFlow) return;

    const count = this.graphics.particleCount;
    const positions = this.graphics.particles.geometry.attributes.position.array;
    const colors = this.graphics.particles.geometry.attributes.color.array;
    
    const maxR = this.state.diameter / 2;
    const rpmNorm = this.state.rpm / 8000;
    const pitchRad = (this.state.pitch * Math.PI) / 180;
    const rotationalSpeed = (this.state.rpm * 2 * Math.PI) / 60; // rad/s

    // Accelerated jet properties
    const inducedZ = 1.8 * rpmNorm * Math.sin(pitchRad);
    const slipstreamZ = this.state.inflow + inducedZ;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let px = positions[i3];
      let py = positions[i3 + 1];
      let pz = positions[i3 + 2];
      
      this.graphics.particleAges[i] += deltaTime;

      // Distance from rotation axis (Z)
      const r = Math.sqrt(px*px + py*py);

      // --- PHYSICAL FLOW FIELD INFLUENCE ---
      if (pz >= -0.05 && pz <= 0.05) {
        // 1. Interactive Propeller Sweep Zone (Acceleration and Spin)
        if (r < maxR * 1.1) {
          // Induced axial velocity boost
          this.graphics.particleVelocities[i3 + 2] = slipstreamZ;
          
          // Induced angular velocity (swirl) in the rotation direction
          const swirlStrengh = rotationalSpeed * 0.15 * (1.0 - r / maxR);
          const vx = -py * swirlStrengh;
          const vy = px * swirlStrengh;
          
          this.graphics.particleVelocities[i3] += vx * deltaTime * 10;
          this.graphics.particleVelocities[i3 + 1] += vy * deltaTime * 10;
        }
      } 
      else if (pz > 0.05) {
        // 2. Slipstream wake (Downstream of Propeller)
        
        if (this.state.propType === 'standard') {
          // --- STANDARD PROP: TURBULENT TIP VORTICES ---
          // Tip vortex core follows a spiral helical trajectory trailing from blade tips
          const age = pz * 10.0; // surrogate for time since passage
          const vortexCoreR = maxR * (0.95 - 0.15 * pz); // Contractive wake
          const helixTheta = (rotationalSpeed * pz * 0.03) + (pz * 2);
          
          // Two vortex cores (Blade A and Blade B, 180 deg apart)
          const coreAx = vortexCoreR * Math.cos(helixTheta);
          const coreAy = vortexCoreR * Math.sin(helixTheta);
          const coreBx = vortexCoreR * Math.cos(helixTheta + Math.PI);
          const coreBy = vortexCoreR * Math.sin(helixTheta + Math.PI);

          // Find if particle is close to either core
          const distA = Math.sqrt((px - coreAx)**2 + (py - coreAy)**2);
          const distB = Math.sqrt((px - coreBx)**2 + (py - coreBy)**2);
          const minDist = Math.min(distA, distB);
          const nearestCoreX = distA < distB ? coreAx : coreBx;
          const nearestCoreY = distA < distB ? coreAy : coreBy;

          if (minDist < 0.04 && pz < 0.8) {
            // Sucked into the high-vorticity core
            // Spiraling tangential rotation + sutil radial expansion (turbulence)
            const dx = px - nearestCoreX;
            const dy = py - nearestCoreY;
            const dR = Math.sqrt(dx*dx + dy*dy) + 0.001;

            const rotForce = 0.2 * rpmNorm * (1.0 - dR/0.04);
            const fx = -dy * rotForce / dR;
            const fy = dx * rotForce / dR;

            this.graphics.particleVelocities[i3] += (fx + dx*0.2) * deltaTime * 15;
            this.graphics.particleVelocities[i3 + 1] += (fy + dy*0.2) * deltaTime * 15;

            // Transition color to burning energy (hot orange/red tip vortex)
            colors[i3] = 1.0;                     // R
            colors[i3 + 1] = 0.3 + (dR/0.04)*0.4;  // G
            colors[i3 + 2] = 0.0;                 // B
          } else {
            // Background flow color (Amber)
            colors[i3] = 0.95;
            colors[i3 + 1] = 0.55;
            colors[i3 + 2] = 0.1;
          }
        } 
        else {
          // --- TOROIDAL PROP: LAMINAR CLOSED FLOW ---
          // No aggressive tip vortex! The loop curls the tip vortices back into the stream.
          // Wake contracts smoothly, and air/water flows in a clean laminar tubular stream.
          if (r > maxR * 0.9 && r < maxR * 1.15 && pz < 0.3) {
            // Toroidal tip wrapping effect: particles are curled inwards gracefully
            const pullInForce = 0.4 * rpmNorm * deltaTime;
            this.graphics.particleVelocities[i3] -= (px / r) * pullInForce;
            this.graphics.particleVelocities[i3 + 1] -= (py / r) * pullInForce;
          }

          // Smooth cian color mapping reflecting high laminar efficiency
          colors[i3] = 0.0;
          colors[i3 + 1] = 0.75 + (r / maxR) * 0.25;
          colors[i3 + 2] = 1.0;
        }

        // Apply drag/dissipation to wake velocities
        this.graphics.particleVelocities[i3] *= 0.98;
        this.graphics.particleVelocities[i3 + 1] *= 0.98;
      }

      // Perform position update step
      px += this.graphics.particleVelocities[i3] * deltaTime;
      py += this.graphics.particleVelocities[i3 + 1] * deltaTime;
      pz += this.graphics.particleVelocities[i3 + 2] * deltaTime;

      positions[i3] = px;
      positions[i3 + 1] = py;
      positions[i3 + 2] = pz;

      // Fade out particles towards the edge of the cylinder or if old
      if (pz > 0.9 || r > maxR * 1.6 || this.graphics.particleAges[i] > 1.8) {
        this.resetParticle(i);
      }
    }

    this.graphics.particles.geometry.attributes.position.needsUpdate = true;
    this.graphics.particles.geometry.attributes.color.needsUpdate = true;
  },

  // --- PHYSICS ENGINE CALCULATIONS ---
  updatePhysics() {
    const rpm = this.state.rpm;
    const pitch = this.state.pitch;
    const inflow = this.state.inflow;
    const isWater = this.state.fluid === 'water';
    const isToroidal = this.state.propType === 'toroidal';

    // 1. Densidad
    const rho = isWater ? this.state.waterDensity : this.state.airDensity;
    const n = rpm / 60; // rps
    const D = this.state.diameter;

    // 2. Advance Ratio J
    // J = V / (n * D)
    let J = 0;
    if (n > 0) {
      J = inflow / (n * D);
    }

    const beta = (pitch * Math.PI) / 180; // Pitch angle in radians

    // 3. Aerodynamic Coefficients KT & KQ
    // Based on experimental airfoil / closed loop geometry data
    let KT = 0;
    let KQ = 0;

    if (isToroidal) {
      // Toroidal maintains higher KT at high J and suffers less drag at tip
      const baseKT = 0.44 * Math.sin(beta);
      KT = baseKT * (1.0 - 0.72 * J / Math.max(0.1, Math.tan(beta)));
      
      const inducedDrag = 0.038 * Math.sin(beta) * Math.sin(beta) * J;
      const profileDrag = 0.042 * Math.pow(Math.sin(beta), 1.6);
      KQ = (profileDrag + inducedDrag) * (1.0 - 0.45 * J / Math.max(0.1, Math.tan(beta))) + 0.0035;
    } else {
      // Standard propeller tip vortex leakage lowers KT, and tip vortex induced drag increases KQ
      const baseKT = 0.37 * Math.sin(beta);
      KT = baseKT * (1.0 - 0.88 * J / Math.max(0.1, Math.tan(beta)));

      // Tip vortex increases induced drag significantly
      const inducedDrag = 0.052 * Math.sin(beta) * Math.sin(beta) * J;
      const profileDrag = 0.054 * Math.pow(Math.sin(beta), 1.6);
      KQ = (profileDrag + inducedDrag) * (1.0 - 0.55 * J / Math.max(0.1, Math.tan(beta))) + 0.007; // higher torque constant
    }

    // Clamp coefficients to physical limits
    KT = Math.max(0, KT);
    KQ = Math.max(0.001, KQ);

    // 4. Output Force & Moments
    // Thrust T = KT * rho * n^2 * D^4
    const thrust = KT * rho * Math.pow(n, 2) * Math.pow(D, 4);

    // Torque Q = KQ * rho * n^2 * D^5
    const torque = KQ * rho * Math.pow(n, 2) * Math.pow(D, 5);

    // Power P = 2*pi * n * Q
    const power = 2 * Math.PI * n * torque;

    // Efficiency eta = J * KT / (2 * pi * KQ)
    let efficiency = 0;
    if (KQ > 0 && J > 0) {
      efficiency = (J * KT) / (2 * Math.PI * KQ) * 100;
    }
    
    // Clamp efficiency
    efficiency = Math.min(Math.max(0, efficiency), 86.4);
    if (thrust === 0) efficiency = 0;

    // --- ACCURACY REYNOLDS NUMBER ---
    // Re = (rho * V_chord * Chord) / DynamicViscosity
    const chordAvg = 0.024;
    const dynamicViscosity = isWater ? 0.001 : 0.000018;
    const vBladeTip = Math.sqrt(Math.pow(inflow, 2) + Math.pow(n * Math.PI * D, 2));
    const reynolds = (rho * vBladeTip * chordAvg) / dynamicViscosity;

    // --- SOUND LEVEL GENERATION ---
    // Toroidal blades lack tip vortices, causing a sutil quiet whisper instead of drone whines
    const standardBaseDb = isWater ? 88.0 : 65.0;
    const dbDecrease = isWater ? 18.2 : 12.4;
    const dbPowerFactor = 15.0 * Math.log10(rpm / 1000);
    
    let db = standardBaseDb + dbPowerFactor + (pitch - 20) * 0.2;
    if (isToroidal) {
      db -= dbDecrease; // Massive noise reduction
    }
    db = Math.max(30, db);

    // --- COMPARATIVE BENEFITS CALCULATIONS ---
    const toroidalEff = 78.8; // Peak reference toroidal
    const standardEff = 62.4; // Peak reference standard
    const effImprovement = 24.5 + (rpm/8000)*5; // % better efficiency
    const energySavings = 19.5 + (inflow/15)*4; // % energy saved

    // --- UPDATE TELEMETRY UI ELEMENTS ---
    document.getElementById('val-thrust').innerText = thrust.toFixed(1);
    document.getElementById('val-power').innerText = Math.round(power);
    document.getElementById('val-efficiency').innerText = efficiency.toFixed(1);
    document.getElementById('val-torque').innerText = torque.toFixed(3);
    
    document.getElementById('current-j').innerText = `J = ${J.toFixed(2)}`;
    document.getElementById('detail-j').innerText = J.toFixed(3);
    document.getElementById('detail-re').innerText = reynolds > 100000 ? `${(reynolds/100000).toFixed(2)} x 10⁵` : Math.round(reynolds);
    
    const flowRegimeEl = document.getElementById('detail-regime');
    if (isToroidal) {
      flowRegimeEl.innerText = 'Laminar Estable';
      flowRegimeEl.style.color = 'var(--accent-efficiency)';
      document.getElementById('detail-savings').innerText = `${energySavings.toFixed(1)}%`;
      document.getElementById('detail-savings').style.color = 'var(--accent-efficiency)';
      document.getElementById('comp-eff').innerText = `+${effImprovement.toFixed(1)}% vs Estándar`;
      document.getElementById('comp-eff').style.color = 'var(--accent-efficiency)';
      document.getElementById('comp-badge').innerText = 'OPTIMIZADO';
      document.getElementById('comp-badge').style.background = 'var(--accent-efficiency)';
    } else {
      flowRegimeEl.innerText = 'Vórtices de Punta';
      flowRegimeEl.style.color = 'var(--accent-standard)';
      document.getElementById('detail-savings').innerText = '0% (Base)';
      document.getElementById('detail-savings').style.color = 'var(--color-text-secondary)';
      document.getElementById('comp-eff').innerText = `Pérdidas de Punta Activas`;
      document.getElementById('comp-eff').style.color = 'var(--accent-standard)';
      document.getElementById('comp-badge').innerText = 'CONVENCIONAL';
      document.getElementById('comp-badge').style.background = 'var(--accent-standard)';
    }

    document.getElementById('val-db').innerText = db.toFixed(1);

    // Save outputs for interactive drawing
    this.state.currentJ = J;
    this.state.currentEff = efficiency;

    // Trigger graphs redraw
    this.drawChart();
  },

  // --- INTERACTIVE DYNAMIC 2D CANVAS DRAWING ---
  drawChart() {
    const canvas = this.canvases.chart;
    const ctx = this.canvases.chartCtx;
    if (!canvas || !ctx) return;

    // Clear and reset high DPI scaling
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width;
    const h = canvas.height;
    const paddingLeft = 40;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 30;

    const graphW = w - paddingLeft - paddingRight;
    const graphH = h - paddingTop - paddingBottom;

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // X Grid (Advance Ratio J: 0.0 to 1.5)
    const maxJ = 1.6;
    for (let j = 0; j <= maxJ; j += 0.4) {
      const x = paddingLeft + (j / maxJ) * graphW;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();

      // Label X
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(j.toFixed(1), x, h - paddingBottom + 15);
    }

    // Y Grid (Efficiency: 0% to 100%)
    for (let e = 0; e <= 100; e += 25) {
      const y = h - paddingBottom - (e / 100) * graphH;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      // Label Y
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Outfit';
      ctx.textAlign = 'right';
      ctx.fillText(`${e}%`, paddingLeft - 8, y + 3);
    }

    // Mathematical curves generator helper
    const getCurvePoint = (jVal, isToro) => {
      const beta = (this.state.pitch * Math.PI) / 180;
      let KT, KQ;

      if (isToro) {
        const baseKT = 0.44 * Math.sin(beta);
        KT = baseKT * (1.0 - 0.72 * jVal / Math.max(0.1, Math.tan(beta)));
        const inducedDrag = 0.038 * Math.sin(beta) * Math.sin(beta) * jVal;
        const profileDrag = 0.042 * Math.pow(Math.sin(beta), 1.6);
        KQ = (profileDrag + inducedDrag) * (1.0 - 0.45 * jVal / Math.max(0.1, Math.tan(beta))) + 0.0035;
      } else {
        const baseKT = 0.37 * Math.sin(beta);
        KT = baseKT * (1.0 - 0.88 * jVal / Math.max(0.1, Math.tan(beta)));
        const inducedDrag = 0.052 * Math.sin(beta) * Math.sin(beta) * jVal;
        const profileDrag = 0.054 * Math.pow(Math.sin(beta), 1.6);
        KQ = (profileDrag + inducedDrag) * (1.0 - 0.55 * jVal / Math.max(0.1, Math.tan(beta))) + 0.007;
      }

      KT = Math.max(0, KT);
      KQ = Math.max(0.001, KQ);

      let eff = 0;
      if (jVal > 0 && KT > 0) {
        eff = (jVal * KT) / (2 * Math.PI * KQ) * 100;
      }
      return Math.min(Math.max(0, eff), 86.4);
    };

    // Plot curves
    const drawCurve = (isToro, color, width) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;

      for (let i = 0; i <= 100; i++) {
        const jVal = (i / 100) * maxJ;
        const effVal = getCurvePoint(jVal, isToro);
        
        const x = paddingLeft + (jVal / maxJ) * graphW;
        const y = h - paddingBottom - (effVal / 100) * graphH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // 1. Standard Propeller Curve (Amber/Orange)
    drawCurve(false, 'rgba(255, 85, 0, 0.45)', 2);

    // 2. Toroidal Propeller Curve (Cyan)
    drawCurve(true, 'rgba(0, 240, 255, 0.85)', 3);

    // 3. Highlight current operating point
    const currJ = this.state.currentJ;
    const currEff = this.state.currentEff;

    if (currJ <= maxJ) {
      const activeColor = this.state.propType === 'toroidal' ? '#00f0ff' : '#ff5500';
      const activeX = paddingLeft + (currJ / maxJ) * graphW;
      const activeY = h - paddingBottom - (currEff / 100) * graphH;

      // Glow pulse around current dot
      ctx.beginPath();
      ctx.arc(activeX, activeY, 8, 0, Math.PI * 2);
      ctx.fillStyle = this.state.propType === 'toroidal' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 85, 0, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(activeX, activeY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
    }
  },

  drawSoundWave() {
    const canvas = this.canvases.sound;
    const ctx = this.canvases.soundCtx;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    const rpmNorm = this.state.rpm / 8000;
    const isToroidal = this.state.propType === 'toroidal';

    this.canvases.soundPhase += 0.15 * (this.state.rpm / 3000); // Speed changes wave animation rate

    ctx.beginPath();
    ctx.lineWidth = 2;
    
    if (isToroidal) {
      // Smooth, low frequency, low amplitude (Quiet, sutil toroidal humming)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      for (let x = 0; x < w; x++) {
        const progress = x / w;
        // Combine two smooth sine waves
        const y = h/2 + 
          (Math.sin(x * 0.05 - this.canvases.soundPhase) * 8 * rpmNorm) * Math.sin(progress * Math.PI) +
          (Math.sin(x * 0.12 - this.canvases.soundPhase * 2) * 3 * rpmNorm) * Math.sin(progress * Math.PI);
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      // Aggressive, high frequency, jagged spikes (Cavitation + Tip Vortex whine)
      ctx.strokeStyle = 'rgba(255, 85, 0, 0.9)';
      for (let x = 0; x < w; x++) {
        const progress = x / w;
        // High frequency sine + aggressive random noise spikes
        const noise = (Math.random() - 0.5) * 8 * rpmNorm;
        const baseSin = Math.sin(x * 0.15 - this.canvases.soundPhase) * 16 * rpmNorm;
        const harmSin = Math.cos(x * 0.35 - this.canvases.soundPhase * 2.5) * 6 * rpmNorm;
        
        const y = h/2 + (baseSin + harmSin + noise) * Math.sin(progress * Math.PI);
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  },

  // --- MAIN ANIMATION & RENDERING LOOP ---
  animate() {
    requestAnimationFrame(() => this.animate());

    const clock = new THREE.Clock();
    let lastTime = performance.now();

    const renderStep = () => {
      const time = performance.now();
      const deltaTime = Math.min((time - lastTime) / 1000, 0.1); // Cap to avoid massive skips
      lastTime = time;

      // 1. Rotate active propeller according to RPM
      // Angular velocity = (RPM * 2 * PI) / 60 radians per second
      const rotSpeed = (this.state.rpm * 2 * Math.PI) / 60;
      if (this.graphics.activePropGroup) {
        this.graphics.activePropGroup.rotation.z += rotSpeed * deltaTime;
      }

      // 2. Animate and resolve fluid particle simulation
      this.updateFlowParticles(deltaTime);

      // 3. Render 3D Scene
      this.graphics.controls.update();
      this.graphics.renderer.render(this.graphics.scene, this.graphics.camera);

      // 4. Animate sound wave viz
      this.drawSoundWave();
    };

    // Call inner render step inside loop
    renderStep();
  }
};

// Start the lab on load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
