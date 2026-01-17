import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// eslint-disable-next-line no-unused-vars
const TextTooltip = ({ text, as: Component = 'div', className = '', ...props }) => {
    const [isTruncated, setIsTruncated] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const elementRef = useRef(null);

    const checkTruncation = () => {
        const el = elementRef.current;
        if (el) {
            setIsTruncated(el.scrollWidth > el.clientWidth);
        }
    };

    useEffect(() => {
        checkTruncation();
        window.addEventListener('resize', checkTruncation);
        return () => window.removeEventListener('resize', checkTruncation);
    }, [text]);

    useEffect(() => {
        if (isVisible && elementRef.current) {
            const updatePosition = () => {
                const rect = elementRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top - 10, // Slightly above
                    left: rect.left + (rect.width / 2)
                });
            };

            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    const handleMouseEnter = () => {
        if (isTruncated) {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    return (
        <>
            <Component
                ref={elementRef}
                className={`truncate ${className}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                {text}
            </Component>

            {isVisible && createPortal(
                <div
                    className="fixed px-3 py-2 bg-slate-800 text-white text-[11px] font-medium rounded-lg shadow-xl z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full animate-fade-in"
                    style={{
                        top: coords.top,
                        left: coords.left
                    }}
                >
                    {/* Arrow pointing down */}
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                    <span className="relative z-10 whitespace-nowrap">{text}</span>
                </div>,
                document.body
            )}
        </>
    );
};

export default TextTooltip;
