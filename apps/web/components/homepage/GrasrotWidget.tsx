type GrasrotWidgetProps = {
  organizationNumber: string;
};

export default function GrasrotWidget({ organizationNumber }: GrasrotWidgetProps) {
  return (
    <div className="homepage-grasrot__widget" aria-label="Grasrotandelen widget area">
      {/* TODO: Replace placeholder with Norsk Tipping iframe widget once embed contract is approved. */}
      <p>Grasrotandelen widget</p>
      <p>Organisasjonsnummer: {organizationNumber || "kommer"}</p>
    </div>
  );
}
