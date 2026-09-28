/*
  /api/reports - the Report button. Any signed-in user may file one; the
  backend records them as the reporter, refuses reports on their own content,
  and refuses a second open report on the same thing.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { authedRequest } from './client'
import type { ReportReason, ReportTargetType } from './types'

export type FileReportBody = {
  targetType: Exclude<ReportTargetType, 'MESSAGE'>
  targetId: number
  category: ReportReason
  details?: string
}

export const reportsApi = {
  file: (body: FileReportBody) =>
    authedRequest<{ reportId: number }>('/api/reports', { method: 'POST', body }),
}
