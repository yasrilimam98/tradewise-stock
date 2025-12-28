// Stockbit API Service
const STORAGE_KEY = 'stockbit_bearer_token';

const getToken = () => localStorage.getItem(STORAGE_KEY);

const fetchWithAuth = async (url) => {
    const token = getToken();
    if (!token) {
        throw new Error('Bearer token tidak ditemukan. Silakan set token di Pengaturan.');
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token expired atau tidak valid');
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('CORS Error: Tidak dapat mengakses API langsung');
        }
        throw error;
    }
};

// IHSG Data
export const getIHSGData = async () => {
    const url = 'https://exodus.stockbit.com/company-price-feed/v2/orderbook/companies/IHSG';
    return fetchWithAuth(url);
};

// Market Movers
const FILTER_STOCKS = [
    'FILTER_STOCKS_TYPE_MAIN_BOARD',
    'FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD',
    'FILTER_STOCKS_TYPE_ACCELERATION_BOARD',
    'FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD'
].map(f => `filter_stocks=${f}`).join('&');

export const getTopGainer = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_TOP_GAINER&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

export const getTopLoser = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_TOP_LOSER&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

export const getTopValue = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_TOP_VALUE&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

export const getTopVolume = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_TOP_VOLUME&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

export const getTopFrequency = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_TOP_FREQUENCY&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

export const getNetForeignBuy = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_NET_FOREIGN_BUY&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

export const getNetForeignSell = async () => {
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=MOVER_TYPE_NET_FOREIGN_SELL&${FILTER_STOCKS}`;
    return fetchWithAuth(url);
};

// Calendar Events
export const getCalendarEvents = async () => {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://exodus.stockbit.com/calendar/events?date=${today}`;
    return fetchWithAuth(url);
};

// Screener Template - supports both GURU and CUSTOM types
export const getScreenerData = async (templateId = '4804992', type = 'TEMPLATE_TYPE_CUSTOM') => {
    const url = `https://exodus.stockbit.com/screener/templates/${templateId}?type=${type}`;
    return fetchWithAuth(url);
};

// Running Trade with filters and pagination
export const getRunningTrade = async (params = {}) => {
    const {
        symbol = '',
        date = new Date().toISOString().split('T')[0],
        sort = 'DESC',
        limit = 50,
        orderBy = 'RUNNING_TRADE_ORDER_BY_TIME',
        tradeNumber = null, // For pagination
        actionType = null, // RUNNING_TRADE_ACTION_TYPE_BUY or RUNNING_TRADE_ACTION_TYPE_SELL
        marketBoard = null, // BOARD_TYPE_REGULAR, BOARD_TYPE_NEGOTIATION
        minimumLot = null,
    } = params;

    if (!symbol) {
        throw new Error('Symbol is required');
    }

    let url = `https://exodus.stockbit.com/order-trade/running-trade?sort=${sort}&limit=${limit}&order_by=${orderBy}&symbols[]=${symbol}&date=${date}`;

    if (tradeNumber) {
        url += `&trade_number=${tradeNumber}`;
    }

    if (actionType) {
        url += `&action_type=${actionType}`;
    }

    if (marketBoard) {
        url += `&market_board=${marketBoard}`;
    }

    if (minimumLot && minimumLot > 0) {
        url += `&minimum_lot=${minimumLot}`;
    }

    return fetchWithAuth(url);
};

// Insider / Major Holder
export const getInsiderData = async (params = {}) => {
    const {
        dateStart = null,
        dateEnd = null,
        page = 1,
        limit = 20,
        actionType = 'ACTION_TYPE_UNSPECIFIED',
        sourceType = 'SOURCE_TYPE_UNSPECIFIED',
        symbol = null,
    } = params;

    // Default: last 1 month
    const end = dateEnd || new Date().toISOString().split('T')[0];
    const start = dateStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let url = `https://exodus.stockbit.com/insider/company/majorholder?date_start=${start}&date_end=${end}&page=${page}&limit=${limit}&action_type=${actionType}&source_type=${sourceType}`;

    if (symbol) {
        url += `&symbols=${symbol}`;
    }

    return fetchWithAuth(url);
};

// FundaChart Metrics
export const getFundaChartMetrics = async () => {
    const url = 'https://exodus.stockbit.com/fundachart/metrics?metric_name=fundachart';
    return fetchWithAuth(url);
};

// FundaChart Data
export const getFundaChartData = async (params = {}) => {
    const {
        items = [],       // Array of metric IDs like [2661, 21335]
        companies = [],   // Array of company symbols like ['ADRO', 'BBRI']
        timeframe = '3m'  // 1m, 3m, 6m, ytd, 1y, 3y, 5y
    } = params;

    if (items.length === 0 || companies.length === 0) {
        throw new Error('Items dan companies tidak boleh kosong');
    }

    const url = `https://exodus.stockbit.com/fundachart?item=${items.join(',')}&companies=${companies.join(',')}&timeframe=${timeframe}`;
    return fetchWithAuth(url);
};

// Market Detector / Bandar Detector
export const getBrokerDetector = async (params = {}) => {
    const {
        symbol = '',
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to = new Date().toISOString().split('T')[0],
        transactionType = 'TRANSACTION_TYPE_NET',
        marketBoard = 'MARKET_BOARD_REGULER',
        investorType = 'INVESTOR_TYPE_ALL',
        limit = 25
    } = params;

    if (!symbol) {
        throw new Error('Symbol is required');
    }

    const url = `https://exodus.stockbit.com/marketdetectors/${symbol}?from=${from}&to=${to}&transaction_type=${transactionType}&market_board=${marketBoard}&investor_type=${investorType}&limit=${limit}`;
    return fetchWithAuth(url);
};

// Broker List
export const getBrokerList = async (params = {}) => {
    const {
        page = 1,
        limit = 150,
        group = 'GROUP_UNSPECIFIED'
    } = params;

    const url = `https://exodus.stockbit.com/findata-view/marketdetectors/brokers?page=${page}&limit=${limit}&group=${group}`;
    return fetchWithAuth(url);
};

// Broker Activity Detail - Get stocks bought/sold by a broker
export const getBrokerActivityDetail = async (params = {}) => {
    const {
        brokerCode = '',
        from = new Date().toISOString().split('T')[0],
        to = new Date().toISOString().split('T')[0],
        transactionType = 'TRANSACTION_TYPE_NET',
        marketBoard = 'MARKET_BOARD_REGULER',
        investorType = 'INVESTOR_TYPE_ALL',
        page = 1,
        limit = 50
    } = params;

    if (!brokerCode) {
        throw new Error('Broker code is required');
    }

    const url = `https://exodus.stockbit.com/findata-view/marketdetectors/activity/${brokerCode}/detail?page=${page}&limit=${limit}&from=${from}&to=${to}&transaction_type=${transactionType}&market_board=${marketBoard}&investor_type=${investorType}`;
    return fetchWithAuth(url);
};

// Broker Distribution - Flow visualization
export const getBrokerDistribution = async (params = {}) => {
    const {
        symbol = '',
        date = new Date().toISOString().split('T')[0]
    } = params;

    if (!symbol) {
        throw new Error('Symbol is required');
    }

    const url = `https://exodus.stockbit.com/order-trade/broker/distribution?date=${date}&symbol=${symbol}`;
    return fetchWithAuth(url);
};

// Key Stats - Fundamental Data for Value Investing
export const getKeyStats = async (params = {}) => {
    const {
        symbol = '',
        yearLimit = 10
    } = params;

    if (!symbol) {
        throw new Error('Symbol is required');
    }

    const url = `https://exodus.stockbit.com/keystats/ratio/v1/${symbol}?year_limit=${yearLimit}`;
    return fetchWithAuth(url);
};

// Price Volume History - For PVA Analysis
export const getPriceVolumeHistory = async (params = {}) => {
    const {
        symbol = '',
        period = 'HS_PERIOD_MONTHLY', // HS_PERIOD_WEEKLY | HS_PERIOD_DAILY | HS_PERIOD_MONTHLY
        startDate = '',
        endDate = '',
        limit = 12,
        page = 1
    } = params;

    if (!symbol) {
        throw new Error('Symbol is required');
    }

    const url = `https://exodus.stockbit.com/company-price-feed/historical/summary/${symbol}?period=${period}&start_date=${startDate}&end_date=${endDate}&limit=${limit}&page=${page}`;
    return fetchWithAuth(url);
};

// Market Movers - Top Volume/Gainer/Loser
export const getMarketMovers = async (params = {}) => {
    const {
        moverType = 'MOVER_TYPE_TOP_VOLUME', // MOVER_TYPE_TOP_VOLUME | MOVER_TYPE_TOP_GAINER | MOVER_TYPE_TOP_LOSER
        limit = 20
    } = params;

    const boards = [
        'FILTER_STOCKS_TYPE_MAIN_BOARD',
        'FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD',
        'FILTER_STOCKS_TYPE_ACCELERATION_BOARD',
        'FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD'
    ];

    const filterParams = boards.map(b => `filter_stocks=${b}`).join('&');
    const url = `https://exodus.stockbit.com/order-trade/market-mover?mover_type=${moverType}&${filterParams}`;
    return fetchWithAuth(url);
};

// Check if token exists
export const hasToken = () => !!getToken();

// Format number helpers
export const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
    return num.toLocaleString('id-ID');
};

export const formatCurrency = (num) => {
    if (num === null || num === undefined) return '-';
    return 'Rp ' + num.toLocaleString('id-ID');
};

export const formatPercentage = (num) => {
    if (num === null || num === undefined) return '-';
    const sign = num > 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
};

// Company Financial Data
// report_type: 1 = Income Statement, 2 = Balance Sheet, 3 = Cash Flow
// statement_type: 1 = Quarterly, 2 = Annual, 3 = TTM, 4 = Interim YTD, etc.
// data_type: 1 = as reported
export const getCompanyFinancial = async ({
    symbol,
    reportType = 1,
    statementType = 2,
    dataType = 1
}) => {
    const url = `https://exodus.stockbit.com/findata-view/company/financial?symbol=${symbol}&data_type=${dataType}&report_type=${reportType}&statement_type=${statementType}`;
    return fetchWithAuth(url);
};

// Company Profile
export const getCompanyProfile = async ({ symbol }) => {
    const url = `https://exodus.stockbit.com/company/companies/${symbol}`;
    return fetchWithAuth(url);
};
