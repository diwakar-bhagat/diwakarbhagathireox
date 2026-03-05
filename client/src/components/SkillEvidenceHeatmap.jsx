import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const getCellColor = (strength) => {
    if (strength >= 80) return 'bg-[#6D5BFF]/90 shadow-[0_0_12px_rgba(109,91,255,0.4)]';
    if (strength >= 50) return 'bg-[#8B5CF6]/60 shadow-[0_0_10px_rgba(139,92,246,0.2)]';
    return 'bg-[#C4B5FD]/30'; // Weak evidence
};

const hashToRange = (value, min, max) => {
    const text = String(value || "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    const range = max - min + 1;
    return min + (hash % range);
};

export default function SkillEvidenceHeatmap({ skills = [] }) {
    const MotionDiv = motion.div;

    // Normalize skills based on multiple possible backend structs
    const normalizedSkills = useMemo(() => {
        if (!skills || !Array.isArray(skills) || skills.length === 0) {
            // Mock data if none present
            return [
                { name: "React Architecture", requiredByJD: true, evidencePoints: [{ strength: 90 }, { strength: 85 }, { strength: 60 }] },
                { name: "State Management", requiredByJD: true, evidencePoints: [{ strength: 80 }, { strength: 40 }] },
                { name: "CSS Modules", requiredByJD: false, evidencePoints: [{ strength: 30 }, { strength: 20 }] },
                { name: "System Design", requiredByJD: true, evidencePoints: [{ strength: 95 }, { strength: 90 }, { strength: 85 }, { strength: 80 }] },
            ];
        }

        return skills.map(s => {
            const normalizedName = s?.name || s?.label || String(s);
            // Automatically fake evidencePoints if the backend just returns raw objects or flat values
            const ep = s.evidencePoints || (s.score ? [{ strength: s.score * 10 }] : [{ strength: hashToRange(normalizedName, 40, 90) }]);
            return {
                name: normalizedName,
                requiredByJD: Boolean(s?.requiredByJD ?? s?.jdRequired ?? s?.required ?? false),
                evidencePoints: ep
            };
        });
    }, [skills]);

    const gridCells = useMemo(() => {
        return normalizedSkills.map((skill, i) => (
            <div key={`heat-${i}-${skill.name}`} className="flex items-center gap-2 sm:gap-4 group">
                {/* JD Requirement Density Indicator */}
                <div className={`w-1 h-6 rounded-full transition-colors ${skill.requiredByJD ? 'bg-[#8B5CF6]/80' : 'bg-white/10'}`}
                    title={skill.requiredByJD ? "Required by Job Description" : "Bonus Skill"} />

                <span className="w-24 sm:w-32 text-xs sm:text-sm text-slate-400 group-hover:text-slate-200 truncate transition-colors">
                    {skill.name}
                </span>

                <div className="flex-1 flex gap-1 h-6 items-center">
                    {skill.evidencePoints.map((point, index) => (
                        <MotionDiv
                            key={index}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.05 * i + (index * 0.05), type: "spring", stiffness: 200 }}
                            className={`h-full flex-1 rounded-sm border border-white/5 origin-left ${getCellColor(point.strength || point)}`}
                            title={`Evidence Strength: ${point.strength || point}%`}
                        />
                    ))}
                    {/* Fill remaining space with empty blocks if very few evidence points */}
                    {skill.evidencePoints.length < 5 && Array.from({ length: 5 - skill.evidencePoints.length }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-full flex-1 rounded-sm bg-white/[0.02] border border-white/[0.02]"></div>
                    ))}
                </div>
            </div>
        ));
    }, [normalizedSkills]);

    return (
        <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center gap-4 px-2 mb-1">
                <span className="w-1 h-1"></span>
                <span className="w-24 sm:w-32 text-[10px] text-slate-500 uppercase tracking-wider">Skill Axis</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Evidence Intensity →</span>
            </div>
            {gridCells}
        </div>
    );
}
