import { RefObject } from 'react';

export const readIonInputValue = async (
  ref: RefObject<HTMLIonInputElement | null>,
  stateValue: string
): Promise<string> => {
  const trimmed = stateValue.trim();
  if (trimmed) {
    return trimmed;
  }

  const element = await ref.current?.getInputElement();
  return (element?.value ?? '').trim();
};

export const readIonTextareaValue = async (
  ref: RefObject<HTMLIonTextareaElement | null>,
  stateValue: string
): Promise<string> => {
  const trimmed = stateValue.trim();
  if (trimmed) {
    return trimmed;
  }

  const element = await ref.current?.getInputElement();
  return (element?.value ?? '').trim();
};
