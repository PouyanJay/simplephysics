import { useRef, useState, useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'

interface PhysicsContainerProps {
  particleParticleFriction: boolean
  particleWallFriction: boolean
}

// Container dimensions
const CONTAINER_SIZE = 2.5
const HALF_SIZE = CONTAINER_SIZE / 2
const WALL_THICKNESS = 0.05

// Number of particles
const NUM_PARTICLES = 100
const PARTICLE_RADIUS = 0.08

// Define the particle instance type
interface Particle {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
}

// Function to generate initial particles data
const generateParticles = (): Particle[] => {
  const particles: Particle[] = []
  const padding = PARTICLE_RADIUS * 2
  
  for (let i = 0; i < NUM_PARTICLES; i++) {
    // Random position inside container with padding
    const x = (Math.random() * (CONTAINER_SIZE - padding * 2) - HALF_SIZE + padding)
    const y = (Math.random() * (CONTAINER_SIZE - padding * 2) - HALF_SIZE + padding)
    const z = (Math.random() * (CONTAINER_SIZE - padding * 2) - HALF_SIZE + padding)
    
    // Random velocity
    const speed = 0.5 + Math.random() * 1.5
    const vx = (Math.random() - 0.5) * speed
    const vy = (Math.random() - 0.5) * speed
    const vz = (Math.random() - 0.5) * speed
    
    particles.push({
      id: i,
      position: [x, y, z] as [number, number, number],
      velocity: [vx, vy, vz] as [number, number, number],
    })
  }
  
  return particles
}

const PhysicsContainer: React.FC<PhysicsContainerProps> = ({
  particleParticleFriction,
  particleWallFriction
}) => {
  // Use counter to force re-render on reset
  const [resetCounter, setResetCounter] = useState(0)
  
  // Generate particles
  const particles = useMemo(() => generateParticles(), [resetCounter])
  
  // Force container re-render when frictions change
  useEffect(() => {
    setResetCounter(prev => prev + 1)
  }, [particleParticleFriction, particleWallFriction])

  // Rotate the container slightly for better 3D perspective
  const groupRef = useRef<THREE.Group>(null)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.PI / 6
      groupRef.current.rotation.x = Math.PI / 12
    }
  }, [])

  return (
    <>
      {/* Container */}
      <group ref={groupRef} key={resetCounter}>
        {/* Walls of the container - rendered as transparent wireframe */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[CONTAINER_SIZE, CONTAINER_SIZE, CONTAINER_SIZE]} />
          <meshStandardMaterial wireframe color="white" transparent opacity={0.3} />
        </mesh>

        {/* Invisible walls with physics colliders */}
        <RigidBody type="fixed" position={[0, 0, 0]} restitution={0.7} friction={particleWallFriction ? 0.4 : 0}>
          {/* Bottom */}
          <CuboidCollider
            args={[HALF_SIZE, WALL_THICKNESS, HALF_SIZE]}
            position={[0, -HALF_SIZE, 0]}
          />
          {/* Top */}
          <CuboidCollider
            args={[HALF_SIZE, WALL_THICKNESS, HALF_SIZE]}
            position={[0, HALF_SIZE, 0]}
          />
          {/* Left */}
          <CuboidCollider
            args={[WALL_THICKNESS, HALF_SIZE, HALF_SIZE]}
            position={[-HALF_SIZE, 0, 0]}
          />
          {/* Right */}
          <CuboidCollider
            args={[WALL_THICKNESS, HALF_SIZE, HALF_SIZE]}
            position={[HALF_SIZE, 0, 0]}
          />
          {/* Front */}
          <CuboidCollider
            args={[HALF_SIZE, HALF_SIZE, WALL_THICKNESS]}
            position={[0, 0, -HALF_SIZE]}
          />
          {/* Back */}
          <CuboidCollider
            args={[HALF_SIZE, HALF_SIZE, WALL_THICKNESS]}
            position={[0, 0, HALF_SIZE]}
          />
        </RigidBody>

        {/* Particles */}
        {particles.map((particle) => (
          <RigidBody
            key={particle.id}
            position={particle.position}
            linearVelocity={particle.velocity}
            restitution={0.7} // Bounciness
            friction={particleParticleFriction ? 0.4 : 0}
            colliders={false}
          >
            <BallCollider args={[PARTICLE_RADIUS]} />
            <mesh>
              <sphereGeometry args={[PARTICLE_RADIUS, 16, 16]} />
              <meshStandardMaterial color={0xfe8c8c} />
            </mesh>
          </RigidBody>
        ))}
      </group>
    </>
  )
}

export default PhysicsContainer 