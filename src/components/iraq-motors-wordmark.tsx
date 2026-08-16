type IraqMotorsWordmarkProps = {
  /** White “iraq” for the transparent home hero. Otherwise follows theme text color. */
  inverted?: boolean;
  className?: string;
};

export function IraqMotorsWordmark({
  inverted = false,
  className = "",
}: IraqMotorsWordmarkProps) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-baseline whitespace-nowrap text-[1.55rem] font-extrabold leading-none tracking-tight md:text-[1.75rem] ${className}`}
      style={{
        fontFamily: "var(--font-logo), ui-sans-serif, system-ui, sans-serif",
      }}
      aria-label="Iraq Motors"
    >
      <span className={inverted ? "text-white" : "text-foreground"}>iraq</span>
      <span className="text-primary">&nbsp;Motors</span>
    </span>
  );
}
