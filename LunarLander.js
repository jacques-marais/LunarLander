"use strict";

// Get the canvas element for the terrain - and then the drawing context.
// The startGame() function will draw onto this canvas. After that, for the remainder
// of the level, this canvas will not be cleared/updated because it just contains the
// terrain. When a new level starts, this canvas will be updated.
let canvas1 = document.getElementById("canvas1");
let ctx1 = canvas1.getContext("2d");

// Get canvas element for the lunar lander - and then the drawing context.
// This canvas will be updated very frequently to show the animations in the game.
let canvas2 = document.getElementById("canvas2");
let ctx2 = canvas2.getContext("2d");

// Tracks which introductory page you are currently on.
let introPageNumber = 0;

// The current level - for displaying the right terrain, etc.
let currentLevel = 0;

// The arrays that contain the terrain/platform information for the different levels.
// These are all 2D arrays.
let floorArrays = new Array();
let ceilingArrays = new Array();
let platformArrays = new Array();

// An array of starting positions (Points). There is a Point for each level. The lander
// starts in a different spot on each level, based on what is appropriate for the terrain.
let startPositionsArray = new Array();

// The building block for all acceleration (gravitational and thruster-related).
// Having this as a global variable makes movement-related adjustments easier.
let movementUnit = 0.001;

// This will contain the "Fuel Tank Size" from the range element on the HTML page.
// The lander's "fuelRemaining" variable will be set to this number at the beginning
// of each level.
let startFuelAmount;

// The time remaining on the timer. If the time runs out, the game ends.
let timeRemaining;

let movementInterval; // The main, most important interval. Handles movement/collisions.
let timerInterval; // The interval for the timer display.
let refuelingInterval; // The interval that runs when lander is on a gas station platform.

// This limits the frequency that thrust can be applied while keydown events fire.
let minTimeBetweenThrusts = 100;

// These variables keep track of the last time a thruster was fired in a particular
// direction. Helps to limit the frequency that thrust can be applied while keydown
// events fire.
let lastUpwardThrustTime;
let lastLeftwardThrustTime;
let lastRightwardThrustTime;

// The gravitational acceleration that will be applied to the lander's "dy" variable.
let gravitationalAcceleration = movementUnit * 20;

// The current sprite number to help get the right sprite from the sprite sheet.
let currentSpriteNum = 0;

// Create the lander. Note: I don't recreate the lander at the beginning of each level.
let lander = new Lander();

// When a collision has occurred, this Point helps to set the lander back to its position
// before the collision happened so that the lander is not displayed overtop of the
// terrain with which it collided. It can be removed, but it makes a bit of a difference.
let positionBeforeCollision = new Point(0, 0);

// This is the distance at which the "trick platforms" will start activating their spikes.
let trickDistance = canvas2.height * 0.10;

// Sound is on by default. Clicking the button on the HTML page can turn it on/off.
let soundOn = true;

// The audio object for playing all the sound effects.
let audio = new Audio();

// This variable helps me to play the thruster sound effects correctly. When a keydown
// event fires the first time (when keydownCount == 1), the thruster sound effect 
// begins playing on a loop. When the key is released, the audio stops and keydownCount
// is set to 0 again.
let keydownCount = 0;

// On-click event handler for pressing the "Next Page" button on the intro pages before
// starting the game. This handler is removed (set to null) when the last intro page is
// reached.
canvas2.onclick = handleClick;



/*
	Display the welcome page and then create the terrain-related arrays, including the
	height map arrays, the platform arrays, and the start positions for each level.
	
	This function is called once - using the "onload" event for the HTML page body.
*/
function setupGame()
{
	// Set to first level.
	currentLevel = 0;

	// Display the welcome page and the next page button.
	displayWelcomePage(); 
	displayNextButton();
	
	// Populate the height map array for each level.
	createHeightMapsLevel1();
	createHeightMapsLevel2();
	createHeightMapsLevel3();

	// Populate the platform array for each level.
	createPlatformsLevel1();
	createPlatformsLevel2();
	createPlatformsLevel3();
	
	// Populate the starting position array with a Point for each level.
	startPositionsArray.push(new Point(100, 100));
	startPositionsArray.push(new Point(20, 300));
	startPositionsArray.push(new Point(410, 20));
}


/*
	Get input from the HTML page.
*/
function getInputValues()
{	
	// Get the time from the radio buttons:
	let timerForm = document.forms[0];
	let chosenTime;
	
	for (let i = 0; i < timerForm.length; i++) {
		if (timerForm[i].checked)
			chosenTime = timerForm[i].value;
	}
	
	// Set the global variable to the chosenTime.
	timeRemaining = Number(chosenTime);
	
	// Get gravity option from the dropdown menu.
	let gravityDropdown = document.getElementById("gravityDropdown");
	let chosenGravity = gravityDropdown.value;
	
	// Set gravitational acceleration according to the selected option.
	if (chosenGravity == "Weak")
		gravitationalAcceleration = movementUnit * 13;
	else if (chosenGravity == "Normal")
		gravitationalAcceleration = movementUnit * 25;
	else
		gravitationalAcceleration = movementUnit * 35;
		
	// Get the value of the range element and set the starting fuel amount.
	let fuelTankRange = document.getElementById("fuelTankRange");
	startFuelAmount = Number(fuelTankRange.value);
}


/*
	This function is called every time the "Start Game!" button is pressed and also
	at the beginning of each new level.
	
	@param level - The level at which to start. If nothing entered, 0 is the default.
*/
function startGame(level = 0)
{
	// Clear onclick handler that was handling the "Next Page" button on the intro pages.
	canvas2.onclick = null;

	// Set level.
	currentLevel = level;

	// Draw landscape and platforms according to the current level.
	drawLandscape();
	drawPlatforms();	

	// Set the source file for the lander's image.
	lander.landerImage.src = lander.spriteFile;
	lander.landerImage.onload = drawLander; // Draw lander when image finishes loading.
	
	// Event listeners for thruster controls - keydown and keyup.
	addEventListener("keydown", handleKeyDownEvent);
	addEventListener("keyup", handleKeyUpEvent);
		
	// Get input from HTML page.
	getInputValues();
	
	// Play sound effect.
	playAudio("startGame");
	
	// Set lander's fuel amount.
	lander.fuelRemaining = startFuelAmount;
		
	// Set lander's position to start position for this level.
	lander.x = startPositionsArray[currentLevel].x;
	lander.y = startPositionsArray[currentLevel].y;
	
	// Set lander's dx and dy to zero.
	lander.dx = 0;
	lander.dy = 0;
	
	// Set all of the lander's booleans to false.
	lander.isLanded = false;
	lander.isRefueling = false;
	lander.isCrashed = false;
	lander.activeThrust = false;
		
	// Set lander to the first sprite.
	currentSpriteNum = 0;
	
	// Clear the intervals.
	clearInterval(movementInterval);
	clearInterval(timerInterval);
	clearInterval(refuelingInterval);
	refuelingInterval = undefined;
	
	// Set intervals for movement (very frequent) and the timer (every second).
	movementInterval = setInterval(runTheGame, 30);
	timerInterval = setInterval(decrementTimer, 1000);
	
	// These keep track of the time of the last thruster action, so set them to 0
	// because this is a new level and the thrusters haven't been fired yet.
	lastUpwardThrustTime = 0;
	lastLeftwardThrustTime = 0;
	lastRightwardThrustTime = 0;
}


/*
	This function is called when the player has successfully completed a level and
	needs to advance to the next level. It gives the player about a 5-second break 
	between levels.
*/
function startNextLevel()
{
	let secondsLeft = 5;
	
	// Draw the lander and the various displays.
	redraw();
	
	// Display message to notify how much time is left before next level starts.
	displayMessageInMiddle("Good job! Next level starting in " + secondsLeft);

	// Set the interval which will run for about 5 seconds.
	let interval = setInterval(function () {
		
		// Decrement the time.
		secondsLeft--;

		// Draw the lander and the various displays.
		redraw();
		
		// Display message to notify how much time is left before next level starts.
		displayMessageInMiddle("Good job! Next level starting in " + secondsLeft);
		
		// When the time runs out, clear the interval, advance to the next level,
		// and start the game.
		if (secondsLeft == 0) {
			clearInterval(interval);
			currentLevel++;
			startGame(currentLevel);
		}
	
	}, 1000);
}


/*
	This is the game "loop." It gets called many times per second by the movementInterval.
	This function applies gravity, moves the lander, draws the lander checks for 
	collisions and platform-related actions, and ends the game in certain situations.
*/
function runTheGame()
{	
	// Apply gravity as long as the lander is not currently on a gas station platform.
	if (!lander.isRefueling)
		applyGravity();
	
	// Move the lander according to the current dx and dy.
	move();

	// Check whether or not the lander has collided with the terrain.
	lander.isCrashed = isCollision();
	
	// If the lander has crashed, set its position to the last position before there was
	// a collision. This helps to prevent the lander from being displayed overtop of the
	// terrain with which it collided. I take the position before collision and do +1 in
	// whichever direction the lander was travelling. This method seems to work nicely to
	// prevent the lander from being displayed too far overtop of the terrain.
	if (lander.isCrashed) {
		lander.x = positionBeforeCollision.x + 1 * Math.sign(lander.dx);
		lander.y = positionBeforeCollision.y + 1 * Math.sign(lander.dy);
	}	
	
	// Clear the canvas and draw lander, fuel display, timer display, and level display.
	redraw();
	
	// Check platforms to determine whether the lander has:
	// 		- landed on a destination platform --> set lander.isLanded to true
	// 		- landed on a gas station platform --> refuel
	// 		- crashed into a trick platform's spikes --> set lander.isCrashed to true
	checkPlatforms();
	
		
	// If the lander is refueling and arrived with an acceptably low speed, this is a
	// successful landing on the gas station platform, so set the dx, dy to zero, change
	// the sprite display, and display a message. The "refuelingInterval" handles the
	// actual refueling because it has to happen on a slower timer.
	if (lander.isRefueling && lander.dy <= lander.terminalVelocityY / 3) {
	
		// Set dx and dy to zero so that lander doesn't move while on refueling platform
		lander.dx = 0;
		lander.dy = 0;
		
		// Set lander to the first sprite
		currentSpriteNum = 0;
		
		// Display message based on whether or not the fuel tank is full.
		if (lander.fuelRemaining == startFuelAmount)
			displayMessageInMiddle("Full tank!");
		else
			displayMessageInMiddle("Refueling...");
		
	// If the lander has landed on a "destination platform" with an acceptably low speed,
	// this is a successful landing, so we can advance to the next level (or end the game
	// if this was the last level).
	} else if (lander.isLanded && lander.dy <= lander.terminalVelocityY / 3) {
		
		// Clear the intervals and remove the event listeners.
		finishGame();
		
		// Set lander to the first sprite
		currentSpriteNum = 0;
		
		// Play sound effect
		playAudio("land");
		
		// If there are more levels, start the next one. If not, just display message.
		if (currentLevel < floorArrays.length - 1)
			startNextLevel();
		else
			displayMessageInMiddle("All levels complete!");
		
	// If the lander is marked as "isLanded" or "isRefueling" but its speed was too
	// fast, it crashes and the game ends. Also, if the lander is marked as "isCrashed"
	// because of terrain or spike collisions, crash and end the game.
	} else if (lander.isLanded || lander.isRefueling || lander.isCrashed) {
		crash();
		finishGame();
		
	// If the lander is out of bounds, end the game.
	} else if (isOutOfBounds()) {
		displayMessageInMiddle("You lost the lander!");
		playAudio("lostLander");
		finishGame();
	}
	
	// If we made it this far, the lander completed a normal move and the game hasn't
	// ended, so store the lander's current position as a good position to revert back
	// to - if there is a collision in the next iteration of this function.
	positionBeforeCollision.x = lander.x;
	positionBeforeCollision.y = lander.y;
}


/*
	Move the lander by dx and dy.
*/
function move()
{
	lander.x += lander.dx;
	lander.y += lander.dy;
}


/*
	Clear canvas2 and draw the lander, fuel display, timer display, and level display.
*/
function redraw()
{
	ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
	
	drawLander();
	updateFuelDisplay();
	updateTimerDisplay();
	updateLevelDisplay();
}


/*
	Plays crash sound effect and handles the explosion animation.
*/
function crash()
{	
	// Play sound effect.
	playAudio("crash");
	
	// Set dx and dy to zero so that the lander doesn't move in further redraws.
	lander.dx = 0;
	lander.dy = 0;
	
	// Start at first explosion sprite.
	currentSpriteNum = 11;
	
	// Get current time.
	let startTime = Date.now();
	
	// Set interval for sprite animation.
	let crashInterval = setInterval(function () {
		
		// Draw the lander.
		redraw();
		
		// call checkPlatforms() to ensure that the spikes on trick platform
		// stay where they were - if the lander crashed into the spikes.
		checkPlatforms();
		
		// If all the crash sprites have been displayed, clear the interval.
		if (Date.now() - startTime > 300)
			clearInterval(crashInterval);
		
		// Move to next sprite in crash sequence.
		currentSpriteNum++;	
		
		// Display message on canvas.
		displayMessageInMiddle("Crashed! Game Over.");
		
	}, 60);
}


/*
	Clear the game and timer interval and remove keyboard listeners.
*/
function finishGame()
{	
	lander.activeThrust = false;
	
	clearInterval(movementInterval);
	clearInterval(timerInterval);
	removeKeyboardListeners();
}


/*
	Applying upward thrust increases the lander's dy in the negative (upward) direction.
*/
function applyUpwardThrust()
{
	// Check the time since the last time thrust was applied.
	let timeSinceLastThrust = Date.now() - lastUpwardThrustTime;

	// If the time since the last thrust is over the minimum and fuel remains, go ahead
	// with applying thrust.
	if (timeSinceLastThrust > minTimeBetweenThrusts && lander.fuelRemaining > 0) {
	
		keydownCount++;
	
		// If this is the first keydown event, start playing the thrust audio loop.
		// If this is not the first keydown event, then that means the audio loop is
		// already playing, so don't start it again.
		if (keydownCount == 1)
			playAudio("thrust");

		// Get terminal velocity.
		let negativeTerminalVelocityY = -lander.terminalVelocityY;
	
		// If lander's current dy is less than terminal velocity, then apply thrust.
		if (lander.dy > negativeTerminalVelocityY)
			lander.dy -= lander.thrusterAcceleration;
			
		// If lander's current dy is great than or equal to terminal velocity, just keep
		// the dy at the terminal velocity.
		else
			lander.dy = negativeTerminalVelocityY;
		
		// Reduce fuel.
		lander.fuelRemaining -= lander.fuelDischargeRate;
		
		// Record the current time as the last time thrust was applied.
		lastUpwardThrustTime = Date.now();
		
		// If currentSpriteNum is not currently on one of the upward-thrust-related
		// sprites, then start at the first upward thrust sprite.
		if (currentSpriteNum < 1 || currentSpriteNum > 4)
			currentSpriteNum = 1;
			
		// Else if currentSpriteNum is already on one of the upward-sprite-related
		// sprites, then increment to the next sprite in the series.
		else
			currentSpriteNum++;
			
		// If, after incrementing to the next sprite, currentSpriteNum goes past the
		// index of the last upward-thrust-related sprite, then we must be operating
		// at maximum thrust, so set the sprite to the maximum upward thrust sprite.
		if (currentSpriteNum > 4)
			currentSpriteNum = 4;
	}
}


/*
	Applying leftward thrust increases the lander's dx in the negative (left) direction.
*/
function applyLeftwardThrust()
{
	// Check the time since the last time thrust was applied.
	let timeSinceLastThrust = Date.now() - lastLeftwardThrustTime;

	// If the time since the last thrust is over the minimum, there is fuel remaining, and
	// the lander is not currently on a gas station platform, go ahead and apply thrust.
	if (timeSinceLastThrust > minTimeBetweenThrusts && lander.fuelRemaining > 0 && 
		!lander.isRefueling) {
		
		keydownCount++;
		
		// If this is the first keydown event, start playing the thrust audio loop.
		// If this is not the first keydown event, then that means the audio loop is
		// already playing, so don't start it again.
		if (keydownCount == 1)
			playAudio("thrust");

		// Get terminal velocity.
		let negativeTerminalVelocityX = -lander.terminalVelocityX;

		// If lander's current dx is less than terminal velocity, then apply thrust.
		if (lander.dx > negativeTerminalVelocityX)
			lander.dx -= lander.thrusterAcceleration;
		
		// If lander's current dx is great than or equal to terminal velocity, just keep
		// the dx at the terminal velocity.
		else
			lander.dx = negativeTerminalVelocityX;
	
		// Reduce fuel.
		lander.fuelRemaining -= lander.fuelDischargeRate;
		
		// Record the current time as the last time thrust was applied.
		lastLeftwardThrustTime = Date.now();
		
		// If currentSpriteNum is not currently on one of the leftward-thrust-related
		// sprites, then start at the first leftward thrust sprite.
		if (currentSpriteNum < 5 || currentSpriteNum > 7)
			currentSpriteNum = 5;
			
		// Else if currentSpriteNum is already on one of the leftward-sprite-related
		// sprites, then increment to the next sprite in the series.
		else
			currentSpriteNum++;
			
		// If, after incrementing to the next sprite, currentSpriteNum goes past the
		// index of the last leftward-thrust-related sprite, then we must be operating
		// at maximum thrust, so set the sprite to the maximum leftward thrust sprite.
		if (currentSpriteNum > 7)
			currentSpriteNum = 7;
	}
}


/*
	Applying rightward thrust increases the lander's dx in the positive (right) direction.
*/
function applyRightwardThrust()
{
	// Check the time since the last time thrust was applied.
	let timeSinceLastThrust = Date.now() - lastRightwardThrustTime;

	// If the time since the last thrust is over the minimum, there is fuel remaining, and
	// the lander is not currently on a gas station platform, go ahead and apply thrust.
	if (timeSinceLastThrust > minTimeBetweenThrusts && lander.fuelRemaining > 0 && 
		!lander.isRefueling) {
		
		keydownCount++;
		
		// If this is the first keydown event, start playing the thrust audio loop.
		// If this is not the first keydown event, then that means the audio loop is
		// already playing, so don't start it again.
		if (keydownCount == 1)
			playAudio("thrust");

		// If lander's current dx is less than terminal velocity, then apply thrust.
		if (lander.dx < lander.terminalVelocityX)
			lander.dx += lander.thrusterAcceleration;
			
		// If lander's current dx is great than or equal to terminal velocity, just keep
		// the dx at the terminal velocity.
		else
			lander.dx = lander.terminalVelocityX;
	
		// Reduce fuel.
		lander.fuelRemaining -= lander.fuelDischargeRate;
		
		// Record the current time as the last time thrust was applied.
		lastRightwardThrustTime = Date.now();
		
		// If currentSpriteNum is not currently on one of the rightward-thrust-related
		// sprites, then start at the first rightward thrust sprite.
		if (currentSpriteNum < 8 || currentSpriteNum > 10)
			currentSpriteNum = 8;
			
		// Else if currentSpriteNum is already on one of the rightward-sprite-related
		// sprites, then increment to the next sprite in the series.
		else
			currentSpriteNum++;
			
		// If, after incrementing to the next sprite, currentSpriteNum goes past the
		// index of the last rightward-thrust-related sprite, then we must be operating
		// at maximum thrust, so set the sprite to the maximum rightward thrust sprite.
		if (currentSpriteNum > 10)
			currentSpriteNum = 10;
	}
}


/*
	Apply gravity (downward acceleration) unless terminal velocity has been reached.
*/
function applyGravity()
{
	// If less than terminal velocity, apply gravity.
	if (lander.dy < lander.terminalVelocityY)
		lander.dy += gravitationalAcceleration;
		
	// If greater than or equal to terminal velocity, keep dy at terminal velocity.
	else
		lander.dy = lander.terminalVelocityY;
}


/*
	Check whether the lander has collided with any terrain.
	
	@return - True if collision; false if not.
*/
function isCollision()
{
	return isCeilingCollision() || isFloorCollision();
}


/*
	Check whether the landed has collided with the ceiling array - if it exists for
	the current level.
	
	@return - True if collision; false if not.
*/
function isCeilingCollision()
{
	// Get the height map for the ceiling of the current level.
	let ceilingHeight = ceilingArrays[currentLevel];
	
	// Three collision types to check for the ceiling.
	let leftThrusterCollision = false;
	let rightThrusterCollision = false;
	let domeCollision = false;
	
	// If ceiling array is active on this level, go ahead and check collisions involving 
	// the ceiling
	if (ceilingHeight != undefined) {
		
		// Coordinates to check for the side thrusters:
		let leftThrusterX = lander.x + 8;
		let rightThrusterX = lander.x + lander.actualWidth - 8;
	
		let thrusterY = lander.y + 20;
	
		// Check for collisions involving thrusters and ceiling
		leftThrusterCollision = thrusterY <= ceilingHeight[Math.round(leftThrusterX)];
		rightThrusterCollision = thrusterY <= ceilingHeight[Math.round(rightThrusterX)];
		
		// Check collision between the center of the dome and the ceiling.
		let landerCenterX = lander.x + 40;
		let domeCenterCollision = lander.y <= ceilingHeight[Math.round(landerCenterX)];
				
		// Check for collision for a point along the left side of the dome.
		let domeLeftX1 = lander.x + 15;
		let domeLeftY1 = lander.y + 15;
		let domeLeftCollision1 = domeLeftY1 <= ceilingHeight[Math.round(domeLeftX1)];
		
		// Check for collision for another point along the left side of the dome.
		let domeLeftX2 = lander.x + 20;
		let domeLeftY2 = lander.y + 10;
		let domeLeftCollision2 = domeLeftY2 <= ceilingHeight[Math.round(domeLeftX2)];
		
		// Check for collision for last point along the left side of the dome.
		let domeLeftX3 = lander.x + 27;
		let domeLeftY3 = lander.y + 4;
		let domeLeftCollision3 = domeLeftY3 <= ceilingHeight[Math.round(domeLeftX3)];
		
		// Check for collision for a point along the right side of the dome.
		let domeRightX1 = lander.x + lander.actualWidth - 15;
		let domeRightY1 = lander.y + 15;
		let domeRightCollision1 = domeRightY1 <= ceilingHeight[Math.round(domeRightX1)];
		
		// Check for collision for another point along the right side of the dome.
		let domeRightX2 = lander.x + lander.actualWidth - 20;
		let domeRightY2 = lander.y + 10;
		let domeRightCollision2 = domeRightY2 <= ceilingHeight[Math.round(domeRightX2)];
		
		// Check for collision for last point along the right side of the dome.
		let domeRightX3 = lander.x + lander.actualWidth - 27;
		let domeRightY3 = lander.y + 4;
		let domeRightCollision3 = domeRightY3 <= ceilingHeight[Math.round(domeRightX3)];
		
		// Determine whether there were any collisions involving the dome.
		domeCollision = domeCenterCollision || domeLeftCollision1 || domeLeftCollision2 ||
					   domeLeftCollision3 || domeRightCollision1 || domeRightCollision2 ||
					   domeRightCollision3;
	}
	
	// Return whether there were any collisions involving the dome or side thrusters.
	return leftThrusterCollision || rightThrusterCollision || domeCollision;
}


/*
	Check whether the lander has collided with the floor array.
	
	@return - True if collision; false if not.
*/
function isFloorCollision()
{
	// Get the height map for the floor of the current level.
	let floorHeight = floorArrays[currentLevel];
	
	// Five collisions to check for the floor.
	let collisionOnThruster = false
	let collisionLeftOfThruster = false;
	let collisionRightOfThruster = false;
	let leftFootCollision = false;
	let rightFootCollision = false;
	
	// x-coordinates of left and right sides of the bottom thruster
	let bottomCenterLeftX = lander.x + 24;
	let bottomCenterRightX = lander.x + lander.actualWidth - 24;
	
	// y-coordinate of bottom of lander (where the thruster is)
	let bottomY = lander.y + lander.actualHeight - 6;
	
	// Check for collisions along bottom thruster
	for (let i = Math.round(bottomCenterLeftX); i <= Math.round(bottomCenterRightX); 
		i = i + 2) {
		
		if (bottomY > floorHeight[i])
			collisionOnThruster = true;
	}
	
	// first x-coord for the area between left leg and thruster on bottom of lander
	let leftLegX = lander.x + 9;
	
	// last x-coord for area between thruster on bottom of lander and right leg
	let rightLegX = lander.x + lander.actualWidth - 9;
	
	// y-coordinate of the part of the lander between the leg and the thruster
	let yNextToThruster = bottomY - 6;
	
	// Check for collisions between left leg and bottom thruster
	for (let i = Math.round(leftLegX); i < bottomCenterLeftX; i = i + 2) {
		
		if (yNextToThruster > floorHeight[i])
			collisionLeftOfThruster = true;
	}
	
	// Check for collisions between bottom thruster and right leg
	for (let i = Math.round(bottomCenterRightX + 1); i <= rightLegX; i = i + 2) {
		
		if (yNextToThruster > floorHeight[i])
			collisionRightOfThruster = true;
	}
	
	// Get the terrain height at the location of the two feet
	let leftFootMapHeight = floorHeight[Math.round(lander.leftFootX())];
	let rightFootMapHeight = floorHeight[Math.round(lander.rightFootX())];

	// Check for collisions involving the lander's two feet
	leftFootCollision = lander.leftFootY() > leftFootMapHeight;
	rightFootCollision = lander.rightFootY() > rightFootMapHeight;
	
	// Return true if any collisions; false if not.
	return collisionOnThruster || collisionLeftOfThruster || collisionRightOfThruster || 
		   leftFootCollision || rightFootCollision;
}


/*
	Check whether the lander is out of bounds in any direction.
	
	@return - True if out of bounds; false if not.
*/
function isOutOfBounds()
{
	// Check whether the lander has gone too high.
	let isAboveMaxHeight = lander.y < (-canvas2.height * 1.5);
	
	// Check whether the lander has gone out of bounds to the left.	
	let isPastLeftBounds = lander.x < -canvas2.width / 2;
	
	// Check whether the lander has gone out of bounds to the right.
	let isPastRightBounds = lander.x > (canvas2.width * 1.5);
	
	// Check whether the lander has gone below the bottom of the canvas.
	let isBelowBottom = (lander.y + lander.actualHeight) > canvas2.height;
	
	// True if lander is out of bounds in any direction.
	return isAboveMaxHeight || isPastLeftBounds || isPastRightBounds || isBelowBottom;
}


/*
	For the platforms corresponding to the current level, check whether the lander:
		- has landed on a destination platform
		- has landed on a gas station platform
		- is near (or has collided with) a trick platform
*/
function checkPlatforms()
{
	// Get the platform array corresponding to the current level.
	let platformList = platformArrays[currentLevel];

	// Check each platform in the array.
	for (let i = 0; i < platformList.length; i++) {
		
		// Get the platform.
		let platform = platformList[i];
				
		// If the lander is within the platform's x-boundaries, call the function
		// corresponding to the platform's type. That method will check the lander's
		// height, among other things.
		if (lander.leftFootX() >= platform.x && lander.rightFootX() <= platform.x + platform.width) {
				
			if (platform.isGasStation())
				handleGasStationPlatform(platform);
			else if (platform.isTrick())
				handleTrickPlatform(platform);
			else
				handleDestinationPlatform(platform);
				
		// If the lander is within a wider x-boundary and if it is a trick platform,
		// handle the trick platform. The technique allows the trick platform's spikes
		// to activate even if the lander is only partially above the platform.
		} else if (lander.leftFootX() >= platform.x - trickDistance && lander.rightFootX() <= platform.x + platform.width + trickDistance) {
			
			if (platform.isTrick())
				handleTrickPlatform(platform);
		}
	}
}


/*
	-If the lander has landed on the gas station platform, start the refuelingInterval.
	-If the lander is already on the gas station platform, don't do anything.
	-If the lander is not on the platform, but the refuelingInterval is active, clear
	the interval and set to undefined.
	
	@param platform - The gas station platform.
*/
function handleGasStationPlatform(platform)
{
	if (lander.leftFootY() + 1 >= platform.y && lander.rightFootY() + 1 >= platform.y) {
		
		// If refueling interval is equal to zero, then the lander has just landed on the 
		// platform; it was not on the platform prior to this.
		if (refuelingInterval == undefined) {
		
			lander.isRefueling = true;

			// Start the refueling interval.
			refuelingInterval = setInterval(refuel, 100);

			// Play sound effect.
			playAudio("refuel");
		}
			
	// If lander is not on platform in the y-direction, but the refuelingInterval is
	// active, clear the interval and set to undefined.
	} else if (refuelingInterval != undefined) {
			
		clearInterval(refuelingInterval);
		refuelingInterval = undefined;
		lander.isRefueling = false;
	}
	
}


/*
	If the lander is within the trick distance (in relation to the trick platform) in
	the y-direction, calculate the distance between the lander and the platform. When
	the lander is far from the platform (but within the trick distance), the spikes will
	be short. As the lander comes closer to the platform, the spikes will grow. There is
	a maximum height for the spike height, so they won't become super long.
	
	@param platform - The trick platform.
*/
function handleTrickPlatform(platform)
{
	// Check that the lander is within the trick distance (in relation to the trick
	// platform) in the y-direction.
	if (lander.leftFootY() + trickDistance >= platform.y && 
		lander.rightFootY() + trickDistance >= platform.y) {
		
		// Find the x-coordinate of the bottom-center of the lander.
		let landerCenterX = lander.x + lander.actualWidth / 2;
		
		// Find the x-coordinate of center of the platform.
		let platformCenterX = platform.x + platform.width / 2;
		
		// Calculate distance from bottom-center of lander to center of platform.
		let centerToPlatform = Math.sqrt(Math.pow(platformCenterX - landerCenterX, 2) + 
			Math.pow(platform.y - lander.leftFootY(), 2));
			
		// Calculate distance from lander's left foot to center of platform.
		let leftFootToPlatform = Math.sqrt(Math.pow(lander.leftFootX() - platformCenterX, 2) + 
			Math.pow(platform.y - lander.leftFootY(), 2));
		
		// Calculate distance from lander's right foot to center of platform.
		let rightFootToPlatform = Math.sqrt(Math.pow(platformCenterX - lander.rightFootX(), 2) + 
			Math.pow(platform.y - lander.rightFootY(), 2));
			
		// Take whichever of those three distances is shortest.
		let distanceToPlatform = Math.min(centerToPlatform, leftFootToPlatform, rightFootToPlatform);
			
		// Calculate spike height. If lander is far away, spike height will be small.
		// As lander gets closed, spike height gets bigger (up to the maximum).
		let spikeHeight = trickDistance % distanceToPlatform;
			
		// If the lander is very close to the platform, set the spike height to the max.			
		if (distanceToPlatform < trickDistance / 2)
			spikeHeight = trickDistance / 4;
			
		// When the lander is far away, the spike's may become very big, so this limits
		// the height of the spikes.
		if (spikeHeight > trickDistance / 4)
			spikeHeight = trickDistance / 4;			
		
		// Draw the spikes.
		makePlatformSpikes(platform, spikeHeight);
		
		// Check whether the left foot is within the platform's x-coordinates.
		let isLeftFootWithinPlatform = lander.leftFootX() >= platform.x &&
									   lander.leftFootX() <= platform.x + platform.width;
		
		// Check whether the right foot is within the platform's x-coordinates.
		let isRightFootWithinPlatform = lander.rightFootX() >= platform.x &&
										lander.rightFootX() <= platform.x + platform.width;
									
		// Check whether the lander's bottom is lower than or equal to the spikes' height.	
		let isTouchingSpike = lander.leftFootY() >= platform.y - spikeHeight && 
							  lander.rightFootY() >= platform.y - spikeHeight;
		
		// If either of the feet are within the platform's x-coordinates and if the
		// bottom of the lander is lower than or equal to the spikes' height, then a
		// collision has occurred.
		let crashedIntoSpike = (isLeftFootWithinPlatform || isRightFootWithinPlatform) && isTouchingSpike;
				
		// Set the lander's isCrashed boolean. If it was already set to "true" and if
		// there is no collision with a spike, the boolean will still be set to "true".
		// That is why I am using the conditional OR operator.
		lander.isCrashed = lander.isCrashed || crashedIntoSpike;
	}
}


/*
	Draw spikes on the given platform, with the specified height.
	
	@param platform - The platform on which to draw the spikes.
	@param spikeHeight - The height of the spikes to be drawn.
*/
function makePlatformSpikes(platform, spikeHeight)
{
	ctx2.lineWidth = 2;
	ctx2.strokeStyle = "yellow";
	ctx2.fillStyle = "red";

	// Get the coordinates of the platform.
	let startX = platform.x;
	let endX = platform.x + platform.width;
	let y = platform.y;
	
	// Set number of spikes and width of each spike.
	let numberOfSpikes = 6;
	let spikeWidth = (endX - startX) / numberOfSpikes;
	
	ctx2.save();
	ctx2.translate(startX, y);
	
	// Draw each spike.
	for (let i = 0; i < numberOfSpikes; i++) {
				
		ctx2.beginPath();
		ctx2.lineTo(0, 0);
		ctx2.lineTo(spikeWidth / 2, -spikeHeight);
		ctx2.lineTo(spikeWidth, 0);
		ctx2.translate(spikeWidth, 0);
		
		ctx2.stroke();
		ctx2.fill();
	}
	
	ctx2.restore();
}


/*
	If the lander has landed on this platform (in the y-direction), then
	set isLanded to true; otherwise set to false.
	
	@param platform - The destination platform.
*/
function handleDestinationPlatform(platform)
{
	lander.isLanded = lander.leftFootY() + 1 >= platform.y && lander.rightFootY() + 1 >= platform.y;
}


/*
	Handle the on-click event on the canvas during the time when the intro pages are
	displayed. This function looks for a click on the "Next Page" button. If the
	button is clicked, the next page is shown - until there are no more pages to be
	shown, at which point the on-click listener is removed (set to null).
	
	@param event - The on-click event.
*/
function handleClick(event)
{		
	let mouseX = event.offsetX;
	let mouseY = event.offsetY;
	
	if (mouseX >= canvas1.width - 180 && mouseX <= canvas1.width - 180 + 150 &&
		mouseY >= canvas1.height - 70 && mouseY <= canvas1.height - 70 + 40) {
	
		introPageNumber++;
		
		if (introPageNumber == 1) {
		
			displayFirstIntroPage();
			displayNextButton();	
			
		} else if (introPageNumber == 2) {
		
			displaySecondIntroPage();
			displayNextButton();
			
		} else {
		
			displayThirdIntroPage();
		}
	}
		
	if (introPageNumber == 3)
		canvas2.onclick = null;
}


/*
	Handle keydown events for the thrusters.
	
	@param event - The keydown event.
*/
function handleKeyDownEvent(event)
{
	lander.activeThrust = true;
	
	// Up, left, and right keys.
	switch(event.keyCode) {
		case 38:
			applyUpwardThrust();
			break;
		case 37:
			applyLeftwardThrust();
			break;
		case 39:
			applyRightwardThrust();
	}
}


/*
	Handle keyup events for the thrusters.
	
	@param event - The keyup event.
*/
function handleKeyUpEvent(event)
{
	// Up, left, and right keys.
	switch(event.keyCode) {
		case 38:
		case 37:
		case 39:
			lander.activeThrust = false;
			currentSpriteNum = 0; // When the key is lifted, the thruster animation stops.
			keydownCount = 0;
			
			// If the sound is on and the lander is not on a gas station platform (those
			// platforms trigger a sound effect loop), then stop the audio.
			if (soundOn && !lander.isRefueling) {
				
				audio.pause();
				audio.currentTime = 0;
			}
	}
}


/*
	Remove keydown and keyup event listeners.
*/
function removeKeyboardListeners()
{
	removeEventListener("keydown", handleKeyDownEvent);
	removeEventListener("keyup", handleKeyUpEvent);
}


/*
	This function is called by the timerInterval every second.
*/
function decrementTimer()
{
	timeRemaining--;
	
	// When time reaches zero, finish the game and play sound effect.
	if (timeRemaining == 0) {
		
		redraw();
		finishGame();
		
		playAudio("timesUp");
		
		displayMessageInMiddle("Times Up!");
	}
}


/*
	This function is called by the refuelingInterval. It increases the lander's fuel
	until the tank is full.
*/
function refuel()
{
	lander.fuelRemaining = lander.fuelRemaining + 2;
	
	// If tank becomes full, clear the refuelInterval and stop the sound effect (if
	// sound is turned on).
	if (lander.fuelRemaining > startFuelAmount) {
		lander.fuelRemaining = startFuelAmount;
		
		
		clearInterval(refuelingInterval);
		
		// If the sound is on, stop the sound when the tank is full.
		if (soundOn) {
			audio.pause();
			audio.currentTime = 0;
		}
	}
}


/*
	Update the fuel display in the top-right corner of the canvas.
*/
function updateFuelDisplay()
{
	ctx2.font = "30px Times New Roman";
	ctx2.fillStyle = "white";
	ctx2.fillText("Fuel:", canvas2.width - 375, 30);
	
	// Width of the grey rectangle behind the green fuel gauge.
	let width = 300;
	
	ctx2.fillStyle = "grey";
	ctx2.fillRect(canvas2.width - 310, 5, width, 30);
	
	// Calculate current fuel percentage.
	let currentFuelPercentage = lander.fuelRemaining / startFuelAmount;
	
	// If fuel is greater than 40%, bar will be green.
	if (currentFuelPercentage > 0.40)
		ctx2.fillStyle = "LimeGreen";
		
	// If fuel is greater than 15%, bar will be yellow.
	else if (currentFuelPercentage > 0.15)
		ctx2.fillStyle = "yellow";
		
	// If fuel is low, bar will be red.
	else
		ctx2.fillStyle = "red";
	
	// If fuel is greater than 0%, display the coloured bar. 
	// If fuel is 0%, only the grey bar will be drawn to indicate an empty fuel tank.
	if (currentFuelPercentage > 0)
		ctx2.fillRect(canvas2.width - 310, 5, width * currentFuelPercentage, 30);
}


/*
	Update display that shows the "current level" in the top-left corner of the canvas.
*/
function updateLevelDisplay()
{
	ctx2.font = "30px Times New Roman";
	ctx2.fillStyle = "white";
	ctx2.fillText("Level " + (currentLevel + 1), 5, 30);
}


/*
	Update the timer display along the top of the canvas.
*/
function updateTimerDisplay()
{
	ctx2.font = "30px Times New Roman";
	ctx2.fillStyle = "white";
	ctx2.fillText("Time Left: " + timeRemaining, 220, 30);
}


/*
	Display the welcome page which is the first thing the player sees when the page loads.
*/
function displayWelcomePage()
{
	ctx1.fillStyle = "black";
	ctx1.fillRect(0, 0, canvas1.width, canvas1.height);
	
	ctx1.font = "60px Times New Roman";
	ctx1.fillStyle = "white";
	
	let message = "Lunar Lander";
	ctx1.fillText(message, canvas1.width * 0.04, canvas1.height * 0.15);
			
	ctx1.font = "30px Times New Roman";

	ctx1.fillText("Start Story  >>>", canvas1.width - 400, canvas1.height - 40);

	ctx1.font = "15px Times New Roman";
	ctx1.fillText("(Click \"Start Game!\" to skip story)", canvas1.width - 215, canvas1.height - 10);
	
	let largeLander = new Image();
	largeLander.src = "images/largeLander.png";
	largeLander.onload = function () {
	
		ctx1.drawImage(largeLander, 200, 100);
	};
	
	
}


/*
	Display the first introductory page.
*/
function displayFirstIntroPage()
{
	ctx1.fillStyle = "black";
	ctx1.fillRect(0, 0, canvas1.width, canvas1.height);

	let textLines = ["It's July, 1973. NASA's Apollo program has just completed its final lunar",
					"mission this past December. The public was told that we got all that we",
					"came for: samples were collected and experiments were conducted. It was",
					"said that the expeditions have become too costly and that the government",
					"has put an end to the Apollo program.",
					"But this is nowhere near the end. The government has been establishing",
					"a lunar society in anticipation of nuclear war on Earth. The Apollo",
					"program was simply a series of supply runs to maintain and expand the",
					"lunar base. The Apollo launches were made public so as to draw funding",
					"from as many sources as possible."];
				
				
	ctx1.font = "60px Times New Roman";
	ctx1.fillStyle = "white";
	
	let message = "Lunar Lander";
	ctx1.fillText(message, canvas1.width * 0.04, canvas1.height * 0.15);
				
					
	ctx1.font = "28px Times New Roman";
	
	ctx1.save();
	ctx1.translate(0, 30);
	
	for (let i = 0; i < textLines.length; i++) {
	
		ctx1.translate(0, 30);
		ctx1.fillText(textLines[i], canvas1.width * 0.04, canvas1.height * 0.15)
		
		if (i == 4)
			ctx1.translate(0, 30);
	}
	
	ctx1.restore();
	
}


/*
	Display the second introductory page.
*/
function displaySecondIntroPage()
{
	ctx1.fillStyle = "black";
	ctx1.fillRect(0, 0, canvas1.width, canvas1.height);

	let textLines = ["With rapid expansion of the lunar base, more pilots are needed so that",
					"the furthest reaches of the moon can be tapped for resources.",
					"You are one of the medical officers on the base - highly trained in your",
					"field, but an inexperienced pilot at best. You need to learn to operate",
					"the lunar lander under all circumstances - across the lunar surface and",
					"also within the base.",
					"Good luck and fly safe."];
					
	ctx1.font = "60px Times New Roman";
	ctx1.fillStyle = "white";
	
	let message = "Lunar Lander";
	ctx1.fillText(message, canvas1.width * 0.04, canvas1.height * 0.15);
				
					
	ctx1.font = "28px Times New Roman";
	
	ctx1.save();
	ctx1.translate(0, 30);
	
	for (let i = 0; i < textLines.length; i++) {
	
		ctx1.translate(0, 30);
		ctx1.fillText(textLines[i], canvas1.width * 0.04, canvas1.height * 0.15)
		
		if (i == 1 || i == 5)
			ctx1.translate(0, 30);
	}
	
	ctx1.restore();
}


/*
	Display the third introductory page on the canvas.
*/
function displayThirdIntroPage()
{
	ctx1.fillStyle = "black";
	ctx1.fillRect(0, 0, canvas1.width, canvas1.height);
		
	let textLines = ["Objective: Land on green platform.",
					"Tips: Land gently and always watch out for trick platforms.",
					"Controls: LEFT, UP, and RIGHT arrow keys to fire the thrusters.",
					"Choose settings below and then click \"Start Game!\""];
					
	ctx1.font = "60px Times New Roman";
	ctx1.fillStyle = "white";
	
	let message = "Lunar Lander";
	ctx1.fillText(message, canvas1.width * 0.04, canvas1.height * 0.15);
	
	ctx1.font = "28px Times New Roman";

	ctx1.save();
	ctx1.translate(0, 30);
	
	for (let i = 0; i < textLines.length; i++) {
	
		ctx1.translate(0, 60);
		ctx1.fillText(textLines[i], canvas1.width * 0.04, canvas1.height * 0.15)
	}
	
	ctx1.restore();
}


/*
	Display a "Next Page" button on the canvas. This is to be displayed on some of the
	introductory pages.
*/
function displayNextButton()
{
	ctx1.font = "28px Times New Roman";

	ctx1.fillStyle = "white";
	ctx1.fillRect(canvas1.width - 180, canvas1.height - 70, 150, 40);
	
	ctx1.fillStyle = "black";
	ctx1.fillText("Next Page", canvas1.width - 165, canvas1.height - 40);
}


/*
	This function will display any message in the middle of the canvas.
	
	@param message - The message to display.
*/
function displayMessageInMiddle(message)
{
	ctx2.font = "50px Times New Roman";
	ctx2.fillStyle = "white";
	ctx2.fillText(message, canvas2.width / 2 - ctx2.measureText(message).width / 2, canvas2.height / 2);
}


/*
	Create the floor and ceiling height arrays for Level 1.
*/
function createHeightMapsLevel1()
{	
	// Create a new array for the floor. The size of the array is the width of the
	// canvas. Each index of the array represents an x-coordinate and the value at
	// each index represents the height of the terrain at that x-coordinate.
	let floorHeight_level1 = new Array(canvas1.width);
	
	// Leave the ceiling variable as 'undefined' because Level 1 does not have a ceiling.
	let ceilingHeight_level1;

	// ******
	// From this point onward, I populate every index position in the array. Some of the
	// for-loops draw curves, some draw lines at and angle, and some draw horizontal lines
	
	let height = canvas1.height;
	
	floorHeight_level1[0] = canvas1.height;

	for(let x = 1; x <= 170; x += 1) {
	    height = canvas1.height - Math.sin(x * Math.PI / 180) * 120;
	    floorHeight_level1[x] = height;
	}
	
	for(let x = 0; x <= 180; x += 1) {
	    height = canvas1.height - Math.sin(x * Math.PI / 180) * 120 - 20;
	    floorHeight_level1[x + 240] = height;
	}
	
	for (let x = 420; x < 500; x++) {
		floorHeight_level1[x] = height;
		height -= 2.25;
	}
		
	for (let x = 500; x < 585; x++) {
		floorHeight_level1[x] = height;
	}
	
	for (let x = 585; x < 600; x++) {
		floorHeight_level1[x] = height;
		height -= 12;
	}
	
	for (let x = 600; x < 620; x++) {
		floorHeight_level1[x] = height;
		height -= 2;
	}
		
	for (let x = 620; x < 660; x++) {
		floorHeight_level1[x] = height;
		height += 3;
	}	
	
	for (let x = 660; x < 680; x++) {
		floorHeight_level1[x] = height;
		height -= 1.5;
	}
		
	for (let x = 680; x < 720; x++) {
		floorHeight_level1[x] = height;
		height += 1.25;
	}
		
	for (let x = 720; x < 740; x++) {
		floorHeight_level1[x] = height;
		height -= 2;
	}
		
	for (let x = 740; x < 780; x++) {
		floorHeight_level1[x] = height;
		height += 5.5;
	}
		
	for (let x = 780; x < 870; x++) {
		floorHeight_level1[x] = height;
	}
		
	for (let x = 870; x < 900; x++) {
		floorHeight_level1[x] = height;
		height -= 5;
	}
	
	floorHeight_level1[canvas1.width] = canvas1.height;
	
	// Push the floor array into the floorArrays array.
	floorArrays.push(floorHeight_level1);
	
	// Push the ceiling variable (which is 'undefined') into the ceilingArrays array.
	ceilingArrays.push(ceilingHeight_level1);
}


/*
	Create the floor and ceiling height arrays for Level 2.
*/
function createHeightMapsLevel2()
{	
	// Create new arrays for the floor and ceiling. The size of the array is the width
	// of the canvas. Each index of the array represents an x-coordinate and the value
	// at each index represents the height of the terrain at that x-coordinate.
	let floorHeight_level2 = new Array(canvas1.width);
	let ceilingHeight_level2 = new Array(canvas1.width);

	// ******
	// From this point onward, I populate every index position in the two arrays to draw
	// the terrain seen on Level 2 when you play the game.

	let floorHeight = canvas1.height;
	let ceilingHeight = undefined;
	
	floorHeight_level2[0] = floorHeight;
	ceilingHeight_level2[0] = ceilingHeight;
	
	floorHeight -= 100;
	
	for (let x = 1; x < 150; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	ceilingHeight = 0;
	
	ceilingHeight_level2[149] = ceilingHeight;
	
	floorHeight -= 250;
	ceilingHeight += 50;
	
	for (let x = 150; x < 180; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	floorHeight += 20;
	
	for (let x = 180; x < 270; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	floorHeight -= 20;
	
	for (let x = 270; x < 300; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	floorHeight += 250;
	ceilingHeight = undefined;
	
	for (let x = 300; x < 450; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	ceilingHeight = 0;
	ceilingHeight_level2[300] = ceilingHeight;
	ceilingHeight_level2[449] = ceilingHeight;
	
	floorHeight -= 100;
	ceilingHeight += 200;
	
	for (let x = 450; x < 600; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	floorHeight += 100;
	ceilingHeight = undefined;
	
	for (let x = 600; x < 750; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	ceilingHeight = 0;
	ceilingHeight_level2[600] = ceilingHeight;
	
	floorHeight -= 275;
	ceilingHeight = undefined;
	
	for (let x = 750; x < 900; x++) {
	
		floorHeight_level2[x] = floorHeight;
		ceilingHeight_level2[x] = ceilingHeight;
	}
	
	floorHeight = canvas1.height;
	
	floorHeight_level2[900] = floorHeight;
	ceilingHeight_level2[900] = ceilingHeight;
	
	
	floorArrays.push(floorHeight_level2);
	ceilingArrays.push(ceilingHeight_level2);
}


/*
	Create the floor and ceiling height arrays for Level 3.
*/
function createHeightMapsLevel3()
{
	// Create a new array for the floor. The size of the array is the width of the
	// canvas. Each index of the array represents an x-coordinate and the value at
	// each index represents the height of the terrain at that x-coordinate.
	let floorHeight_level3 = new Array(canvas1.width);
	
	// Leave the ceiling variable as 'undefined' because Level 3 does not have a ceiling.
	let ceilingHeight_level3 = undefined;

	// ******
	// From this point onward, I populate every index position in the array to draw the
	// terrain as seen on Level 3 when you play the game.

	let floorHeight = canvas1.height;
	let ceilingHeight = undefined;
	
	floorHeight_level3[0] = floorHeight;

	floorHeight -= 300;
		
	for (let x = 1; x < 100; x++) {
	
		floorHeight_level3[x] = floorHeight;
	}
			
	for (let x = 100; x < 200; x++) {
	
		floorHeight += 1;
		floorHeight_level3[x] = floorHeight;
	}
			
	for (let x = 200; x < 300; x++) {
	
		floorHeight_level3[x] = floorHeight;
	}
	
	for (let x = 300; x < 400; x++) {
	
		floorHeight += 1;
		floorHeight_level3[x] = floorHeight;
	}
	
	for (let x = 400; x < 500; x++) {
	
		floorHeight_level3[x] = floorHeight;
	}
	
	for (let x = 500; x < 600; x++) {
	
		floorHeight -= 1;
		floorHeight_level3[x] = floorHeight;
	}
	
	for (let x = 600; x < 700; x++) {
	
		floorHeight_level3[x] = floorHeight;
	}
	
	for (let x = 700; x < 800; x++) {
	
		floorHeight -= 1;
		floorHeight_level3[x] = floorHeight;
	}
	
	for (let x = 800; x < 900; x++) {
	
		floorHeight_level3[x] = floorHeight;
	}
	
	floorHeight_level3[900] = canvas1.height;
	
	
	floorArrays.push(floorHeight_level3);
	ceilingArrays.push(ceilingHeight_level3);

}


/*
	Create the three platforms for Level 1 and add the array
	to the platformArrays array.
*/
function createPlatformsLevel1()
{
	// Create the array.
	let platformList = new Array();

	// Create trick platform.
	let trickPlatform = new Platform(170, 480, 70);
	trickPlatform.setToTrick();
	
	// Create gas station platform.
	let gasStationPlatform = new Platform(500, 300, 85);
	gasStationPlatform.setToGasStation();
	
	// Create destination platform.
	let destinationPlatform = new Platform(780, 400, 90);
	destinationPlatform.setToDestination();

	// Add the three platforms to the array.
	platformList.push(trickPlatform);
	platformList.push(gasStationPlatform);
	platformList.push(destinationPlatform);
	
	// Add the array to the platformArrays array.
	platformArrays.push(platformList);
}


/*
	Create the three platforms for Level 2 and add the array
	to the platformArrays array.
*/
function createPlatformsLevel2()
{
	// Create the array.
	let platformList = new Array();
	 
	// Create gas station platform.
	let gasStationPlatform = new Platform(180, 170, 90);
	gasStationPlatform.setToGasStation();
	
	// Create trick platform.
	let trickPlatform = new Platform(475, 300, 100);
	trickPlatform.setToTrick();
	
	// Create destination platform.
	let destinationPlatform = new Platform(780, 125, 90); 
	destinationPlatform.setToDestination();

	// Add the three platforms to the array.
	platformList.push(trickPlatform);
	platformList.push(gasStationPlatform);
	platformList.push(destinationPlatform);
	
	// Add the array to the platformArrays array.
	platformArrays.push(platformList);
}


/*
	Create the five platforms for Level 3 and add the array
	to the platformArrays array.
	
	The platforms have set locations, but each platform's
	type is randomized. There will, however, be at least one
	"destination" platform so that the game can be won.
*/
function createPlatformsLevel3()
{
	// Create the array.
	let platformList = new Array();
	
	// Create five randomized platforms:
	
	let platform1 = new Platform(5, 200, 90);
	randomizePlatform(platform1);
	
	let platform2 = new Platform(205, 300, 90);
	randomizePlatform(platform2);
	
	let platform3 = new Platform(405, 400, 90);
	randomizePlatform(platform3);
	
	let platform4 = new Platform(605, 300, 90);
	randomizePlatform(platform4);
	
	let platform5 = new Platform(805, 200, 90);
	randomizePlatform(platform5);

	// Add the five platforms to the array.
	platformList.push(platform1);
	platformList.push(platform2);
	platformList.push(platform3);
	platformList.push(platform4);
	platformList.push(platform5);
	
	// A counter variable to see how many destination platforms were created.
	let destinationPlatformsCount = 0;
	
	// Check that there is at least one destination platform.
	for (let i = 0; i < platformList.length; i++) {
		
		if (platformList[i].isDestination())
			destinationPlatformsCount++;
	}
	
	// If there is currently no destination platform, pick a random platform
	// from the array and make it a destination platform.
	if (destinationPlatformsCount == 0) {
		
		let randomIndex = Math.floor(Math.random() * platformList.length);
		
		platformList[randomIndex].setToDestination();
	}
	
	// Add the array to the platformArrays array.
	platformArrays.push(platformList);
}


/*
	Takes a Platform object as a parameter and randomly sets the type of the platform
	to gas station, trick platform, or destination platform. Trick platform has slightly
	higher probability.
	
	@param platform - A Platform object.
*/
function randomizePlatform(platform)
{
	let randomNum = Math.random();
	
	// Giving higher probability to creating trick platforms.
	if (randomNum < 0.3)
		platform.setToGasStation();
	else if (randomNum < 0.7)
		platform.setToTrick();
	else
		platform.setToDestination();
}


/*
	Draw the landscape for the current level, taking into account both the floorArray
	and the ceilingArray.
*/
function drawLandscape()
{
	// Get the floor and ceiling arrays.
	let floorArray = floorArrays[currentLevel];
	let ceilingArray = ceilingArrays[currentLevel];
	
	ctx1.fillStyle = "black";
	ctx1.fillRect(0, 0, canvas1.width, canvas1.height);

	ctx1.lineWidth = 2;
	ctx1.strokeStyle = "white";
	ctx1.fillStyle = "SlateGrey";

	ctx1.beginPath();
	
	// Draw a line to every point in the a floor array.
	for (let i = 0; i < floorArray.length; i++) {
		ctx1.lineTo(i, floorArray[i]);
	}
	
	ctx1.stroke();
	ctx1.fill();
	
	
	// If the ceiling array exists, draw a line to every point in the array. If an
	// undefined element is found, this must be a break in the ceiling (see Level 2
	// terrain), so begin a new path to get ready for any points that are still coming.
	if (ceilingArray != undefined) {
		
		ctx1.beginPath();
	
		for (let i = 0; i < ceilingArray.length; i++) {
	
			if (typeof(ceilingArray[i]) == 'undefined') {
				ctx1.stroke();
				ctx1.fill();
				ctx1.beginPath();
			} else {
				ctx1.lineTo(i, ceilingArray[i]);
			}
		}
	
		ctx1.stroke();
		ctx1.fill();
	}
}


/*
	The Lander constructor. I am not giving the constructor any parameters (such as x, y) 
	because it's not necessary in my design. I create the lander at the very beginning 
	and then set the x, y once the startGame() function is called.
*/
function Lander() {

	// Coordinates of the top-left corner of the lander.
	this.x;
	this.y;

	this.landerImage = new Image(); // For displaying the lander.
	this.spriteFile = "images/landerSpriteSheet.png"; // Filename of lander's sprite sheet

	// The dimensions of each sprite on the sprite sheet
	this.spriteWidth = 160;
	this.spriteHeight = 100;
	
	// The dimensions of the lander on the canvas
	this.actualWidth = 80;
	this.actualHeight = 50;
	
	// Distance from side of image to one of the lander's feet
	var distanceToFootX = 7;
	
	// Distance from bottom of image to lander's feet
	var distanceToFootY = 2;
	
	// Methods to return the x and y coordinates of the lander's left foot.
	this.leftFootX = function () {return this.x + distanceToFootX};
	this.leftFootY = function () {return this.y + this.actualHeight - distanceToFootY};
	
	// Methods to return the x and y coordinates of the lander's right foot
	this.rightFootX = function () {return this.x + this.actualWidth - distanceToFootX};
	this.rightFootY = function () {return this.y + this.actualHeight - distanceToFootY};
	
	// The delta x and y - the amount to move the lander on each call to move()
	this.dx = 0;
	this.dy = 0;
	
	// The strength of the lander's thrusters
	this.thrusterAcceleration = movementUnit * 500;
	
	// Whether or not thrust is currently being applied to the lander.
	// This helps with the thruster sound effect if someone presses the "Enable Sound"
	// button while thrust is being applied.
	this.activeThrust = false;
	
	// Terminal velocities
	this.terminalVelocityX = this.thrusterAcceleration * 7;
	this.terminalVelocityY = this.thrusterAcceleration * 7;
	
	// The amount of fuel and the rate at which it will discharge when thrust is applied.
	this.fuelRemaining = startFuelAmount;
	this.fuelDischargeRate = this.thrusterAcceleration * 7;
	
	this.isLanded = false; // True if lander is on a "destination platform"
	this.isRefueling = false; // True if lander is on a gas station platform
	this.isCrashed = false; // True if lander has crashed into something
}


/*
	Draw the lander using the appropriate sprite.
*/
function drawLander()
{	
	// The x and y coordinates of the sprite on the sprite sheet
	let sourceX;
	let sourceY;
		
	if (currentSpriteNum == 0) { //normal lander image
		sourceX = 0;
		sourceY = 0;
	} else if (currentSpriteNum >= 1 && currentSpriteNum <= 4) { //upward thrust range
		sourceX = (currentSpriteNum - 1) * lander.spriteWidth;
		sourceY = lander.spriteHeight;
	} else if (currentSpriteNum >= 5 && currentSpriteNum <= 7) { //leftward thrust range
		sourceX = (currentSpriteNum - 5) * lander.spriteWidth;
		sourceY = lander.spriteHeight * 2;
	} else if (currentSpriteNum >= 8 && currentSpriteNum <= 10) { //rightward thrust range
		sourceX = (currentSpriteNum - 8) * lander.spriteWidth;
		sourceY = lander.spriteHeight * 3;
	} else if (currentSpriteNum >= 11 && currentSpriteNum <= 14) { //explosion range
		sourceX = (currentSpriteNum - 11) * lander.spriteWidth;
		sourceY = lander.spriteHeight * 4;
		
	// Get blank/invisible lander - for after the lander has exploded
	} else {
		sourceX = 0;
		sourceY = lander.spriteHeight * 5;
	}
	
	// Take the sprite at sourceX and sourceY and draw it at the lander's x and y
	ctx2.drawImage(lander.landerImage, sourceX, sourceY, lander.spriteWidth, 
		lander.spriteHeight + 1, lander.x, lander.y, lander.actualWidth, 
		lander.actualHeight);

}


/*
	The Platform constructor. A platform can be a gas station, a trick platform, or a
	destination platform. It cannot be more than one kind of platform at the same time.
	
	@param x - x-coordinate of left side of platform.
	@param y - y-coordinate of left side of platform.
	@param width - The desired width of the platform.
*/
function Platform(x, y, width)
{
	// A platform has x and y coordinates and a width.
	this.x = x;
	this.y = y;
	this.width = width;
	
	// Local variables to keep track of which kind of platform this is.
	var isGasPlatform = false;
	var isTrickPlatform = false;
	var isDestinationPlatform = false;
	
	// If you set this to be a gas station platform, then isTrickPlatform and
	// isDestinationPlatform are set to false.
	this.setToGasStation = function() {
		isGasPlatform = true;
		isTrickPlatform = false;
		isDestinationPlatform = false;
	};
	
	// If you set this to be a trick platform, then isGasPlatform and 
	// isDestinationPlatform are set to false.
	this.setToTrick = function() {
		isGasPlatform = false;
		isTrickPlatform = true;
		isDestinationPlatform = false;
	};
	
	// If you set this to be a destination platform, then isGasPlatform and 
	// isTrickPlatform are set to false.
	this.setToDestination = function() {
		isGasPlatform = false;
		isTrickPlatform = false;
		isDestinationPlatform = true;
	};
	
	// Methods to check whether the Platform object is a gas station, a trick platform,
	// or a destination platform.
	this.isGasStation = function() {return isGasPlatform};
	this.isTrick = function() {return isTrickPlatform};
	this.isDestination = function() {return isDestinationPlatform};
}


/*
	Draw the platforms (corresponding to the current level) on the canvas.
*/
function drawPlatforms()
{
	// Get the platform array corresponding to the current level.
	let platformList = platformArrays[currentLevel];

	ctx1.beginPath();

	ctx1.lineWidth = 7;
	
	// Draw each platform. Colour depends on platform type.
	for (let i = 0; i < platformList.length; i++) {
	
		let platform = platformList[i];
	
		if (platform.isGasStation())
			ctx1.strokeStyle = "yellow";
		else
			ctx1.strokeStyle = "LimeGreen";
			
		ctx1.beginPath();
		ctx1.lineTo(platform.x, platform.y);
		ctx1.lineTo(platform.x + platform.width, platform.y);
		ctx1.stroke();
	}
}


/*
	Point object constructor which is used to set "positionBeforeCollision" and also 
	used in the "startPositionsArray" to set the lander's starting point at the beginning 
	of each level.
	
	@param x - x position of point.
	@param y - y position of point.
*/
function Point(x, y)
{
	this.x = x;
	this.y = y;
}


/*
	This function is called by the sound button above the canvas element. It toggles
	the sound on/off.
*/
function soundOnOff()
{
	// If sound is currently on, then turn it off and change the button's value.
	if (soundOn) {
		
		audio.pause();
		soundOn = false;
		document.getElementById("soundButton").value = "Enable Sound";
	
	// If sound is currently off, then turn it on and change the button's value.
	} else {
		soundOn = true;
		document.getElementById("soundButton").value = "Disable Sound";
		
		// If the lander is currently refueling and the tank is not yet full (and sound 
		// is turned on, start playing the refueling sound effect.
		if (lander.isRefueling && lander.fuelRemaining < startFuelAmount) {
			playAudio("refuel");	
			
		// If one of the lander's thrusters is currently firing while the sound is turned
		// on, start playing the thrust sound effect.
		} else if (lander.activeThrust) {
			playAudio("thrust");
		}
	}
}


/*
	Play sound effect. Only works when soundOn is set to true.
	
	@param type - The predefined name of the sound effect to be played.
*/
function playAudio(type)
{
	// If sound is on, go ahead and play the sound effect.
	if (soundOn) {
	
		let source; // The filename.
		let loop; // Whether or not the sound should be played on a loop.
	
		switch (type) {
			case "startGame":
				source = "audio/startGame.ogg";
				loop = false;
				break;
		
			case "thrust":
				source = "audio/thruster.wav";
				loop = true;
				break;
				
			case "refuel":
				source = "audio/refueling.wav";
				loop = true;
				break;
				
			case "land":
				source = "audio/landed.wav";
				loop = false;
				break;
				
			case "crash":
				source = "audio/crashGameOver.wav";
				loop = false;
				break;
				
			case "lostLander":
				source = "audio/lostLander.wav";
				loop = false;
				break;
				
			case "timesUp":
				source = "audio/timesUp.wav";
				loop = false;
		}
		
		audio.src = source;
		audio.loop = loop;
				
		// Without catching the following exception, if you press the
		// thruster keys a bunch of times in quick succession, an exception
		// is thrown to the console because there is some conflict between
		// the play() and pause() methods of the Audio object. It didn't
		// happen every time, but it was often enough that I saw it every
		// few minutes while I was testing the game.
		//
		// Exception text: 
		// 		Uncaught (in promise) DOMException: 
		// 		The play() request was interrupted by a call to pause()
		//
		// Source for the "playPromise" code below: 
		// https://developers.google.com/web/updates/2016/03/play-returns-promise
		let playPromise = audio.play();
		
		if (playPromise !== undefined) {
			
			playPromise.then(function() {
			}).catch(function(error) {
				
				//do nothing
				
				// Since this exception is only thrown when you fire the thrusters
				// repeatedly in quick succession, I am doing nothing in this catch
				// block. It will just skip the audio for that one press of the key.
				// You wouldn't notice that the audio didn't play because the audio
				// from the next keydown will play immediately after this.
				
			});
		}
	}
}