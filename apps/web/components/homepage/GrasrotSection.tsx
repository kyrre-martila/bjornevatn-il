import Link from "next/link";

import GrasrotWidget from "./GrasrotWidget";

type GrasrotSectionProps = {
  title: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  organizationNumber: string;
};

export default function GrasrotSection({
  title,
  text,
  buttonLabel,
  buttonUrl,
  organizationNumber,
}: GrasrotSectionProps) {
  return (
    <section className="homepage-grasrot" aria-labelledby="homepage-grasrot-title">
      <div className="homepage-grasrot__columns">
        <GrasrotWidget organizationNumber={organizationNumber} />
        <div className="homepage-grasrot__content stack stack--sm">
          <h2 id="homepage-grasrot-title">{title}</h2>
          <p>{text}</p>
          <ol className="homepage-grasrot__steps stack stack--sm">
            <li>Go to Norsk Tipping</li>
            <li>Search for Bjørnevatn IL</li>
            <li>Select the club as your Grasrot recipient</li>
            <li>Continue to play as normal</li>
          </ol>
          <Link className="button-primary" href={buttonUrl}>
            {buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
