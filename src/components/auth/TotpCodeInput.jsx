import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";

// Segmented one-time-code input: six individual digit boxes that behave like a
// single field. Auto-advances as you type, Backspace walks left, and pasting a
// full code (with or without spaces) fills every box at once. Used by the
// Authenticator setup wizard and the login 2FA step-up so both screens share
// one code-entry behavior.
const TotpCodeInput = ({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = false,
  testIdPrefix,
}) => {
  const inputsRef = useRef([]);
  // Fire onComplete only once per full entry, not on every re-render.
  const completedRef = useRef(false);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) completedRef.current = false;
  }, [value, length, onComplete]);

  const setValue = (next) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    const focusIndex = Math.min(clean.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleChange = (index, raw) => {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;
    // Typing into box N overwrites from N onward — also covers a paste that
    // lands mid-field or an OS autofill dumping the whole code into one box.
    setValue(value.slice(0, index) + incoming);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value.length > 0) {
        const cut = Math.min(index, value.length - 1);
        setValue(value.slice(0, cut));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setValue(e.clipboardData.getData("text"));
  };

  // Keep focus on the first empty box so clicking anywhere resumes typing in
  // the right place.
  const handleFocus = (index) => {
    const active = Math.min(value.length, length - 1);
    if (index !== active) inputsRef.current[active]?.focus();
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-2.5"
      data-test-id={testIdPrefix}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length} /* allow a full paste/autofill into one box */
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          aria-label={`Digit ${i + 1} of ${length}`}
          className={`w-11 sm:w-12 h-14 rounded-xl border-2 text-center text-2xl font-bold caret-transparent
            bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
            transition-all duration-150 focus:outline-none
            ${digit
              ? "border-primary-500 dark:border-primary-400"
              : "border-gray-300 dark:border-gray-600"}
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30
            disabled:opacity-50`}
          data-test-id={`${testIdPrefix}-digit-${i}`}
        />
      ))}
    </div>
  );
};

TotpCodeInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
  length: PropTypes.number,
  disabled: PropTypes.bool,
  autoFocus: PropTypes.bool,
  testIdPrefix: PropTypes.string.isRequired,
};

export default TotpCodeInput;
