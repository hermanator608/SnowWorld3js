import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { CharacterControls } from "./charMovement";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
// TODO: Can i use this?
import { threeToCannon } from "three-to-cannon";
import Stats from "stats.js";
import { io } from "socket.io-client";
import { initializeCharacter, initializePlayer } from "./player";

const socket = io("http://localhost:3000");

const players = {};

socket.on("connect", () => {
  console.log(socket.id); // x8WIv7-mJelg7on_ALbx
});

socket.on("init", (areYouTheMonster) => {
  initWorld(areYouTheMonster);
});

socket.on("playerPositionUpdate", (playerPosition) => {
  players[player.id].position.set(playerPosition);
});

// TODO: WORKING ON THIS PIECE
socket.on("playerJoined", async (player) => {
  console.log(player);
  const model = await initializePlayer(player.isMonster, {});
  players[player.id] = model;
  console.log(players);
});

const WORLD_WIDTH = 100;

const initWorld = async (isMonster) => {
  /**
   * Base
   */
  // Debug
  const gui = new dat.GUI();

  // Canvas
  const canvas = document.querySelector("canvas.webgl");

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eeeeee");

  const textureLoader = new THREE.TextureLoader();

  const axesHelper = new THREE.AxesHelper(3);
  axesHelper.position.setY(1);
  scene.add(axesHelper);
  /**
   * Physics
   */
  const world = new CANNON.World();
  // Maybe caused issues with collision?
  // world.broadphase = new CANNON.SAPBroadphase(world);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.allowSleep = true;
  world.gravity.set(0, -9.82, 0);

  const cannonDebugger = new CannonDebugger(scene, world, {
    // options...
  });

  // Default material
  const defaultMaterial = new CANNON.Material("default");
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0.1,
      restitution: 0.0,
    }
  );
  world.defaultContactMaterial = defaultContactMaterial;

  // Upgrade floor - https://github.com/pmndrs/use-cannon/blob/master/packages/react-three-cannon-examples/src/demos/demo-Heightfield.tsx
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_WIDTH),
    new THREE.MeshStandardMaterial({
      color: "#D6D6D6",
    })
  );

  floor.geometry.setAttribute(
    "uv2",
    new THREE.Float32BufferAttribute(floor.geometry.attributes.uv.array, 2)
  );
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor
  const planeShape = new CANNON.Plane();
  const planeBody = new CANNON.Body({
    mass: 0,
    type: CANNON.BODY_TYPES.STATIC,
    material: defaultMaterial,
  });
  planeBody.addShape(planeShape);
  planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(planeBody);

  // Walls
  const wallShape = new CANNON.Box(new CANNON.Vec3(WORLD_WIDTH / 2, 4, 4));

  const pos = WORLD_WIDTH / 2 + 4;

  const wallBody1 = new CANNON.Body({
    mass: 0,
    shape: wallShape,
    type: CANNON.BODY_TYPES.STATIC,
    material: defaultMaterial,
  });
  wallBody1.position.set(pos, 0, 0);
  wallBody1.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
  world.addBody(wallBody1);

  const wallBody2 = new CANNON.Body({
    mass: 0,
    shape: wallShape,
    type: CANNON.BODY_TYPES.STATIC,
  });
  wallBody2.position.set(-pos, 0, 0);
  world.addBody(wallBody2);
  wallBody2.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);

  const wallBody3 = new CANNON.Body({
    mass: 0,
    shape: wallShape,
    type: CANNON.BODY_TYPES.STATIC,
  });
  wallBody3.position.set(0, 0, -pos);
  world.addBody(wallBody3);

  const wallBody4 = new CANNON.Body({
    mass: 0,
    shape: wallShape,
    type: CANNON.BODY_TYPES.STATIC,
  });
  wallBody4.position.set(0, 0, pos);
  world.addBody(wallBody4);

  const fog = new THREE.Fog("#eeeeee", 2, 30);
  scene.fog = fog;

  /*********************************************************************
   * Snow Particles
   *********************************************************************/
  const speed = { value: 0.08, wind: 0.0 };
  const snow = { count: 50000 };

  gui.add(speed, "value", 0, 0.2, 0.01).name("Snow speed");
  gui.add(speed, "wind", 0, 0.2, 0.01).name("Wind speed");

  const particleTexture = textureLoader.load("/textures/particles/3.png");
  const particlesGeo = new THREE.BufferGeometry();

  const setupSnow = (snowInfo) => {
    const positions = new Float32Array(snowInfo.count * 3);
    const colors = new Float32Array(snowInfo.count * 3);

    for (let i = 0; i < snowInfo.count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * WORLD_WIDTH;
      positions[i + 1] = Math.random() * 10;
      positions[i + 2] = (Math.random() - 0.5) * WORLD_WIDTH;
      colors[i], colors[i + 1], (colors[i + 2] = 1); // Math.random();
    }
    particlesGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particlesGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  };
  setupSnow(snow);

  const snowController = gui
    .add(snow, "count", [2000, 5000, 10000, 50000, 100000])
    .name("Snow Count");
  snowController.onChange(() => setupSnow(snow));

  const particlesMat = new THREE.PointsMaterial({
    size: 0.2,
    sizeAttenuation: true,
    color: "white",
    map: particleTexture,
    transparent: true,
    alphaMap: particleTexture,
    alphaTest: 0.001, // Fixes the box around it
    // depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // Adds colors on top of each other
    // vertexColors: true,
  });

  const particles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particles);
  /*********************************************************************
   * Snow Particles
   *********************************************************************/

  /**
   * Sizes
   */
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  /**
   * Camera
   */
  // Base camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 5;
  camera.position.z = 5;
  camera.position.x = 0;
  scene.add(camera);

  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const gltfLoader = new GLTFLoader();

  const { characterControls, orbitControls: controls } =
    await initializeCharacter(isMonster, {
      textureLoader,
      scene,
      world,
      defaultMaterial,
      camera,
      gltfLoader,
      renderer,
    });

  /*********************************************************************
   * Player Controls
   *********************************************************************/
  const keysPressed = {};
  // const keyDisplayQueue = new KeyDisplay();
  document.addEventListener(
    "keydown",
    (event) => {
      // keyDisplayQueue.down(event.key)
      if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
      } else {
        keysPressed[event.key.toLowerCase()] = true;
      }
    },
    false
  );
  document.addEventListener(
    "keyup",
    (event) => {
      // keyDisplayQueue.up(event.key);
      keysPressed[event.key.toLowerCase()] = false;
      winterSounds.play();
    },
    false
  );
  /*********************************************************************
   * Player Controls
   *********************************************************************/

  /*********************************************************************
   * Trees & Snow
   *********************************************************************/
  const trees = new THREE.Group();
  scene.add(trees);

  const treeGltf = await gltfLoader.loadAsync(
    "/models/low_poly_snowy_trees/scene.gltf"
  );

  const treeModels = [];
  treeGltf.scene.traverse((object) => {
    if (object.isMesh) {
      treeModels.push(object);
    }
  });

  const sphereRadius = 2;
  const geometry = new THREE.SphereGeometry(sphereRadius, 16, 8, Math.PI);
  const material = new THREE.MeshBasicMaterial({ color: "#D6D6D6" });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.name = "snowPile";
  treeModels.push(sphere);

  const numOfGraves = 300;
  for (let i = 0; i < numOfGraves; i++) {
    const treeIndex = i % treeModels.length;

    const angle = Math.random() * Math.PI * 2;

    const radius = 4 + Math.random() * 50;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    // const y = 0.4 - Math.random() * 0.2;

    let boundingBoxSize = null;
    const treeMesh = treeModels[treeIndex].clone(true);
    treeMesh.rotation.x = -Math.PI * 0.5;
    if (treeMesh.name === "Tree_5_0") {
      treeMesh.scale.set(0.5, 0.5, 0.5);
      treeMesh.position.set(x, 0.5, z);
      boundingBoxSize = new CANNON.Vec3(0.5, 3.5, 0.5);
    } else if (treeMesh.name === "Tree_4_0") {
      treeMesh.scale.set(0.3, 0.3, 0.3);
      treeMesh.position.set(x, 0, z);
      boundingBoxSize = new CANNON.Vec3(0.25, 1.75, 0.25);
    } else if (treeMesh.name === "Tree_3_0") {
      treeMesh.scale.set(0.1, 0.1, 0.1);
      treeMesh.position.set(x, 0.2, z);
      boundingBoxSize = new CANNON.Vec3(0.3, 2.5, 0.3);
    } else if (treeMesh.name === "Tree_6_0") {
      treeMesh.position.set(x, 3, z);
      boundingBoxSize = new CANNON.Vec3(0.25, 4.5, 0.25);
    } else if (treeMesh.name == "snowPile") {
      treeMesh.position.set(x, -1.25, z);
    } else {
      treeMesh.scale.set(0.2, 0.2, 0.2);
      treeMesh.position.set(x, 0.5, z);
      boundingBoxSize = new CANNON.Vec3(0.5, 4.5, 0.5);
    }

    if (boundingBoxSize) {
      const treeShape = new CANNON.Box(boundingBoxSize);

      const treeBody = new CANNON.Body({
        mass: 0,
        shape: treeShape,
        material: defaultMaterial,
      });
      if (treeMesh.name === "Tree_6_0") {
        treeBody.position.copy(
          new CANNON.Vec3(treeMesh.position.x - 0.5, 0, treeMesh.position.z)
        );
      } else {
        treeBody.position.copy(
          new CANNON.Vec3(treeMesh.position.x, -0.5, treeMesh.position.z)
        );
      }
      // body.addEventListener("collide", playHitSound);
      world.addBody(treeBody);
    }

    treeMesh.castShadow = true;

    trees.add(treeMesh);
  }

  /**
   * Sounds
   */
  const winterSounds = new Audio("/sounds/winter_sounds.mp3");

  /**
   * Lights
   */
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(1024, 1024);
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -7;
  directionalLight.shadow.camera.top = 7;
  directionalLight.shadow.camera.right = 7;
  directionalLight.shadow.camera.bottom = -7;
  directionalLight.shadow.bias = -0.005;
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const dLightCamHelper = new THREE.CameraHelper(
    directionalLight.shadow.camera
  );
  scene.add(dLightCamHelper);
  dLightCamHelper.visible = false;

  window.addEventListener("resize", () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  const updateParticles = () => {
    // Update particles
    // particles.rotation.x = elapsedTime * 0.5;

    for (let i = 0; i < snow.count; i++) {
      const i3 = i * 3;

      // particlesGeo.attributes.position.array;
      // const x = particlesGeo.attributes.position.array[i3 + 0];

      const newY = particlesGeo.attributes.position.array[i3 + 1] - speed.value;
      const newX = particlesGeo.attributes.position.array[i3 + 0] - speed.wind;

      particlesGeo.attributes.position.array[i3 + 1] = newY <= 0 ? 10 : newY;
      particlesGeo.attributes.position.array[i3 + 0] =
        newX < -WORLD_WIDTH ? WORLD_WIDTH : newX;
    }

    particlesGeo.attributes.position.needsUpdate = true;
  };

  var stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);

  /**
   * Animate
   */
  const clock = new THREE.Clock();
  let previousTime = 0;

  const tick = () => {
    stats.begin();
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    if (characterControls) {
      characterControls.update(deltaTime, keysPressed);
    }

    updateParticles();

    // Update controls
    controls.update();

    // TODO Update?
    socket.emit(
      "playerPositionUpdate",
      {
        x: characterControls.model.position.x,
        y: characterControls.model.position.y,
        z: characterControls.model.position.z,
      },
      {
        x: characterControls.model.rotation.x,
        y: characterControls.model.rotation.y,
        z: characterControls.model.rotation.z,
      }
    );

    world.step(deltaTime); // Update cannon-es physics
    // cannonDebugger.update(); // Update the CannonDebugger meshes
    // Render
    renderer.render(scene, camera);

    stats.end();
    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
  };

  tick();
};
