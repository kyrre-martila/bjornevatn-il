import type { ReactNode } from "react";

import type { ServiceDetailItem } from "../../../lib/content";

export type BaseTemplateProps = {
  children?: ReactNode;
  title?: string;
  meta?: string;
  service?: ServiceDetailItem;
};
