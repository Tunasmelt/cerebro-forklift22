import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const isDarkRef = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateThemeState = () => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    };
    updateThemeState();
    const observer = new MutationObserver(updateThemeState);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    const particleCount = 50;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.5,
      });
    }

    particlesRef.current = particles;

    const connectionDistance = 150;

    const animate = () => {
      const isDark = isDarkRef.current;
      const clearColor = isDark ? "rgba(10, 25, 47, 0.1)" : "rgba(241, 245, 249, 0.22)";
      const pointCore = isDark ? "rgba(100, 255, 218, 1)" : "rgba(37, 99, 235, 0.6)";
      const pointGlowA = isDark ? "rgba(100, 255, 218, 0.8)" : "rgba(37, 99, 235, 0.28)";
      const pointGlowB = isDark ? "rgba(100, 255, 218, 0.4)" : "rgba(37, 99, 235, 0.14)";
      const lineA = isDark ? "100, 255, 218" : "37, 99, 235";
      const lineB = isDark ? "0, 217, 255" : "59, 130, 246";

      // Clear canvas with semi-transparent overlay for trail effect
      ctx.fillStyle = clearColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 3
        );
        gradient.addColorStop(0, pointGlowA);
        gradient.addColorStop(0.4, pointGlowB);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(
          particle.x - particle.radius * 3,
          particle.y - particle.radius * 3,
          particle.radius * 6,
          particle.radius * 6
        );

        // Draw particle core
        ctx.fillStyle = pointCore;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.4;

            // Draw line with gradient
            const lineGradient = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            );
            lineGradient.addColorStop(0, `rgba(${lineA}, ${opacity})`);
            lineGradient.addColorStop(0.5, `rgba(${lineB}, ${opacity * 0.6})`);
            lineGradient.addColorStop(1, `rgba(${lineA}, ${opacity})`);

            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Base gradient background */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: "linear-gradient(135deg, hsl(var(--hero-gradient-start)), hsl(var(--hero-gradient-end)))",
        }}
      />

      {/* Canvas for animated particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10"
      />
    </>
  );
};

export default AnimatedBackground;
