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
