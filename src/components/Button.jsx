export function Button({ variant = 'ghost', icon, children, className = '', ...props }) {
  return (
    <button className={`btn btn--${variant} ${className}`.trim()} {...props}>
      {icon && <img src={icon} alt="" />}
      {children && <span>{children}</span>}
    </button>
  );
}
