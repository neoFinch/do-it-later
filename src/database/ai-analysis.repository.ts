import { AIAnalysis } from '../types/ai-analysis';
import { splitAnalysisIntoStages } from '../types/ai-pipeline-stages';
import {
  deletePipelineStages,
  getComposedAnalysis,
  getPipelineStages,
  initializeAiPipelineTables,
  savePipelineStages
} from './ai-pipeline.repository';

export const initializeAiAnalysisTable = async (): Promise<void> => {
  await initializeAiPipelineTables();
};

export const getAiAnalysis = async (captureId: string): Promise<AIAnalysis | null> => {
  return getComposedAnalysis(captureId);
};

export const saveAiAnalysis = async (analysis: AIAnalysis): Promise<void> => {
  const stages = splitAnalysisIntoStages(analysis);
  await savePipelineStages(stages);
};

export const deleteAiAnalysis = async (captureId: string): Promise<void> => {
  await deletePipelineStages(captureId);
};

export { getPipelineStages };
