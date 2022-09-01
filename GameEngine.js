class GameEngine {
    constructor(options = {}) {
        options = options || {};

        if (!options.gameContainer)
            throw new Error("GameEngine: gameContainer is required");

        this.gameContainer = options.gameContainer;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");

        this.trailCanvas = document.createElement('canvas');
        this.trailCtx = this.trailCanvas.getContext("2d");

        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;

        this.drawScale = options.drawScale || 10;

        this.inputs = {
            up: false,
            right: false,
            left: false,
            down: false,
            space: false,
        }

        this.car = new Car(this);

        this.currentTime = Date.now();
        this.lastTime = Date.now();

        this.setUp();
    }

    setUp() {
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0px";
        this.canvas.style.left = "0px";

        this.trailCanvas.style.position = "absolute";
        this.trailCanvas.style.top = "0px";
        this.trailCanvas.style.left = "0px";

        this.gameContainer.appendChild(this.trailCanvas);
        this.gameContainer.appendChild(this.canvas);


        document.addEventListener("keydown", (e) => {
            switch (e.code) {
                case "ArrowUp":
                case "KeyW":
                    this.inputs.up = true;
                    break;
                case "ArrowDown":
                case "KeyS":
                    this.inputs.down = true;
                    break;
                case "ArrowLeft":
                case "KeyA":
                    this.inputs.left = true;
                    break;
                case "ArrowRight":
                case "KeyD":
                    this.inputs.right = true;
                    break;
                case "Space":
                    this.inputs.space = true;
                    break;
            }
        });

        document.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "ArrowUp":
                case "KeyW":
                    this.inputs.up = false;
                    break;
                case "ArrowDown":
                case "KeyS":
                    this.inputs.down = false;
                    break;
                case "ArrowLeft":
                case "KeyA":
                    this.inputs.left = false;
                    break;
                case "ArrowRight":
                case "KeyD":
                    this.inputs.right = false;
                    break;
                case "Space":
                    this.inputs.space = false;
                    break;
            }
        });

        window.onresize = () => this.resize();
        this.resize();


        this.car.position.x = this.canvasWidth / 2 / this.drawScale
        this.car.position.y = -(this.canvasHeight / 2 / this.drawScale)
    }

    update(deltaTime) {
        this.car.inputs.left = this.inputs.left;
        this.car.inputs.right = this.inputs.right;
        this.car.inputs.throttle = this.inputs.up;
        this.car.inputs.brake = this.inputs.down;
        this.car.inputs.eBrake = this.inputs.space;

        this.car.update(deltaTime);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.save();
        this.trailCtx.save();

        //this.ctx.translate(this.canvasWidth / 2.0, this.canvasHeight / 2.0);
        this.ctx.scale(this.drawScale, -this.drawScale);
        //this.ctx.translate(-this.car.position.x, -this.car.position.y);

        this.trailCtx.scale(this.drawScale, -this.drawScale);

        this.car.render();

        this.ctx.restore();
        this.trailCtx.restore();
    }

    run() {
        window.requestAnimationFrame(this.run.bind(this));

        this.currentTime = Date.now();
        let deltaTime = (this.currentTime - this.lastTime) / 1000;

        if (deltaTime > 0) {

            if (deltaTime > 1)
                deltaTime = 0;

            this.update(deltaTime);
            this.render();
            this.lastTime = this.currentTime;
        }
    }

    resize() {
        let dpi = window.devicePixelRatio || 1;
        let w = window.innerWidth * dpi;
        let h = window.innerHeight * dpi;

        //  Apply this w & h to game div and canvas
        this.gameContainer.style.width = w + 'px';
        this.gameContainer.style.height = h + 'px';
        this.canvas.width = w;
        this.canvas.height = h;

        this.trailCanvas.width = w;
        this.trailCanvas.height = h;

        //reset variables
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
    }

    start() {
        this.run();
    }
}