import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { OrbitControls } from '@react-three/drei'
import './App.css'
import PhysicsContainer from './components/PhysicsContainer'
import ControlPanel from './components/ControlPanel'

function App() {
  // Physics simulation states
  const [particleParticleFriction, setParticleParticleFriction] = useState(true)
  const [particleWallFriction, setParticleWallFriction] = useState(false)
  const [gravity, setGravity] = useState(false)
  const [deltaTime, setDeltaTime] = useState(0.5) // Default deltaTime
  const [isPlaying, setIsPlaying] = useState(true)
  
  // Add key to force physics container to re-render on reset
  const [resetKey, setResetKey] = useState(0)
  const [physicsKey, setPhysicsKey] = useState(0)

  const handleReset = () => {
    // Increment reset key to force re-render
    setResetKey(prev => prev + 1)
    setPhysicsKey(prev => prev + 1)
    
    // Pause and then resume the simulation
    setIsPlaying(false)
    setTimeout(() => setIsPlaying(true), 100)
  }

  // Reset physics when gravity changes
  useEffect(() => {
    setPhysicsKey(prev => prev + 1)
  }, [gravity])

  return (
    <div className="app-container">
      <div className="control-panel">
        <h1>Simple Physics</h1>
        <ControlPanel
          particleParticleFriction={particleParticleFriction}
          setParticleParticleFriction={setParticleParticleFriction}
          particleWallFriction={particleWallFriction}
          setParticleWallFriction={setParticleWallFriction}
          gravity={gravity}
          setGravity={setGravity}
          deltaTime={deltaTime}
          setDeltaTime={setDeltaTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onReset={handleReset}
        />
      </div>
      <div className="simulation-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1.5} />
          <Physics
            key={physicsKey}
            gravity={gravity ? [0, -9.81, 0] : [0, 0, 0]}
            timeStep={deltaTime * 0.01}
            paused={!isPlaying}
            interpolate={false}
            colliders={false}
            numSolverIterations={4}
          >
            <PhysicsContainer
              key={resetKey}
              particleParticleFriction={particleParticleFriction}
              particleWallFriction={particleWallFriction}
            />
          </Physics>
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </div>
    </div>
  )
}

export default App
