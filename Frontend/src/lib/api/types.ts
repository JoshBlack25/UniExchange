/*
  Shapes returned by the backend, mirrored from the JPA entities in
  Backend/src/main/java/za/ac/cput/domain/.

  Two things to know before you use these:

  1. BOOLEAN FIELD NAMES DIFFER BETWEEN REQUEST AND RESPONSE.
     The entities declare `isPrimary` / `isRead` / `isFacultyAnnouncement`, but
     their getters are isPrimary() / isRead() / isFacultyAnnouncement(), and
     Jackson strips the "is" prefix when serialising. So you SEND
     { "isPrimary": true } to the request DTO but you READ back
     { "primary": true }. The response types below use the stripped names.
     Confirm it the first time you call one of these - if the value comes back
     undefined, that is the reason, and the fix is one word.

  2. Foreign keys are plain numbers, not nested objects. There are no JPA
     relationship annotations in the domain, so a Listing gives you `sellerId`,
     not a `seller` object. Fetch the related record separately.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

/* ------------------------------------------------------------------ identity */

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export type RoleType = 'STUDENT' | 'FACULTY' | 'VENDOR' | 'RESIDENT' | 'MODERATOR' | 'ADMIN'

/*
  What the current session may do. A moderator or admin who signs in normally
  gets STANDARD and is treated like any student; MODERATOR / ADMIN sessions come
  only from the hidden sign-in (Ctrl+Alt+M / Ctrl+Alt+A). The backend enforces
  this - the frontend only uses it to decide what to show.
*/
export type SessionMode = 'STANDARD' | 'MODERATOR' | 'ADMIN'

/** STAFF for an @cput.ac.za account, STUDENT otherwise. Computed by the backend from the email. */
export type Affiliation = 'STUDENT' | 'STAFF'

/*
  GET /api/users/{id} returns the full record only for your own account and in
  a moderator/admin session. For anyone else it is a public profile
  (PublicUserProfile on the backend) with no email, cellPhone, dateOfBirth,
  emailVerifiedAt or updatedAt - hence those are optional here. Render them
  only when present.
*/
export type User = {
  userId: number
  email?: string
  firstName: string
  middleName: string | null
  lastName: string
  cellPhone?: string | null
  dateOfBirth?: string | null
  accountStatus: AccountStatus
  emailVerifiedAt?: string | null
  campusId: number | null
  createdAt: string
  updatedAt?: string
  affiliation?: Affiliation
  /** Relative to the API (prefix BASE_URL); null when there is no photo. See photoSrc(). */
  profilePhotoUrl?: string | null
}

export type Campus = {
  campusId: number
  name: string
  city: string
  address: string | null
}

export type AuthResponse = {
  token: string
  tokenType: string
  expiresIn: number
  userId: number
  email: string
  roles: string[]
  /*
    Proof this browser completed an OTP, so the next sign-in can skip it.
    Populated ONLY by /verify-otp - a trusted /login leaves it null, because the
    browser already holds a valid one. Store it with writeDeviceToken().
  */
  deviceToken: string | null
  mode: SessionMode
}

export type RegistrationResponse = {
  email: string
  message: string
  codeExpiresInSeconds: number
  /** Only from an elevated /login: proof the password was checked, needed by /verify-otp. */
  loginTicket?: string | null
}

/* --------------------------------------------------------------- marketplace */

export type ListingStatus = 'ACTIVE' | 'SOLD' | 'REMOVED' | 'DELETED'

export type Listing = {
  listingId: number
  sellerId: number
  categoryId: number
  campusId: number
  title: string
  description: string | null
  /** BigDecimal on the backend; arrives as a JSON number. */
  price: number
  status: ListingStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  /** Filled in by the backend from the seller's account. */
  sellerName?: string | null
  sellerAffiliation?: Affiliation | null
  /** The card photo (primary image, else the first); null when the listing has none. */
  coverImageUrl?: string | null
}

export type Category = {
  categoryId: number
  name: string
  description: string | null
}

export type ListingImage = {
  imageId: number
  listingId: number
  imageUrl: string
  position: number
  /** Sent as `isPrimary`, received as `primary` - see the note at the top. */
  primary: boolean
}

/* ------------------------------------------------------------- communication */

export type NotificationType = 'MESSAGE' | 'LISTING' | 'TRANSACTION' | 'BULLETIN' | 'SYSTEM'

export type Notification = {
  notificationId: number
  userId: number
  type: NotificationType
  title: string
  content: string | null
  entityType: string | null
  entityId: number | null
  /** Sent as `isRead`, received as `read` - see the note at the top. */
  read: boolean
  createdAt: string
}

export type Conversation = {
  conversationId: number
  createdAt: string
}

export type ConversationParticipant = {
  participantId: number
  conversationId: number
  userId: number
  joinedAt: string
  lastReadAt: string | null
}

export type Message = {
  messageId: number
  conversationId: number
  senderId: number
  content: string
  sentAt: string
}

/* ----------------------------------------------------------------- community */

export type BulletinPostStatus = 'PUBLISHED' | 'HIDDEN' | 'REMOVED'

export type BulletinPostCategory = 'GENERAL' | 'EVENT' | 'STUDY_GROUP' | 'LOST_AND_FOUND'

export type BulletinPost = {
  bulletinPostId: number
  authorId: number
  title: string
  content: string
  status: BulletinPostStatus
  /** Sent as `isFacultyAnnouncement`, received as `facultyAnnouncement`. */
  facultyAnnouncement: boolean
  category: BulletinPostCategory
  createdAt: string
  updatedAt: string
  removedAt: string | null
}

export type Review = {
  reviewId: number
  transactionId: number
  reviewerId: number
  revieweeId: number
  /** 1–5 */
  rating: number
  comment: string | null
  createdAt: string
}
 
export type TrustedSellerBadge = {
  trustedSellerBadgeId: number
  userId: number
  earnedAt: string
  /** null while the badge is still active */
  revokedAt: string | null
}
export type BulletinPostImage = {
  imageId: number
  bulletinPostId: number
  imageUrl: string
  position: number
  /** Sent as `isPrimary`, received as `primary` - see the note at the top. */
  primary: boolean
}

/* -------------------------------------------------------------------- chat */

export type ChatMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO'

export type ChatMediaView = {
  mediaId: number
  mediaType: ChatMediaType
  mimeType: string
  /**
   * Pre-signed, short-lived and bound to you as the viewer. Drop it straight
   * into an img/audio/video src - do NOT prefix BASE_URL, and do not cache it in
   * component state across polls, because it rotates roughly every half hour.
   */
  url: string
  /**
   * Milliseconds, for voice notes and video. Measured in the browser while
   * recording, because a MediaRecorder blob reports Infinity for its duration -
   * so render your own progress bar from this rather than trusting the element.
   */
  durationMs: number | null
  sizeBytes: number
  originalFilename: string | null
}

export type ChatMessageView = {
  messageId: number
  conversationId: number
  senderId: number
  /** Empty string for an attachment sent with no caption. */
  content: string
  sentAt: string
  media: ChatMediaView | null
}

export type ChatParticipant = {
  userId: number
  firstName: string
  lastName: string
}

export type ChatThreadView = {
  conversationId: number
  /** Null for a general chat, and for every conversation started before listings were linked. */
  listingId: number | null
  listingTitle: string | null
  otherParticipant: ChatParticipant | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export type ChatMediaUploaded = {
  mediaId: number
  mediaType: ChatMediaType
  durationMs: number | null
}

/* ------------------------------------------------------------ transactions */

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'

export type PaymentMethod = 'CASH' | 'WALLET' | 'PAYFAST' | 'SNAPSCAN'

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT'

/**
 * Money arrives as a JSON number, not a string: Jackson serialises the
 * backend's BigDecimal that way, and the existing Listing.price does the same.
 *
 * Safe to display and compare at marketplace amounts, but do NOT do arithmetic
 * on it and send the result back - all money maths belongs on the server, where
 * it stays in BigDecimal.
 */
export type WalletSummary = {
  /**
   * Spendable right now. This is ALREADY net of anything in escrow - money
   * leaves the wallet the moment a purchase is made - so never subtract `held`
   * from it, or you deduct the same amount twice.
   */
  available: number
  /** Paid for, not yet released to the seller. */
  held: number
  /** available + held. */
  total: number
  currency: string
  /**
   * What a top-up will actually do in this environment, so the UI can say so
   * up front instead of describing a payment screen the student may never see.
   *
   *   LIVE      - real PayFast, real money
   *   SANDBOX   - PayFast's test environment: a real payment screen, no money
   *   SIMULATED - local development: completed in-app, PayFast never contacted
   */
  topUpMode: 'LIVE' | 'SANDBOX' | 'SIMULATED'
}

/** Result of a transfer. `balanceAfter` is the SENDER's new balance. */
export type TransferResult = {
  amount: number
  recipientName: string
  balanceAfter: number
}

export type WalletTransaction = {
  walletTransactionId: number
  walletId: number
  type: WalletTransactionType
  amount: number
  balanceAfter: number
  referenceType: string | null
  referenceId: number | null
  description: string | null
  createdAt: string
}

export type Transaction = {
  transactionId: number
  buyerId: number
  sellerId: number
  listingId: number
  amount: number
  paymentMethod: PaymentMethod
  status: TransactionStatus
  createdAt: string
  completedAt: string | null
}

/**
 * The fields to POST to PayFast, in order.
 *
 * Render these as a hidden self-submitting form rather than building a URL: the
 * signature covers the values, so anything altered in transit is rejected.
 */
export type PayFastRedirect = {
  processUrl: string
  fields: Record<string, string>
  /** Our reference for this attempt, used to ask about it afterwards. */
  merchantPaymentId: string
  /**
   * True only in local development with the ITN simulator switched on.
   *
   * PayFast confirms a payment by calling the backend from their own servers,
   * which can never reach localhost - so on a laptop the redirect is a dead end.
   * When this is true the UI completes the top-up itself instead of redirecting.
   */
  simulatorEnabled: boolean
}

/* ---------------------------------------------------------------- moderation */

/** A user as moderators see them. Never carries a password hash. */
export type ModeratedUser = {
  userId: number
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  cellPhone: string | null
  campusId: number | null
  accountStatus: AccountStatus
  affiliation: Affiliation
  roles: RoleType[]
  emailVerifiedAt: string | null
  createdAt: string
}

export type UserSummary = {
  userId: number
  name: string
  email: string
  accountStatus: AccountStatus
}

export type ModeratedPost = {
  post: BulletinPost
  author: UserSummary | null
}

export type FlaggedReview = {
  reviewId: number
  transactionId: number
  rating: number
  comment: string | null
  createdAt: string
  reviewer: UserSummary | null
  reviewee: UserSummary | null
}

export type AuditEntry = {
  auditLogId: number
  action: string
  targetType: string
  targetId: number | null
  details: string | null
  createdAt: string
  actor: UserSummary | null
}

export type ModerationOverview = {
  flaggedReviews: number
  suspendedUsers: number
  removedThisWeek: number
  pendingReports: number
  totalUsers: number
  activeListings: number
  recentActivity: AuditEntry[]
}

/* ---- reports */

/** Why something was reported, or why a moderator acted. See src/lib/reportReasons.ts. */
export type ReportReason =
  | 'SCAM_OR_FRAUD'
  | 'PROHIBITED_ITEM'
  | 'MISLEADING_LISTING'
  | 'HARASSMENT_OR_BULLYING'
  | 'HATE_SPEECH'
  | 'INAPPROPRIATE_CONTENT'
  | 'SPAM'
  | 'FAKE_ACCOUNT'
  | 'IMPERSONATION'
  | 'UNSAFE_MEETUP'
  | 'OTHER'

export type ReportTargetType = 'LISTING' | 'USER' | 'MESSAGE' | 'BULLETIN_POST'
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'

/** What a moderator must send to suspend, delete or remove. */
export type ActionReport = {
  reason: ReportReason
  details: string
  /** The user report this answers, if it came from the queue. */
  userReportId?: number | null
}

export type ModerationActionType = 'ACCOUNT_SUSPENDED' | 'ACCOUNT_DELETED' | 'LISTING_REMOVED' | 'POST_REMOVED'

/** The saved report behind a moderator action (a "case file"). Names are snapshots. */
export type ModerationReport = {
  moderationReportId: number
  action: ModerationActionType
  reason: ReportReason
  details: string
  subjectUserId: number
  subjectName: string
  subjectEmail: string
  targetType: string
  targetId: number
  targetTitle: string | null
  moderatorId: number
  moderatorName: string
  userReportId: number | null
  sentToUser: boolean
  emailedAt: string | null
  createdAt: string
}

/** A report a user filed, as the moderation queue shows it. */
export type UserReport = {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  targetTitle: string
  targetOwner: UserSummary | null
  reporter: UserSummary | null
  category: ReportReason | null
  details: string
  status: ReportStatus
  resolutionNote: string | null
  createdAt: string
  resolvedAt: string | null
}

/* ---- dashboard analytics (GET /api/moderation/analytics) */

export type AnalyticsRange = '1d' | '2d' | '3d' | '1w' | '2w' | '1m' | '2m' | '3m' | '6m' | '1y'
export type AnalyticsBucket = 'HOUR' | 'DAY' | 'WEEK'

export type AnalyticsSeries = {
  /** One value per bucket; null where there is nothing to show (an average of no reviews). */
  values: (number | null)[]
  total: number | null
  /** The same metric over the equally long window just before this one. */
  previousTotal: number | null
}

export type Analytics = {
  range: AnalyticsRange
  bucket: AnalyticsBucket
  from: string
  to: string
  /** Start of each bucket, oldest first. */
  buckets: string[]
  /** Money series (salesVolume, topUpVolume) are only present in an admin session. */
  series: Record<string, AnalyticsSeries>
}

export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  total: number
}
