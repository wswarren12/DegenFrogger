// Game canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const startButton = document.getElementById('startButton');

// Game dimensions
const GRID_SIZE = 40;
const ROWS = 15;
const COLS = 17;
const WIDTH = COLS * GRID_SIZE;
const HEIGHT = ROWS * GRID_SIZE;

// Set canvas dimensions
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Game state variables
let lives = 3;
let score = 0;
let level = 1;
let gameActive = false;
let gameOver = false;
let gameWon = false;
// Speed modifier (0.25 = 75% slower than original)
const SPEED_MODIFIER = 0.20;
// Celebration animation variables
let celebrating = false;
let celebrationTime = 0;
let celebrationParticles = [];
let showNextLevelButton = false;
// Water animation
let waterAnimTime = 0;

// Frog position and properties
const frog = {
    x: Math.floor(COLS / 2) * GRID_SIZE,
    y: (ROWS - 1) * GRID_SIZE,
    width: GRID_SIZE,
    height: GRID_SIZE,
    speed: GRID_SIZE,
    jumping: false,
    jumpProgress: 0,
    jumpHeight: GRID_SIZE / 4,
    direction: 'up'
};

// Game areas
const areas = {
    finish: { startRow: 0, endRow: 0 },
    water: { startRow: 1, endRow: 5 },
    safe: { startRow: 6, endRow: 6 },
    road: { startRow: 7, endRow: 12 },
    start: { startRow: 13, endRow: 14 }
};

// Arrays for obstacles and platforms
let vehicles = [];
let logs = [];
let lilypads = [];
let homePositions = [];

// Game colors
const colors = {
    water: '#000080',
    road: '#303030',
    safe: '#00480f',
    grass: '#006400',
    frog: '#00ff00'
};

// Image assets
const images = {
    pepe: new Image(),
    red_lamb: new Image(),
    doge: new Image(),
    yellow_lambo: new Image(),
    rug: new Image(),
    chad: new Image()
};

// Track image loading
let loadedImages = 0;
const totalImages = Object.keys(images).length;

function loadImages(callback) {
    function onImageLoad() {
        loadedImages++;
        if (loadedImages === totalImages) {
            callback();
        }
    }

    // Set source and add load event for each image
    images.pepe.onload = onImageLoad;
    images.red_lamb.onload = onImageLoad;
    images.doge.onload = onImageLoad;
    images.yellow_lambo.onload = onImageLoad;
    images.rug.onload = onImageLoad;
    images.chad.onload = onImageLoad;

    // Set the paths to your PNG files
    images.pepe.src = 'assets/pepe.png';
    images.red_lamb.src = 'assets/red_lamb.png';
    images.doge.src = 'assets/doge.png';
    images.yellow_lambo.src = 'assets/yellow_lambo.png';
    images.rug.src = 'assets/rug.png';
    images.chad.src = 'assets/chad.png';
}

// Collision detection
function checkCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

// Add leaderboard variables
let playerName = '';
let leaderboard = [];
const MAX_LEADERBOARD_ENTRIES = 10;

// Get DOM elements
const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerName');
const submitNameButton = document.getElementById('submitName');
const leaderboardModal = document.getElementById('leaderboard');
const leaderboardList = document.getElementById('leaderboardList');
const closeLeaderboardButton = document.getElementById('closeLeaderboard');

// Load leaderboard from localStorage
function loadLeaderboard() {
    const savedLeaderboard = localStorage.getItem('degenFroggerLeaderboard');
    if (savedLeaderboard) {
        leaderboard = JSON.parse(savedLeaderboard);
    }
}

// Save leaderboard to localStorage
function saveLeaderboard() {
    localStorage.setItem('degenFroggerLeaderboard', JSON.stringify(leaderboard));
}

// Add score to leaderboard
function addToLeaderboard(name, score) {
    leaderboard.push({ name, score });
    leaderboard.sort((a, b) => b.score - a.score);
    if (leaderboard.length > MAX_LEADERBOARD_ENTRIES) {
        leaderboard = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
    }
    saveLeaderboard();
}

// Display leaderboard
function displayLeaderboard() {
    leaderboardList.innerHTML = '';
    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${entry.name} - ${entry.score}`;
        leaderboardList.appendChild(li);
    });
    leaderboardModal.style.display = 'block';
}

// Initialize game objects
function initializeGame() {
    // Reset game state
    lives = 3;
    score = 0;
    level = 1;
    gameOver = false;
    gameWon = false;
    gameActive = true;
    celebrating = false;
    celebrationTime = 0;
    celebrationParticles = [];
    
    // Update displays
    livesDisplay.textContent = lives;
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    
    // Reset frog position
    resetFrog();
    
    // Initialize obstacles based on level
    initializeObstacles();
    
    // Initialize home positions
    initializeHomePositions();
}

// Reset frog to starting position
function resetFrog() {
    frog.x = Math.floor(COLS / 2) * GRID_SIZE;
    frog.y = (ROWS - 1) * GRID_SIZE;
    frog.jumping = false;
    frog.jumpProgress = 0;
    frog.direction = 'up';
}

// Initialize obstacles (vehicles and logs)
function initializeObstacles() {
    vehicles = [];
    logs = [];
    
    // Calculate speed multiplier based on level (10% increase per level)
    const speedMultiplier = 1 + ((level - 1) * 0.1);
    
    // Vehicle rows (bottom to top)
    const vehicleRows = [
        { row: 12, speed: 1.5 * speedMultiplier, interval: 6, type: 'truck', length: 1, direction: 1 },
        { row: 11, speed: 0.8 * speedMultiplier, interval: 2, type: 'car', length: 1, direction: -1 },
        { row: 10, speed: 1.2 * speedMultiplier, interval: 2.5, type: 'truck', length: 1, direction: 1 },
        { row: 9, speed: 1.0 * speedMultiplier, interval: 1.5, type: 'car', length: 1, direction: -1 },
        { row: 8, speed: 0.7 * speedMultiplier, interval: 2, type: 'car', length: 1, direction: 1 },
        { row: 7, speed: 1.3 * speedMultiplier, interval: 3, type: 'truck', length: 1, direction: -1 }
    ];
    
    // Log rows (bottom to top)
    const logRows = [
        { row: 5, speed: 0.5 * speedMultiplier, interval: 3, length: 3, direction: -1 },
        { row: 4, speed: 0.7 * speedMultiplier, interval: 2.5, length: 4, direction: 1 },
        { row: 3, speed: 0.6 * speedMultiplier, interval: 3.5, length: 2, direction: -1 },
        { row: 2, speed: 0.8 * speedMultiplier, interval: 3, length: 3, direction: 1 },
        { row: 1, speed: 0.5 * speedMultiplier, interval: 2, length: 2, direction: -1 }
    ];
    
    // Create vehicles
    for (const rowConfig of vehicleRows) {
        // For the bottom row (row 12), we'll manually position obstacles across the wider area
        if (rowConfig.row === 12) {
            // Create three trucks instead of two, spread across the wider area with guaranteed spacing
            vehicles.push({
                x: 1 * GRID_SIZE,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
            
            vehicles.push({
                x: 5 * GRID_SIZE,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
            
            vehicles.push({
                x: 13 * GRID_SIZE,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
        } 
        // For the third row from the bottom (row 10), distribute trucks more evenly across wider area
        else if (rowConfig.row === 10) {
            const firstX = 4 * GRID_SIZE;
            // Create trucks with a wider gap in the middle and extend to new width with guaranteed spacing
            vehicles.push({
                x: firstX,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
            
            // Ensure spacing of at least GRID_SIZE + vehicle width from the first vehicle
            const secondX = 4 * GRID_SIZE; // Ensures 1 grid space between vehicles
            vehicles.push({
                x: secondX,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
            
            // Ensure spacing from second vehicle
            const thirdX = secondX + GRID_SIZE * (rowConfig.length + 4); // 4 grid spaces after second vehicle
            vehicles.push({
                x: thirdX,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
            
            // Ensure spacing from third vehicle
            const fourthX = thirdX + GRID_SIZE * (rowConfig.length + 3);
            vehicles.push({
                x: fourthX,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                type: rowConfig.type
            });
        }
        else {
            // Use a different approach for other rows: manually calculate positions with fixed spacing
            let positions = [];
            
            // Start with default spacing based on grid size
            const minimumSpacing = GRID_SIZE; // 1 full grid between vehicles
            
            if (rowConfig.row === 11) {  // Row with red Ferrari-style cars
                // Manually place cars with exact spacing - 25% fewer cars
                let curX = 0;
                // Reduced from 8 to 6 cars (25% reduction)
                for (let i = 0; i < 5; i++) {
                    positions.push(curX);
                    // Increased spacing between cars
                    curX += (rowConfig.length + 3) * GRID_SIZE; // 3 grid spaces between instead of 2
                }
            } 
            else if (rowConfig.row === 8) {  // Row with yellow cars
                // Manually place cars with exact spacing - reduced count and increased spacing
                let curX = 0;
                const yellowCarCount = 4; // Further reduced from 6 to 4 cars
                for (let i = 0; i < yellowCarCount; i++) {
                    positions.push(curX);
                    // Much more spacing between cars to prevent any overlap
                    curX += (rowConfig.length + 4) * GRID_SIZE; // Increased to 4 grid spaces between cars
                }
            }
            else if (rowConfig.row === 7) { // Row with purple trucks
                // Very few trucks with lots of space
                let curX = 0;
                const purpleCarCount = 2; // Reduced to just 2 trucks
                for (let i = 0; i < purpleCarCount; i++) {
                    positions.push(curX);
                    // Massive spacing between trucks
                    curX += (rowConfig.length + 6) * GRID_SIZE; // Increased to 6 grid spaces between trucks
                }
            }
            else {
                // Other rows: regular spacing but ensure no touching
                let curX = 0;
                // Calculate how many will fit with guaranteed spacing
                const vehiclesPossible = Math.floor(WIDTH / ((rowConfig.length + 2) * GRID_SIZE)); // Increased minimum spacing
                
                for (let i = 0; i < vehiclesPossible; i++) {
                    positions.push(curX);
                    // Move pointer with guaranteed spacing
                    curX += (rowConfig.length + 2) * GRID_SIZE; // Increased to 2 full grid spaces between
                }
            }
            
            // Apply direction (negative direction will be handled by the speed)
            if (rowConfig.direction < 0) {
                positions = positions.map(pos => WIDTH - pos - rowConfig.length * GRID_SIZE);
            }
            
            // Create vehicles with calculated positions
            for (const pos of positions) {
                vehicles.push({
                    x: pos,
                    y: rowConfig.row * GRID_SIZE,
                    width: GRID_SIZE * rowConfig.length,
                    height: GRID_SIZE,
                    speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER,
                    type: rowConfig.type
                });
            }
        }
    }
    
    // Create logs with guaranteed spacing
    for (const rowConfig of logRows) {
        let positions = [];
        
        // Calculate exact positions with guaranteed spacing
        let curX = 0;
        
        // Calculate how many logs will fit with guaranteed minimum spacing
        const minimumSpacing = GRID_SIZE; // 1 grid exactly between logs
        const logWithSpacing = rowConfig.length * GRID_SIZE + minimumSpacing;
        const logsInRow = Math.floor(WIDTH / logWithSpacing) - 1; // One less to ensure extra space
        
        for (let i = 0; i < logsInRow; i++) {
            positions.push(curX);
            // Move pointer by log length plus guaranteed spacing
            curX += (rowConfig.length + 2) * GRID_SIZE; // 2 grid space between
        }
        
        // Rows 4 and 5 need special handling - reduce logs even further
        if (rowConfig.row === 5 || rowConfig.row === 4) {
            // Keep every other log for these rows
            positions = positions.filter((_, index) => index % 2 === 0);
            
            // Add even more space
            positions = positions.map((pos, index) => pos + index * GRID_SIZE * 2);
        }
        
        // Adjust positions for direction
        if (rowConfig.direction < 0) {
            positions = positions.map(pos => WIDTH - pos - rowConfig.length * GRID_SIZE);
        }
        
        // Create logs with calculated positions
        for (const pos of positions) {
            logs.push({
                x: pos,
                y: rowConfig.row * GRID_SIZE,
                width: GRID_SIZE * rowConfig.length,
                height: GRID_SIZE,
                speed: rowConfig.speed * (level * 0.2 + 0.8) * rowConfig.direction * SPEED_MODIFIER
            });
        }
    }
}

// Initialize home positions (lilypads)
function initializeHomePositions() {
    homePositions = [];
    lilypads = [];
    
    // Create 6 home positions in the top row (previously 5, now increased to fill wider area)
    const spacing = WIDTH / 6;
    for (let i = 0; i < 6; i++) {
        const x = spacing/2 + i * spacing - GRID_SIZE/2;
        homePositions.push({
            x: x,
            y: 0,
            width: GRID_SIZE,
            height: GRID_SIZE,
            filled: false
        });
        
        // Add lily pads
        lilypads.push({
            x: x,
            y: 0,
            width: GRID_SIZE,
            height: GRID_SIZE
        });
    }
}

// Draw game background
function drawBackground() {
    // Draw water area
    ctx.fillStyle = colors.water;
    ctx.fillRect(0, areas.water.startRow * GRID_SIZE, WIDTH, (areas.water.endRow - areas.water.startRow + 1) * GRID_SIZE);
    
    // Add animated water ripples
    waterAnimTime += 0.05;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Create horizontal ripple waves
    for (let row = areas.water.startRow; row <= areas.water.endRow; row++) {
        // Skip every other row for better visual effect
        if ((row - areas.water.startRow) % 2 === 0) continue;
        
        for (let i = 0; i < WIDTH; i += GRID_SIZE) {
            // Calculate wave offset using sine function for animation
            const offset = Math.sin(waterAnimTime + i * 0.05) * 3;
            
            ctx.beginPath();
            ctx.moveTo(i, row * GRID_SIZE + offset);
            ctx.lineTo(i + GRID_SIZE * 0.7, row * GRID_SIZE + offset);
            ctx.stroke();
        }
    }
    
    // Draw safe zone
    ctx.fillStyle = colors.safe;
    ctx.fillRect(0, areas.safe.startRow * GRID_SIZE, WIDTH, GRID_SIZE);
    
    // Draw road
    ctx.fillStyle = colors.road;
    ctx.fillRect(0, areas.road.startRow * GRID_SIZE, WIDTH, (areas.road.endRow - areas.road.startRow + 1) * GRID_SIZE);
    
    // Add road markings
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([GRID_SIZE * 0.5, GRID_SIZE * 0.3]);
    
    // Draw dashed line down the middle of the road
    const middleRoadRow = Math.floor((areas.road.startRow + areas.road.endRow) / 2);
    ctx.beginPath();
    ctx.moveTo(0, middleRoadRow * GRID_SIZE + GRID_SIZE / 2);
    ctx.lineTo(WIDTH, middleRoadRow * GRID_SIZE + GRID_SIZE / 2);
    ctx.stroke();
    
    // Reset dash style
    ctx.setLineDash([]);
    
    // Draw start area
    ctx.fillStyle = colors.grass;
    ctx.fillRect(0, areas.start.startRow * GRID_SIZE, WIDTH, (areas.start.endRow - areas.start.startRow + 1) * GRID_SIZE);
    
    // Add grass details
    for (let x = 0; x < WIDTH; x += GRID_SIZE * 0.5) {
        for (let y = areas.start.startRow; y <= areas.start.endRow; y++) {
            if (Math.random() > 0.7) {
                ctx.fillStyle = '#004d00'; // Darker green for grass tufts
                ctx.fillRect(x + Math.random() * GRID_SIZE * 0.3, 
                          y * GRID_SIZE + Math.random() * GRID_SIZE * 0.7, 
                          GRID_SIZE * 0.1, GRID_SIZE * 0.2);
            }
        }
    }
    
    // Draw finish area
    ctx.fillStyle = colors.grass;
    ctx.fillRect(0, areas.finish.startRow * GRID_SIZE, WIDTH, GRID_SIZE);
    
    // Add finish line details
    for (let x = 0; x < WIDTH; x += GRID_SIZE) {
        if (x % (GRID_SIZE * 2) === 0) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x, areas.finish.startRow * GRID_SIZE + GRID_SIZE * 0.8, GRID_SIZE, GRID_SIZE * 0.2);
        }
    }
    
    // Draw grid lines for retro feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, HEIGHT);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(WIDTH, i * GRID_SIZE);
        ctx.stroke();
    }
}

// Draw lily pads
function drawLilyPads() {
    for (const pad of lilypads) {
        // Draw chad image for each lily pad position
        ctx.drawImage(images.chad, 
            pad.x, pad.y,
            pad.width, pad.height);
    }
    
    // Draw frogs in filled home positions
    for (const home of homePositions) {
        if (home.filled) {
            drawFrogAt(home.x, home.y, 'up', colors.frog);
        }
    }
}

// Draw vehicles
function drawVehicles() {
    for (const vehicle of vehicles) {
        // Save context for rotation if needed
        ctx.save();
        
        // Get direction
        const isMovingRight = vehicle.speed > 0;
        
        // Determine which image to use based on row
        let vehicleImage;
        const row = Math.floor(vehicle.y / GRID_SIZE);
        
        switch(row) {
            case 11: // Red cars row
                vehicleImage = images.red_lamb;
                break;
            case 10: // Yellow cars row
                vehicleImage = images.doge;
                break;
            case 9: // Blue cars row
                vehicleImage = images.red_lamb;
                break;
            case 8: // Yellow cars row
                vehicleImage = images.doge;
                break;
            case 7: // Purple cars row
                vehicleImage = images.doge;
                break;
            default: // Orange cars and others
                vehicleImage = images.yellow_lambo;
        }
        
        // If moving left, flip the image
        if (!isMovingRight) {
            ctx.translate(vehicle.x + vehicle.width, vehicle.y);
            ctx.scale(-1, 1);
            ctx.drawImage(vehicleImage, 
                0, 0,
                vehicle.width, vehicle.height);
        } else {
            ctx.drawImage(vehicleImage, 
                vehicle.x, vehicle.y,
                vehicle.width, vehicle.height);
        }
        
        ctx.restore();
    }
}

// Draw logs
function drawLogs() {
    for (const log of logs) {
        // Draw the rug image
        ctx.drawImage(images.rug,
            log.x, log.y,
            log.width, log.height);
        
        // Add water ripple effect around the rug
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        // Draw ripples at front and back
        const frontX = (log.speed > 0) ? log.x + log.width + 5 : log.x - 5;
        const rippleWidth = 8;
        
        // Front ripple
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(frontX, log.y + GRID_SIZE * 0.2 + i * GRID_SIZE * 0.3);
            ctx.lineTo(frontX + rippleWidth, log.y + GRID_SIZE * 0.2 + i * GRID_SIZE * 0.3);
            ctx.stroke();
        }
        
        // Back ripple
        const backX = (log.speed > 0) ? log.x - 5 : log.x + log.width + 5;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(backX, log.y + GRID_SIZE * 0.2 + i * GRID_SIZE * 0.3);
            ctx.lineTo(backX - rippleWidth, log.y + GRID_SIZE * 0.2 + i * GRID_SIZE * 0.3);
            ctx.stroke();
        }
    }
}

// Draw frog at specified position
function drawFrogAt(x, y, direction, color) {
    // Calculate rotation angle based on direction
    let rotation = 0;
    switch(direction) {
        case 'up': rotation = 0; break;
        case 'right': rotation = Math.PI / 2; break;
        case 'down': rotation = Math.PI; break;
        case 'left': rotation = -Math.PI / 2; break;
    }

    // Save the current context state
    ctx.save();
    
    // Move to the center of where we want to draw the frog
    ctx.translate(x + GRID_SIZE/2, y + GRID_SIZE/2);
    
    // Rotate the context
    ctx.rotate(rotation);
    
    // Draw the pepe image centered
    ctx.drawImage(images.pepe, 
        -GRID_SIZE/2, -GRID_SIZE/2,  // Draw centered
        GRID_SIZE, GRID_SIZE);       // Maintain grid size
    
    // Restore the context state
    ctx.restore();
}

// Draw the frog with jump animation if needed
function drawFrog() {
    let displayY = frog.y;
    
    // Apply jump animation
    if (frog.jumping) {
        // Calculate jump height using sine wave (0 to 1 to 0 over the jump)
        const jumpFactor = Math.sin(frog.jumpProgress * Math.PI);
        displayY = frog.y - jumpFactor * frog.jumpHeight;
    }
    
    drawFrogAt(frog.x, displayY, frog.direction, colors.frog);
}

// Update frog position and handle game logic
function updateFrog() {
    // Update jump animation
    if (frog.jumping) {
        frog.jumpProgress += 0.1;
        if (frog.jumpProgress >= 1) {
            frog.jumping = false;
            frog.jumpProgress = 0;
        }
    }
    
    // Check if frog is on a log (in water)
    let onLog = false;
    if (frog.y / GRID_SIZE >= areas.water.startRow && frog.y / GRID_SIZE <= areas.water.endRow) {
        for (const log of logs) {
            if (checkCollision(frog, log)) {
                frog.x += log.speed;
                onLog = true;
                break;
            }
        }
        
        // If in water but not on a log, frog drowns
        if (!onLog) {
            loseLife('water');
            return;
        }
    }
    
    // Check for vehicle collisions
    for (const vehicle of vehicles) {
        if (checkCollision(frog, vehicle)) {
            loseLife('vehicle');
            return;
        }
    }
    
    // Check boundaries
    if (frog.x < 0) {
        frog.x = 0;
    } else if (frog.x > WIDTH - GRID_SIZE) {
        frog.x = WIDTH - GRID_SIZE;
    }
    
    // Check if frog reached a home position
    if (frog.y === 0) {
        let reachedHome = false;
        
        for (const home of homePositions) {
            if (!home.filled && 
                frog.x >= home.x - GRID_SIZE/2 && 
                frog.x <= home.x + GRID_SIZE/2) {
                
                home.filled = true;
                reachedHome = true;
                
                // Add points for reaching a home
                score += 50 + Math.floor(level * 10);
                scoreDisplay.textContent = score;
                
                // Check if all homes are filled
                if (homePositions.every(h => h.filled)) {
                    // Game is won!
                    gameWon = true;
                } else {
                    // Just show Safu modal
                    celebrating = true;
                    celebrationTime = 0;
                }
                
                // Increment level and increase speed
                level++;
                levelDisplay.textContent = level;
                
                // Reinitialize obstacles with increased speed
                initializeObstacles();
                
                // Reset frog position
                resetFrog();
                break;
            }
        }
        
        // If no valid home found, lose a life
        if (!reachedHome) {
            loseLife('boundary');
        }
    }
}

// Update all game objects
function updateGameObjects() {
    // Update vehicles
    for (const vehicle of vehicles) {
        vehicle.x += vehicle.speed;
        
        // Wrap around screen
        if (vehicle.speed > 0 && vehicle.x > WIDTH) {
            vehicle.x = -vehicle.width;
        } else if (vehicle.speed < 0 && vehicle.x + vehicle.width < 0) {
            vehicle.x = WIDTH;
        }
    }
    
    // Update logs
    for (const log of logs) {
        log.x += log.speed;
        
        // Wrap around screen
        if (log.speed > 0 && log.x > WIDTH) {
            log.x = -log.width;
        } else if (log.speed < 0 && log.x + log.width < 0) {
            log.x = WIDTH;
        }
    }
}

// Handle level completion
function levelUp() {
    // Start celebration
    celebrating = true;
    celebrationTime = 0;
    celebrationParticles = [];
    showNextLevelButton = false;
    
    // Generate initial celebration particles
    generateCelebrationParticles();
    
    // Increment level
    level++;
    levelDisplay.textContent = level;
    
    // Bonus points for completing level
    score += 100 * level;
    scoreDisplay.textContent = score;
}

// Continue to next level
function continueToNextLevel() {
    // Reset celebration state
    celebrating = false;
    celebrationTime = 0;
    celebrationParticles = [];
    showNextLevelButton = false;
    
    // Reset home positions
    for (const home of homePositions) {
        home.filled = false;
    }
    
    // Reset frog
    resetFrog();
    
    // Reinitialize obstacles with increased difficulty
    initializeObstacles();
}

// Handle losing a life
function loseLife(cause) {
    lives--;
    livesDisplay.textContent = lives;
    
    if (lives <= 0) {
        endGame();
    } else {
        resetFrog();
    }
}

// Game over
function endGame() {
    gameActive = false;
    gameOver = true;
    addToLeaderboard(playerName, score);
    setTimeout(() => {
        displayLeaderboard();
    }, 2000); // Show leaderboard 2 seconds after game over
}

// Draw game over screen
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    ctx.fillStyle = '#ff0000';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('YOU GOT REKT', WIDTH/2, HEIGHT/2 - 40);
    
    ctx.fillStyle = '#ffff00';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText(`SCORE: ${score}`, WIDTH/2, HEIGHT/2 + 20);
    
    ctx.fillStyle = '#0f0';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillText('PRESS START TO PLAY AGAIN', WIDTH/2, HEIGHT/2 + 80);
}

// Create a celebration particle
function createParticle(x, y) {
    return {
        x: x,
        y: y,
        size: Math.random() * 10 + 5,
        color: ['#ff0', '#0f0', '#0ff', '#f0f', '#f00', '#00f'][Math.floor(Math.random() * 6)],
        speedX: (Math.random() - 0.5) * 8,
        speedY: (Math.random() - 0.5) * 8,
        life: 100 + Math.random() * 50
    };
}

// Generate celebration particles
function generateCelebrationParticles() {
    // Generate particles over the entire top row
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * WIDTH;
        const y = Math.random() * (GRID_SIZE * 3);
        celebrationParticles.push(createParticle(x, y));
    }
}

// Update celebration particles
function updateCelebrationParticles() {
    for (let i = celebrationParticles.length - 1; i >= 0; i--) {
        const particle = celebrationParticles[i];
        
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Reduce life
        particle.life -= 1;
        
        // Remove dead particles
        if (particle.life <= 0) {
            celebrationParticles.splice(i, 1);
        }
    }
    
    // Add more particles if needed during celebration
    if (celebrationTime < 100 && celebrationParticles.length < 50) {
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * WIDTH;
            const y = Math.random() * (GRID_SIZE * 3);
            celebrationParticles.push(createParticle(x, y));
        }
    }
}

// Draw celebration particles
function drawCelebrationParticles() {
    for (const particle of celebrationParticles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 150; // Fade out as life decreases
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1; // Reset alpha
}

// Draw level complete celebration
function drawLevelComplete() {
    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Draw celebration message
    ctx.fillStyle = '#00ff00';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('SAFU', WIDTH/2, HEIGHT/2 - 40);
    
    // Draw next level button
    const buttonWidth = 220;
    const buttonHeight = 50;
    const buttonX = WIDTH/2 - buttonWidth/2;
    const buttonY = HEIGHT/2 + 20;
    
    // Draw button background
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Draw button text
    ctx.fillStyle = '#000';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('NEXT LEVEL', WIDTH/2, buttonY + 33);
    
    // Store button position and dimensions for click handling
    window.nextLevelButton = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
}

// Draw win screen
function drawWinScreen() {
    // Add score to leaderboard before showing win screen
    addToLeaderboard(playerName, score);
    
    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Draw win message
    ctx.fillStyle = '#00ff00';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WON', WIDTH/2, HEIGHT/2 - 40);
    
    // Draw score
    ctx.fillStyle = '#ffff00';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText(`FINAL SCORE: ${score}`, WIDTH/2, HEIGHT/2 + 20);
    
    // Draw restart button
    const buttonWidth = 220;
    const buttonHeight = 50;
    const buttonX = WIDTH/2 - buttonWidth/2;
    const buttonY = HEIGHT/2 + 60;
    
    // Draw button background
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Draw button text
    ctx.fillStyle = '#000';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('PLAY AGAIN', WIDTH/2, buttonY + 33);
    
    // Store button position and dimensions for click handling
    window.restartButton = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
    
    // Show leaderboard after a short delay
    setTimeout(() => {
        displayLeaderboard();
    }, 2000);
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Draw background
    drawBackground();
    
    // Draw game objects
    drawLilyPads();
    drawLogs();
    drawVehicles();
    
    if (gameActive && !gameOver) {
        if (gameWon) {
            drawWinScreen();
        } else if (celebrating) {
            drawLevelComplete();
        } else {
            // Normal game updates
            updateGameObjects();
            updateFrog();
            drawFrog();
        }
    } else if (gameOver) {
        drawGameOver();
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Handle keyboard input
function handleKeyDown(e) {
    if (!gameActive || gameOver) return;
    
    // Prevent default behavior (scrolling) for arrow keys
    if ([37, 38, 39, 40].includes(e.keyCode)) {
        e.preventDefault();
    }
    
    // Only move if not currently jumping
    if (!frog.jumping) {
        switch (e.keyCode) {
            case 37: // Left
                frog.x -= frog.speed;
                frog.direction = 'left';
                frog.jumping = true;
                break;
            case 38: // Up
                frog.y -= frog.speed;
                frog.direction = 'up';
                frog.jumping = true;
                break;
            case 39: // Right
                frog.x += frog.speed;
                frog.direction = 'right';
                frog.jumping = true;
                break;
            case 40: // Down
                // Don't move down if at the bottom
                if (frog.y < (ROWS - 1) * GRID_SIZE) {
                    frog.y += frog.speed;
                    frog.direction = 'down';
                    frog.jumping = true;
                }
                break;
        }
    }
}

// Start the game
function startGame() {
    nameModal.style.display = 'block';
    playerNameInput.focus();
}

// Event listeners
window.addEventListener('keydown', handleKeyDown);
startButton.addEventListener('click', () => {
    startGame();
});

// Update click handler to handle both next level and restart buttons
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (celebrating && window.nextLevelButton) {
        const btn = window.nextLevelButton;
        if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
            mouseY >= btn.y && mouseY <= btn.y + btn.height) {
            celebrating = false;
            celebrationTime = 0;
        }
    } else if (gameWon && window.restartButton) {
        const btn = window.restartButton;
        if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
            mouseY >= btn.y && mouseY <= btn.y + btn.height) {
            // Reset everything for a new game
            gameWon = false;
            startGame();
        }
    }
});

// Event listeners
submitNameButton.addEventListener('click', () => {
    playerName = playerNameInput.value.toUpperCase();
    if (playerName.length > 0) {
        nameModal.style.display = 'none';
        initializeGame();
    }
});

closeLeaderboardButton.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
});

playerNameInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Initialize the game for the first time
function initGame() {
    loadImages(() => {
        // Initialize game objects but don't start yet
        initializeHomePositions();
        initializeObstacles();
        gameLoop();
    });
}

// Initialize the game loop but don't start game yet
initGame(); 