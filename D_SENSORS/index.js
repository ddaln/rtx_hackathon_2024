import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import io from 'socket.io-client';
import songUrl from './sounds/knock.mp3';
import './styles.css';
let runGame=false;  // set to true in startGame after user logs in
let remainingTime;
let decision; // Assuming this is defined globally at the top of your code
let eventState;
var chatMessage="no message, yet";
let cumulativeRescues = 0;
let cumulativeScore = 0;
let yourCumulativeScore = 0;
let rescueCount=0;
let yourScore=0;
let clientUID;
let victimPlaced=false;

clientUID='test client id';
localStorage.setItem('clientUID', clientUID);
console.log('from client just testing retrieval',localStorage.getItem('clientUID'));
let standoffDistance=undefined;
let walabotPosition=undefined;;
let isBehindWall=undefined;;
let reason=undefined;
let username=undefined;
let distance=undefined;
var missDistance=1000.0;
const players = {};
let currentPlayerId;
let alreadyUpdated=false;

//var victimObject.position.x;
//missDistance=Math.abs(markPosition.x-victimObject.position.x);


// Declare audioContext at the top level of your script
let audioContext;
let         SFLAG=0;
// Initialize audioContext
function initAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error("Web Audio API is not supported in this browser");
        return;
    }
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// Call initAudioContext early in your script, before any interaction occurs
initAudioContext();

// Now, you can safely use audioContext in your event handlers and functions
// Establish socket connection
//const socket = io('http://127.0.0.1:3000'); // Update with your server's IP address
const socket = io('http://172.210.74.144:3000'); // Update with your server's IP address

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// PointerLockControls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Create grid of hallways
const gridSize = 20;
const gridDivisions = 10;
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions);
scene.add(gridHelper);

 const maze = [
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];
/*

const maze = [
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 1,0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1,0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0,0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 1, 0,0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

 */

const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
const wallHeight = 2;
const wallThickness = 0.2; // Adjust thickness to be more reasonable

const debugMode = true;  // Set this to false when not debugging

function createWall(x, z, width, depth) {
    const wallGeometry = new THREE.BoxGeometry(width, wallHeight, depth);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, wallHeight / 2, z);
    scene.add(wall);
    return wall;
}

// Create walls based on the maze layout
const walls = [];
const cellSize = 2; // Adjust cell size to fit your grid

for (let i = 0; i < maze.length; i++) {
    for (let j = 0; j < maze[i].length; j++) {
        if (maze[i][j] === 1) {
            walls.push(createWall(j * cellSize - gridSize / 2, i * cellSize - gridSize / 2, cellSize, cellSize));
        }
    }
}


const rescueWallIndices = [8, 15];  // Example indices of walls for rescue locations
let currentLocationIndex = 0; // To keep track of the current location


const directions = [
    { x: 1, z: 0 },   // right
    { x: 0, z: 1 },   // down
    { x: -1, z: 0 },  // left
    { x: 0, z: -1 }   // up
];

function isWalkable(maze, x, z) {
    return x >= 0 && x < maze[0].length && z >= 0 && z < maze.length && maze[z][x] === 0;
}

function generateWallFollowingPath(maze) {
    const path = [];
    const rows = maze.length;
    const cols = maze[0].length;

    // Starting point (top-left corner of the maze)
    let x = 0;
    let z = 0;
    let dirIndex = 0; // Start by moving right

    while (runGame) {
        // Add the current position to the path
        path.push({ x: x * cellSize - gridSize / 2, z: z * cellSize - gridSize / 2 });

        // Check if the next move in the current direction is walkable
        const nextX = x + directions[dirIndex].x;
        const nextZ = z + directions[dirIndex].z;

        if (isWalkable(maze, nextX, nextZ)) {
            // Move to the next cell
            x = nextX;
            z = nextZ;
        } else {
            // Try to turn right
            const rightDirIndex = (dirIndex + 1) % 4;
            const rightX = x + directions[rightDirIndex].x;
            const rightZ = z + directions[rightDirIndex].z;

            if (isWalkable(maze, rightX, rightZ)) {
                // Turn right and move to the next cell
                dirIndex = rightDirIndex;
                x = rightX;
                z = rightZ;
            } else {
                // Try to turn left
                const leftDirIndex = (dirIndex + 3) % 4;
                const leftX = x + directions[leftDirIndex].x;
                const leftZ = z + directions[leftDirIndex].z;

                if (isWalkable(maze, leftX, leftZ)) {
                    // Turn left and move to the next cell
                    dirIndex = leftDirIndex;
                    x = leftX;
                    z = leftZ;
                } else {
                    // If no move is possible, stop the algorithm
                    break;
                }
            }
        }

        // Stop if we've returned to the starting point
        if (x === 0 && z === 0) {
            break;
        }
    }

    return path;
}

const searchPath = generateWallFollowingPath(maze);
console.log('Generated wall-following search path:', searchPath);

// Player object
class Player {
    constructor(id, name, position) {
        this.id = id;
        this.name = name;
        this.position = position;
        this.direction = new THREE.Vector3(0, 0, -1); // Default facing north

        // Create a smaller capsule geometry for the player
        const capsuleGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 16); // Smaller cylinder
        const capsuleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.icon = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
        this.icon.position.set(this.position.x, this.position.y, this.position.z);
        scene.add(this.icon);
    }

    move(x, z) {
 //       console.log(`Moving player by x: ${x}, z: ${z}`);
        const newX = this.position.x + x;
        const newZ = this.position.z + z;

        // Check for collisions with walls
        if (!this.checkCollision(newX, this.position.y, newZ)) {
            this.position.x = newX;
            this.position.z = newZ;
            this.icon.position.set(this.position.x, this.position.y, this.position.z);
            controls.getObject().position.set(this.position.x, this.position.y + 1.6, this.position.z);
//            console.log(`Player moved to x: ${this.position.x}, z: ${this.position.z}`);
        } else {
            console.log('Collision detected, movement blocked');
        }
    }

    rotate(direction) {
        console.log(`Rotating player to ${direction}`);
        switch (direction) {
            case 'north':
                this.direction.set(0, 0, -1);
                break;
            case 'south':
                this.direction.set(0, 0, 1);
                break;
            case 'east':
                this.direction.set(1, 0, 0);
                break;
            case 'west':
                this.direction.set(-1, 0, 0);
                break;
        }
        controls.getObject().rotation.y = this.direction.angleTo(new THREE.Vector3(0, 0, -1));
    }
	checkCollision(x, y, z) {
		const tolerance = 0.03; // Adjust this value to make collision less sensitive
		
		for (const wall of walls) {
			const wallBox = new THREE.Box3().setFromObject(wall);

			// Calculate the new player position
			const newPosition = new THREE.Vector3(x, y, z);
			const playerBox = new THREE.Box3().setFromObject(this.icon).translate(newPosition.sub(this.position));

			// Adjust wall box by tolerance to make it less sensitive
			wallBox.expandByScalar(-tolerance);
			
			// Debugging information
//			console.log(`PlayerBox: min (${playerBox.min.x}, ${playerBox.min.y}, ${playerBox.min.z}) max (${playerBox.max.x}, ${playerBox.max.y}, ${playerBox.max.z})`);
//			console.log(`WallBox: min (${wallBox.min.x}, ${wallBox.min.y}, ${wallBox.min.z}) max (${wallBox.max.x}, ${wallBox.max.y}, ${wallBox.max.z})`);
			
			if (wallBox.intersectsBox(playerBox)) {
				console.log('Collision detected with wall:', wall);
				return true;
			}
		}
		return false;
	}
	

    getRoundedDirection() {
        const angle = controls.getObject().rotation.y;
        if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
            return 'north';
        } else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
            return 'west';
        } else if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) {
            return 'east';
        } else {
            return 'south';
        }
    }
}
function   initializeNewGameState(){
    console.log('new user state initialized'); 
}
// Save currentPlayerId to local storage before navigating away
function saveCurrentPlayerId() {
    localStorage.setItem('currentPlayerId', currentPlayerId);
}
// Retrieve currentPlayerId from local storage when coming back
function getCurrentPlayerId() {
    const savedId = localStorage.getItem('currentPlayerId');
    if (savedId) {
        currentPlayerId = savedId;
    } else {
        // Handle case where currentPlayerId is not set
        console.log('No currentPlayerId found in local storage.');
    }
}
async function startGame() {
    try {
        const username = await fetchUsername();
        if (username) {
            currentPlayerId = username;  // Set the global player ID
            saveCurrentPlayerId();  // Save the player ID to local storage
            document.addEventListener('DOMContentLoaded', (event) => {
                // Your existing code to display currentPlayerId
                function displayCurrentPlayerId() {
                    var playerIdElement = document.getElementById('playerIdDisplay');
                    playerIdElement.textContent =  currentPlayerId;
                }
            
                // Call the function to update the display
                displayCurrentPlayerId();
            });
                          //         restoreServerGameState(currentPlayerId); 
            clientUID=username;
            localStorage.setItem('clientUID', clientUID);

            initializePlayer(currentPlayerId);
            runGame=true;
        } else {
            console.error('Username fetch returned no username.');
        }
    } catch (error) {
        console.error('Failed to start the game due to an error:', error);
    }
}

async function fetchUsername() {
    const response = await fetch('/get-username');
    if (!response.ok) throw new Error('Failed to fetch username');
    const data = await response.json();
    return data.username;
}

function initializePlayer(username) {
    // Assuming Player constructor and players array are correctly defined elsewhere
    players[username] = new Player(username, username, new THREE.Vector3(0, 0, 0));
    console.log(`Player ${username} initialized`);
    return players[username]; // Return the newly created player object
}

//scene.add(players[currentPlayerId].icon);

// Ensure camera starts at a good position to see the player
camera.position.set(0, 1.8, 0); // Adjusted height for first-person view

// Add event listeners for PointerLockControls

controls.addEventListener('lock', () => {
    console.log('Pointer Lock Enabled');
	if (listener.context.state === 'suspended') {
		listener.context.resume().then(() => {
			console.log('Audio context resumed');
		});
}
	
});

// Implement the resumeAudioContext function
function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed!");
      }).catch((error) => {
        console.error("Error resuming AudioContext:", error);
      });
    }
  }

controls.addEventListener('unlock', () => {
	resumeAudioContext(); // Resume audio context when pointer lock is disabled	
    console.log('Pointer Lock Disabled');
});

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let rotateLeft = false;
let rotateRight = false;

function updateMinimap() {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    const cellSize = canvas.width / gridDivisions;
    ctx.strokeStyle = 'lightgray';
    for (let i = 0; i <= gridDivisions; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }

    // Draw walls
    ctx.fillStyle = 'gray';
    walls.forEach(wall => {
        const wallBox = new THREE.Box3().setFromObject(wall);
        const minX = (wallBox.min.x / gridSize + 0.5) * canvas.width;
        const minZ = (wallBox.min.z / gridSize + 0.5) * canvas.height;
        const width = (wallBox.max.x - wallBox.min.x) / gridSize * canvas.width;
        const height = (wallBox.max.z - wallBox.min.z) / gridSize * canvas.height;
        ctx.fillRect(minX, minZ, width, height);
    });

    // Draw each player
/*     for (const id in players) {
        const player = players[id];
        if (player && player.position) {
            ctx.fillStyle = 'green';
            const playerX = (player.position.x / gridSize + 0.5) * canvas.width;
            const playerZ = (player.position.z / gridSize + 0.5) * canvas.height;
            ctx.fillRect(playerX, playerZ, 5, 5); // Adjust positions for the map
        }
    }
 */
    // Draw each player with direction
    for (const id in players) {
        const player = players[id];
        if (player && player.position) {
            drawPlayerWithDirection(ctx, player);
        }
    }

    // Draw the victim's position if debug mode is on
    if (debugMode && victimObject && victimObject.position) {
        ctx.fillStyle = 'red';
        const victimX = (victimObject.position.x / gridSize + 0.5) * canvas.width;
        const victimZ = (victimObject.position.z / gridSize + 0.5) * canvas.height;
        ctx.beginPath();
        ctx.arc(victimX, victimZ, 5, 0, 2 * Math.PI); // Draw a circle for the victim
        ctx.fill();
    }

    requestAnimationFrame(updateMinimap);
	function getCameraDirection() {
		var vector = new THREE.Vector3(); 
		camera.getWorldDirection(vector);
		var angle = Math.atan2(vector.x, vector.z);
//		console.log("Camera angle:", angle);
		return angle;
	}
	function getCameraDirection() {
		var vector = new THREE.Vector3(); 
		camera.getWorldDirection(vector);
		var originalAngle = Math.atan2(vector.x, vector.z);
		var adjustedAngle = originalAngle + Math.PI / 2;

//		console.log("Original angle:", originalAngle * (180 / Math.PI), "degrees");
//		console.log("Adjusted angle:", adjustedAngle * (180 / Math.PI), "degrees");

		return adjustedAngle;
	}
	
	function drawPlayerWithDirection(ctx, player) {
		const playerX = (player.position.x / gridSize + 0.5) * canvas.width;
		const playerZ = (player.position.z / gridSize + 0.5) * canvas.height;
		const angle = getCameraDirection() ;  // Subtract π/2 to rotate arrow to point North

		ctx.fillStyle = 'green';
		ctx.beginPath();
		ctx.moveTo(playerX + 25 * Math.cos(angle), playerZ + 25 * Math.sin(angle));  // Increase the size of the arrow
		ctx.lineTo(playerX + 10 * Math.cos(angle + Math.PI / 7), playerZ + 10 * Math.sin(angle + Math.PI / 7));
		ctx.lineTo(playerX + 10 * Math.cos(angle - Math.PI / 7), playerZ + 10 * Math.sin(angle - Math.PI / 7));
		ctx.closePath();
		ctx.fill();
	}
}

updateMinimap();
 
/* // Chat functionality
document.getElementById('global-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && this.value !== '') {
        socket.emit('global message', { player: currentPlayerId, message: this.value });
        this.value = '';
    }
});
 */

 
    socket.on('data ready', function(data) {
        getCurrentPlayerId();  // Retrieve currentPlayerId from local storage
        console.log('data ready currentPlayerId:', currentPlayerId);
        console.log('Data received from the server:', data);
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
        // Handle the data from the server her
//        console.log('Received data:', data); // Ensure the data object is logged        
        // Assuming 'data' is a top-level key, and we need to access its value
        const nestedData = data.data;        
//        console.log('Nested data object:', nestedData); // Ensure the nested data object is logged
        // First loop to extract specific keys
        for (const [key, value] of Object.entries(nestedData)) {
            console.log(`Processing key: ${key}, value: ${value}`); // Debugging log        
            if (key === 'isBehindWall') {
                isBehindWall = value; // Assign value directly if key matches
            } else if (key === 'reason') {
                reason = value; // Assign value directly if key matches
            } else if (key === 'standoffDistance') {
                standoffDistance = value; // Assign value directly if key matches
            } else if (key === 'walabotPosition') {
                walabotPosition = value; // Assign value directly if key matches
            } else if (typeof value === 'object' && value !== null) {
                // If the value is an object and the key does not match 'isBehindWall' or 'reason',
                // handle it differently, for example, converting it to a JSON string
                this[key] = JSON.stringify(value);
            }
        }
        sendGameStateToServer();
        updateRescueCount()
        console.log(`isBehindWall: ${isBehindWall}`);
        console.log(`reason: ${reason}`);
        console.log(`standoffDistance: ${standoffDistance}`);
        console.log(`walabotPosition: ${walabotPosition}`);
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {

                console.log(`${key}: ${JSON.stringify(value)}`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
    });


/* socket.on('global message', function (data) {
    const msg = document.createElement('div');
    msg.textContent = `${data.player}: ${data.message}`;
    document.getElementById('global-messages').appendChild(msg);
});
 */
/* document.getElementById('private-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && this.value !== '') {
        socket.emit('private message', { from: currentPlayerId, to: 'player2', message: this.value });
        this.value = '';
    }
});
 */
socket.on('private message', function (data) {
    const msg = document.createElement('div');
    msg.textContent = `${data.from} to ${data.to}: ${data.message}`;
    document.getElementById('private-messages').appendChild(msg);
});
/* document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('decisionForm').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the form from submitting in the traditional way

        const decisionElement = document.querySelector('input[name="decision"]:checked');
        if (decisionElement) {
            const decision = decisionElement.value;

            // Store the decision in Local Storage
            localStorage.setItem('lastDecision', decision);

            // Gather the game state with the decision and send it to the server
            eventState=3;
            console.log('line 472')

            sendGameStateToServer(); // Updated to call without arguments
        } else {
            // Handle the case where no decision is selected
            eventState=4;
            decision=null;
            console.log('line 479')

            sendGameStateToServer(); // Updated to call without arguments
            console.error('No decision selected');
        }
    });
});
 */
let isChatFocused = false;
document.addEventListener('DOMContentLoaded', startGame);

document.addEventListener('click', () => {
    if (!isChatFocused) {
        controls.lock();}
});		
let markWall = false;

// Motion command handlers
document.addEventListener('keydown', (event) => {
    if (!isChatFocused) {
        switch (event.code) {
//            case 'ArrowUp':
//            case 'KeyW':
//                moveForward = true;
//                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                sendGameStateToServer()                

                break;
//            case 'ArrowDown':
//            case 'KeyS':
//                moveBackward = true;
//                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                sendGameStateToServer()                
                break;
            case 'KeyQ':
                rotateLeft = true;
                break;
            case 'KeyE':
                rotateRight = true;
                break;
			case 'Space':
				markWall = true; // Set flag to mark the wall
				break;
				
        }
            // Add more cases as needed
    }
});

document.addEventListener('keyup', (event) => {
    if (!isChatFocused) {
        switch (event.code) {
//            case 'ArrowUp':
//            case 'KeyW':
//                moveForward = false;
//                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
 //           case 'ArrowDown':
//            case 'KeyS':
//                moveBackward = false;
//                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
            case 'KeyQ':
                rotateLeft = false;
                break;
            case 'KeyE':
                rotateRight = false;
                break;
            case 'Space':
				console.log('Space key pressed up.');
				missDistance=markWallOnShoot();
                alreadyUpdated=false;
                eventState=2;
                console.log('line 597')
                sendGameStateToServer()                
				markWall = false;
        // Assuming you have a close button with the class 'close' inside your modal
/*         var closeButton = document.querySelector('.close');
        function showModal() {
            modal.style.display = 'block'; // This will make the modal visible
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                event.stopPropagation(); // This will prevent the event from bubbling up
                modal.style.display = 'none';
            });
        } else {
            console.log('Error: Close button not found.');
        }
        var modal = document.getElementById('myModal');
        showModal();
        // Assuming your form has an ID 'modalForm'
        var form = document.getElementById('myModal');
        if (form) {
            form.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevent the default form submission behavior
                event.stopPropagation(); // This will prevent the event from bubbling up

                console.log('Closing modal...');
                // Here, handle the form data, e.g., sending it to a server

                // After handling the form, close the modal
                modal.style.display = 'none';
            });
        } else {
            console.log('Error: Form not found.');
        }

 */                break;
            // Add more cases as needed
        }
    }
});


// Audio based on proximity
const listener = new THREE.AudioListener();
camera.add(listener);

const audioLoader = new THREE.AudioLoader();
const victimSound = new THREE.PositionalAudio(listener);
audioLoader.load(songUrl, function (buffer) {
    victimSound.setBuffer(buffer);
    victimSound.setRefDistance(20); // Set reference distance
    victimSound.setLoop(true);
    victimSound.setVolume(0.5);
    victimSound.play();
    console.log('Audio loaded and playing');
}, undefined, function (error) {
    console.error('An error occurred while loading the audio file:', error);
});

const victimObject = new THREE.Object3D();
victimObject.add(victimSound);
scene.add(victimObject);

if (listener.context.state === 'suspended') {
    listener.context.resume().then(() => {
        console.log('Audio context resumed');
    });
}

function gaussian(x, mu, sigma) {
    return Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
}
function updateAudio(player) {
    if (player && player.position && victimObject.position) {
//        const distance = player.position.distanceTo(victimObject.position);
        const distance=Math.abs(player.position.x-victimObject.position.x);
        const sigma = 4; // Adjust this value to control the width of the peak
        let volume = gaussian(distance, 0, sigma);
  //      const volume=1;
        victimSound.setVolume(volume);
	if (listener.context.state === 'suspended') {
		listener.context.resume().then(() => {
			console.log('Audio context resumed');
		});
	}
		
        console.log(`Distance to victim: ${distance}, Volume: ${volume}`);
    }
}

function animate() {
    requestAnimationFrame(animate);
    // Check if we need to mark a wall
    //markWallOnShoot();
    if (controls.isLocked) {
        const delta = 0.025;

        // Handle rotation
        if (rotateLeft) {
            controls.getObject().rotation.y += Math.PI / 2; // 90 degrees to the left
			controls.getObject().rotation.z = 0; // Ensure camera stays upright
            players[currentPlayerId].rotate(players[currentPlayerId].getRoundedDirection());
            rotateLeft = false;
        }
        if (rotateRight) {
            controls.getObject().rotation.y -= Math.PI / 2; // 90 degrees to the right
			controls.getObject().rotation.z = 0; // Ensure camera stays upright					
            players[currentPlayerId].rotate(players[currentPlayerId].getRoundedDirection());
            rotateRight = false;
        }

        // Move player based on current direction
        const roundedDirection = players[currentPlayerId].getRoundedDirection();
        if (moveForward) {
            switch (roundedDirection) {
                case 'north':
                    players[currentPlayerId].move(0, -delta);
                    break;
                case 'south':
                    players[currentPlayerId].move(0, delta);
                    break;
                case 'east':
                    players[currentPlayerId].move(delta, 0);
                    break;
                case 'west':
                    players[currentPlayerId].move(-delta, 0);
                    break;
            }
        }
        if (moveBackward) {
            switch (roundedDirection) {
                case 'north':
                    players[currentPlayerId].move(0, delta);
                    break;
                case 'south':
                    players[currentPlayerId].move(0, -delta);
                    break;
                case 'east':
                    players[currentPlayerId].move(-delta, 0);
                    break;
                case 'west':
                    players[currentPlayerId].move(delta, 0);
                    break;
            }
        }
        if (moveLeft) {
            switch (roundedDirection) {
                case 'north':
                    players[currentPlayerId].move(-delta, 0);
                    break;
                case 'south':
                    players[currentPlayerId].move(delta, 0);
                    break;
                case 'east':
                    players[currentPlayerId].move(0, -delta);
                    break;
                case 'west':
                    players[currentPlayerId].move(0, delta);
                    break;
            }
        }
        if (moveRight) {
            switch (roundedDirection) {
                case 'north':
                    players[currentPlayerId].move(delta, 0);
                    break;
                case 'south':
                    players[currentPlayerId].move(-delta, 0);
                    break;
                case 'east':
                    players[currentPlayerId].move(0, delta);
                    break;
                case 'west':
                    players[currentPlayerId].move(0, -delta);
                    break;
            }
        }

        updateAudio(players[currentPlayerId]);
    }

    renderer.render(scene, camera);
}

animate();

function displayVictimPosition(position) {
	const loader = new THREE.FontLoader();
	loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
		// Success callback
		// Your code to use the font here
        const textGeometry = new THREE.TextGeometry(`Victim here: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`, {
            font: font,
            size: 0.5,
            height: 0.1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(position.x, position.y + 2, position.z);
        scene.add(textMesh);
		
	}, undefined, function (error) {
		console.error('Error loading font:', error);
	});
	
}

function placeVictimInWall() {
 //   const fixedWallIndex = rescueWallIndices[currentLocationIndex];  ;  // Index of the wall where you want to place the victim
//    const fixedWallIndex = 8;  ;  // Index of the wall where you want to place the victim
    let fixedWallIndex=Math.floor(Math.random() * 5)+3
	console.log(`fixedWallIndex=${fixedWallIndex}`)
    const wall = walls[fixedWallIndex];  // Use a fixed index for consistent placement

    const victim = new THREE.Object3D();
    victim.position.copy(wall.position);
    scene.add(victim);
    victimObject.position.copy(victim.position);

    if (debugMode) {
        console.log(`Victim placed at fixed position: ${victim.position.x}, ${victim.position.y}, ${victim.position.z}`);
//        displayVictimPosition(victim.position);
    }
    victimPlaced=true;
}

if(!victimPlaced){
    placeVictimInWall();
}
//placeVictimInWall(rescueLocations[currentLocationIndex]);

//const socket = io(); // Assuming you are using Socket.IO
//const socket = io.connect('http://localhost:3000');
socket.on('connect', () => {
    console.log('lin 715 Connected to the server');
});


socket.on('timerUpdate', data => {
	//console.log('Received timer update:', data);
    remainingTime=data.remainingTime;
    updateTimerDisplay(data.remainingTime);
});

function updateTimerDisplay(remainingTime) {
    document.getElementById('timer').textContent = formatTime(remainingTime);
//	console.log('Updating display for time:', remainingTime);	
}

function formatTime(seconds) {
    let mins = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}


// Victim rescue count
let rescuedCount = 0;


// Establish connection with the server
//const socket = io('http://192.168.1.163:3000'); // Update with your server's IP address

// Ensure the DOM is fully loaded before attaching event listeners
// Ensure the DOM is fully loaded before attaching event listeners

// Function to handle auto-navigation along the route
document.addEventListener('DOMContentLoaded', () => {
    const globalInput = document.getElementById('global-input');
    const globalMessages = document.getElementById('global-messages');
    const clientId = generateClientId(); // Generate a unique identifier for this client

    // Prevent rebroadcasting received messages
    let lastSentMessage = '';

    // Check if the global input element exists
    if (globalInput) {
        // Add event listener to detect "Enter" key press
        globalInput.addEventListener('keypress', async function (e) {
            if (e.key === 'Enter' && this.value !== '') {
                const message = this.value.trim();
                if (message !== lastSentMessage) {
                    chatMessage = message;
                    console.log('line 873');
                    sendGameStateToServer(); // Updated to call without arguments

                    socket.emit('global message', { player: currentPlayerId, message: this.value, clientId });
                    lastSentMessage = message; // Store the last sent message
                }
                this.value = '';
                e.stopPropagation(); // Stop the key event from propagating to the game
            }
        });

        // Stop propagation of all key events when the input is focused
        globalInput.addEventListener('keydown', function (e) {
            e.stopPropagation();
        });

        globalInput.addEventListener('keyup', function (e) {
            e.stopPropagation();
        });
    } else {
        console.error("Element with ID 'global-input' not found.");
    }

    // Ensure global message event is added only once
    if (!socket.hasListeners('global message')) {
        socket.on('global message', async (data) => {
            if (data.clientId !== clientId) { // Ignore messages originating from this client
                const msg = document.createElement('div');
                msg.innerHTML = formatMessage(data.player, data.message);
                globalMessages.appendChild(msg);
                chatMessage = data.message; // Fix here: assign the actual message text
                console.log('line 893');
                sendGameStateToServer(); // Updated to call without arguments

                if (data.message === 'please auto search') {
                    console.log('Starting auto navigation...'); // Debugging statement
                    await startAutoNavigation();
                }
            }
        });
    }
});

// Helper function to generate a unique client identifier
function generateClientId() {
    return 'client-' + Math.random().toString(36).substr(2, 16);
}

// Helper function to check if a message contains code
function isCodeMessage(message) {
    return /```[\s\S]*?```/.test(message); // Updated regex to detect code blocks
}

// Helper function to format code messages
function formatMessage(player, message) {
    if (isCodeMessage(message)) {
        // Replace triple backticks with <pre><code> and </code></pre> tags
        message = message.replace(/```/g, '');
        message = `<pre><code>${message}</code></pre>`;
    }
    return `${player}: ${message}`;
}

async function autoNavigate(route) {
    for (const step of route) {
        console.log(`Moving to: x=${step.x}, z=${step.z}`); // Debugging statement
        await autoMoveTo(step.x, step.z);
    }
}

// Function to move player to specified coordinates
function autoMoveTo(x, z) {
    return new Promise((resolve) => {
        const deltaX = x - players[currentPlayerId].position.x;
        const deltaZ = z - players[currentPlayerId].position.z;

        players[currentPlayerId].move(deltaX, deltaZ);
        updateAudio(players[currentPlayerId]);

        setTimeout(resolve, 1700); // Adjust the delay as needed
    });
}

// Function to start the auto-navigation
async function startAutoNavigation() {
    console.log('Auto-navigation started'); // Debugging statement
//    const parsedRoute = testRoute.map(step => ({ x: step.x, z: step.z }));
    await autoNavigate(searchPath);
}

// Assuming the Player class and other necessary parts are already defined and initialized
function markWallOnShoot() {
    if (!markWall) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(walls);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const markGeometry = new THREE.CircleGeometry(0.1, 32);
        const markMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mark = new THREE.Mesh(markGeometry, markMaterial);
        // Position the mark on the wall where the ray intersects
        mark.position.copy(intersect.point);
        mark.rotation.x = Math.PI / 2; // Adjust rotation to align with the wall
        mark.lookAt(camera.position);
        // Ensure the mark is slightly off the wall to avoid z-fighting
        mark.position.add(intersect.face.normal.multiplyScalar(0.01));
        mark.position.copy(intersect.point);
        mark.rotation.copy(intersect.object.rotation);
        scene.add(mark);
        missDistance=checkRescueCondition(intersect.point);

        return missDistance;
    }
/*     const form = document.querySelector('form[action="http://localhost:3000/upload"]');
    
    // Check if the form exists
    if (form) {
        // Programmatically submit the form
        form.submit();
    } else {
        console.log('Form not found.');
    } */


}

function checkRescueCondition(markPosition) {
//    let missDistance = markPosition.distanceTo(victimObject.position);
    missDistance=Math.abs(markPosition.x-victimObject.position.x);
    localStorage.setItem('missDistance', missDistance.toString());
	// Send this to the server
/* 	fetch('/set-miss-distance', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ missDistance: missDistance })
	}).then(response => response.json())
	  .then(data => console.log('Success:', data))
	  .catch((error) => console.error('Error:', error));
 */
//    const rescueThreshold = 10.0; // Define how close the player needs to be to rescue the victim
	console.log(`miss distance=${missDistance}`);  // Correctly formatted to print the distance
	
//    if (missDistance <= rescueThreshold) {
//        rescueVictim();
//    }

return missDistance;
}

const eventSource = new EventSource('/register');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('New data from server:', data);
    // Act on the data
};

eventSource.onerror = function(error) {
    console.error('EventSource failed:', error);
    eventSource.close();
};

await makeDecisionAndUpdate();
async function makeDecisionAndUpdate() {
//    console.log('hellow from makeDecisionand update')
    try {
        const response = await fetch('/get-decision');
        console.log('hellow from makeDecisionand fetch decision   ')

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json(); // Assuming the response is JSON
        
        console.log('data.decision',data.decision);
} catch (error) {
    console.error('Error:', error);
    // Optionally, update the UI or log failure
}
}

function updateRescueCount() {
    if (alreadyUpdated) return;
    getCurrentPlayerId();   
//    missDistance=Math.abs(player.position.x-victimObject.position.x);
    const MISS_DISTANCE_THRESHOLD=10;
//    missDistance=Math.abs(markPosition.x-victimObject.position.x);
    var missDistance = parseFloat(localStorage.getItem('missDistance'));
    let RFLAG=undefined;
    console.log('rescueCount isBehindWall:', isBehindWall); // Debugging line
    console.log('rescueCount missDistance:',missDistance); // Debugging line
    if (isBehindWall === "yes" && missDistance < MISS_DISTANCE_THRESHOLD) {
        rescueCount++; // Increment client cumulative rescue count
        RFLAG=1;
        console.log('CLIENT Rescue happened! client rescues:', rescueCount);
        yourScore = 0;
        if (reason == 'eye') {
            yourScore += 1;
        } else if (reason == '"code-alone"') {
            yourScore += 2;
        } else if (reason == 'code-ai') {
            yourScore += 3;
        }            
        yourScore=yourScore+standoffDistance/10
        if (walabotPosition=='upper'){
            yourScore=yourScore+0.5;}    
    }
    if (isBehindWall === "yes" && missDistance >= MISS_DISTANCE_THRESHOLD) {
        console.log('MISS PENALTY');
        RFLAG=0;
        yourScore=-1;
    }

    function updateServerAndFetchScores(clientscore, currentPlayerId) {
        fetch('/update-scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score: clientscore,
                currentPlayerId: currentPlayerId,
            }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Updated Cumulative Score:', data.cumulativeScore);
            console.log('Updated Cumulative Rescues:', data.cumulativeRescues);
            let cumulativeRescues = data.cumulativeRescues;
            let cumulativeScore = data.cumulativeScore;
            let rescueCount = data.rescueCount; // Corrected from data.RescueCount to data.rescueCount
            let yourCumulativeScore = data.yourCumulativeScore;
            // Update game page display with these values
            document.getElementById('teamRescues').textContent = `Team Rescues: ${cumulativeRescues}`;
            document.getElementById('teamScore').textContent = `Team Score: ${cumulativeScore}`;            
            document.getElementById('yourRescues').textContent = `Your Rescues: ${rescueCount}`;
            document.getElementById('yourScore').textContent = `Your Score: ${yourCumulativeScore}`;
        })
        .catch(error => console.error('Error:', error));
    }
    // Example usage
//    var yourScore = -1; // Example score
//    var RFLAG = 1; // Example flag
    if (RFLAG== 1) {
        console.log('right before update scores',currentPlayerId)
        updateServerAndFetchScores(yourScore, currentPlayerId);
        alreadyUpdated=true;
        RFLAG=0;
        victimPlaced=false;
    }
//    let teamScore = 300;
    //post yourScore to server, add it to teamScore and then get TeamScore back        
            // Select each div by its id and update its textContent
        }
/* window.onload = function() {
    console.log('Page fully loaded');
    var flagElement = document.getElementById('flag');
    var SFLAG = flagElement.getAttribute('data-sflag');
    console.log('SFLAG:', SFLAG);

    // Your code here
};


 */

document.addEventListener('DOMContentLoaded', (event) => {
    // Attach the event listener to the document
    document.addEventListener('submit', function(e) {
        // Use closest to ensure we're acting on submissions from within "formContainer"
        const formContainer = e.target.closest('#formContainer');
        // Ensure the submission is from a form with id "answerForm"
        if (formContainer && e.target.id === 'answerForm') {
            e.preventDefault(); // Prevent the default form submission

 //           updateRescueCount(); // Call your existing function
            sendGameStateToServer(); // Make sure this function is defined elsewhere

            // Optionally, you can add any additional logic here
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired'); // Debugging line    
    var flagElement = document.getElementById('flag');
    var SFLAG = flagElement.getAttribute('data-sflag');
    console.log('SFLAG:', SFLAG);
    if (SFLAG == '1') {
        console.log('SFLAG=1 !!!!!!');
//        updateRescueCount();
        // Unset SFLAG by updating the data-sflag attribute
        flagElement.setAttribute('data-sflag', '0');
    }

if (SFLAG == '0') {
    console.log('SFLAG=0 !!!!!! from line 1063 client');
//    updateRescueCount();
    // Unset SFLAG by updating the data-sflag attribute
//    flagElement.setAttribute('data-sflag', '0');
}
}); 

function submitAnswer(isBehindWall) {
  fetch('/test-submit-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isBehindWall: isBehindWall }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      // Update the score panel with the new rescue count
      document.getElementById('scorePanel').textContent = `Rescue Count: ${data.rescueCount}`;
      rescueVictim();
    } else {
      console.log(data.message);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}
function rescueVictim() {
    console.log('Victim rescued!');
//    rescuedCount++;
  //  document.getElementById('rescued-count').textContent = `Rescued Victims: ${rescuedCount}`;	
	    // Move to the next location
    currentLocationIndex++;
    // Check if we've reached the end of the array
    if (currentLocationIndex >= rescueWallIndices.length) {
        currentLocationIndex = 0; // Reset to the first location or stop the cycle
    }	
   // placeVictimInWall();	
    eventState=5;  // rescue
    console.log('line 1035')
 sendGameStateToServer(); // Updated to call without arguments
 
    // Stop the sound
//    if (source) {
//        source.stop();
//    }
    // Increment rescue counter
//    rescueCounter++;
//    console.log('Rescued victims count:', rescueCounter);
}

function gatherGameState() {
    const player = players[currentPlayerId]; // Assuming currentPlayerId is the ID of the current player
    const currentTimeStamp = new Date().toISOString();
//    console.log("Current chatMessage:", chatMessage);

    const gameState = {
        currentPlayerId:currentPlayerId,
        username: username,
        isBehindWall: isBehindWall,
        reason: reason,
        standoffDistance: standoffDistance,
        walabotPosition: walabotPosition,
        rescueCount: rescueCount,
        yourCumulativeScore: yourCumulativeScore,
        cumulativeRescues: cumulativeRescues,
        cumulativeScore: cumulativeScore,
        currentLocationIndex: currentLocationIndex,
        remainingTime: remainingTime,
        eventState: eventState,
        chatMessage: chatMessage,
        currentTimeStamp: currentTimeStamp    };
    // Convert gameState object to JSON and send it to the server
    fetch('/savePlayerData', {
        method: 'POST', // Specify the method
        headers: {
          'Content-Type': 'application/json' // Specify the content type as JSON
        },
        body: JSON.stringify({
          currentPlayerId: 'currentPlayerId', // Assuming 'currentPlayerId' is a variable holding the current player's ID
          playerData: gameState // Use the gameState object directly as playerData
        }) // Convert the combined object to JSON string
      })
      .then(response => response.text()) // Convert the response to text
      .then(data => console.log(data)) // Log the response from the server
      .catch(error => console.error('Error:', error)); // Log any errors
      return gameState;
}

function sendGameStateToServer() {
    const gameState = gatherGameState();
    fetch('/save-game-state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(gameState)
    })
    .then(response => response.json())
    .then(data => console.log('Game state saved successfully:', data))
    .catch(error => console.error('Failed to send game state:', error));
}
function restoreServerGameState() {
    // Assuming 'currentPlayerId' is already defined somewhere in your script
    fetch(`/get-game-state?currentPlayerId=${encodeURIComponent(currentPlayerId)}`)
        .then(response => {
            if (!response.ok) {
                // Handle the case where there is no game state (e.g., server responds with 404)
                console.log('No game state found for this player. Initializing new game state...');
                initializeNewGameState(); // This function should initialize a new game state
                return null; // Prevent further processing in the promise chain
            }
            return response.json();
        })
        .then(gameState => {
            if (!gameState) {
                // No game state to process (handled in the previous step)
                return;
            }
            // Update global variables with the restored gameState
            currentPlayerId = gameState.currentPlayerId;
            username = gameState.username;
            isBehindWall = gameState.isBehindWall;
            reason = gameState.reason;
            standoffDistance = gameState.standoffDistance;
            walabotPosition = gameState.walabotPosition;
            rescueCount = gameState.rescueCount;
            yourCumulativeScore = gameState.yourCumulativeScore;
            cumulativeRescues = gameState.cumulativeRescues;
            cumulativeScore = gameState.cumulativeScore;
            currentLocationIndex = gameState.currentLocationIndex;
            remainingTime = gameState.remainingTime;
            eventState = gameState.eventState;
            chatMessage = gameState.chatMessage;
            currentTimeStamp = gameState.currentTimeStamp;
            console.log('GameState restored and global variables updated');
        })
        .catch(error => console.error('Error fetching gameState:', error));
}


function restoreGameState(gameState){
            // Update global variables with the restored gameState
            currentPlayerId = gameState.currentPlayerId;
            username = gameState.username;
            isBehindWall = gameState.isBehindWall;
            reason = gameState.reason;
            standoffDistance = gameState.standoffDistance;
            walabotPosition = gameState.walabotPosition;
            rescueCount = gameState.rescueCount;
            yourCumulativeScore = gameState.yourCumulativeScore;
            cumulativeRescues = gameState.cumulativeRescues;
            cumulativeScore = gameState.cumulativeScore;
            currentLocationIndex = gameState.currentLocationIndex;
            remainingTime = gameState.remainingTime;
            eventState = gameState.eventState;
            chatMessage = gameState.chatMessage;
            currentTimeStamp = gameState.currentTimeStamp;
    }
    
// Save game state to localStorage when the page is about to be unloaded
window.addEventListener('beforeunload', function(event) {
    const gameState = gatherGameState();
    localStorage.setItem('gameState', JSON.stringify(gameState));
});

// Restore game state from localStorage when the page is loaded
window.addEventListener('DOMContentLoaded', () => {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        getCurrentPlayerId();  // Retrieve currentPlayerId from local storage

//        restoreGameState(gameState);
    }
});

// If handling the back button specifically to restore state without reloading
 window.addEventListener('popstate', function(event) {
    event.preventDefault(); // Prevent the default back button behavior
//    restoreServerGameState(); // Load your game state
    getCurrentPlayerId();  // Retrieve currentPlayerId from local storage

});

 /* function restoreGameState(gameState) {
    // Assuming there's only one player and his state is directly accessible
    const savedPlayer = gameState.player;
    const player = players[savedPlayer.id]; // Assuming 'players' is still used to store the player object

    if (player) {
        player.position.x = savedPlayer.position.x;
        player.position.y = savedPlayer.position.y;
        player.position.z = savedPlayer.position.z;
        player.direction.x = savedPlayer.direction.x;
        player.direction.y = savedPlayer.direction.y;
        player.direction.z = savedPlayer.direction.z;
        // You might also need to update the visual or game object if applicable
    }

    // Restore other game-related states
    rescuedCount = gameState.rescuedCount;
    currentLocationIndex = gameState.currentLocationIndex;
    victimObject.position.x = gameState.victimPosition.x;
    victimObject.position.y = gameState.victimPosition.y;
    victimObject.position.z = gameState.victimPosition.z;
    remainingTime = gameState.timer; // Restore remaining timer time

    // Update UI elements with the restored state
    document.getElementById('timer').textContent = formatTime(remainingTime);
 //   document.getElementById('rescued-count').textContent = `Rescued Victims: ${rescuedCount}`;

    // If your game scene or visuals depend on this state, ensure they are updated accordingly
    renderer.render(scene, camera);
}
window.sendGameStateToServer=sendGameStateToServer;
window.updateRescueCount=updateRescueCount;

 *//* 	fetch('/set-miss-distance', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ missDistance: missDistance })
	}).then(response => response.json())
	  .then(data => console.log('Success:', data))
	  .catch((error) => console.error('Error:', error));
 */
 /*    let teamRescues=0;
    // You can now use data.decision and data.MISS_DISTANCE_THRESHOLD as needed
    document.addEventListener('DOMContentLoaded', function() {
        fetch('/get-rescue-count')
          .then(response => response.json())
          .then(data => {
            teamRescues = data.rescueCount;
            console.log('Team Rescue Count:', data.rescueCount);
          }); // Corrected syntax here
    }); */
