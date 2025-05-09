// Game initialization
window.addEventListener('DOMContentLoaded', function() {
    // Get the canvas element
    const canvas = document.getElementById('renderCanvas');
    
    // Load the loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingBarFill = document.getElementById('loadingBarFill');
    const startScreen = document.getElementById('startScreen');
    const startBtn = document.getElementById('startBtn');
    const gameUI = document.getElementById('gameUI');
    const speedElement = document.getElementById('speed');
    const timeElement = document.getElementById('time');
    const mobileControls = document.getElementById('mobileControls');
    
    // Create the Babylon.js engine
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    
    // Game variables
    let scene;
    let car;
    let camera;
    let startTime;
    let gameStarted = false;
    let gameRunning = false;
    let carSpeed = 0;
    let maxSpeed = 300; // km/h
    let acceleration = 0.5;
    let deceleration = 0.3;
    let brakeDeceleration = 0.8;
    let steering = 0.02;
    let currentLap = 0;
    let checkpoints = [];
    let currentCheckpoint = 0;
    
    // Control states
    const inputStates = {
        up: false,
        down: false,
        left: false,
        right: false
    };
    
    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        mobileControls.style.display = 'flex';
    }
    
    // Set up mobile controls
    if (isMobile) {
        document.getElementById('upBtn').addEventListener('touchstart', () => { inputStates.up = true; });
        document.getElementById('upBtn').addEventListener('touchend', () => { inputStates.up = false; });
        document.getElementById('downBtn').addEventListener('touchstart', () => { inputStates.down = true; });
        document.getElementById('downBtn').addEventListener('touchend', () => { inputStates.down = false; });
        document.getElementById('leftBtn').addEventListener('touchstart', () => { inputStates.left = true; });
        document.getElementById('leftBtn').addEventListener('touchend', () => { inputStates.left = false; });
        document.getElementById('rightBtn').addEventListener('touchstart', () => { inputStates.right = true; });
        document.getElementById('rightBtn').addEventListener('touchend', () => { inputStates.right = false; });
    }
    
    // Set up keyboard controls
    window.addEventListener('keydown', (event) => {
        if ((event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') && !inputStates.up) {
            inputStates.up = true;
        }
        if ((event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') && !inputStates.down) {
            inputStates.down = true;
        }
        if ((event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') && !inputStates.left) {
            inputStates.left = true;
        }
        if ((event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') && !inputStates.right) {
            inputStates.right = true;
        }
    });
    
    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
            inputStates.up = false;
        }
        if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
            inputStates.down = false;
        }
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
            inputStates.left = false;
        }
        if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
            inputStates.right = false;
        }
    });
    
    // Start button event listener
    startBtn.addEventListener('click', function() {
        startGame();
    });
    
    // Create the scene
    async function createScene() {
        // Create a basic scene
        const scene = new BABYLON.Scene(engine);
        
        // Set the scene's clear color to a dark blue/purple gradient
        scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.15, 1);
        
        // Enable physics
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.AmmoJSPlugin());
        
        // Create a camera that follows the car
        camera = new BABYLON.FollowCamera("followCamera", new BABYLON.Vector3(0, 5, -10), scene);
        camera.radius = 15; // Distance from target
        camera.heightOffset = 4; // Height above target
        camera.rotationOffset = 180; // View from behind
        camera.cameraAcceleration = 0.05; // Camera movement smoothing
        camera.maxCameraSpeed = 10; // Maximum camera speed
        
        // Create lights
        const hemisphericLight = new BABYLON.HemisphericLight("hemisphericLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemisphericLight.intensity = 0.7;
        
        // Add directional light for shadows
        const directionalLight = new BABYLON.DirectionalLight("directionalLight", new BABYLON.Vector3(0, -1, 1), scene);
        directionalLight.intensity = 0.5;
        directionalLight.position = new BABYLON.Vector3(0, 20, -20);
        
        // Add colored point lights for the futuristic ambiance
        const purpleLight = new BABYLON.PointLight("purpleLight", new BABYLON.Vector3(20, 10, 0), scene);
        purpleLight.diffuse = new BABYLON.Color3(0.5, 0, 1);
        purpleLight.intensity = 0.7;
        
        const blueLight = new BABYLON.PointLight("blueLight", new BABYLON.Vector3(-20, 10, 0), scene);
        blueLight.diffuse = new BABYLON.Color3(0, 0.5, 1);
        blueLight.intensity = 0.7;
        
        // Create skybox
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000.0}, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("https://assets.babylonjs.com/textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;
        
        // Create the race track
        createRaceTrack(scene);
        
        // Load the car model
        await loadCar(scene);
        
        return scene;
    }
    
    // Create the race track
    function createRaceTrack(scene) {
        // Create the main track
        const trackWidth = 20;
        const trackLength = 500;
        
        // Create the ground
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 1000, height: 1000}, scene);
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        ground.material = groundMaterial;
        ground.position.y = -0.1;
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
        
        // Create the straight track
        const track = BABYLON.MeshBuilder.CreateGround("track", {width: trackWidth, height: trackLength}, scene);
        const trackMaterial = new BABYLON.StandardMaterial("trackMaterial", scene);
        trackMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        
        // Add track texture with lane markings
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
        
        trackTexture.update();
        trackMaterial.diffuseTexture = trackTexture;
        track.material = trackMaterial;
        
        // Create track barriers
        const barrierHeight = 1.5;
        const barrierLeft = BABYLON.MeshBuilder.CreateBox("barrierLeft", {width: 1, height: barrierHeight, depth: trackLength}, scene);
        barrierLeft.position.x = -trackWidth/2 - 0.5;
        barrierLeft.position.y = barrierHeight/2;
        
        const barrierRight = BABYLON.MeshBuilder.CreateBox("barrierRight", {width: 1, height: barrierHeight, depth: trackLength}, scene);
        barrierRight.position.x = trackWidth/2 + 0.5;
        barrierRight.position.y = barrierHeight/2;
        
        // Create barrier material
        const barrierMaterial = new BABYLON.StandardMaterial("barrierMaterial", scene);
        barrierMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        barrierMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
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
        checkpoints.push(checkpoint);
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
        
        // Create material for the structure
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
    async function loadCar(scene) {
        // Create a default car mesh while the model loads
        const tempCar = BABYLON.MeshBuilder.CreateBox("tempCar", {width: 2, height: 1, depth: 4}, scene);
        tempCar.position = new BABYLON.Vector3(0, 0.5, -240); // Starting position
        tempCar.rotation.y = Math.PI; // Face forward
        
        // Create car material
        const carMaterial = new BABYLON.StandardMaterial("carMaterial", scene);
        carMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // White/silver
        carMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        carMaterial.specularPower = 128;
        tempCar.material = carMaterial;
        
        // Add physics to the car
        tempCar.physicsImpostor = new BABYLON.PhysicsImpostor(tempCar, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, friction: 0.5, restitution: 0.3 }, scene);
        
        // Try to load the actual car model
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "https://cdn.glitch.global/8bd9ceba-9b9e-4ce3-9958-1625ab15b1ef/", "2006_lamborghini_murcielago_lp640.glb", scene);
            
            // Set up the imported car
            car = result.meshes[0];
            car.position = tempCar.position.clone();
            car.rotation = tempCar.rotation.clone();
            car.scaling = new BABYLON.Vector3(0.02, 0.02, 0.02); // Adjust scale as needed
            
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
        } catch (error) {
            console.error("Failed to load car model:", error);
            // Use the temporary car if loading fails
            car = tempCar;
        }
        
        // Set camera target to the car
        camera.lockedTarget = car;
        
        return car;
    }
    
    // Update car movement based on input
    function updateCarMovement() {
        if (!car || !gameRunning) return;
        
        const deltaTime = engine.getDeltaTime() / 1000; // Convert to seconds
        
        // Get the car's physics body (or the car itself if no separate physics body)
        const physicsBody = car.physicsBody || car;
        
        // Get current velocity
        const currentVelocity = physicsBody.physicsImpostor.getLinearVelocity();
        
        // Calculate current speed in km/h (approximation)
        carSpeed = Math.sqrt(
            currentVelocity.x * currentVelocity.x +
            currentVelocity.z * currentVelocity.z
        ) * 3.6; // Convert m/s to km/h
        
        // Update speed display
        speedElement.textContent = `Speed: ${Math.round(carSpeed)} km/h`;
        
        // Get forward direction based on car's rotation
        const forward = new BABYLON.Vector3(
            Math.sin(physicsBody.rotation.y),
            0,
            Math.cos(physicsBody.rotation.y)
        );
        
        // Acceleration
        if (inputStates.up) {
            const force = forward.scale(acceleration * 10000 * deltaTime);
            physicsBody.physicsImpostor.applyForce(force, physicsBody.getAbsolutePosition());
        }
        
        // Braking
        if (inputStates.down) {
            const force = forward.scale(-brakeDeceleration * 10000 * deltaTime);
            physicsBody.physicsImpostor.applyForce(force, physicsBody.getAbsolutePosition());
        }
        
        // Apply natural deceleration when not accelerating or braking
        if (!inputStates.up && !inputStates.down && carSpeed > 0) {
            const decelerationForce = forward.scale(-deceleration * 5000 * deltaTime);
            physicsBody.physicsImpostor.applyForce(decelerationForce, physicsBody.getAbsolutePosition());
        }
        
        // Steering
        if (carSpeed > 5) { // Only steer if moving
            if (inputStates.left) {
                physicsBody.rotation.y += steering * (carSpeed / 50) * deltaTime * 5;
            }
            if (inputStates.right) {
                physicsBody.rotation.y -= steering * (carSpeed / 50) * deltaTime * 5;
            }
        }
        
        // Check for checkpoints and lap completion
        checkCheckpoints();
    }
    
    // Check if car has passed checkpoints
    function checkCheckpoints() {
        if (!car || checkpoints.length === 0) return;
        
        const carPosition = car.position || car.physicsBody.position;
        const checkpoint = checkpoints[currentCheckpoint];
        
        // Calculate distance to checkpoint
        const distance = BABYLON.Vector3.Distance(
            new BABYLON.Vector3(carPosition.x, 0, carPosition.z),
            new BABYLON.Vector3(checkpoint.position.x, 0, checkpoint.position.z)
        );
        
        // If car is close enough to checkpoint
        if (distance < 10) {
            currentCheckpoint++;
            
            // If all checkpoints passed, complete a lap
            if (currentCheckpoint >= checkpoints.length) {
                currentCheckpoint = 0;
                currentLap++;
                console.log("Lap completed!", currentLap);
            }
        }
    }
    
    // Update game timer
    function updateTimer() {
        if (!gameRunning) return;
        
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - startTime;
        
        // Format time as MM:SS
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        
        timeElement.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Start the game
    function startGame() {
        startScreen.style.display = 'none';
        gameUI.style.display = 'block';
        gameStarted = true;
        gameRunning = true;
        startTime = new Date().getTime();
    }
    
    // Initialize the game
    async function initGame() {
        // Show loading screen
        loadingScreen.style.display = 'flex';
        
        // Create the scene
        scene = await createScene();
        
        // Register a render loop to repeatedly render the scene
        engine.runRenderLoop(function () {
            if (scene) {
                scene.render();
                
                if (gameStarted) {
                    updateCarMovement();
                    updateTimer();
                }
            }
        });
        
        // Update loading progress
        let progress = 0;
        const loadingInterval = setInterval(() => {
            progress += 5;
            if (progress > 100) {
                clearInterval(loadingInterval);
                loadingScreen.style.display = 'none';
                startScreen.style.display = 'flex';
            } else {
                loadingBarFill.style.width = `${progress}%`;
            }
        }, 100);
        
        // Watch for browser/canvas resize events
        window.addEventListener('resize', function () {
            engine.resize();
        });
    }
    
    // Initialize the game
    initGame();
});