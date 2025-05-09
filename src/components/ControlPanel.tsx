import React from 'react'

interface ControlPanelProps {
  particleParticleFriction: boolean
  setParticleParticleFriction: (value: boolean) => void
  particleWallFriction: boolean
  setParticleWallFriction: (value: boolean) => void
  gravity: boolean
  setGravity: (value: boolean) => void
  deltaTime: number
  setDeltaTime: (value: number) => void
  isPlaying: boolean
  setIsPlaying: (value: boolean) => void
  onReset: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  particleParticleFriction,
  setParticleParticleFriction,
  particleWallFriction,
  setParticleWallFriction,
  gravity,
  setGravity,
  deltaTime,
  setDeltaTime,
  isPlaying,
  setIsPlaying,
  onReset,
}) => {
  const ToggleSwitch = ({ isActive, onChange, label }: { isActive: boolean; onChange: () => void; label: string }) => (
    <div className="control-group">
      <label>{label}</label>
      <div
        className={`toggle-switch ${isActive ? 'active' : ''}`}
        onClick={onChange}
      />
    </div>
  )

  return (
    <>
      <ToggleSwitch
        isActive={particleParticleFriction}
        onChange={() => setParticleParticleFriction(!particleParticleFriction)}
        label="Particle-Particle Friction"
      />
      <ToggleSwitch
        isActive={particleWallFriction}
        onChange={() => setParticleWallFriction(!particleWallFriction)}
        label="Particle-Wall Friction"
      />
      <ToggleSwitch
        isActive={gravity}
        onChange={() => setGravity(!gravity)}
        label="Gravity"
      />

      <div className="slider-container">
        <label>
          <span>δt</span>
          <span>{deltaTime.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="1.0"
          step="0.01"
          value={deltaTime}
          onChange={(e) => setDeltaTime(parseFloat(e.target.value))}
          className="slider"
        />
      </div>

      <button className="button" onClick={onReset}>
        Reset
      </button>

      <button className="button" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </>
  )
}

export default ControlPanel 