import * as THREE from "three";

export interface ParticleSettings {
  particleCount: number;
  particleSize: number;
  animationSpeed: number;
  autoRotate: boolean;
  morphDuration: number;
  currentColor: THREE.Color;
  autoMorph: boolean;
  autoMorphDuration: number;
  interactionRadius: number;
  interactionStrength: number;
}

export const DEFAULT_SETTINGS: ParticleSettings = {
  particleCount: 60000,
  particleSize: 3.6,
  animationSpeed: 1,
  autoRotate: true,
  morphDuration: 2.5,
  currentColor: new THREE.Color(0x088cff),
  autoMorph: true,
  autoMorphDuration: 5000,
  interactionRadius: 3.0,
  interactionStrength: 10.0,
};

export class UIManager {
  private settings: ParticleSettings;
  private onMorph: (shape: string) => void;
  private onColorChange: (color: string) => void;

  constructor(
    settings: ParticleSettings,
    onMorph: (shape: string) => void,
    onColorChange: (color: string) => void
  ) {
    this.settings = settings;
    this.onMorph = onMorph;
    this.onColorChange = onColorChange;
  }

  public init() {
    this.setupShapeButtons();
    this.setupSliders();
    this.setupColorButtons();
    this.setupToggles();
    this.setupFullscreen();
    this.setupPanels();
  }

  private setupShapeButtons() {
    const shapes = ["heart"];
    shapes.forEach((shape) => {
      const btn = document.getElementById(`btn-${shape}`);
      if (btn) {
        btn.addEventListener("click", () => this.onMorph(shape));
      }
    });
  }

  public updateActiveShape(shape: string) {
    document.querySelectorAll(".shape-btn").forEach((btn) => {
      const el = btn as HTMLElement;
      el.classList.toggle("active", el.dataset.shape === shape);
    });
  }

  private setupSliders() {
    this.bindSlider("speed-slider", "speed-value", (val) => {
      this.settings.animationSpeed = val;
      return `${val.toFixed(1)}x`;
    });

    this.bindSlider(
      "particle-size-slider",
      "size-value",
      (val) => {
        this.settings.particleSize = val;
        // Note: Uniform updates are handled by binding to settings object reference,
        // but 'size' uniform needs manual update if strictly following reactive pattern.
        // For now, main loop or setter in main class picks it up, or we dispatch event.
        // In this refactor, we rely on the main class checking settings or direct access if improved.
        // Ideally, UIManager executes a callback for these updates.
        return val.toFixed(1);
      },
      (val) => {
        // Dispatch custom event or callback if needed for immediate uniform update
        window.dispatchEvent(
          new CustomEvent("setting-update", {
            detail: { type: "size", value: val },
          })
        );
      }
    );

    this.bindSlider(
      "interaction-radius-slider",
      "radius-value",
      (val) => {
        this.settings.interactionRadius = val;
        return val.toFixed(1);
      },
      (val) => {
        window.dispatchEvent(
          new CustomEvent("setting-update", {
            detail: { type: "radius", value: val },
          })
        );
      }
    );

    this.bindSlider(
      "interaction-strength-slider",
      "strength-value",
      (val) => {
        this.settings.interactionStrength = val;
        return val.toFixed(1);
      },
      (val) => {
        window.dispatchEvent(
          new CustomEvent("setting-update", {
            detail: { type: "strength", value: val },
          })
        );
      }
    );
  }

  private bindSlider(
    id: string,
    valueId: string,
    onInput: (val: number) => string,
    onUpdate?: (val: number) => void
  ) {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId);
    if (slider) {
      slider.addEventListener("input", (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        const display = onInput(val);
        if (valueDisplay) valueDisplay.textContent = display;
        if (onUpdate) onUpdate(val);
      });
    }
  }

  private setupColorButtons() {
    document.querySelectorAll(".color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".color-btn")
          .forEach((b) => b.classList.remove("active"));
        (btn as HTMLElement).classList.add("active");
        const color = (btn as HTMLElement).dataset.color;
        if (color) this.onColorChange(color);
      });
    });
  }

  private setupToggles() {
    const autoRotateCheck = document.getElementById(
      "auto-rotate"
    ) as HTMLInputElement;
    if (autoRotateCheck) {
      autoRotateCheck.addEventListener("change", (e) => {
        this.settings.autoRotate = (e.target as HTMLInputElement).checked;
      });
    }

    const autoMorphCheck = document.getElementById(
      "auto-morph"
    ) as HTMLInputElement;
    if (autoMorphCheck) {
      autoMorphCheck.checked = this.settings.autoMorph;
      autoMorphCheck.addEventListener("change", (e) => {
        this.settings.autoMorph = (e.target as HTMLInputElement).checked;
        if (this.settings.autoMorph) {
          window.dispatchEvent(
            new CustomEvent("setting-update", {
              detail: { type: "autoMorphReset" },
            })
          );
        }
      });
    }
  }

  private setupFullscreen() {
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          (e.target as HTMLElement).textContent = "Exit Fullscreen";
        } else {
          document.exitFullscreen();
          (e.target as HTMLElement).textContent = "Fullscreen";
        }
      });
    }
  }

  private setupPanels() {
    const controlPanel = document.querySelector(".control-panel");
    const controlToggle = document.getElementById("control-toggle");
    if (controlPanel && controlToggle) {
      controlToggle.addEventListener("click", () => {
        controlPanel.classList.toggle("collapsed");
      });
    }

    const infoPanel = document.getElementById("info-panel");
    const infoToggle = document.getElementById("info-toggle");
    if (infoPanel && infoToggle) {
      infoToggle.addEventListener("click", () => {
        infoPanel.classList.toggle("open");
      });
    }
  }
}
