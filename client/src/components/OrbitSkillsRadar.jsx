import React, { useMemo } from 'react';

export default function OrbitSkillsRadar({ skills = [], centerScore = 0 }) {
    // Normalize skills
    const normalizedSkills = useMemo(() => {
        if (!skills || !Array.isArray(skills) || skills.length === 0) {
            // Dummy data for visual effect if no skills provided
            return [
                { label: "React" }, { label: "Node.js" }, { label: "System Design" },
                { label: "Algorithms" }, { label: "Communication" }, { label: "TypeScript" }
            ];
        }
        return skills;
    }, [skills]);

    const orbits = useMemo(() => {
        // Determine number of orbits based on skill count
        const numOrbits = Math.max(2, Math.min(3, Math.ceil(normalizedSkills.length / 3)));
        const orbitData = Array.from({ length: numOrbits }, (_, i) => ({
            radius: 45 + (i * 30),
            skills: []
        }));

        normalizedSkills.forEach((skill, i) => {
            orbitData[i % numOrbits].skills.push({ ...skill, _idx: i });
        });

        orbitData.forEach(orbit => {
            orbit.skills.forEach((s, idx) => {
                s.angle = idx * (360 / orbit.skills.length);
            });
        });

        return orbitData;
    }, [normalizedSkills]);

    return (
        <div className="w-full relative aspect-square max-w-[320px] mx-auto select-none">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Center Node */}
                <circle cx="100" cy="100" r="24" fill="#0A0A0A" stroke="#6D5BFF" strokeWidth="1.5" filter="url(#neonGlow)" />
                <text x="100" y="102" textAnchor="middle" dominantBaseline="middle" fill="#A78BFA" fontSize="12" fontWeight="bold">
                    {centerScore}%
                </text>
                <text x="100" y="114" textAnchor="middle" dominantBaseline="middle" fill="#6B7280" fontSize="5" letterSpacing="0.5">
                    Role Fit
                </text>

                {/* Orbits */}
                {orbits.map((orbit, i) => {
                    const duration = 25 + (i * 15);
                    return (
                        <g key={`orbit-${i}`}>
                            <circle cx="100" cy="100" r={orbit.radius} fill="none" stroke="rgba(109, 91, 255, 0.15)" strokeWidth="1" strokeDasharray="2 4" />

                            <g>
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 100 100"
                                    to="360 100 100"
                                    dur={`${duration}s`}
                                    repeatCount="indefinite"
                                />

                                {orbit.skills.map((skill, j) => {
                                    const rad = (skill.angle * Math.PI) / 180;
                                    const x = 100 + orbit.radius * Math.cos(rad);
                                    const y = 100 + orbit.radius * Math.sin(rad);

                                    return (
                                        <g key={`skill-${j}`} transform={`translate(${x}, ${y})`}>
                                            <circle cx="0" cy="0" r="3.5" fill="#8B5CF6" filter="url(#neonGlow)" className="transition-all duration-300 hover:r-5 cursor-pointer" />
                                            <g>
                                                {/* Counter-rotate text so it stays upright! */}
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="rotate"
                                                    from="360 0 0"
                                                    to="0 0 0"
                                                    dur={`${duration}s`}
                                                    repeatCount="indefinite"
                                                />
                                                <text x="5" y="1.5" fill="#E2E8F0" fontSize="4.5" fontWeight="500" dominantBaseline="middle" className="pointer-events-none drop-shadow-md">
                                                    {skill.label || skill.name || skill}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                })}
                            </g>
                        </g>
                    );
                })}
            </svg>
            {/* Fallback for reduced motion by overriding SVG animations via CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media (prefers-reduced-motion: reduce) {
          svg animateTransform { display: none; }
        }
      `}} />
        </div>
    );
}
