import { useEffect, useRef, useState } from 'react';

export function DateDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  function handleSelect(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={`date-dropdown${open ? ' is-open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className={`date-dropdown__trigger${value ? ' is-selected' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedOption?.label || label}
      </button>
      {open && (
        <div className="date-dropdown__menu" role="listbox" aria-label={`Selecionar ${label.toLowerCase()}`}>
          <button
            type="button"
            className={`date-dropdown__option${!value ? ' is-selected' : ''}`}
            role="option"
            aria-selected={!value}
            onClick={() => handleSelect('')}
          >
            {label}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`date-dropdown__option${option.value === value ? ' is-selected' : ''}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
