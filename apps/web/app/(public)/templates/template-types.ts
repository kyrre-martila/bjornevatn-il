import type { ReactNode } from "react";

import type { ServiceDetailItem } from "../../../lib/content";

/**
 * A template is a complete page component. It may render its own header,
 * main content area, and footer.
 */
export type BaseTemplateProps = {
  children?: ReactNode;
  title?: string;
  meta?: string;
  service?: ServiceDetailItem;
};
