import * as THREE from "three";
import { gsap } from "gsap";
import { vertexShader, fragmentShader } from "./shaders";
import {
  UIManager,
  ParticleSettings,
  DEFAULT_SETTINGS,
} from "./managers/UIManager";

class ParticleMorpher {
  private container: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private settings: ParticleSettings;
  private particles: THREE.Points | null = null;
  private readonly models: { [key: string]: Float32Array } = {};
  private currentShape: string = "heart";
  private isTransitioning: boolean = false;
  private lastTime: number = 0;
  private lastMorphTime: number = 0;
  private mouse: THREE.Vector2 = new THREE.Vector2(-100, -100);
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseWorld: THREE.Vector3 = new THREE.Vector3();
  private uiManager: UIManager;

  constructor() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas element not found");
    this.container = canvas;

    this.settings = { ...DEFAULT_SETTINGS }; // Clone defaults

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.uiManager = new UIManager(
      this.settings,
      (shape) => this.morphTo(shape),
      (color) => this.setColor(color)
    );

    this.init();
  }

  private async init() {
    this.setupParticles();
    this.setupEvents();
    this.uiManager.init();

    await this.loadModels();
    this.hideLoader();

    this.morphTo("heart");
    this.animate();
  }

  private setupParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.settings.particleCount * 3);

    // Random initial positions
    for (let i = 0; i < this.settings.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const randoms = new Float32Array(this.settings.particleCount);
    for (let i = 0; i < this.settings.particleCount; i++) {
      randoms[i] = Math.random();
    }
    geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMouse: { value: new THREE.Vector3() },
        uRadius: { value: this.settings.interactionRadius },
        uStrength: { value: this.settings.interactionStrength },
        uColor: { value: this.settings.currentColor },
        uSize: { value: this.settings.particleSize },
        uOpacity: { value: 0.8 },
        uTime: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private async loadModels() {
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) progressBar.style.width = `100%`;

    this.models["heart"] = this.getHeartPositions();
  }

  public morphTo(shape: string) {
    if (this.isTransitioning) return;
    if (!this.particles) return;
    this.isTransitioning = true;

    const targetPositions = this.models[shape];

    if (!targetPositions) {
      this.isTransitioning = false;
      return;
    }

    const currentPositions = this.particles.geometry.attributes.position
      .array as Float32Array;

    gsap.to(currentPositions, {
      duration: this.settings.morphDuration / this.settings.animationSpeed,
      endArray: targetPositions as any,
      ease: "expo.inOut",
      onUpdate: () => {
        if (this.particles)
          this.particles.geometry.attributes.position.needsUpdate = true;
      },
      onComplete: () => {
        this.isTransitioning = false;
        this.currentShape = shape;
        console.log(`Morphed to: ${this.currentShape}`);
        this.uiManager.updateActiveShape(shape);
      },
    });
  }

  private getHeartPositions(): Float32Array {
    const positions = new Float32Array(this.settings.particleCount * 3);
    for (let i = 0; i < this.settings.particleCount; i++) {
      let x, y, z;
      while (true) {
        x = (Math.random() - 0.5) * 3.0;
        y = (Math.random() - 0.5) * 3.0;
        z = (Math.random() - 0.5) * 3.0;
        const x2 = x * x;
        const y2 = y * y;
        const z2 = z * z;
        const a = x2 + 2.25 * z2 + y2 - 1.0;
        const val = a * a * a - x2 * y * y2 - 0.1125 * z2 * y * y2;
        if (val <= 0.0 && val > -0.1) {
          const scale = 10;
          positions[i * 3] = x * scale;
          positions[i * 3 + 1] = y * scale;
          positions[i * 3 + 2] = z * scale;
          break;
        }
      }
    }
    return positions;
  }

  private setColor(colorHex: string) {
    if (!this.particles) return;
    const color = new THREE.Color(colorHex);
    if (
      this.particles &&
      this.particles.material instanceof THREE.ShaderMaterial
    ) {
      gsap.to(this.particles.material.uniforms.uColor.value, {
        duration: 1,
        r: color.r,
        g: color.g,
        b: color.b,
        ease: "power2.out",
      });
    }
    this.settings.currentColor = color;
  }

  private setupEvents() {
    window.addEventListener("resize", () => this.handleResize());

    window.addEventListener("setting-update", (e: any) => {
      const { type, value } = e.detail;
      if (
        !this.particles ||
        !(this.particles.material instanceof THREE.ShaderMaterial)
      )
        return;

      const uniforms = this.particles.material.uniforms;
      switch (type) {
        case "size":
          uniforms.uSize.value = value;
          break;
        case "radius":
          uniforms.uRadius.value = value;
          break;
        case "strength":
          uniforms.uStrength.value = value;
          break;
        case "autoMorphReset":
          this.lastMorphTime = performance.now();
          break;
      }
    });

    const updateMouse = (x: number, y: number) => {
      this.mouse.x = (x / window.innerWidth) * 2 - 1;
      this.mouse.y = -(y / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", (e) =>
      updateMouse(e.clientX, e.clientY)
    );

    const handleTouch = (e: TouchEvent) => {
      const isCanvas = (e.target as HTMLElement).id === "canvas";
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
      if (isCanvas) e.preventDefault();
    };

    window.addEventListener("touchstart", handleTouch, { passive: false });
    window.addEventListener("touchmove", handleTouch, { passive: false });

    const resetMouse = () => this.mouse.set(-100, -100);
    window.addEventListener("mouseleave", resetMouse);
    window.addEventListener("touchend", resetMouse);

    this.handleResize();
  }

  private handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.updateCameraPosition();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateCameraPosition() {
    const aspect = this.camera.aspect;
    const fov = this.camera.fov;
    const targetDim = 25;
    const fovRad = (fov * Math.PI) / 180;
    let dist;

    if (aspect >= 1) {
      dist = targetDim / (2 * Math.tan(fovRad / 2));
    } else {
      dist = targetDim / (aspect * 2 * Math.tan(fovRad / 2));
    }

    const finalDist = Math.max(dist, 40);
    this.camera.position.set(0, 10, finalDist);
    this.camera.lookAt(0, 0, 0);
  }

  private hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => (loader.style.display = "none"), 800);
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    if (this.settings.autoRotate && this.particles) {
      this.particles.rotation.y += 0.005 * this.settings.animationSpeed;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.raycaster.ray.intersectPlane(plane, this.mouseWorld);

    if (
      this.particles &&
      this.particles.material instanceof THREE.ShaderMaterial
    ) {
      this.particles.material.uniforms.uMouse.value.copy(this.mouseWorld);
      this.particles.material.uniforms.uTime.value = performance.now();
    }

    this.updateStats();
    this.handleAutoMorph();
    this.renderer.render(this.scene, this.camera);
  }

  private handleAutoMorph() {
    if (!this.settings.autoMorph || this.isTransitioning) return;

    const now = performance.now();
    if (now - this.lastMorphTime > this.settings.autoMorphDuration) {
      const morphKeys = Object.keys(this.models);
      if (morphKeys.length > 0) {
        const currentIndex = morphKeys.indexOf(this.currentShape);
        const nextIndex = (currentIndex + 1) % morphKeys.length;
        this.morphTo(morphKeys[nextIndex]);
        this.lastMorphTime = now;
      }
    }
  }

  private updateStats() {
    if (!this.lastTime) this.lastTime = performance.now();
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    if (Math.random() > 0.9) {
      const fps = Math.round(1000 / delta);
      const fpsCounter = document.getElementById("fps-counter");
      if (fpsCounter) fpsCounter.textContent = fps.toString();
    }
  }
}

new ParticleMorpher();
