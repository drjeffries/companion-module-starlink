/**
 * Hand-trimmed TypeScript shapes for the subset of the Starlink Public API v2
 * (https://starlink.com/api/public/swagger/index.html?urls.primaryName=V2) that this module
 * uses. Only the fields this module reads are declared; the live API returns additional
 * fields that are intentionally left untyped here.
 */

export interface StarlinkServiceResponse {
	errors?: StarlinkValidationResult[] | null
	warnings?: StarlinkValidationResult[] | null
	information?: string[] | null
	isValid: boolean
}

export interface StarlinkValidationResult {
	message?: string
	[key: string]: unknown
}

export interface StarlinkAccountResponseV2 {
	accountNumber: string
	regionCode: string
	accountName: string | null
	activeSuspensions: string[] | null
}

export interface StarlinkAccountResponseV2ServiceResponse extends StarlinkServiceResponse {
	content: StarlinkAccountResponseV2 | null
}

export interface StarlinkDataBlockSummaryResponse {
	productId: string | null
	startDate: string
	expirationDate: string
	count: number
	dataAmount: number
	dataUnitType: string | null
}

export interface StarlinkServiceLineDataBlocksSummaryResponse {
	recurringBlocksCurrentBillingCycle: StarlinkDataBlockSummaryResponse[] | null
	recurringBlocksNextBillingCycle: StarlinkDataBlockSummaryResponse[] | null
	delayedProductRecurringBlocksNextCycle: StarlinkDataBlockSummaryResponse[] | null
	topUpBlocksOptInPurchase: StarlinkDataBlockSummaryResponse[] | null
	topUpBlocksOneTimePurchase: StarlinkDataBlockSummaryResponse[] | null
}

export interface StarlinkServiceLineResponse {
	addressReferenceId: string
	serviceLineNumber: string
	nickname: string | null
	productReferenceId: string
	delayedProductId: string | null
	optInProductId: string | null
	startDate: string | null
	endDate: string | null
	publicIp: boolean
	active: boolean
	dataPoolId: string | null
	dataBlocks: StarlinkServiceLineDataBlocksSummaryResponse | null
}

export interface StarlinkServiceLineResponseServiceResponse extends StarlinkServiceResponse {
	content: StarlinkServiceLineResponse | null
}

export interface StarlinkDataUsageDailyV2 {
	date: string
	priorityGB: number
	optInPriorityGB: number
	standardGB: number
	nonBillableGB: number
}

export interface StarlinkDataUsageOverageLine {
	[key: string]: unknown
}

export interface StarlinkDataPoolUsagePublicResponse {
	[key: string]: unknown
}

export interface StarlinkDataUsageBillingCycleV2 {
	startDate: string
	endDate: string
	dailyDataUsage: StarlinkDataUsageDailyV2[]
	overageLines: StarlinkDataUsageOverageLine[]
	dataPoolUsage: StarlinkDataPoolUsagePublicResponse[]
	totalPriorityGB: number
	totalStandardGB: number
	totalOptInPriorityGB: number
	totalNonBillableGB: number
}

export interface StarlinkServiceLineDataUsageForBillingCycles {
	accountNumber: string
	serviceLineNumber: string
	startDate: string
	endDate: string
	billingCycles: StarlinkDataUsageBillingCycleV2[]
	lastUpdated: string | null
}

export interface StarlinkServiceLineDataUsageForBillingCyclesPaginatedServiceResponse extends StarlinkServiceResponse {
	content: {
		results: StarlinkServiceLineDataUsageForBillingCycles[]
		totalResults?: number
	} | null
}

export interface StarlinkQueryDataUsageRequest {
	serviceLineNumbers?: string[] | null
	previousBillingCycles?: number | null
	activeServiceLinesOnly?: boolean
	queryStartDate?: string | null
}

export interface StarlinkL2VpnCircuitDefinition {
	[key: string]: unknown
}

export interface StarlinkRouterResponseV2 {
	routerId: string
	nickname: string | null
	userTerminalId: string
	configId: string | null
	hardwareVersion: string | null
	lastBonded: string | null
}

export interface StarlinkRouterResponseV2ServiceResponse extends StarlinkServiceResponse {
	content: StarlinkRouterResponseV2 | null
}

export interface StarlinkUserTerminalResponseV2 {
	userTerminalId: string
	nickname: string | null
	kitSerialNumber: string
	dishSerialNumber: string
	serviceLineNumber: string | null
	l2VpnCircuits: StarlinkL2VpnCircuitDefinition[]
	routers: StarlinkRouterResponseV2[]
}

export interface StarlinkUserTerminalResponseV2Paginated {
	results: StarlinkUserTerminalResponseV2[]
	totalResults?: number
}

export interface StarlinkUserTerminalResponseV2PaginatedServiceResponse extends StarlinkServiceResponse {
	content: StarlinkUserTerminalResponseV2Paginated | null
}

export interface StarlinkAddDataBlockRequest {
	productId: string
	count: number
}

export interface StarlinkServiceLineSetPublicIpRequest {
	publicIp: boolean
}

export interface StarlinkDataProductResponse {
	productId: string | null
	price: number
	isoCurrencyCode: string | null
	dataAmount: number
	dataUnit: string | null
}

export interface StarlinkDataProductsResponse {
	dataProducts?: StarlinkDataProductResponse[]
	[key: string]: unknown
}

export interface StarlinkTokenResponse {
	access_token: string
	token_type: string
	expires_in: number
	scope?: string
}

/**
 * Types for the Starlink Telemetry Cache API - POST /public/v2/telemetry/query.
 * Undocumented in the OpenAPI/Swagger spec; only described in the prose guides at
 * https://starlink.readme.io/reference/post_public-v2-telemetry-query. Requires the
 * "Device telemetry, View" permission on the service account, separate from the
 * management-API permissions the rest of this module uses.
 */
export interface StarlinkEnterpriseCacheSearchRequest {
	includeUserTerminals?: boolean | null
	userTerminalIds?: string[] | null
	includeRouters?: boolean | null
	routerIds?: string[] | null
}

export interface StarlinkIpAllocationCacheData {
	userTerminalId: string
	timestamp: string
	ipv4: string[] | null
	ipv6Ue: string[] | null
	ipv6Cpe: string[] | null
}

export interface StarlinkUserTerminalCacheData {
	userTerminalId: string
	timestamp: string
	uptimeSeconds: number | null
	softwareVersion: string | null
	downlinkThroughputMbps: number | null
	uplinkThroughputMbps: number | null
	popPingDropRateAvg: number | null
	popPingLatencyMsAvg: number | null
	obstructionPercentTime: number | null
	signalQuality: number | null
	countryCode: string | null
	inTerritorialWaters: boolean | null
	h3CellId: string | null
	secondsUntilSoftwareUpdateRebootPossible: number | null
	alertSoftwareUpdateRebootPending: boolean | null
	alertDataOverageRateLimited: boolean | null
	alertEthernetSlowLink10: boolean | null
	alertEthernetSlowLink100: boolean | null
	alertPsuOtpThrottling: boolean | null
	alertPopChange: boolean | null
	alertActuatorMotorStuck: boolean | null
	alertMastNotVertical: boolean | null
	alertUnableToAlign: boolean | null
	alertHighTimeObstruction: boolean | null
	alertDisabledNoActiveServiceLine: boolean | null
	alertDisabledTooFarFromServiceAddress: boolean | null
	alertDisabledNoServiceInOcean: boolean | null
	alertDisabledBlockedCountry: boolean | null
	alertDisabledMovingTooFast: boolean | null
	alertDisabledDataUsageExceededQuota: boolean | null
	alertDisabledCellIsDisabled: boolean | null
	alertDisabledRoamRestricted: boolean | null
	alertDisabledUnknownLocation: boolean | null
	alertDisabledAccountDisabled: boolean | null
	alertDisabledUnsupportedSoftware: boolean | null
	ipAllocations: StarlinkIpAllocationCacheData | null
}

export interface StarlinkRouterCacheData {
	routerId: string
	timestamp: string
	uptimeSeconds: number | null
	softwareVersion: string | null
	hardwareVersion: string | null
	isRepeater: boolean | null
	hopsFromController: number | null
	isBypassed: boolean | null
	internetPingDropRate: number | null
	internetPingLatencyMs: number | null
	popPingDropRate: number | null
	popPingLatencyMs: number | null
	dishPingDropRate: number | null
	dishPingLatencyMs: number | null
	clients: number | null
	clients2Ghz: number | null
	clients5Ghz: number | null
	clientsEthernet: number | null
	wanRxBytes: number | null
	wanTxBytes: number | null
}

export interface StarlinkEnterpriseCacheSearchResponse {
	userTerminals: Record<string, StarlinkUserTerminalCacheData> | null
	routers: Record<string, StarlinkRouterCacheData> | null
}

export interface StarlinkEnterpriseCacheSearchResponseServiceResponse extends StarlinkServiceResponse {
	content: StarlinkEnterpriseCacheSearchResponse | null
}
