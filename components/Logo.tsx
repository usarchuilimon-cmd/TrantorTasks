import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
    return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Orbit Ring */}
            <path 
                d="M85.3553 14.6447C94.7226 24.0119 94.7226 39.2014 85.3553 48.5685L51.4315 82.4924C42.0642 91.8596 26.8748 91.8596 17.5076 82.4924C8.14036 73.1252 8.14036 57.9358 17.5076 48.5685L51.4315 14.6447C60.7987 5.27749 75.9881 5.27749 85.3553 14.6447Z" 
                stroke="#0891b2" 
                strokeWidth="6" 
                strokeLinecap="round"
                transform="rotate(-15 50 50)"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset="0"
                fill="none"
                style={{ opacity: 0 }} // Hiding this complex path attempt, switching to simple ellipse rotation
            />
             {/* Actual Orbit - Ellipse rotated */}
            <ellipse cx="50" cy="50" rx="55" ry="20" transform="rotate(-45 50 50)" stroke="#0e7490" strokeWidth="8" />

            {/* Molecule/Planet Shape (Light Blue) */}
            <circle cx="35" cy="35" r="18" fill="#67e8f9" />
            <circle cx="55" cy="25" r="14" fill="#67e8f9" />
            
            {/* Orange Planet */}
            <circle cx="45" cy="65" r="10" fill="#f97316" />
        </svg>
    );
};