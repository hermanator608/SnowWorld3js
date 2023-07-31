import "./style.css";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { CharacterControls } from "./charMovement";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const initFoxBodyAndBody = async (deps) => {
  const { scene, world, defaultMaterial, gltfLoader } = deps;
  /*********************************************************************
   * FOX Model
   *********************************************************************/
  const foxGltf = await gltfLoader.loadAsync("/models/Fox/glTF/Fox.gltf");

  const model = foxGltf.scene;

  model.rotateY(Math.PI);
  model.scale.set(0.005, 0.005, 0.005);
  model.position.set(foxGltf.scene.position.x, 5, foxGltf.scene.position.z);

  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
    }
  });
  scene.add(model);

  const gltfAnimations = foxGltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap = new Map();
  gltfAnimations.forEach((a) => {
    animationsMap.set(a.name, mixer.clipAction(a));
  });

  const shape = new CANNON.Box(new CANNON.Vec3(0.08, 0.1, 0.5));

  const body = new CANNON.Body({
    mass: 1,
    // position: model.position,
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(model.position);
  // body.addEventListener('collide', playHitSound)
  world.addBody(body);

  return {
    model,
    body,
    mixer,
    animationsMap,
  };
};

const initFoxCharacter = async (deps) => {
  const { controls, camera, playerName } = deps;

  const { model, mixer, animationsMap, body } = await initFoxBodyAndBody(deps);

  const characterControls = new CharacterControls(
    model,
    mixer,
    animationsMap,
    null, // Use default animation keys
    controls,
    camera,
    "Survey",
    playerName,
    0.5,
    body,
    0.1
  );
  /*********************************************************************
   * FOX Model
   *********************************************************************/

  return characterControls;
};

const initDinoModelAndBody = async (deps) => {
  const { textureLoader, scene, world, defaultMaterial } = deps;

  /*********************************************************************
   * Dino Model
   *********************************************************************/
  const fbxLoader = new FBXLoader();

  const gradientTexture = textureLoader.load("textures/gradients/5.jpg");
  gradientTexture.magFilter = THREE.NearestFilter;
  const dinoMaterial = new THREE.MeshToonMaterial({
    color: "#46311C",
    gradientMap: gradientTexture,
  });
  const dinoMaterial2 = new THREE.MeshToonMaterial({
    color: "#181819",
    gradientMap: gradientTexture,
  });
  const dinoMaterial3 = new THREE.MeshToonMaterial({
    color: "#9F865E",
    gradientMap: gradientTexture,
  });
  const dinoModel = await fbxLoader.loadAsync(
    "/models/dinos/FBX/Velociraptor.fbx"
  );
  dinoModel.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.material = [dinoMaterial, dinoMaterial2, dinoMaterial3];
    }
  });
  dinoModel.scale.set(0.0025, 0.0025, 0.0025);
  scene.add(dinoModel);
  dinoModel.position.set(1, 3, 1);

  const gltfAnimations = dinoModel.animations;
  const mixer = new THREE.AnimationMixer(dinoModel);
  const animationsMap = new Map();
  gltfAnimations.forEach((a) => {
    animationsMap.set(a.name, mixer.clipAction(a));
  });
  const dinoAnimationsNameMap = new Map();
  dinoAnimationsNameMap.set("Walk", "Armature|Velociraptor_Walk");
  dinoAnimationsNameMap.set("Run", "Armature|Velociraptor_Run");
  dinoAnimationsNameMap.set("Survey", "Armature|Velociraptor_Idle");
  dinoAnimationsNameMap.set("Jump", "Armature|Velociraptor_Jump");

  const shape = new CANNON.Box(new CANNON.Vec3(0.3, 0.5, 1.2));

  const body = new CANNON.Body({
    mass: 1,
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(dinoModel.position);
  // body.addEventListener('collide', playHitSound)
  world.addBody(body);

  return {
    model: dinoModel,
    body,
    mixer,
    animationsMap,
    dinoAnimationsNameMap,
  };
};

const initDinoPlayer = async (deps) => {
  const { controls, camera, playerName } = deps;

  const { dinoModel, mixer, animationsMap, dinoAnimationsNameMap, body } =
    await initDinoModelAndBody(deps);

  const characterControls = new CharacterControls(
    dinoModel,
    mixer,
    animationsMap,
    dinoAnimationsNameMap,
    controls,
    camera,
    "Survey",
    playerName,
    1.5,
    body,
    0.5
  );

  return characterControls;
  /*********************************************************************
   * Dino Model
   *********************************************************************/
};

export const initializeCharacter = async (isMonster, deps) => {
  const { textureLoader, scene, camera, renderer } = deps;

  // CONTROLS
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 15;
  orbitControls.enablePan = false;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
  orbitControls.update();

  const matcap = textureLoader.load("/textures/matcaps/black.png");

  const fontLoader = new FontLoader();

  /*********************************************************************
   * Player Name Model
   *********************************************************************/
  const font = await fontLoader.loadAsync(
    "/fonts/helvetiker_regular.typeface.json"
  );

  const bevelSize = 0.002;
  const bevelThickness = 0.003;
  const textGeometry = new TextGeometry("Player 1", {
    font,
    size: 0.05,
    height: 0.01,
    curveSegments: 5,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelOffset: 0,
    bevelSegments: 4,
  });

  textGeometry.computeBoundingBox();
  textGeometry.center();

  const sharedMaterial = new THREE.MeshMatcapMaterial({ matcap });

  const playerName = new THREE.Mesh(textGeometry, sharedMaterial);

  scene.add(playerName);
  /*********************************************************************
   * Player Name Model
   *********************************************************************/

  const playerMovement = isMonster
    ? await initDinoPlayer({ ...deps, controls: orbitControls, playerName })
    : await initFoxCharacter({ ...deps, controls: orbitControls, playerName });

  return { characterControls: playerMovement, orbitControls };
};

export const initializePlayer = async (isMonster, deps) => {
  const { model } = isMonster
    ? await initDinoPlayer({ ...deps, controls: orbitControls, playerName })
    : await initFoxCharacter({ ...deps, controls: orbitControls, playerName });
};
