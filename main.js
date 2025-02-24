import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.127.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.127.0/examples/jsm/controls/OrbitControls.js';

// Initialize the scene
const scene = new THREE.Scene();

// Create both cameras
let aspect = window.innerWidth / window.innerHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
const orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

// Define a common start position for both cameras
const startPosition = new THREE.Vector3(0, 0.5, 1.5); // Start position for both cameras
const startRotation = new THREE.Euler(0, 0, 0); // Common initial rotation

// Set the initial camera
let currentCamera = perspectiveCamera;
currentCamera.position.copy(startPosition);
currentCamera.rotation.copy(startRotation);

// Add the current camera to the scene
scene.add(currentCamera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setClearColor(0xffffff, 0.8); // White background with 80% opacity
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('renderer-container').appendChild(renderer.domElement);

// Responsive resizing
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Update aspect ratio
  aspect = width / height;

  // Update camera aspect ratios and projection matrices
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  orthographicCamera.left = -aspect;
  orthographicCamera.right = aspect;
  orthographicCamera.top = 1;
  orthographicCamera.bottom = -1;
  orthographicCamera.updateProjectionMatrix();

  // Update renderer size
  renderer.setSize(width, height);
}

window.addEventListener('resize', onWindowResize, false);
onWindowResize();

// Lights and geometry setup
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.ShadowMaterial({
  opacity: 0.1,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
scene.add(directionalLight);

// Allowed Thicknesses in centimeters
const allowedThicknesses = [1.2, 1.8, 2.4, 3.0]; // Allowed values in centimeters

function closestAllowedThickness(value, toMeters = true) {
  const closest = allowedThicknesses.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
  return toMeters ? closest / 100 : closest; // Convert based on the flag
}

// Cube properties, dimensions, spacing, etc.
let viewProperties = {
  perspectiveView: true,
};
let cubeProperties = {
  transparency: true,
  opacity: 1,
  thickness: closestAllowedThickness(1.8), // Initialize in meters
  cubeWidth: 0.4,
  cubeHeight: 0.4,
  cubeDepth: 0.4,
  frontPanelVisible: true,
  backPanelVisible: true,
  leftPanelVisible: true,
  rightPanelVisible: true,
  topPanelVisible: true,
  bottomPanelVisible: true,
  showHorizontalPanels: true,
  selectedTexture: 'Red Lamination',
};

// Store initial properties for resetting
const initialCubeProperties = { ...cubeProperties };

let dimensions = {
  width: 0.6,
  height: 0.6,
  depth: 0.6,
};

// Store initial dimensions
const initialDimensions = { ...dimensions };

let spacing = {
  cubeSpacing: 0.02,
  frontPanelGap: 0.005,
};

let numCubes = {
  numCubesX: 1,
  numCubesY: 1,
  numCubesZ: 1,
};

// Store initial numCubes
const initialNumCubes = { ...numCubes };

let panelProperties = {
  showLargePanel: false,
  showFloorPanel: false,
};

// Function: Smooth reset camera to start position
function resetCamera() {
  const duration = 1; // Transition duration in seconds
  const startPos = currentCamera.position.clone(); // Clone the current position
  const startRot = currentCamera.rotation.clone(); // Clone the current rotation

  // Calculate bounding box center and distance based on geometry dimensions
  const center = new THREE.Vector3(0, dimensions.height / 2, 0); // Center of the geometry
  const maxDimension = Math.max(dimensions.width, dimensions.height, dimensions.depth); // Get the largest dimension
  // Adjust the distance factor based on the geometry width to avoid going too far
  const widthFactor = Math.min(1, dimensions.width / dimensions.height); // Limit width contribution
  const distanceFactor = 1 + widthFactor / 2; // Base distance factor with smaller width contribution

  // Calculate target position based on geometry size and aspect ratio
  const targetPos = new THREE.Vector3(center.x, center.y, maxDimension * distanceFactor);
  const targetRot = new THREE.Euler(0, 0, 0); // Keep the rotation looking forward
  const startTime = performance.now();

  function animateReset(time) {
    const elapsedTime = (time - startTime) / 1000; // Convert to seconds
    const t = Math.min(elapsedTime / duration, 1); // Normalize time to [0, 1]

    // Smoothly interpolate the position and rotation
    currentCamera.position.lerpVectors(startPos, targetPos, t);

    // Interpolate the rotation smoothly using slerp (for Euler angles, manually interpolate each axis)
    currentCamera.rotation.set(
      THREE.MathUtils.lerp(startRot.x, targetRot.x, t),
      THREE.MathUtils.lerp(startRot.y, targetRot.y, t),
      THREE.MathUtils.lerp(startRot.z, targetRot.z, t)
    );

    // Update the controls target to the center of the geometry
    controls.target.lerp(center, t);

    // Update controls for the current frame
    controls.update();

    // Continue the animation if not done
    if (t < 1) {
      requestAnimationFrame(animateReset);
    }
  }

  requestAnimationFrame(animateReset);
}

function updateCameraView() {
  if (viewProperties.perspectiveView) {
    currentCamera = perspectiveCamera;
  } else {
    // Update orthographic camera parameters
    const frustumSize = 1;
    orthographicCamera.left = -frustumSize * aspect;
    orthographicCamera.right = frustumSize * aspect;
    orthographicCamera.top = frustumSize;
    orthographicCamera.bottom = -frustumSize;
    orthographicCamera.updateProjectionMatrix();

    currentCamera = orthographicCamera;
  }

  // Sync camera position and rotation
  currentCamera.position.copy(perspectiveCamera.position);
  currentCamera.rotation.copy(perspectiveCamera.rotation);
  controls.object = currentCamera;
  controls.update();
}

function updateDimensions() {
  const cubeWidth = cubeProperties.cubeWidth;
  const cubeHeight = cubeProperties.cubeHeight;
  const cubeDepth = cubeProperties.cubeDepth;
  const cubeSpacing = spacing.cubeSpacing;

  dimensions.width = numCubes.numCubesX * cubeWidth + (numCubes.numCubesX - 1) * cubeSpacing;
  dimensions.height = numCubes.numCubesY * cubeHeight + (numCubes.numCubesY - 1) * cubeSpacing;
  dimensions.depth = numCubes.numCubesZ * cubeDepth + (numCubes.numCubesZ - 1) * cubeSpacing;
}

let largePanel = null; // Initialize largePanel outside the function
let floorPanel = null; // Initialize floorPanel outside the function

function updateCubeGeometry() {
  scene.children = scene.children.filter(
    (child) => !child.userData.isCube && child !== largePanel && child !== floorPanel
  );
  updateDimensions();

  endGrainMaterial.opacity = cubeProperties.opacity;
  rotatedEndGrainMaterial.opacity = cubeProperties.opacity;
  laminatedMaterial.opacity = cubeProperties.opacity;
  cylinderMaterial.opacity = cubeProperties.opacity;

  const cubeWidth = cubeProperties.cubeWidth;
  const cubeHeight = cubeProperties.cubeHeight;
  const cubeDepth = cubeProperties.cubeDepth;
  const cubeSpacing = spacing.cubeSpacing;

  const sectionSizeX = cubeWidth + cubeSpacing;
  const sectionSizeY = cubeHeight + cubeSpacing;
  const sectionSizeZ = cubeDepth + cubeSpacing;

  const numSectionsX = numCubes.numCubesX;
  const numSectionsY = numCubes.numCubesY;
  const numSectionsZ = numCubes.numCubesZ;

  for (let x = 0; x < numSectionsX; x++) {
    for (let z = 0; z < numSectionsZ; z++) {
      for (let y = 0; y < numSectionsY; y++) {
        const offsetX = x * sectionSizeX - dimensions.width / 2;
        const offsetY = y * sectionSizeY;
        const offsetZ = z * sectionSizeZ;
        const mesh = createSectionMesh(
          cubeProperties.cubeWidth,
          cubeProperties.cubeHeight,
          cubeProperties.cubeDepth,
          offsetX,
          offsetY,
          offsetZ
        );
        scene.add(mesh);
      }
    }
  }

  // Handle largePanel
  if (largePanel) {
    scene.remove(largePanel);
  }

  if (panelProperties.showLargePanel) {
    const panelWidth = 8;
    const panelHeight = 3;
    const panelDepth = 0.1;

    const largePanelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
    const largePanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
    });
    largePanel = new THREE.Mesh(largePanelGeometry, largePanelMaterial);

    largePanel.position.set(panelWidth / 2 - 3, panelHeight / 2, -panelDepth / 2);
    largePanel.userData.isCube = true;
    scene.add(largePanel);
  }

  // Handle floorPanel
  if (floorPanel) {
    scene.remove(floorPanel);
  }

  if (panelProperties.showFloorPanel) {
    const floorWidth = 8;
    const floorDepth = 4;
    const floorThickness = 0.1;

    const floorPanelGeometry = new THREE.BoxGeometry(floorWidth, floorThickness, floorDepth);
    const floorPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
    });
    floorPanel = new THREE.Mesh(floorPanelGeometry, floorPanelMaterial);

    floorPanel.position.set(floorWidth / 2 - 3, -floorThickness / 2, floorDepth / 2);
    floorPanel.userData.isCube = true;
    scene.add(floorPanel);
  }
}

const textureLoader = new THREE.TextureLoader();

const greyLaminatedTexture = textureLoader.load('https://i.imgur.com/0yEgr94.jpeg');
const whiteLaminatedTexture = textureLoader.load('https://i.imgur.com/EjW8L4E.jpeg');
const yellowLaminatedTexture = textureLoader.load('https://i.imgur.com/QrapdXF.jpeg');
const naturalFinishTexture = textureLoader.load('https://i.imgur.com/P9YMPBs.jpg');
const redLaminatedTexture = textureLoader.load('https://i.imgur.com/30oAplv.jpeg'); // New Red Texture
const blueLaminatedTexture = textureLoader.load('https://i.imgur.com/AEN7fTa.jpeg'); // New Blue Texture

const endGrainTexture = textureLoader.load('https://i.imgur.com/azPNWoQ.jpeg', (texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.1, 0.1);
});

const rotatedEndGrainTexture = textureLoader.load('https://i.imgur.com/azPNWoQ.jpeg', (texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.1, 0.1);
  texture.rotation = Math.PI / 2;
  texture.center.set(0.5, 0.5);
});

let laminatedMaterial = new THREE.MeshStandardMaterial({
  map: redLaminatedTexture,
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.5,
  metalness: 0.1,
});

let cylinderMaterial = new THREE.MeshStandardMaterial({
  map: greyLaminatedTexture, // Initial texture matching the selected lamination
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.5,
  metalness: 0.1,
});

const endGrainMaterial = new THREE.MeshStandardMaterial({
  map: endGrainTexture,
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.8,
  metalness: 0.1,
});

const rotatedEndGrainMaterial = new THREE.MeshStandardMaterial({
  map: rotatedEndGrainTexture,
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.8,
  metalness: 0.1,
});

function updateLaminatedMaterial() {
  switch (cubeProperties.selectedTexture) {
    case 'Grey Lamination':
      laminatedMaterial.map = greyLaminatedTexture;
      break;
    case 'White Lamination':
      laminatedMaterial.map = whiteLaminatedTexture;
      break;
    case 'Yellow Lamination':
      laminatedMaterial.map = yellowLaminatedTexture;
      break;
    case 'Natural Finish':
      laminatedMaterial.map = naturalFinishTexture;
      break;
    case 'Red Lamination':
      laminatedMaterial.map = redLaminatedTexture;
      break;
    case 'Blue Lamination':
      laminatedMaterial.map = blueLaminatedTexture;
      break;
  }
  laminatedMaterial.needsUpdate = true;
  cylinderMaterial.needsUpdate = true;
  updateCubeGeometry();
}

function createSectionMesh(width, height, depth, offsetX, offsetY, offsetZ) {
  const thickness = cubeProperties.thickness;
  const offset = 0; // 0cm offset from the edges for the horizontal panels!!!
  const frontPanelGap = spacing.frontPanelGap; // 10cm -> 0.005 meters

  const group = new THREE.Group();

  // Top and Bottom Panels
  const panelWidth = width;
  const topPanelGeometry = new THREE.BoxGeometry(panelWidth, thickness, depth);
  const topPanelMaterials = [
    endGrainMaterial,
    endGrainMaterial,
    laminatedMaterial,
    laminatedMaterial,
    endGrainMaterial,
    endGrainMaterial,
  ];
  const topPanel = new THREE.Mesh(topPanelGeometry, topPanelMaterials);
  topPanel.position.set(0, height / 2 - thickness / 2, 0);
  topPanel.visible = cubeProperties.topPanelVisible;
  topPanel.castShadow = true;
  topPanel.receiveShadow = true;
  group.add(topPanel);

  const bottomPanelGeometry = new THREE.BoxGeometry(panelWidth, thickness, depth);
  const bottomPanel = new THREE.Mesh(bottomPanelGeometry, topPanelMaterials);
  bottomPanel.position.set(0, -height / 2 + thickness / 2, 0);
  bottomPanel.visible = cubeProperties.bottomPanelVisible;
  bottomPanel.castShadow = true;
  bottomPanel.receiveShadow = true;
  group.add(bottomPanel);

  // Left and Right Panels
  const sidePanelHeight = height - 2 * thickness;
  const leftPanelGeometry = new THREE.BoxGeometry(thickness, sidePanelHeight, depth);
  const leftPanelMaterials = [
    laminatedMaterial,
    laminatedMaterial,
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
  ];
  const leftPanel = new THREE.Mesh(leftPanelGeometry, leftPanelMaterials);
  leftPanel.position.set(-width / 2 + thickness / 2, 0, 0);
  leftPanel.visible = cubeProperties.leftPanelVisible;
  leftPanel.castShadow = true;
  leftPanel.receiveShadow = true;
  group.add(leftPanel);

  const rightPanelGeometry = new THREE.BoxGeometry(thickness, sidePanelHeight, depth);
  const rightPanel = new THREE.Mesh(rightPanelGeometry, leftPanelMaterials);
  rightPanel.position.set(width / 2 - thickness / 2, 0, 0);
  rightPanel.visible = cubeProperties.rightPanelVisible;
  rightPanel.castShadow = true;
  rightPanel.receiveShadow = true;
  group.add(rightPanel);

  // Calculate the number of middle panels along the width
  const availableWidth = width - 2 * thickness; // Available width after edge offsets
  const numMiddlePanelX = Math.floor(availableWidth / 0.5) + 2; // At least 1 middle panel, add more if needed
  const numMiddlePanelZ = Math.floor(depth / 0.5) + 2; // At least 1 middle panel, add more if needed
  // Middle Panels
  const middlePanelDepth = depth - cubeProperties.thickness;
  const middlePanelWidth = availableWidth / (numMiddlePanelX - 1);
  const middlePanelZ = depth / (numMiddlePanelZ - 1);

  for (let i = 1; i < numMiddlePanelX - 1; i++) {
    const middlePanelGeometry = new THREE.BoxGeometry(thickness, sidePanelHeight, middlePanelDepth);
    const middlePanel = new THREE.Mesh(middlePanelGeometry, leftPanelMaterials);

    const posX = -availableWidth / 2 + i * middlePanelWidth;
    middlePanel.position.set(posX, 0, thickness / 2);
    middlePanel.castShadow = true;
    middlePanel.receiveShadow = true;
    group.add(middlePanel);
  }

  // Create arrays of horizontal panels along the X-axis if toggle is enabled
  if (cubeProperties.showHorizontalPanels) {
    for (let i = 0; i < numMiddlePanelX - 1; i++) {
      const startX = -availableWidth / 2 + i * middlePanelWidth;
      const endX = startX + middlePanelWidth;

      const availableHeight = height - 2 * thickness;
      const numHorizontalPanels = Math.floor(availableHeight / 0.5) + 2;

      const panelHeight = availableHeight / (numHorizontalPanels - 1);

      for (let j = 1; j < numHorizontalPanels - 1; j++) {
        const horizontalPanelGeometry = new THREE.BoxGeometry(
          middlePanelWidth - 2 * offset - thickness,
          thickness,
          middlePanelDepth
        );
        const horizontalPanel = new THREE.Mesh(horizontalPanelGeometry, topPanelMaterials);

        const posY = -availableHeight / 2 + j * panelHeight;
        const posX = startX + middlePanelWidth / 2;

        horizontalPanel.position.set(posX, posY, thickness / 2);
        horizontalPanel.castShadow = true;
        horizontalPanel.receiveShadow = true;
        group.add(horizontalPanel);
      }
    }
  }

  // Front Panels with offset for the front panel
  const panelWidthFrontBack = width - 2 * thickness;
  const panelHeightFrontBack = height - 2 * thickness;
  const frontPanelWidthWithOffset = middlePanelWidth - 2 * frontPanelGap - thickness;
  const frontPanelHeightWithOffset = panelHeightFrontBack - 2 * frontPanelGap;

  const frontPanelMaterials = [
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
    endGrainMaterial,
    endGrainMaterial,
    laminatedMaterial,
    laminatedMaterial,
  ];

  for (let i = 0; i < numMiddlePanelX - 1; i++) {
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(frontPanelWidthWithOffset, frontPanelHeightWithOffset, thickness),
      frontPanelMaterials
    );

    const posX = -availableWidth / 2 + i * middlePanelWidth + middlePanelWidth / 2;
    const posZ = depth / 2 - thickness / 2 - 0.01;

    frontPanel.position.set(posX, 0, posZ);
    frontPanel.visible = cubeProperties.frontPanelVisible;
    frontPanel.castShadow = true;
    frontPanel.receiveShadow = true;
    group.add(frontPanel);
  }

  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidthFrontBack, panelHeightFrontBack, thickness),
    frontPanelMaterials
  );
  backPanel.position.set(0, 0, -depth / 2 + thickness / 2);
  backPanel.visible = cubeProperties.backPanelVisible;
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;
  group.add(backPanel);

  // Add Cylinders with updated material based on selected lamination
  const cylinderRadius = 0.015; // 1.5 cm radius
  const cylinderHeight = spacing.cubeSpacing; // Already in meters
  const edgeOffsetX = 0.04; // 4 cm offset in meters (0.04 m)
  const edgeOffsetZ = 0.04; // 4 cm offset converted to meters
  const numCylindersX = Math.floor(availableWidth / 0.5) + 2;
  const numCylindersZ = Math.floor(depth / 0.5) + 2;
  const middlePanelZValue = depth / (numCylindersZ - 1); // Calculate based on previous logic

  const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 32);

  for (let i = 0; i < numCylindersX; i++) {
    for (let j = 0; j < numCylindersZ; j++) {
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

      let posX = -availableWidth / 2 + i * middlePanelWidth;
      if (i === 0) {
        posX += edgeOffsetX; // Apply offset only to the first cylinder
      } else if (i === numCylindersX - 1) {
        posX -= edgeOffsetX; // Apply offset only to the last cylinder
      }
      let posZ = -depth / 2 + j * middlePanelZValue;
      if (j === 0) {
        posZ += edgeOffsetZ; // Apply offset to the first cylinder
      } else if (j === numCylindersZ - 1) {
        posZ -= edgeOffsetZ; // Apply offset to the last cylinder
      }

      const posY = -height / 2 - cylinderHeight / 2;

      cylinder.position.set(posX, posY, posZ);
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;

      group.add(cylinder);
    }
  }

  // Position the entire group and lift on the Y axis by the value of cubeSpacing
  group.position.set(
    offsetX + width / 2,
    offsetY + height / 2 + spacing.cubeSpacing,
    offsetZ + depth / 2
  );

  group.userData.isCube = true;

  return group;
}

// Orbit Controls and Animation Loop
const controls = new OrbitControls(currentCamera, renderer.domElement);
controls.enableDamping = true; // enables inertial damping
controls.dampingFactor = 0.05; // sets the damping factor
controls.maxPolarAngle = Math.PI / 2; // No downward rotation beyond horizontal view
controls.minDistance = 1; // Minimum zoom distance
controls.maxDistance = 6; // Maximum zoom distance

// Add auto-rotate to the OrbitControls
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0; // Speed of rotation

// Stop auto-rotate once the user interacts with the 3D interface
controls.addEventListener('start', () => {
  controls.autoRotate = false; // Disable auto-rotation after user input
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, currentCamera);
}

animate();
updateCubeGeometry();

// Control Panel Elements
const controlPanel = document.getElementById('control-panel');
const controlPanelToggle = document.getElementById('control-panel-toggle');

// Event Listener for Control Panel Toggle Button
controlPanelToggle.addEventListener('click', () => {
  controlPanel.classList.toggle('collapsed');

  // Update the 'open' class based on the control panel state
  const isOpen = !controlPanel.classList.contains('collapsed');
  if (isOpen) {
    controlPanelToggle.classList.add('open'); // Show X icon
  } else {
    controlPanelToggle.classList.remove('open'); // Show burger icon
  }

  // Update the 'aria-expanded' attribute for accessibility
  controlPanelToggle.setAttribute('aria-expanded', isOpen);
});

// Initialize Control Panel State
function initializeControlPanelState() {
  if (window.innerWidth >= 769) {
    // Desktop mode: Start opened
    controlPanel.classList.remove('collapsed');
    controlPanelToggle.classList.add('open'); // Show X icon when open
    controlPanelToggle.setAttribute('aria-expanded', 'true');
  } else {
    // Mobile mode: Start closed
    controlPanel.classList.add('collapsed');
    controlPanelToggle.classList.remove('open'); // Show burger icon when closed
    controlPanelToggle.setAttribute('aria-expanded', 'false');
  }
}

window.addEventListener('load', () => {
  setTimeout(() => {
    const overlay = document.getElementById('overlay-message');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 1000); // Remove element after fade-out
  }, 3000); // Show message for 3 seconds

  // Initialize Control Panel State
  initializeControlPanelState();

  // Initialize Box State
  resetBox(); // Ensure the Box starts with initial properties

  // Automatically reset camera on launch
  resetCamera();

  // Initialize custom sliders
  initializeCustomSliders();
});

// Control Elements
const resetCameraButton = document.getElementById('reset-camera');
const resetBoxButton = document.getElementById('reset-box');
const cubeWidthSlider = document.getElementById('cube-width-slider');
const cubeHeightSlider = document.getElementById('cube-height-slider');
const cubeDepthSlider = document.getElementById('cube-depth-slider');
const cubeThicknessSlider = document.getElementById('cube-thickness-slider');
const cubeWidthValueInput = document.getElementById('cube-width-value');
const cubeHeightValueInput = document.getElementById('cube-height-value');
const cubeDepthValueInput = document.getElementById('cube-depth-value');
const cubeThicknessValueInput = document.getElementById('cube-thickness-value');
const frontPanelVisibleCheckbox = document.getElementById('front-panel-visible');
const backPanelVisibleCheckbox = document.getElementById('back-panel-visible');
const shelvesVisibleCheckbox = document.getElementById('shelves-visible');
const numCubesXSlider = document.getElementById('num-cubes-x-slider');
const numCubesYSlider = document.getElementById('num-cubes-y-slider');
const numCubesZSlider = document.getElementById('num-cubes-z-slider');
const numCubesXValueInput = document.getElementById('num-cubes-x-value');
const numCubesYValueInput = document.getElementById('num-cubes-y-value');
const numCubesZValueInput = document.getElementById('num-cubes-z-value');
const textureSwatches = document.querySelectorAll('.texture-swatch');

// Function to initialize custom sliders
function initializeCustomSliders() {
  const sliders = document.querySelectorAll('.custom-slider');
  sliders.forEach(slider => {
    let thumb = slider.querySelector('.thumb');

    // If thumb doesn't exist, create it
    if (!thumb) {
      thumb = document.createElement('div');
      thumb.classList.add('thumb');
      slider.appendChild(thumb);
    }

    // Read data attributes for min, max, step, value
    const min = parseFloat(slider.getAttribute('data-min'));
    const max = parseFloat(slider.getAttribute('data-max'));
    const step = parseFloat(slider.getAttribute('data-step'));
    let value = parseFloat(slider.getAttribute('data-value'));

    const inputId = slider.id.replace('-slider', '-value');
    const input = document.getElementById(inputId);

    function updateThumbPosition() {
      const rect = slider.getBoundingClientRect();
      const sliderWidth = rect.width;
      const percentage = (value - min) / (max - min);
      const thumbX = percentage * sliderWidth;
      thumb.style.left = `${thumbX}px`;

      // Update the slider fill
      slider.style.background = `linear-gradient(to right, red 0%, red ${percentage * 100}%, #ccc ${percentage * 100}%, #ccc 100%)`;
    }

    updateThumbPosition();

    let isDragging = false;

    thumb.addEventListener('mousedown', (e) => {
      isDragging = true;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });

    function onMouseMove(e) {
      if (!isDragging) return;

      const rect = slider.getBoundingClientRect();
      let x = e.clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width)); // Clamp x between 0 and slider width

      const percentage = x / rect.width;
      const newValue = min + percentage * (max - min);
      value = Math.round(newValue / step) * step; // Adjust for step
      value = Math.max(min, Math.min(value, max)); // Clamp value between min and max

      // Update the thumb position and fill
      updateThumbPosition();

      // Update the associated input element
      input.value = value.toFixed(step < 1 ? 1 : 0); // Adjust decimal places

      // Trigger the input event on the input element
      const event = new Event('input');
      input.dispatchEvent(event);
    }

    function onMouseUp(e) {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    // Prevent clicks on the slider track from changing the value
    slider.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Update the thumb position when the input value changes
    input.addEventListener('input', () => {
      value = parseFloat(input.value);
      value = Math.max(min, Math.min(value, max));
      slider.setAttribute('data-value', value);
      updateThumbPosition();
    });
  });
}

// Function to debounce resetCamera
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

const debouncedResetCamera = debounce(resetCamera, 1000);

function resetBox() {
  // Reset cubeProperties to initial values
  cubeProperties = { ...initialCubeProperties };
  dimensions = { ...initialDimensions };
  numCubes = { ...initialNumCubes };

  // Update UI elements to reflect initial values in cm
  cubeWidthSlider.setAttribute('data-value', (cubeProperties.cubeWidth * 100).toFixed(0)); // m to cm
  cubeHeightSlider.setAttribute('data-value', (cubeProperties.cubeHeight * 100).toFixed(0)); // m to cm
  cubeDepthSlider.setAttribute('data-value', (cubeProperties.cubeDepth * 100).toFixed(0)); // m to cm
  cubeThicknessSlider.setAttribute('data-value', (cubeProperties.thickness * 100).toFixed(1)); // m to cm
  cubeWidthValueInput.value = (cubeProperties.cubeWidth * 100).toFixed(0);
  cubeHeightValueInput.value = (cubeProperties.cubeHeight * 100).toFixed(0);
  cubeDepthValueInput.value = (cubeProperties.cubeDepth * 100).toFixed(0);
  cubeThicknessValueInput.value = (cubeProperties.thickness * 100).toFixed(1);

  // Trigger input events to update thumb positions
  cubeWidthValueInput.dispatchEvent(new Event('input'));
  cubeHeightValueInput.dispatchEvent(new Event('input'));
  cubeDepthValueInput.dispatchEvent(new Event('input'));
  cubeThicknessValueInput.dispatchEvent(new Event('input'));

  frontPanelVisibleCheckbox.checked = cubeProperties.frontPanelVisible;
  backPanelVisibleCheckbox.checked = cubeProperties.backPanelVisible;
  shelvesVisibleCheckbox.checked = cubeProperties.showHorizontalPanels;

  numCubesXSlider.setAttribute('data-value', numCubes.numCubesX);
  numCubesYSlider.setAttribute('data-value', numCubes.numCubesY);
  numCubesZSlider.setAttribute('data-value', numCubes.numCubesZ);
  numCubesXValueInput.value = numCubes.numCubesX;
  numCubesYValueInput.value = numCubes.numCubesY;
  numCubesZValueInput.value = numCubes.numCubesZ;

  // Trigger input events to update thumb positions
  numCubesXValueInput.dispatchEvent(new Event('input'));
  numCubesYValueInput.dispatchEvent(new Event('input'));
  numCubesZValueInput.dispatchEvent(new Event('input'));

  // Reset Texture Selection to initial value
  textureSwatches.forEach((swatch) => {
    if (swatch.getAttribute('data-texture') === cubeProperties.selectedTexture) {
      swatch.classList.add('selected');
    } else {
      swatch.classList.remove('selected');
    }
  });

  // Update materials and geometry
  updateLaminatedMaterial();
  updateCubeGeometry();

  // Remove the call to initializeCustomSliders()
  // initializeCustomSliders(); // Remove this line to prevent adding duplicate thumbs
}

// Event Listeners for Controls
resetCameraButton.addEventListener('click', resetCamera);
resetBoxButton.addEventListener('click', resetBox);

// Size (cm) Controls

// Helper function to set up value inputs
function setupValueInput(input, propertyName, isThickness = false) {
  input.addEventListener('input', () => {
    let valueCm = parseFloat(input.value);
    if (isNaN(valueCm)) valueCm = parseFloat(input.min);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    valueCm = Math.max(min, Math.min(max, valueCm));
    input.value = valueCm.toFixed(isThickness ? 1 : 0);
    const valueM = isThickness ? closestAllowedThickness(valueCm) : valueCm / 100;
    cubeProperties[propertyName] = valueM;
    updateCubeGeometry();
    debouncedResetCamera();
  });
}

// Width
setupValueInput(cubeWidthValueInput, 'cubeWidth');

// Height
setupValueInput(cubeHeightValueInput, 'cubeHeight');

// Depth
setupValueInput(cubeDepthValueInput, 'cubeDepth');

// Thickness
setupValueInput(cubeThicknessValueInput, 'thickness', true);

// Visibility Toggles
frontPanelVisibleCheckbox.addEventListener('change', () => {
  cubeProperties.frontPanelVisible = frontPanelVisibleCheckbox.checked;
  updateCubeGeometry();
});

backPanelVisibleCheckbox.addEventListener('change', () => {
  cubeProperties.backPanelVisible = backPanelVisibleCheckbox.checked;
  updateCubeGeometry();
});

shelvesVisibleCheckbox.addEventListener('change', () => {
  cubeProperties.showHorizontalPanels = shelvesVisibleCheckbox.checked;
  updateCubeGeometry();
});

// Repetition Controls
function setupRepetitionInput(input, propertyName) {
  input.addEventListener('input', () => {
    let value = parseInt(input.value, 10);
    if (isNaN(value)) value = parseInt(input.min, 10);
    const min = parseInt(input.min, 10);
    const max = parseInt(input.max, 10);
    value = Math.max(min, Math.min(max, value));
    input.value = value;
    numCubes[propertyName] = value;
    updateCubeGeometry();
    debouncedResetCamera();
  });
}

// numCubesX
setupRepetitionInput(numCubesXValueInput, 'numCubesX');

// numCubesY
setupRepetitionInput(numCubesYValueInput, 'numCubesY');

// numCubesZ
setupRepetitionInput(numCubesZValueInput, 'numCubesZ');

// Texture Swatches
textureSwatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    // Remove 'selected' class from all swatches
    textureSwatches.forEach((s) => s.classList.remove('selected'));

    // Add 'selected' class to clicked swatch
    swatch.classList.add('selected');

    // Update the selected texture
    cubeProperties.selectedTexture = swatch.getAttribute('data-texture');
    updateLaminatedMaterial();
  });
});

// Add event listeners to each control-section header for collapsing
const controlSectionHeaders = document.querySelectorAll('.control-section h3');

controlSectionHeaders.forEach((header) => {
  header.addEventListener('click', () => {
    const controlSection = header.parentElement;
    controlSection.classList.toggle('collapsed');
  });
});

// Ensure the initial control values match the properties
cubeWidthValueInput.value = (cubeProperties.cubeWidth * 100).toFixed(0);
cubeHeightValueInput.value = (cubeProperties.cubeHeight * 100).toFixed(0);
cubeDepthValueInput.value = (cubeProperties.cubeDepth * 100).toFixed(0);
cubeThicknessValueInput.value = (cubeProperties.thickness * 100).toFixed(1);

frontPanelVisibleCheckbox.checked = cubeProperties.frontPanelVisible;
backPanelVisibleCheckbox.checked = cubeProperties.backPanelVisible;
shelvesVisibleCheckbox.checked = cubeProperties.showHorizontalPanels;

numCubesXValueInput.value = numCubes.numCubesX;
numCubesYValueInput.value = numCubes.numCubesY;
numCubesZValueInput.value = numCubes.numCubesZ;

// Listen to window resize to adjust Control Panel state if needed
window.addEventListener('resize', initializeControlPanelState);
