export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 grid-veil" />
      <div className="orb-drift absolute -left-32 -top-32 size-[34rem] rounded-full bg-[radial-gradient(circle,var(--glow-a),transparent_66%)] blur-2xl" />
      <div className="orb-drift-slow absolute -right-36 top-1/4 size-[32rem] rounded-full bg-[radial-gradient(circle,var(--glow-b),transparent_66%)] blur-2xl" />
      <div className="orb-drift absolute -bottom-48 left-1/3 size-[30rem] rounded-full bg-[radial-gradient(circle,var(--glow-c),transparent_66%)] blur-2xl" />
    </div>
  );
}
