// Graphics handling for Car Racing Game

// Create and manage the game scene
async function createGameScene(engine, canvas) {
    // Create a new scene
    const scene = new BABYLON.Scene(engine);
    
    // Set the scene's clear color to a dark blue/purple gradient to match the futuristic look
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.15, 1);
    
    // Wait for Ammo.js to be initialized before enabling physics
    if (!ammoInitialized) {
        console.log('Waiting for Ammo.js to initialize in graphics.js...');
        await ammoReadyPromise;
    }
    
    // Enable physics
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.AmmoJSPlugin());
    
    // Create camera
    const camera = createCamera(scene);
    
    // Create lighting
    createLighting(scene);
    
    // Create environment
    createEnvironment(scene);
    
    // Create race track
    const track = createRaceTrack(scene);
    
    // Load car model
    const car = await loadCarModel(scene);
    
    // Set camera target to car
    camera.lockedTarget = car;
    
    // Add post-processing effects
    addPostProcessing(scene, camera);
    
    return { scene, car, camera };
}

// Create camera that follows the car
function createCamera(scene) {
    const camera = new BABYLON.FollowCamera("followCamera", new BABYLON.Vector3(0, 5, -10), scene);
    camera.radius = 15; // Distance from target
    camera.heightOffset = 4; // Height above target
    camera.rotationOffset = 180; // View from behind
    camera.cameraAcceleration = 0.05; // Camera movement smoothing
    camera.maxCameraSpeed = 10; // Maximum camera speed
    
    return camera;
}

// Create lighting for the scene
function createLighting(scene) {
    // Main hemisphere light for ambient lighting
    const hemisphericLight = new BABYLON.HemisphericLight("hemisphericLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 0.7;
    
    // Directional light for shadows
    const directionalLight = new BABYLON.DirectionalLight("directionalLight", new BABYLON.Vector3(0, -1, 1), scene);
    directionalLight.intensity = 0.5;
    directionalLight.position = new BABYLON.Vector3(0, 20, -20);
    
    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    
    // Add colored point lights for the futuristic ambiance
    const purpleLight = new BABYLON.PointLight("purpleLight", new BABYLON.Vector3(20, 10, 0), scene);
    purpleLight.diffuse = new BABYLON.Color3(0.5, 0, 1); // Purple
    purpleLight.intensity = 0.7;
    
    const blueLight = new BABYLON.PointLight("blueLight", new BABYLON.Vector3(-20, 10, 0), scene);
    blueLight.diffuse = new BABYLON.Color3(0, 0.5, 1); // Blue
    blueLight.intensity = 0.7;
    
    return { shadowGenerator, hemisphericLight, directionalLight, purpleLight, blueLight };
}

// Create environment (skybox, ground, etc.)
function createEnvironment(scene) {
    // Create skybox
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000.0}, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("https://assets.babylonjs.com/textures/skybox", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 1000, height: 1000}, scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Dark color
    ground.material = groundMaterial;
    ground.position.y = -0.1;
    ground.receiveShadows = true;
    
    // Add physics to ground
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
    
    return { skybox, ground };
}

// Create the race track
function createRaceTrack(scene) {
    // Track parameters
    const trackWidth = 20;
    const trackLength = 500;
    
    // Create the straight track
    const track = BABYLON.MeshBuilder.CreateGround("track", {width: trackWidth, height: trackLength}, scene);
    const trackMaterial = new BABYLON.StandardMaterial("trackMaterial", scene);
    
    // Create dynamic texture for the track
    const trackTexture = new BABYLON.DynamicTexture("trackTexture", {width: 512, height: 2048}, scene);
    const trackContext = trackTexture.getContext();
    
    // Fill background
    trackContext.fillStyle = "#333333";
    trackContext.fillRect(0, 0, 512, 2048);
    
    // Draw lane markings
    trackContext.strokeStyle = "#FFFFFF";
    trackContext.lineWidth = 5;
    
    // Center line
    trackContext.beginPath();
    trackContext.setLineDash([50, 30]);
    trackContext.moveTo(256, 0);
    trackContext.lineTo(256, 2048);
    trackContext.stroke();
    
    // Edge lines
    trackContext.beginPath();
    trackContext.setLineDash([]);
    trackContext.moveTo(20, 0);
    trackContext.lineTo(20, 2048);
    trackContext.moveTo(492, 0);
    trackContext.lineTo(492, 2048);
    trackContext.stroke();
    
    // Add neon effect to edges
    trackContext.shadowBlur = 15;
    trackContext.shadowColor = "#00FFFF";
    trackContext.beginPath();
    trackContext.moveTo(10, 0);
    trackContext.lineTo(10, 2048);
    trackContext.moveTo(502, 0);
    trackContext.lineTo(502, 2048);
    trackContext.stroke();
    
    trackTexture.update();
    trackMaterial.diffuseTexture = trackTexture;
    track.material = trackMaterial;
    
    // Create track barriers with neon effect
    const barrierHeight = 1.5;
    const barrierLeft = BABYLON.MeshBuilder.CreateBox("barrierLeft", {width: 1, height: barrierHeight, depth: trackLength}, scene);
    barrierLeft.position.x = -trackWidth/2 - 0.5;
    barrierLeft.position.y = barrierHeight/2;
    
    const barrierRight = BABYLON.MeshBuilder.CreateBox("barrierRight", {width: 1, height: barrierHeight, depth: trackLength}, scene);
    barrierRight.position.x = trackWidth/2 + 0.5;
    barrierRight.position.y = barrierHeight/2;
    
    // Create barrier material with emissive properties for neon effect
    const barrierMaterial = new BABYLON.StandardMaterial("barrierMaterial", scene);
    barrierMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    barrierMaterial.emissiveColor = new BABYLON.Color3(0, 0.5, 0.5); // Cyan glow
    barrierLeft.material = barrierMaterial;
    barrierRight.material = barrierMaterial;
    
    // Add physics to barriers
    barrierLeft.physicsImpostor = new BABYLON.PhysicsImpostor(barrierLeft, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, scene);
    barrierRight.physicsImpostor = new BABYLON.PhysicsImpostor(barrierRight, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, scene);
    
    // Create start/finish line
    const startLine = BABYLON.MeshBuilder.CreateGround("startLine", {width: trackWidth, height: 5}, scene);
    startLine.position.z = -trackLength/2 + 50;
    startLine.position.y = 0.01; // Slightly above track to avoid z-fighting
    
    const startLineMaterial = new BABYLON.StandardMaterial("startLineMaterial", scene);
    startLineMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    startLine.material = startLineMaterial;
    
    // Create overhead structure (as seen in the image)
    const overheadStructure = createOverheadStructure(scene, trackWidth, startLine.position.z);
    
    // Add checkpoint for lap counting
    const checkpoint = new BABYLON.TransformNode("checkpoint");
    checkpoint.position = new BABYLON.Vector3(0, 0, startLine.position.z);
    
    return { track, barrierLeft, barrierRight, startLine, overheadStructure, checkpoint };
}

// Create overhead structure like in the image
function createOverheadStructure(scene, trackWidth, position) {
    // Create the main frame
    const pillarHeight = 8;
    const crossbeamWidth = trackWidth + 10;
    
    // Left pillar
    const leftPillar = BABYLON.MeshBuilder.CreateBox("leftPillar", {width: 1, height: pillarHeight, depth: 1}, scene);
    leftPillar.position = new BABYLON.Vector3(-crossbeamWidth/2, pillarHeight/2, position);
    
    // Right pillar
    const rightPillar = BABYLON.MeshBuilder.CreateBox("rightPillar", {width: 1, height: pillarHeight, depth: 1}, scene);
    rightPillar.position = new BABYLON.Vector3(crossbeamWidth/2, pillarHeight/2, position);
    
    // Crossbeam
    const crossbeam = BABYLON.MeshBuilder.CreateBox("crossbeam", {width: crossbeamWidth, height: 1, depth: 2}, scene);
    crossbeam.position = new BABYLON.Vector3(0, pillarHeight, position);
    
    // Create material for the structure with emissive properties
    const structureMaterial = new BABYLON.StandardMaterial("structureMaterial", scene);
    structureMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    structureMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    leftPillar.material = structureMaterial;
    rightPillar.material = structureMaterial;
    crossbeam.material = structureMaterial;
    
    // Add lights to the structure
    const leftLight = new BABYLON.PointLight("leftLight", new BABYLON.Vector3(-crossbeamWidth/4, pillarHeight - 0.5, position), scene);
    leftLight.diffuse = new BABYLON.Color3(0.5, 0, 1); // Purple
    leftLight.intensity = 0.8;
    
    const rightLight = new BABYLON.PointLight("rightLight", new BABYLON.Vector3(crossbeamWidth/4, pillarHeight - 0.5, position), scene);
    rightLight.diffuse = new BABYLON.Color3(0, 0.5, 1); // Blue
    rightLight.intensity = 0.8;
    
    // Group all elements
    const structure = new BABYLON.TransformNode("overheadStructure");
    leftPillar.parent = structure;
    rightPillar.parent = structure;
    crossbeam.parent = structure;
    
    return structure;
}

// Load the car model
async function loadCarModel(scene) {
    // Create a default car mesh while the model loads
    const tempCar = BABYLON.MeshBuilder.CreateBox("tempCar", {width: 2, height: 1, depth: 4}, scene);
    tempCar.position = new BABYLON.Vector3(0, 0.5, -240); // Starting position
    tempCar.rotation.y = Math.PI; // Face forward
    
    // Create car material with metallic look
    const carMaterial = new BABYLON.PBRMaterial("carMaterial", scene);
    carMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9); // White/silver
    carMaterial.metallic = 0.9;
    carMaterial.roughness = 0.1;
    tempCar.material = carMaterial;
    
    // Add physics to the car
    tempCar.physicsImpostor = new BABYLON.PhysicsImpostor(tempCar, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, friction: 0.5, restitution: 0.3 }, scene);
    
    // Try to load the actual car model
    try {
        // Use the sports car model from the image
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "https://cdn.glitch.global/8bd9ceba-9b9e-4ce3-9958-1625ab15b1ef/", "2006_lamborghini_murcielago_lp640.glb", scene);
        
        // Set up the imported car
        const car = result.meshes[0];
        car.position = tempCar.position.clone();
        car.rotation = tempCar.rotation.clone();
        car.scaling = new BABYLON.Vector3(0.02, 0.02, 0.02); // Adjust scale as needed
        
        // Add custom materials to make it look like the car in the image
        result.meshes.forEach(mesh => {
            if (mesh.material) {
                // Check if it's a body part to apply the white/silver color
                if (mesh.name.includes("body") || mesh.name.includes("Body")) {
                    const bodyMaterial = new BABYLON.PBRMaterial("bodyMaterial", scene);
                    bodyMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9); // White/silver
                    bodyMaterial.metallic = 0.9;
                    bodyMaterial.roughness = 0.1;
                    mesh.material = bodyMaterial;
                }
                
                // Add emissive properties to lights
                if (mesh.name.includes("light") || mesh.name.includes("Light")) {
                    const lightMaterial = new BABYLON.PBRMaterial("lightMaterial", scene);
                    lightMaterial.emissiveColor = new BABYLON.Color3(0, 0.5, 1); // Blue glow
                    lightMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
                    mesh.material = lightMaterial;
                }
            }
        });
        
        // Add physics to the imported car
        const carBoundingBox = BABYLON.MeshBuilder.CreateBox("carBoundingBox", {
            width: 2,
            height: 1,
            depth: 4
        }, scene);
        carBoundingBox.visibility = 0; // Make it invisible
        carBoundingBox.position = car.position.clone();
        carBoundingBox.physicsImpostor = new BABYLON.PhysicsImpostor(carBoundingBox, BABYLON.PhysicsImpostor.BoxImpostor, {
            mass: 1000,
            friction: 0.5,
            restitution: 0.3
        }, scene);
        
        // Link the visual model to the physics body
        scene.onBeforeRenderObservable.add(() => {
            car.position = carBoundingBox.position.clone();
            car.position.y -= 0.5; // Adjust to align wheels with ground
            car.rotation = carBoundingBox.rotation.clone();
        });
        
        // Set the car's physics body
        car.physicsBody = carBoundingBox;
        
        // Remove the temporary car
        tempCar.dispose();
        
        return car;
    } catch (error) {
        console.error("Failed to load car model:", error);
        // Use the temporary car if loading fails
        return tempCar;
    }
}

// Add post-processing effects for a more cinematic look
function addPostProcessing(scene, camera) {
    // Create default pipeline
    const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    
    // Enable bloom effect for neon glow
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.2;
    pipeline.bloomWeight = 0.3;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
    
    // Add chromatic aberration for a more cinematic look
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 1.0;
    
    // Add vignette effect
    pipeline.vignetteEnabled = true;
    pipeline.vignette.weight = 0.5;
    pipeline.vignette.color = new BABYLON.Color4(0, 0, 0, 0);
    
    // Add grain
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 10;
    
    return pipeline;
}

// Export functions
window.createGameScene = createGameScene;