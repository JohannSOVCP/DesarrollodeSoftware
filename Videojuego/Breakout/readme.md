# Breakout Game

Juan Carlos Luz Gallardo - A01028527
I make a breakout game using the base of the pong in js that we saw in class.
In my own carpet is in Videojuegos/Breakout

# Controls

- Left Arrow / A → Move paddle left  
- Right Arrow / D → Move paddle right  
- Spacebar → Launch the ball  
- Restart Button → Reset the game  


# Features

- Destructible brick grid
- Configurable number of rows and columns
- Score tracking (destroyed blocks)
- Remaining blocks counter
- Lives system (3 lives)
- Win and Game Over conditions
- Restart functionality
- Sound effects using Web Audio API
- Responsive paddle control

# Technical Details

This game is based on concepts learned in class:

- HTML5 Canvas rendering
- Game loop using `requestAnimationFrame`
- Object-oriented structure (Ball, Paddle, Game)
- Collision detection using AABB (Axis-Aligned Bounding Box)
- Vector-based movement
- Delta time for smooth motion

And to be clear, the sound effects are generated using the Web Audio API instead of external audio files. 
I already know this api because of a project that i made for myself.

Beyond that, this is a extension of the pong game that we develop in class.
The mostly changes that were made are:
- Removing the second paddle
- Adding a grid of destructible blocks
- Implementing a lives system
- Adding win and lose conditions
- Including on-screen HUD (lives, score, remaining blocks)
- Adding sound effects for gameplay events

And the number of bricks can be change in `breakout.js`.