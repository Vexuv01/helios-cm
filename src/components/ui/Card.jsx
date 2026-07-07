export default function Card({ children, className = "" }) {
  return <article className={`ui-card ${className}`}>{children}</article>;
}
