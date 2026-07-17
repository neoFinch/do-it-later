import { Capture } from '../types/capture';
import { getCaptureDisplayTitle } from '../services/title.service';
import { getCaptureSourceBadge } from './capture-source';

export const isSameCaptureDisplay = (left: Capture, right: Capture): boolean =>
  left.id === right.id &&
  getCaptureDisplayTitle(left) === getCaptureDisplayTitle(right) &&
  left.thumbnail === right.thumbnail &&
  left.type === right.type &&
  getCaptureSourceBadge(left).variant === getCaptureSourceBadge(right).variant &&
  left.status === right.status &&
  left.createdAt === right.createdAt;
