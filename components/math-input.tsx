"use client";

import { useEffect, useRef } from 'react';
import 'mathlive';

// We need to use 'type' to reference the element type without attempting to import the class directly
type MathfieldElement = HTMLElement & {
  value: string;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, listener: EventListener): void;
  remove(): void;
};

// Register the custom element if it hasn't been registered already
// This is needed because MathfieldElement is a custom element
if (typeof window !== 'undefined' && !customElements.get('math-field')) {
  // The custom element will be registered by the mathlive import
  // No need to define it manually
}

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MathInput({ value, onChange, placeholder, disabled }: MathInputProps) {
  const mathFieldRef = useRef<HTMLDivElement>(null);
  const mathFieldElementRef = useRef<MathfieldElement | null>(null);
  
  // Handle creating the mathfield element
  useEffect(() => {
    if (!mathFieldRef.current) return;
    
    // Clear any existing mathfield
    if (mathFieldRef.current.firstChild) {
      mathFieldRef.current.innerHTML = '';
    }

    // Create the mathfield element
    try {
      const mathField = document.createElement('math-field') as MathfieldElement;
      mathField.value = value;
      // Set attributes directly
      mathField.setAttribute('virtual-keyboard-mode', 'manual');
      mathField.setAttribute('math-virtual-keyboard', 'all');
      mathField.setAttribute('smart-mode', 'true');
      mathField.setAttribute('smart-fence', 'true');
      
      if (disabled) {
        mathField.setAttribute('read-only', 'true');
      }
      
      if (placeholder) {
        mathField.setAttribute('placeholder', placeholder);
      }
      
      mathField.addEventListener('input', () => {
        onChange(mathField.value);
      });

      mathFieldRef.current.appendChild(mathField);
      mathFieldElementRef.current = mathField;
    } catch (error) {
      console.error("Error initializing MathField:", error);
    }

    return () => {
      if (mathFieldElementRef.current) {
        mathFieldElementRef.current.remove();
        mathFieldElementRef.current = null;
      }
    };
  }, [disabled, placeholder]);
  
  // Update value when prop changes
  useEffect(() => {
    if (mathFieldElementRef.current && mathFieldElementRef.current.value !== value) {
      mathFieldElementRef.current.value = value;
    }
  }, [value]);

  return (
    <div 
      ref={mathFieldRef}
      className={`w-full p-2 border rounded-md bg-background ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    />
  );
}