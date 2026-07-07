export default function Button({
  children,
  variant = "primary",
  type = "button",
  onClick,
}) {
  return (
    <button className={`ui-button ${variant}`} type={type} onClick={onClick}>
      {children}
    </button>
  );
}
