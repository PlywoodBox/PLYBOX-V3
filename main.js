// main.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.127.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.127.0/examples/jsm/controls/OrbitControls.js';

// Initialize the scene
const scene = new THREE.Scene();

// Create both cameras
const aspect = window.innerWidth / window.innerHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
const orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

// Define a common start position for both cameras
const startPosition = new THREE.Vector3(0, 0.5, 1.5); // Start position for both cameras
const startRotation = new THREE.Euler(0, 0, 0); // Common initial rotation

// Set the initial camera
let currentCamera = perspectiveCamera;
perspectiveCamera.position.set(startPosition.x, startPosition.y, startPosition.z);
orthographicCamera.position.set(startPosition.x, startPosition.y, startPosition.z);

// Add the current camera to the scene
scene.add(currentCamera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setClearColor(0xffffff, 0.8); // White background with full opacity
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('renderer-container').appendChild(renderer.domElement);

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

const allowedThicknesses = [0.012, 0.018, 0.024, 0.03]; // Allowed values in meters

function closestAllowedThickness(value) {
  return allowedThicknesses.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

// Cube properties, dimensions, spacing, etc.
let viewProperties = {
  perspectiveView: true,
};
let cubeProperties = {
  transparency: true,
  opacity: 1,
  thickness: 0.018,
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

let dimensions = {
  width: 0.6,
  height: 0.6,
  depth: 0.6,
};

let spacing = {
  cubeSpacing: 0.02,
  frontPanelGap: 0.005,
};

let numCubes = {
  numCubesX: 1,
  numCubesY: 1,
  numCubesZ: 1,
};

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
  const offset = 0; // 0mm offset from the edges for the horizontal panels!!!
  const frontPanelGap = spacing.frontPanelGap; // 10mm -> 0.01 meters

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
  const cylinderRadius = 0.015; // 15mm radius
  const cylinderHeight = spacing.cubeSpacing; // Already in meters
  const edgeOffsetX = 0.04; // 40mm offset in meters
  const edgeOffsetZ = 0.04; // 40mm offset converted to meters
  const numCylindersX = Math.floor(availableWidth / 0.5) + 2;
  const numCylindersZ = Math.floor(depth / 0.5) + 2;

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
      let posZ = -depth / 2 + j * middlePanelZ;
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

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, currentCamera);
}

animate();
updateCubeGeometry();

// Control Panel Elements
const controlPanel = document.getElementById('control-panel');
const controlPanelClose = document.getElementById('control-panel-close');
const controlPanelToggle = document.getElementById('control-panel-toggle');

// Event Listeners for Control Panel
controlPanelClose.addEventListener('click', () => {
  controlPanel.classList.add('collapsed');
});

controlPanelToggle.addEventListener('click', () => {
  controlPanel.classList.remove('collapsed');
});

// Adjust control panel visibility on window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 767) {
    controlPanel.classList.remove('collapsed');
    controlPanelToggle.style.display = 'none';
  } else {
    controlPanel.classList.add('collapsed');
    controlPanelToggle.style.display = 'block';
  }
});

// Initialize control panel visibility
if (window.innerWidth > 767) {
  controlPanel.classList.remove('collapsed');
  controlPanelToggle.style.display = 'none';
} else {
  controlPanel.classList.add('collapsed');
  controlPanelToggle.style.display = 'block';
}

// Collapsible Sections
document.querySelectorAll('.control-section h3').forEach((header) => {
  header.addEventListener('click', () => {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
  });
});

// Control Elements
const resetCameraButton = document.getElementById('reset-camera');
const overallWidthInput = document.getElementById('overall-width');
const overallHeightInput = document.getElementById('overall-height');
const overallDepthInput = document.getElementById('overall-depth');
const cubeWidthInput = document.getElementById('cube-width');
const cubeHeightInput = document.getElementById('cube-height');
const cubeDepthInput = document.getElementById('cube-depth');
const cubeThicknessInput = document.getElementById('cube-thickness');
const frontPanelVisibleCheckbox = document.getElementById('front-panel-visible');
const backPanelVisibleCheckbox = document.getElementById('back-panel-visible');
const shelvesVisibleCheckbox = document.getElementById('shelves-visible');
const numCubesXInput = document.getElementById('num-cubes-x');
const numCubesYInput = document.getElementById('num-cubes-y');
const numCubesZInput = document.getElementById('num-cubes-z');
const textureSelection = document.getElementById('texture-selection');

// Event Listeners for Controls
resetCameraButton.addEventListener('click', resetCamera);

overallWidthInput.addEventListener('input', () => {
  dimensions.width = parseFloat(overallWidthInput.value);
  updateCubeGeometry();
});
overallHeightInput.addEventListener('input', () => {
  dimensions.height = parseFloat(overallHeightInput.value);
  updateCubeGeometry();
});
overallDepthInput.addEventListener('input', () => {
  dimensions.depth = parseFloat(overallDepthInput.value);
  updateCubeGeometry();
});

cubeWidthInput.addEventListener('input', () => {
  cubeProperties.cubeWidth = parseFloat(cubeWidthInput.value);
  updateCubeGeometry();
});
cubeHeightInput.addEventListener('input', () => {
  cubeProperties.cubeHeight = parseFloat(cubeHeightInput.value);
  updateCubeGeometry();
});
cubeDepthInput.addEventListener('input', () => {
  cubeProperties.cubeDepth = parseFloat(cubeDepthInput.value);
  updateCubeGeometry();
});
cubeThicknessInput.addEventListener('input', () => {
  cubeProperties.thickness = closestAllowedThickness(parseFloat(cubeThicknessInput.value));
  cubeThicknessInput.value = cubeProperties.thickness.toFixed(3);
  updateCubeGeometry();
});

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

numCubesXInput.addEventListener('input', () => {
  numCubes.numCubesX = parseInt(numCubesXInput.value, 10);
  updateCubeGeometry();
});
numCubesYInput.addEventListener('input', () => {
  numCubes.numCubesY = parseInt(numCubesYInput.value, 10);
  updateCubeGeometry();
});
numCubesZInput.addEventListener('input', () => {
  numCubes.numCubesZ = parseInt(numCubesZInput.value, 10);
  updateCubeGeometry();
});

textureSelection.addEventListener('change', () => {
  cubeProperties.selectedTexture = textureSelection.value;
  updateLaminatedMaterial();
});

// Ensure the initial control values match the properties
overallWidthInput.value = dimensions.width.toFixed(2);
overallHeightInput.value = dimensions.height.toFixed(2);
overallDepthInput.value = dimensions.depth.toFixed(2);

cubeWidthInput.value = cubeProperties.cubeWidth.toFixed(2);
cubeHeightInput.value = cubeProperties.cubeHeight.toFixed(2);
cubeDepthInput.value = cubeProperties.cubeDepth.toFixed(2);
cubeThicknessInput.value = cubeProperties.thickness.toFixed(3);

frontPanelVisibleCheckbox.checked = cubeProperties.frontPanelVisible;
backPanelVisibleCheckbox.checked = cubeProperties.backPanelVisible;
shelvesVisibleCheckbox.checked = cubeProperties.showHorizontalPanels;

numCubesXInput.value = numCubes.numCubesX;
numCubesYInput.value = numCubes.numCubesY;
numCubesZInput.value = numCubes.numCubesZ;

textureSelection.value = cubeProperties.selectedTexture;
