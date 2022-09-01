class CarConfigurations {
    constructor(options = {}) {
  
      options = options || {};
  
      this.gravity = options.gravity || 9.81;  // m/s^2
      this.mass = options.mass || 1200.0;  // kg
      this.inertiaScale = options.inertiaScale || 1.0;  // Multiply by mass for inertia
      this.halfWidth = options.halfWidth || 0.8; // Centre to side of chassis (metres)
      this.cgToFront = options.cgToFront || 2.0; // Centre of gravity to front of chassis (metres)
      this.cgToRear = options.cgToRear || 2.0;   // Centre of gravity to rear of chassis
      this.cgToFrontAxle = options.cgToFrontAxle || 1.25;  // Centre gravity to front axle
      this.cgToRearAxle = options.cgToRearAxle || 1.25;  // Centre gravity to rear axle
      this.cgHeight = options.cgHeight || 0.55;  // Centre gravity height
      this.wheelRadius = options.wheelRadius || 0.3;  // Includes tire (also represents height of axle)
      this.wheelWidth = options.wheelWidth || 0.2;  // Used for render only
      this.tireGrip = options.tireGrip || 2.0;  // How much grip tires have
      this.lockGrip = (typeof options.lockGrip === 'number') ? GMath.clamp(options.lockGrip, 0.01, 1.0) : 0.7;  // % of grip available when wheel is locked
      this.engineForce = options.engineForce || 8000.0;
      this.brakeForce = options.brakeForce || 12000.0;
      this.eBrakeForce = options.eBrakeForce || this.brakeForce / 2.5;
      this.weightTransfer = (typeof options.weightTransfer === 'number') ? options.weightTransfer : 0.2;  // How much weight is transferred during acceleration/braking
      this.maxSteer = options.maxSteer || 0.6;  // Maximum steering angle in radians
      this.cornerStiffnessFront = options.cornerStiffnessFront || 5.0;
      this.cornerStiffnessRear = options.cornerStiffnessRear || 5.2;
      this.airResist = (typeof options.airResist === 'number') ? options.airResist : 2.5;	// air resistance (* vel)
      this.rollResist = (typeof options.rollResist === 'number') ? options.rollResist : 8.0;	// rolling resistance force (* vel)
  
      this.color = options.color || '#ff0000';
      this.wheelsColor = options.wheelsColor || ['#000', '#000', '#000', '#000'];

      this.drawTrail = options.drawTrail || true;

      this.trailDefaultConfig = options.trailDefaultConfig || {
       /* accelTime: 1,
        accelTimePercentage: 20,
        brakeTime: 1,
        brakeTimePercentage: 20,*/
        color: '#424242',
        rainbow: true
      };
    }
  }
  