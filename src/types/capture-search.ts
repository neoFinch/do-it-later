import { Capture } from './capture';
import { ClassifyResult, EnrichResult, EvaluateResult, UnderstandResult } from './ai-pipeline-stages';

export type SearchableScalar = string | string[] | null | undefined;

export interface CaptureSearchContext {
  capture: Capture;
  understand?: UnderstandResult | null;
  classify?: ClassifyResult | null;
  enrich?: EnrichResult | null;
  evaluate?: EvaluateResult | null;
}

export interface SearchableField {
  id: string;
  /** Column on the captures table when searchable without joins. */
  sqlColumn?: keyof Capture;
  getValue: (context: CaptureSearchContext) => SearchableScalar;
}
