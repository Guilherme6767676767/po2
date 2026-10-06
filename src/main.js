// src/main.js
import * as THREE from 'three';
import { io } from 'socket.io-client';

// ---------------------------------------------------------------
// UI elements (must match index.html)
const uiMode = document.getElementById('mode');
const uiTimer = document.getElementById('timer');
// ---------------------------------------------------------------

// ---------------------- Three.js scene ------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ground plane
const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Simple player capsule
const playerGeom = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeom, playerMat);
player.position.y = 1;
scene.add(player);

// ---------------------------------------------------------------
// Input handling (WASD + mouse aim + left‑click shoot)
// ---------------------------------------------------------------
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w': keys.w = true; break;
    case 'a': keys.a = true; break;
    case 's': keys.s = true; break;
    case 'd': keys.d = true; break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w': keys.w = false; break;
    case 'a': keys.a = false; break;
    case 's': keys.s = false; break;
    case 'd': keys.d = false; break;
  }
});

let mouseDown = false;
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) mouseDown = true;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
});

// Mouse look (only works after pointer lock)
let pitch = 0,
  yaw = 0;
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    camera.rotation.set(pitch, yaw, 0);
  }
});
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

// ---------------------------------------------------------------
// Socket.io client – connect to dev server or production origin
// ---------------------------------------------------------------
const socket = io(import.meta.env.DEV ? 'http://localhost:4000' : location.origin);

socket.on('connect', () => {
  console.log('✅ Connected to server, id:', socket.id);
});

// Server‑side UI updates
socket.on('modeUpdate', (mode) => (uiMode.textContent = mode));
socket.on('timerUpdate', (seconds) => {
  uiTimer.textContent = seconds >= 0 ? seconds : '-';
});

// Optional debug helpers (you can open console and type these)
window.__socket = socket;

// ---------------------------------------------------------------
// Game loop – basic movement + shooting event
// ---------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  // ---- WASD movement (relative to camera forward) ----
  const speed = 0.08;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), forward)
    .normalize();
  const move = new THREE.Vector3();
  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.d) move.add(right);
  if (keys.a) move.sub(right);
  move.normalize().multiplyScalar(speed);
  player.position.add(move);

  // ---- Camera follows player (third‑person) ----
  const camOffset = new THREE.Vector3(0, 2, 5).applyQuaternion(camera.quaternion);
  camera.position.copy(player.position).add(camOffset);

  // ---- Shooting (emit one event per click) ----
  if (mouseDown) {
    socket.emit('playerShoot', {
      position: player.position.toArray(),
      direction: forward.toArray(),
    });
    mouseDown = false; // prevent continuous fire
  }

  renderer.render(scene, camera);
}
animate();

// ---------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
