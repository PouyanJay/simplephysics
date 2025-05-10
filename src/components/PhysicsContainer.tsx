import { useRef, useState, useEffect, useMemo } from 'react'
import { RigidBody, CuboidCollider, BallCollider, RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface PhysicsContainerProps {
  particleParticleFriction: boolean
  particleWallFriction: boolean
  gravity?: boolean
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

// Create a debug object for logging (to avoid console spam)
const DEBUG = {
  logCount: 0,
  maxLogs: 10,
  issues: new Set<string>(),
  
  log: (msg: string, ...args: any[]) => {
    if (DEBUG.logCount < DEBUG.maxLogs) {
      console.log(msg, ...args)
      DEBUG.logCount++
    }
  },
  
  logIssue: (issueType: string, details: any) => {
    const key = `${issueType}-${JSON.stringify(details)}`
    if (!DEBUG.issues.has(key)) {
      console.warn(`PHYSICS ISSUE DETECTED [${issueType}]:`, details)
      DEBUG.issues.add(key)
    }
  }
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
    
    // Random velocity with more conservative speeds (slower) to ensure stable simulation
    const speed = 0.5 + Math.random() * 0.5 // Reduced range to ensure stability
    const phi = Math.random() * Math.PI * 2
    const theta = Math.random() * Math.PI
    
    // Convert from spherical to cartesian coordinates for uniform direction distribution
    const vx = speed * Math.sin(theta) * Math.cos(phi)
    const vy = speed * Math.sin(theta) * Math.sin(phi)
    const vz = speed * Math.cos(theta)
    
    particles.push({
      id: i,
      position: [x, y, z] as [number, number, number],
      velocity: [vx, vy, vz] as [number, number, number],
    })
  }
  
  return particles
}

// Function to check if a velocity has invalid values
const hasInvalidVelocity = (vel: { x: number, y: number, z: number }) => {
  return isNaN(vel.x) || isNaN(vel.y) || isNaN(vel.z) ||
         !isFinite(vel.x) || !isFinite(vel.y) || !isFinite(vel.z) ||
         Math.abs(vel.x) > 100 || Math.abs(vel.y) > 100 || Math.abs(vel.z) > 100 // Lower threshold
}

const PhysicsContainer: React.FC<PhysicsContainerProps> = ({
  particleParticleFriction,
  particleWallFriction,
  gravity = false
}) => {
  // Use counter to force re-render on reset
  const [resetCounter, setResetCounter] = useState(0)
  
  // Generate particles
  const particles = useMemo(() => generateParticles(), [resetCounter])
  
  // Store references to rigid bodies to monitor/correct velocities
  const particleRefs = useRef<RapierRigidBody[]>([])
  
  // Reset counter for checking status
  const statusCheckCounter = useRef(0)
  
  // Debug state to track issues
  const [hasDetectedIssue, setHasDetectedIssue] = useState(false)
  
  // Force container re-render when frictions or gravity change
  useEffect(() => {
    setResetCounter(prev => prev + 1)
    // Clean up refs when we reset
    particleRefs.current = []
    // Reset debug state
    DEBUG.logCount = 0
    DEBUG.issues.clear()
    setHasDetectedIssue(false)
  }, [particleParticleFriction, particleWallFriction, gravity])

  // Rotate the container slightly for better 3D perspective
  const groupRef = useRef<THREE.Group>(null)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.PI / 6
      groupRef.current.rotation.x = Math.PI / 12
    }
  }, [])
  
  // Store original speeds of particles to maintain constant speed
  const particleSpeeds = useRef<Map<number, number>>(new Map())
  
  // Initialize particle speeds
  useEffect(() => {
    particleSpeeds.current.clear()
    particles.forEach((particle, index) => {
      const v = particle.velocity
      const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
      particleSpeeds.current.set(index, speed)
    })
  }, [particles])
  
  // Frame counter to control frequency of checks
  const frameCounter = useRef(0)
  
  // Check velocities after initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      let allValid = true
      particleRefs.current.forEach((body, index) => {
        if (body) {
          try {
            const vel = body.linvel()
            if (hasInvalidVelocity(vel)) {
              allValid = false
              DEBUG.logIssue('INITIAL_INVALID_VELOCITY', {
                particleIndex: index,
                velocity: vel
              })
            }
          } catch (error) {
            allValid = false
            DEBUG.logIssue('INITIAL_VELOCITY_CHECK_ERROR', {
              particleIndex: index,
              error: String(error)
            })
          }
        }
      })
      
      if (allValid) {
        DEBUG.log('All particles have valid initial velocities')
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [resetCounter])
  
  // Use a more conservative approach to handle the zero-friction case
  useFrame(() => {
    // Only check every 3rd frame - frequent enough to catch issues but not every frame
    frameCounter.current = (frameCounter.current + 1) % 3
    if (frameCounter.current !== 0) return
    
    // Only apply in zero-friction mode
    if (!particleParticleFriction && !particleWallFriction) {
      // Periodically check system status (every ~300 frames or 5 seconds at 60fps)
      statusCheckCounter.current += 1
      if (statusCheckCounter.current % 100 === 0) {
        let anyNaN = false
        let anyInfinite = false
        
        particleRefs.current.forEach((body) => {
          if (!body) return
          
          try {
            const vel = body.linvel()
            
            // Simple check for critical issues that would cause crashes
            if (isNaN(vel.x) || isNaN(vel.y) || isNaN(vel.z)) {
              anyNaN = true
            } else if (!isFinite(vel.x) || !isFinite(vel.y) || !isFinite(vel.z)) {
              anyInfinite = true
            }
          } catch (error) {
            // Ignore errors
          }
        })
        
        // If critical issues detected, flag it
        if (anyNaN || anyInfinite) {
          setHasDetectedIssue(true)
        }
      }
      
      // Process all particles and ensure their velocities remain valid
      particleRefs.current.forEach((body, index) => {
        if (!body || body.isSleeping()) return
        
        try {
          const vel = body.linvel()
          
          // Skip if velocity contains invalid values and reset it
          if (hasInvalidVelocity(vel)) {
            // Reset to a safe random velocity with the original speed (conservative)
            const originalSpeed = particleSpeeds.current.get(index) || 0.5
            const safeSpeed = Math.min(originalSpeed, 2.0) // Cap the speed to prevent instability
            
            const phi = Math.random() * Math.PI * 2
            const theta = Math.random() * Math.PI
            
            const vx = safeSpeed * Math.sin(theta) * Math.cos(phi)
            const vy = safeSpeed * Math.sin(theta) * Math.sin(phi)
            const vz = safeSpeed * Math.cos(theta)
            
            body.setLinvel({ x: vx, y: vy, z: vz }, true)
            return
          }
          
          // Get current velocity magnitude
          const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
          
          // If speed is almost zero, give it a small push
          if (currentSpeed < 0.1) {
            const originalSpeed = Math.min(particleSpeeds.current.get(index) || 0.5, 1.0)
            const phi = Math.random() * Math.PI * 2
            const theta = Math.random() * Math.PI
            
            const vx = originalSpeed * Math.sin(theta) * Math.cos(phi)
            const vy = originalSpeed * Math.sin(theta) * Math.sin(phi)
            const vz = originalSpeed * Math.cos(theta)
            
            body.setLinvel({ x: vx, y: vy, z: vz }, true)
            return
          }
          
          // If speed is too high, cap it to prevent instability
          if (currentSpeed > 10.0) {
            const scale = 10.0 / currentSpeed
            body.setLinvel({ 
              x: vel.x * scale, 
              y: vel.y * scale, 
              z: vel.z * scale 
            }, true)
            return
          }
          
          // Conservative speed correction
          // Only apply for deviations > 10% and cap max speed at 5.0
          const originalSpeed = particleSpeeds.current.get(index)
          if (originalSpeed && 
              Math.abs(currentSpeed - originalSpeed) / originalSpeed > 0.1 &&
              currentSpeed < originalSpeed * 0.9) { // Only boost if slower than expected
            
            // Normalize current velocity and scale by original speed (with cap)
            const safeSpeed = Math.min(originalSpeed, 5.0)
            const scale = safeSpeed / currentSpeed
            
            body.setLinvel({ 
              x: vel.x * scale, 
              y: vel.y * scale, 
              z: vel.z * scale 
            }, true)
          }
        } catch (error) {
          // Silently catch errors to prevent simulation interruption
        }
      })
    }
  })

  // Collect a reference when a rigid body is created
  const addBodyRef = (body: RapierRigidBody) => {
    if (body && !particleRefs.current.includes(body)) {
      particleRefs.current.push(body)
    }
  }

  return (
    <>
      {/* Container */}
      <group ref={groupRef} key={resetCounter}>
        {/* Walls of the container - rendered as transparent wireframe */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[CONTAINER_SIZE, CONTAINER_SIZE, CONTAINER_SIZE]} />
          <meshStandardMaterial wireframe color="white" transparent opacity={0.3} />
        </mesh>

        {/* Warning indicator for detected issues */}
        {hasDetectedIssue && (
          <mesh position={[0, -HALF_SIZE - 0.5, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}

        {/* Invisible walls with physics colliders */}
        <RigidBody 
          type="fixed" 
          position={[0, 0, 0]} 
          restitution={0.999} // Slightly less than 1.0 to avoid energy accumulation
          friction={particleWallFriction ? 0.3 : 0}
          linearDamping={0}
          angularDamping={0}
        >
          {/* Bottom */}
          <CuboidCollider
            args={[HALF_SIZE, WALL_THICKNESS, HALF_SIZE]}
            position={[0, -HALF_SIZE, 0]}
            restitution={0.999}
            friction={particleWallFriction ? 0.3 : 0}
          />
          {/* Top */}
          <CuboidCollider
            args={[HALF_SIZE, WALL_THICKNESS, HALF_SIZE]}
            position={[0, HALF_SIZE, 0]}
            restitution={0.999}
            friction={particleWallFriction ? 0.3 : 0}
          />
          {/* Left */}
          <CuboidCollider
            args={[WALL_THICKNESS, HALF_SIZE, HALF_SIZE]}
            position={[-HALF_SIZE, 0, 0]}
            restitution={0.999}
            friction={particleWallFriction ? 0.3 : 0}
          />
          {/* Right */}
          <CuboidCollider
            args={[WALL_THICKNESS, HALF_SIZE, HALF_SIZE]}
            position={[HALF_SIZE, 0, 0]}
            restitution={0.999}
            friction={particleWallFriction ? 0.3 : 0}
          />
          {/* Front */}
          <CuboidCollider
            args={[HALF_SIZE, HALF_SIZE, WALL_THICKNESS]}
            position={[0, 0, -HALF_SIZE]}
            restitution={0.999}
            friction={particleWallFriction ? 0.3 : 0}
          />
          {/* Back */}
          <CuboidCollider
            args={[HALF_SIZE, HALF_SIZE, WALL_THICKNESS]}
            position={[0, 0, HALF_SIZE]}
            restitution={0.999}
            friction={particleWallFriction ? 0.3 : 0}
          />
        </RigidBody>

        {/* Particles */}
        {particles.map((particle) => (
          <RigidBody
            key={particle.id}
            ref={addBodyRef}
            position={particle.position}
            linearVelocity={particle.velocity}
            restitution={0.999} // Slightly less than 1.0 to avoid energy accumulation
            friction={particleParticleFriction ? 0.3 : 0}
            linearDamping={0}
            angularDamping={0}
            ccd={false} // Disable CCD for better stability
            canSleep={false} // Prevent particles from sleeping
            colliders={false}
            mass={1}
            gravityScale={gravity ? 1 : 0}
          >
            <BallCollider 
              args={[PARTICLE_RADIUS]} 
              restitution={0.999}
              friction={particleParticleFriction ? 0.3 : 0}
              density={1}
            />
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