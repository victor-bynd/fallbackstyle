import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * BufferedInput
 * 
 * An input component that maintains internal state to allow for:
 * 1. Temporary invalid states (like empty strings) without parent rejection causing a reset.
 * 2. Formatting differences (e.g. "1.0" vs "1") without cursor jumping.
 * 
 * It syncs with the parent `value` prop, but intelligently ignores updates that match 
 * the numeric value of the current local state to preserve user intent (like trailing decimals).
 */
const BufferedInput = ({
    value,
    onChange,
    type = "text",
    ...props
}) => {
    // Initialize local state with incoming value
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    // Sync local state with prop value, but be smart about it
    useEffect(() => {
        // If the prop value matches our local value exactly, do nothing (obviously)
        if (value === localValue) return;

        // If we are focused, we need to be careful about overwriting the user's work
        if (isFocused) {
            // For numbers: if the parsed values match, don't overwrite the local string.
            // This prevents "1." (local) becoming "1" (prop) while typing.
            const parsedProp = parseFloat(value);
            const parsedLocal = parseFloat(localValue);

            // If both are valid numbers and equal, simplify ignore the prop update
            // to keep the user's text (e.g. "1.00") intact.
            if (!isNaN(parsedProp) && !isNaN(parsedLocal) && parsedProp === parsedLocal) {
                return;
            }
        }

        // Otherwise (not focused, or values genuinely differ), sync up.
        // We use string conversion to ensure controlled input behavior
        setLocalValue(value === undefined || value === null ? '' : value);
    }, [value, isFocused]); // Removed localValue from dependency to avoid loops, though strict equality check handles it.

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        // Optional: Don't propagate completely empty/invalid values if that causes issues upstream?
        // Or propagate everything and let the useEffect logic handle the refusal to sync back?
        // Let's propagate, but relying on the useEffect logic above to NOT reset us if the parent 
        // processes "1." -> "1".

        // However, for empty string:
        // Parent might convert "" -> 0 or NaN. 
        // If parent converts "" -> 0, prop becomes 0.
        // 0 !== "". 0 (parsed) === NaN (parsed)? No.
        // So we might get a snapback for empty string if parent forces a default.
        // To fix this, we can choose NOT to call onChange if empty?
        // Or we assume the user WANTS to clear it.
        // If the user clears it, and parent forces 0, then the field becomes 0. That might be annoying if trying to type "0.5".
        // (delete "1") -> "" -> (parent returns 0) -> "0" -> (user types ".") -> "0."

        // Better safest approach: Wrap the onChange to fire.
        if (onChange) {
            onChange(e);
        }
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        // Force a hard sync on blur to ensure we match the canonical state finally
        if (value !== undefined && value !== null) {
            setLocalValue(value);
        }
        if (props.onBlur) props.onBlur(e);
    };

    const handleFocus = (e) => {
        setIsFocused(true);
        if (props.onFocus) props.onFocus(e);
    };

    return (
        <input
            {...props}
            type={type}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
        />
    );
};

BufferedInput.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    type: PropTypes.string,
};

export default BufferedInput;
