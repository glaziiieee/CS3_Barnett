import { forwardRef } from "react";

const Header = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <header
      ref={ref}
      className="flex justify-center items-center px-6 py-3 bg-primary border-b border-highlights/30"
      aria-label="Application header"
    >
      {/* Title removed per request; header kept for spacing and accessibility */}
    </header>
  );
});

Header.displayName = "Header";

export default Header;
