class Car {
    constructor(gameEngine, options = {}) {
        this.gameEngine = gameEngine;

        options = options || {};

        this.heading = options.heading || 0.0;  // angle car is pointed at (radians)
        this.position = new Vec2(options.x, options.y);  // metres in world coords
        this.velocity = new Vec2();  // m/s in world coords
        this.velocity_c = new Vec2();  // m/s in local car coords (x is forward y is sideways)
        this.accel = new Vec2();  // acceleration in world coords
        this.accel_c = new Vec2();   // accleration in local car coords
        this.absVel = 0.0;  // absolute velocity m/s
        this.yawRate = 0.0;   // angular velocity in radians
        this.steer = 0.0;	// amount of steering input (-1.0..1.0)
        this.steerAngle = 0.0;  // actual front wheel steer angle (-maxSteer..maxSteer)

        //  State of inputs
        this.inputs = {
            left: 0,
            right: 0,
            throttle: 0,
            brake: 0,
            eBrake: 0,
        }

        //  Use input smoothing (on by default)
        this.smoothSteer = (options.smoothSteer === undefined) ? true : !!options.smoothSteer;

        //  Use safe steering (angle limited by speed)
        this.safeSteer = (options.safeSteer === undefined) ? false : !!options.safeSteer;

        //  Stats object we can use to ouptut info
        this.stats = {};

        //  Other static values to be computed from config
        this.inertia = 0.0;  // will be = mass
        this.wheelBase = 0.0;  // set from axle to CG lengths
        this.axleWeightRatioFront = 0.0;  // % car weight on the front axle
        this.axleWeightRatioRear = 0.0;  // % car weight on the rear axle

        this.trailConfig = {
          /*  accelTime: 1, //in seconds
            accelTimeSet: true,
            brakeTime: 1, //in seconds
            brakeTimeSet: true,*/
        }

        //  Setup car configuration
        this.config = new CarConfigurations(options.config);
        this.recalculateValues();
    }

    recalculateValues() {
        this.inertia = this.config.mass * this.config.inertiaScale;
        this.wheelBase = this.config.cgToFrontAxle + this.config.cgToRearAxle;
        this.axleWeightRatioFront = this.config.cgToRearAxle / this.wheelBase; // % car weight on the front axle
        this.axleWeightRatioRear = this.config.cgToFrontAxle / this.wheelBase; // % car weight on the rear axle

        /*this.trailConfig.accelTime = Utils.getRandomValueWithPercentage(this.config.trailDefaultConfig.accelTime, this.config.trailDefaultConfig.accelTimePercentage, 100)
        this.trailConfig.brakeTime = Utils.getRandomValueWithPercentage(this.config.trailDefaultConfig.brakeTime, this.config.trailDefaultConfig.brakeTimePercentage, 100)*/
    }

    checkPhysics(deltaTime) {
        // Pre-calc heading vector
        let sn = Math.sin(this.heading);
        let cs = Math.cos(this.heading);

        // Get velocity in local car coordinates
        this.velocity_c.x = cs * this.velocity.x + sn * this.velocity.y;
        this.velocity_c.y = cs * this.velocity.y - sn * this.velocity.x;

        // Weight on axles based on centre of gravity and weight shift due to forward/reverse acceleration
        let axleWeightFront = this.config.mass * (this.axleWeightRatioFront * this.config.gravity - this.config.weightTransfer * this.accel_c.x * this.config.cgHeight / this.wheelBase);
        let axleWeightRear = this.config.mass * (this.axleWeightRatioRear * this.config.gravity + this.config.weightTransfer * this.accel_c.x * this.config.cgHeight / this.wheelBase);

        // Resulting velocity of the wheels as result of the yaw rate of the car body.
        // v = yawrate * r where r is distance from axle to CG and yawRate (angular velocity) in rad/s.
        let yawSpeedFront = this.config.cgToFrontAxle * this.yawRate;
        let yawSpeedRear = -this.config.cgToRearAxle * this.yawRate;

        // Calculate slip angles for front and rear wheels (a.k.a. alpha)
        let slipAngleFront = Math.atan2(this.velocity_c.y + yawSpeedFront, Math.abs(this.velocity_c.x)) - Math.sign(this.velocity_c.x) * this.steerAngle;
        let slipAngleRear = Math.atan2(this.velocity_c.y + yawSpeedRear, Math.abs(this.velocity_c.x));

        let tireGripFront = this.config.tireGrip;
        let tireGripRear = this.config.tireGrip * (1.0 - this.inputs.eBrake * (1.0 - this.config.lockGrip)); // reduce rear grip when eBrake is on

        let frictionForceFront_cy = Math.min(Math.max(-this.config.cornerStiffnessFront * slipAngleFront, -tireGripFront), tireGripFront) * axleWeightFront;
        let frictionForceRear_cy = Math.min(Math.max(-this.config.cornerStiffnessRear * slipAngleRear, -tireGripRear), tireGripRear) * axleWeightRear;

        //  Get amount of brake/throttle from our inputs
        let brake = Math.min(this.inputs.brake * this.config.brakeForce + this.inputs.eBrake * this.config.eBrakeForce, this.config.brakeForce);
        let throttle = this.inputs.throttle * this.config.engineForce;

        //  Resulting force in local car coordinates.
        //  This is implemented as a RWD car only.
        let tractionForce_cx = throttle - brake * Math.sign(this.velocity_c.x);
        let tractionForce_cy = 0;

        let dragForce_cx = -this.config.rollResist * this.velocity_c.x - this.config.airResist * this.velocity_c.x * Math.abs(this.velocity_c.x);
        let dragForce_cy = -this.config.rollResist * this.velocity_c.y - this.config.airResist * this.velocity_c.y * Math.abs(this.velocity_c.y);

        // total force in car coordinates
        let totalForce_cx = dragForce_cx + tractionForce_cx;
        let totalForce_cy = dragForce_cy + tractionForce_cy + Math.cos(this.steerAngle) * frictionForceFront_cy + frictionForceRear_cy;

        // acceleration along car axes
        this.accel_c.x = totalForce_cx / this.config.mass;  // forward/reverse accel
        this.accel_c.y = totalForce_cy / this.config.mass;  // sideways accel

        // acceleration in world coordinates
        this.accel.x = cs * this.accel_c.x - sn * this.accel_c.y;
        this.accel.y = sn * this.accel_c.x + cs * this.accel_c.y;

        // update velocity
        this.velocity.x += this.accel.x * deltaTime;
        this.velocity.y += this.accel.y * deltaTime;

        this.absVel = this.velocity.length();

        // calculate rotational forces
        let angularTorque = (frictionForceFront_cy + tractionForce_cy) * this.config.cgToFrontAxle - frictionForceRear_cy * this.config.cgToRearAxle;

        //  Sim gets unstable at very slow speeds, so just stop the car
        if (Math.abs(this.absVel) < 0.5 && !throttle) {
            this.velocity.x = this.velocity.y = this.absVel = 0;
            angularTorque = this.yawRate = 0;

           /* if (!this.trailConfig.accelTimeSet) {
                this.trailConfig.accelTime = Utils.getRandomValueWithPercentage(this.config.trailDefaultConfig.accelTime, this.config.trailDefaultConfig.accelTimePercentage, 100)
                this.trailConfig.accelTimeSet = true
            }

            if (!this.trailConfig.brakeTimeSet) {
                this.trailConfig.brakeTime = Utils.getRandomValueWithPercentage(this.config.trailDefaultConfig.brakeTime, this.config.trailDefaultConfig.brakeTimePercentage, 100)
                this.trailConfig.brakeTimeSet = true
            }*/
        }

        let angularAccel = angularTorque / this.inertia;

        this.yawRate += angularAccel * deltaTime;
        this.heading += this.yawRate * deltaTime;

        //  finally we can update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Check car position on screen
        if (this.position.x < 0) {
            this.position.x = this.gameEngine.canvasWidth / this.gameEngine.drawScale;
        } else if (this.position.x > this.gameEngine.canvasWidth / this.gameEngine.drawScale) {
            this.position.x = 0;
        }

        if (this.position.y < -(this.gameEngine.canvasHeight / this.gameEngine.drawScale)) {
            this.position.y = 0
        } else if (this.position.y > 0) {
            this.position.y = -(this.gameEngine.canvasHeight / this.gameEngine.drawScale);
        }

        if (this.inputs.throttle) {
            this.trailConfig.accelTime -= deltaTime;

            if (this.trailConfig.accelTime <= 0) {
                this.trailConfig.accelTimeSet = false;
                this.trailConfig.accelTime = 0
            }
        }

        if (this.inputs.brake || this.inputs.eBrake) {
            this.trailConfig.brakeTime -= deltaTime;

            if (this.trailConfig.brakeTime <= 0) {
                this.trailConfig.brakeTimeSet = false;
                this.trailConfig.brakeTime = 0;
            }
        }

        //  Display some data
        this.stats.speed = this.velocity_c.x * 3600 / 1000;  // km/h
        this.stats.accleration = this.accel_c.x;
        this.stats.yawRate = this.yawRate;
        this.stats.weightFront = axleWeightFront;
        this.stats.weightRear = axleWeightRear;
        this.stats.slipAngleFront = slipAngleFront;
        this.stats.slipAngleRear = slipAngleRear;
        this.stats.frictionFront = frictionForceFront_cy;
        this.stats.frictionRear = frictionForceRear_cy;
    }

    applySafeSteer(steer) {
        return steer * (1.0 - (Math.min(this.absVel, 250.0) / 280.0));
    }

    applySmoothSteer(steerInput, deltaTime) {
        let steer = 0;

        if (Math.abs(steerInput) > 0.001) {
            //  Move toward steering input
            steer = Math.min(Math.max(this.steer + steerInput * deltaTime * 2.0, -1.0), 1.0); // -inp.right, inp.left);
        }
        else {
            //  No steer input - move toward centre (0)
            if (this.steer > 0) {
                steer = Math.max(this.steer - deltaTime * 1.0, 0);
            }
            else if (this.steer < 0) {
                steer = Math.min(this.steer + deltaTime * 1.0, 0);
            }
        }

        return steer;
    }

    update(deltaTime) {
        let steerInput = this.inputs.left - this.inputs.right;

        //  Perform filtering on steering...
        if (this.smoothSteer)
            this.steer = this.applySmoothSteer(steerInput, deltaTime);
        else
            this.steer = steerInput;

        if (this.safeSteer)
            this.steer = this.applySafeSteer(this.steer);

        //  Now set the actual steering angle
        this.steerAngle = this.steer * this.config.maxSteer;
        this.checkPhysics(deltaTime);
    }

    render() {
        let ctx = this.gameEngine.ctx;

        ctx.save();

        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.heading);

        // Draw car body
        ctx.beginPath();
        ctx.rect(-this.config.cgToRear, -this.config.halfWidth, this.config.cgToFront + this.config.cgToRear, this.config.halfWidth * 2.0);
        ctx.fillStyle = this.config.color
        ctx.fill();
        ctx.lineWidth = 0.05;  // use thin lines because everything is scaled up 25x
        ctx.strokeStyle = this.config.color;
        ctx.stroke();
        ctx.closePath();

        // Draw rear wheels
        ctx.translate(-this.config.cgToRearAxle, -this.config.halfWidth);
        ctx.beginPath();
        ctx.rect(
            -this.config.wheelRadius, -this.config.wheelWidth / 2.0,
            this.config.wheelRadius * 2, this.config.wheelWidth
        );
        ctx.fillStyle = this.config.wheelsColor[0];
        ctx.fill();
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = this.config.wheelsColor[0];
        ctx.stroke();
        ctx.closePath();

        ctx.translate(0, this.config.halfWidth * 2);
        ctx.beginPath();
        ctx.rect(
            -this.config.wheelRadius, -this.config.wheelWidth / 2.0,
            this.config.wheelRadius * 2, this.config.wheelWidth
        );
        ctx.fillStyle = this.config.wheelsColor[1];
        ctx.fill();
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = this.config.wheelsColor[1];
        ctx.stroke();
        ctx.closePath();


        // Draw front wheels
        ctx.save();
        ctx.translate(this.config.cgToRearAxle + this.config.cgToFrontAxle, 0);
        ctx.rotate(this.steerAngle);
        ctx.beginPath();
        ctx.rect(
            -this.config.wheelRadius, -this.config.wheelWidth / 2.0,
            this.config.wheelRadius * 2, this.config.wheelWidth
        );
        ctx.fillStyle = this.config.wheelsColor[2];
        ctx.fill();
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = this.config.wheelsColor[2];
        ctx.stroke();
        ctx.closePath();
        ctx.restore();

        ctx.save();
        ctx.translate(this.config.cgToRearAxle + this.config.cgToFrontAxle, -this.config.halfWidth * 2);
        ctx.rotate(this.steerAngle);
        ctx.beginPath();
        ctx.rect(
            -this.config.wheelRadius, -this.config.wheelWidth / 2.0,
            this.config.wheelRadius * 2, this.config.wheelWidth
        );
        ctx.fillStyle = this.config.wheelsColor[3];
        ctx.fill();
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = this.config.wheelsColor[3];
        ctx.stroke();
        ctx.closePath();
        ctx.restore();

        ctx.restore();

        // Draw trail
        if (this.config.drawTrail) {
            /*console.log(this.accel_c.length());*/

            /*    if (Math.abs(this.yawRate) < .4 && this.trailConfig.accelTime <= 0)
                    return
    
                if ((Math.abs(this.yawRate) > .4 && this.velocity_c.length() < 10) && !this.inputs.throttle)
                    return*/

           /* if (this.trailConfig.accelTime == true && this.trailConfig.accelTime <= 0 && this.trailConfig.brakeTimeSet == true)
                return;

            if (this.trailConfig.accelTime == false && this.trailConfig.accelTime <= 0 && this.trailConfig.brakeTimeSet == false)
                return;*/


            let trailColor = this.config.trailDefaultConfig.color;

            if (this.config.trailDefaultConfig.rainbow) {
                this.trailConfig.rainbowAngle = this.trailConfig.rainbowAngle || 0;

                trailColor = "hsl(" + (this.trailConfig.rainbowAngle % 360) + ",100%, 50%)";

                this.trailConfig.rainbowAngle += 1.2
            }

            let trailCtx = this.gameEngine.trailCtx;
            trailCtx.save();

            trailCtx.translate(this.position.x, this.position.y);
            trailCtx.rotate(this.heading);

            trailCtx.translate(-this.config.cgToRearAxle, -this.config.halfWidth);
            trailCtx.beginPath();
            trailCtx.rect(
                -this.config.wheelRadius, -this.config.wheelWidth / 2.0,
                this.config.wheelRadius, this.config.wheelWidth / 2
            );
            trailCtx.fillStyle = trailColor
            trailCtx.fill();
            trailCtx.closePath();

            trailCtx.translate(0, this.config.halfWidth * 2);
            trailCtx.beginPath();
            trailCtx.rect(
                -this.config.wheelRadius, -this.config.wheelWidth / 2.0,
                this.config.wheelRadius, this.config.wheelWidth / 2
            );
            trailCtx.fillStyle = trailColor
            trailCtx.fill();
            trailCtx.closePath();

            trailCtx.restore();
        }


    }
}
