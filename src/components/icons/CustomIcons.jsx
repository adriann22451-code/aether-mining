import {
  Server,
} from "lucide-react";
import BATTERY_IMG from "../../assets/images/battery.png";
import CARBON_FIBER_IMG from "../../assets/images/carbon-fiber.png";
import COOLING_IMG from "../../assets/images/cooling.png";
import CORE_CRYSTAL_IMG from "../../assets/images/core-crystal.png";
import DRONE_IMG from "../../assets/images/drone.png";
import GPU_IMG from "../../assets/images/gpu.png";
import METAL_INGOT_IMG from "../../assets/images/metal-ingot.png";
import METAL_PLATE_IMG from "../../assets/images/metal-plate.png";
import NANO_ALLOY_IMG from "../../assets/images/nano-alloy.png";
import PROCESSOR_IMG from "../../assets/images/processor.png";
import QUANTUM_ALLOY_IMG from "../../assets/images/quantum-alloy.png";
import RACK_ICON_IMG from "../../assets/images/rack-icon.png";
import AETHER_COIN_IMG from "../../assets/images/aether-coin.png";

export function AetherCoinIcon({ size = 24, style = {}, className = "", dim = false }) {
  return (
    <img
      src={AETHER_COIN_IMG}
      alt="AETHER"
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "inline-block",
        filter: dim ? "grayscale(85%) brightness(0.65)" : "none",
        opacity: dim ? 0.65 : 1,
        transition: "filter 0.15s ease, opacity 0.15s ease",
        ...style,
      }}
    />
  );
}

export function CoolingIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={COOLING_IMG}
      alt="Cooling System"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function BatteryIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={BATTERY_IMG}
      alt="Battery"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function ProcessorIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={PROCESSOR_IMG}
      alt="Processor"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function CoreCrystalIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={CORE_CRYSTAL_IMG}
      alt="Core Crystal"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function CarbonFiberIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={CARBON_FIBER_IMG}
      alt="Carbon Fiber"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function QuantumAlloyIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={QUANTUM_ALLOY_IMG}
      alt="Quantum Alloy"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function NanoAlloyIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={NANO_ALLOY_IMG}
      alt="Nano Alloy"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function MetalPlateIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={METAL_PLATE_IMG}
      alt="Metal Plate"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function MetalIngotIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={METAL_INGOT_IMG}
      alt="Metal Ingot"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function DroneIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={DRONE_IMG}
      alt="Drone"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function GpuIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={GPU_IMG}
      alt="GPU"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}

export function RackIcon({ size = 24, style = {}, className = "" }) {
  return (
    <img
      src={RACK_ICON_IMG}
      alt="Server Rack"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", ...style }}
    />
  );
}
