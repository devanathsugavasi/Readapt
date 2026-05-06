'use client';
import { useEffect, useRef } from 'react';

export default function CursorOrb() {
  const orbRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMove);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      currentRef.current.x = lerp(currentRef.current.x, posRef.current.x, 0.08);
      currentRef.current.y = lerp(currentRef.current.y, posRef.current.y, 0.08);
      if (orbRef.current) {
        orbRef.current.style.left = `${currentRef.current.x}px`;
        orbRef.current.style.top = `${currentRef.current.y}px`;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return <div ref={orbRef} className="cursor-orb" aria-hidden="true" />;
}
