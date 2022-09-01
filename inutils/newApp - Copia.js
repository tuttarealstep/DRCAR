const windowHeight = window.innerHeight;
const windowWidth = window.innerWidth;
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const GRAVITY = 9.81;
const DRAG = -5;
const RESISTANCE = 100;
const CA_F = -5;
const CA_R = -5.2;
const MAX_GRIP = 2;
const SCALE = 8;

class CarType {
  constructor() {
    this.length = 0;
    this.width = 0;
    this.mass = 0; //in kg
    this.inertia = 0; //in kg.m

    this.wheelBase = 0; //in m
    this.wheelLength = 0;
    this.wheelWidth = 0;

    this.frontAxleDistance = 0; //in m
    this.rearAxleDistance = 0; //in m

    this.heightCenterOfMass = 0; //in m - from ground

    this.wheelColors = ["#000", "#000", "#000", "#000"];
  }
}

class Car {
  constructor() {
    this.carType = null;

    this.position = { x: windowWidth / 2, y: windowHeight / 2 };
    this.velocity = { x: 0, y: 0 };

    this.angle = 0; //car body orientation (rads)
    this.angularVelocity = 0;

    this.steerAngle = 0; // in input
    this.throttle = 0; // in input
    this.brake = 0; //in input

    this.color = "#ff0000";
  }

  checkPhysics(deltaTime) {
    let sn = Math.sin(this.angle);
    let cs = Math.cos(this.angle);

    let carVelocity = { x: 0, y: 0 };
    carVelocity.x = cs * this.velocity.x + sn * this.velocity.y;
    carVelocity.y = cs * this.velocity.y - sn * this.velocity.x;

    let yAWSpeed = this.carType.wheelBase * 0.5 * this.angularVelocity;

    let rotAngle = 0;

    if (carVelocity.x == 0) rotAngle = 0;
    else rotAngle = Math.atan2(yAWSpeed, carVelocity.x);

    let sideSlip = 0;
    if (carVelocity.x == 0) sideSlip = 0;
    else sideSlip = Math.atan2(carVelocity.y, carVelocity.x);

    let slipAngleFront = sideSlip + rotAngle - this.steerAngle;
    let slipAngleRear = sideSlip - rotAngle;

    let weight = this.carType.mass * GRAVITY * 0.5;

    // Lateral force on front wheels
    let flatForceFront = { x: 0, y: 0 };
    flatForceFront.y = CA_F * slipAngleFront;
    flatForceFront.y = Math.min(MAX_GRIP, flatForceFront.y);
    flatForceFront.y = Math.max(-MAX_GRIP, flatForceFront.y);
    flatForceFront.y *= weight;

    // todo if (front_slip) flatForceFront.y *= 0.5;

    // Lateral force on rear wheels
    let flatForceRear = { x: 0, y: 0 };
    flatForceRear.x = 0;
    flatForceRear.y = CA_R * slipAngleRear;
    flatForceRear.y = Math.min(MAX_GRIP, flatForceRear.y);
    flatForceRear.y = Math.max(-MAX_GRIP, flatForceRear.y);
    flatForceRear.y *= weight;
    // todo if(rear_slip) flatForceRear.y *= 0.5;

    let fTraction = { x: 0, y: 0 };
    fTraction.x = 100 * (this.throttle - this.brake * Math.sign(carVelocity.x));
    fTraction.y = 0;

    // todo if(rear_slip) fTraction.x *= 0.5;

    // Forces and torque on body
    let resistance = { x: 0, y: 0 };

    resistance.x = -(
      RESISTANCE * carVelocity.x +
      DRAG * carVelocity.x * Math.abs(carVelocity.x)
    );
    resistance.y = -(
      RESISTANCE * carVelocity.y +
      DRAG * carVelocity.y * Math.abs(carVelocity.y)
    );

    let force = { x: 0, y: 0 };
    // sum forces
    force.x =
      fTraction.x +
      Math.sin(this.steerAngle) * flatForceFront.x +
      flatForceRear.x +
      resistance.x;
    force.y =
      fTraction.y +
      Math.cos(this.steerAngle) * flatForceFront.y +
      flatForceRear.y +
      resistance.y;

    // torque on body from lateral forces
    let torque =
      this.carType.frontAxleDistance * flatForceFront.y -
      this.carType.rearAxleDistance * flatForceRear.y;

    // Acceleration

    // Newton F = m.a, therefore a = F/m
    let acceleration = { x: 0, y: 0 };
    acceleration.x = force.x / this.carType.mass;
    acceleration.y = force.y / this.carType.mass;

    let angular_acceleration = torque / this.carType.inertia;

    // Velocity and position
    let acceleration_wc = { x: 0, y: 0 };
    // transform acceleration from car reference frame to world reference frame
    acceleration_wc.x = cs * acceleration.y + sn * acceleration.x;
    acceleration_wc.y = -sn * acceleration.y + cs * acceleration.x;

    // velocity is integrated acceleration
    //
    this.velocity.x += deltaTime * acceleration_wc.x;
    this.velocity.y += deltaTime * acceleration_wc.y;

    // position is integrated velocity
    //
    this.position.x += deltaTime * this.velocity.x;
    this.position.y += deltaTime * this.velocity.y;

    // Angular velocity and heading

    // integrate angular acceleration to get angular velocity
    //
    this.angularVelocity += deltaTime * angular_acceleration;

    // integrate angular velocity to get angular orientation
    //
    this.angle += deltaTime * this.angularVelocity;


    //STATS
    this.stats.torque = torque;
    this.stats.speed = carVelocity.x * 3.6;
  }

  update(deltaTime) {
    this.checkPhysics(deltaTime);
  }

  render(deltaTime) {
    let sn = Math.sin(this.angle);
    let cs = Math.cos(this.angle);

    let screen_pos = { x: 0, y: 0 };

    screen_pos.x = this.position.x * SCALE + windowWidth / 2;
    screen_pos.y = -this.position.y * SCALE + windowHeight / 2;

    while (screen_pos.y < 0)
      screen_pos.y += windowHeight;
    while (screen_pos.y > windowHeight)
      screen_pos.y -= windowHeight;
    while (screen_pos.x < 0)
      screen_pos.x += windowWidth;
    while (screen_pos.x > windowWidth)
      screen_pos.x -= windowWidth;

    let corners = [];
    let wheels = [];
    let w = [];

    // wheels: 0=fr left, 1=fr right, 2 =rear right, 3=rear left

    corners[0] = { x: -this.carType.width / 2, y: -this.carType.length / 2 };
    corners[1] = { x: this.carType.width / 2, y: -this.carType.length / 2 };
    corners[2] = { x: this.carType.width / 2, y: this.carType.length / 2 };
    corners[3] = { x: -this.carType.width / 2, y: this.carType.length / 2 };

    for (let i = 0; i <= 3; i++) {
      w[i] = { x: 0, y: 0 };
      w[i].x = cs * corners[i].x - sn * corners[i].y;
      w[i].y = sn * corners[i].x + cs * corners[i].y;
      corners[i].x = w[i].x;
      corners[i].y = w[i].y;
    }

    for (let i = 0; i <= 3; i++) {
      corners[i].x *= SCALE;
      corners[i].y *= SCALE;
      corners[i].x += screen_pos.x;
      corners[i].y += screen_pos.y;
    }

    // draw car

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.lineTo(corners[0].x, corners[0].y);
    ctx.fillStyle = this.color
    ctx.fill();
    ctx.stroke();

    // wheels: 0=fr left, 1=fr right, 2 =rear right, 3=rear left

    const draw_wheel = (wheelNr, x, y) => {
      draw_rect(this.angle + (wheelNr < 2 ? this.steerAngle : 0), this.carType.wheelWidth * SCALE, this.carType.wheelLength * SCALE, x, y, this.carType.wheelColors[wheelNr]);
    };

    wheels[0] = { x: 0, y: 0 };
    wheels[0].x = -this.carType.width / 2;
    wheels[0].y = -this.carType.frontAxleDistance

    wheels[1] = { x: 0, y: 0 };
    wheels[1].x = this.carType.width / 2;
    wheels[1].y = -this.carType.frontAxleDistance;

    wheels[2] = { x: 0, y: 0 };
    wheels[2].x = this.carType.width / 2;
    wheels[2].y = this.carType.rearAxleDistance

    wheels[3] = { x: 0, y: 0 };
    wheels[3].x = -this.carType.width / 2;
    wheels[3].y = this.carType.rearAxleDistance;


    for (let i = 0; i <= 3; i++) {
      w[i].x = cs * wheels[i].x - sn * wheels[i].y;
      w[i].y = sn * wheels[i].x + cs * wheels[i].y;
      wheels[i].x = w[i].x;
      wheels[i].y = w[i].y;
    }

    for (let i = 0; i <= 3; i++) {
      wheels[i].x *= SCALE;
      wheels[i].y *= SCALE;
      wheels[i].x += screen_pos.x;
      wheels[i].y += screen_pos.y;
    }


    draw_wheel(0, wheels[0].x, wheels[0].y);
    draw_wheel(1, wheels[1].x, wheels[1].y);
    draw_wheel(2, wheels[2].x, wheels[2].y);
    draw_wheel(3, wheels[3].x, wheels[3].y);

    /*ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x,
      this.position.y,
      this.carType.width * 8,
      this.carType.length * 8
    );*/
  }
}

function draw_rect(angle, w, l, x, y, color) {
  let sn = Math.sin(angle);
  let cs = Math.cos(angle);

  let c = [];
  let c2 = [];


  c[0] = { x: -w / 2, y: l / 2 };
  c[1] = { x: w / 2, y: l / 2 };
  c[2] = { x: w / 2, y: -l / 2 };
  c[3] = { x: -w / 2, y: -l / 2 };


  for (let i = 0; i <= 3; i++) {
    if (c2[i] == null) {
      c2[i] = { x: 0, y: 0 };
    }

    c2[i].x = cs * c[i].x - sn * c[i].y;
    c2[i].y = sn * c[i].x + cs * c[i].y;
    c[i].x = c2[i].x;
    c[i].y = c2[i].y;
  }

  for (let i = 0; i <= 3; i++) {
    c[i].x += x;
    c[i].y += y;
  }

  ctx.beginPath();
  ctx.moveTo(c[0].x, c[0].y);
  ctx.lineTo(c[1].x, c[1].y);
  ctx.lineTo(c[2].x, c[2].y);
  ctx.lineTo(c[3].x, c[3].y);
  ctx.lineTo(c[0].x, c[0].y);

  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.stroke();
}

let keyCheck = {
  up: false,
  down: false,
  left: false,
  right: false,
};

let lastTime = Date.now();
let car = new Car();

function setUpCanvas() {
  canvas.width = windowWidth;
  canvas.height = windowHeight;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function checkKeys() {
  if (keyCheck.up) {
    if (car.throttle < 100) car.throttle += 10;
  } else {
    if (car.throttle >= 10) car.throttle -= 10;
    //car.throttle = 0;
  }

  if (keyCheck.down) {
    car.brake = 100;
    car.throttle = 0;
  } else {
    car.brake = 0;
  }

  if (keyCheck.left) {
    if (car.steerAngle > -Math.PI / 4) car.steerAngle -= Math.PI / 32;
  } else {
    if (car.steerAngle < 0) {
      car.steerAngle += Math.PI / 32;
    }
  }

  if (keyCheck.right) {
    if (car.steerAngle < Math.PI / 4) car.steerAngle += Math.PI / 32;
  } else {
    if (car.steerAngle > 0) {
      car.steerAngle -= Math.PI / 32;
    }
  }

}

function setUpEvents() {
  document.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        keyCheck.up = true;
        break;
      case "ArrowDown":
      case "KeyS":
        keyCheck.down = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        keyCheck.left = true;
        break;
      case "ArrowRight":
      case "KeyD":
        keyCheck.right = true;
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        keyCheck.up = false;
        break;
      case "ArrowDown":
      case "KeyS":
        keyCheck.down = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        keyCheck.left = false;
        break;
      case "ArrowRight":
      case "KeyD":
        keyCheck.right = false;
        break;
    }
  });
}

function render() {
  window.requestAnimationFrame(render);

  let currentTime = Date.now();
  let deltaTime = (currentTime - lastTime) / 1000;

  if(deltaTime > 1)
  {
    deltaTime = 0;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  checkKeys();

  car.update(deltaTime);
  car.render(deltaTime);

  lastTime = currentTime;
}

function setUpCar() {
  car.carType = new CarType();

  car.carType.frontAxleDistance = 1; //in m
  car.carType.rearAxleDistance = 1; //in m
  car.carType.length = 3;
  car.carType.width = 1.5;
  car.carType.mass = 1500; //in kg
  car.carType.inertia = 1500; //in kg.m

  car.carType.wheelBase =
    car.carType.frontAxleDistance + car.carType.rearAxleDistance; //in m
  car.carType.wheelLength = 0.7;
  car.carType.wheelWidth = 0.3;

  car.carType.heightCenterOfMass = 1; //in m - from ground
}

async function main() {
  setUpCanvas();
  setUpEvents();
  setUpCar();
  window.requestAnimationFrame(render);
}

main();

