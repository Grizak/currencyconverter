import React, { useState, useEffect, useCallback, useRef } from 'react';

const CurrencyConverter = () => {
  const [apiKey, setApiKey] = useState('');
  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState({});
  const [rates, setRates] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const apiInputRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("apiKey", apiKey);
    }
  }, [apiKey])

  useEffect(() => {
    const apikey = localStorage.getItem("apiKey");
    if (apikey) {
      setApiKey(apikey)
    }
  }, [])

  // Fetch available currencies
  const fetchCurrencies = useCallback(async () => {
    if (!apiKey.trim()) return;

    try {
      setError('');
      const response = await fetch(`https://data.fixer.io/api/symbols?access_key=${apiKey}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrencies(data.symbols);
      } else {
        setError(getErrorMessage(data.error));
      }
    } catch (err) {
      setError('Failed to fetch currencies. Please check your internet connection.');
    }
  }, [apiKey]);

  // Fetch latest rates (EUR base for free plan)
  const fetchRates = useCallback(async () => {
    if (!apiKey.trim()) return;

    try {
      setError('');
      const response = await fetch(`https://data.fixer.io/api/latest?access_key=${apiKey}`);
      const data = await response.json();
      
      if (data.success) {
        setRates(data.rates);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        setError(getErrorMessage(data.error));
      }
    } catch (err) {
      setError('Failed to fetch exchange rates. Please check your internet connection.');
    }
  }, [apiKey]);

  // Load currencies and rates when API key is provided
  useEffect(() => {
    if (apiKey.trim()) {
      fetchCurrencies();
      fetchRates();
    }
  }, [apiKey, fetchCurrencies, fetchRates]);

  // Auto-refresh rates every 10 minutes
  useEffect(() => {
    if (apiKey.trim() && Object.keys(rates).length > 0) {
      timerRef.current = setInterval(() => {
        fetchRates();
      }, 10 * 60 * 1000); // 10 minutes

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [apiKey, rates, fetchRates]);

  const getErrorMessage = (error) => {
    if (!error) return 'Unknown error occurred';
    
    const errorMessages = {
      101: 'Invalid API key. Please check your API key.',
      102: 'Account inactive or suspended.',
      103: 'This endpoint requires a paid plan. Using free plan workaround.',
      104: 'Monthly usage limit exceeded. Try again next month.',
      105: 'Current usage limit exceeded.',
      201: 'Invalid source currency.',
      202: 'Invalid target currency.'
    };

    return errorMessages[error.code] || error.info || 'An error occurred';
  };

  // Validate inputs
  const validateInputs = () => {
    if (!apiKey.trim()) {
      return 'Please enter your API key';
    }
    if (!amount || amount <= 0) {
      return 'Please enter a valid amount greater than 0';
    }
    if (amount > 1000000) {
      return 'Amount too large. Please enter a smaller value.';
    }
    return null;
  };

  // Convert currency using EUR as base (free plan workaround)
  const convertCurrency = useCallback(() => {
    const validationError = validateInputs();
    if (validationError) {
      setResult('');
      setError(validationError);
      return;
    }

    if (fromCurrency === toCurrency) {
      setResult(`${amount.toFixed(2)} ${fromCurrency} = ${amount.toFixed(2)} ${toCurrency}`);
      setError('');
      return;
    }

    if (Object.keys(rates).length === 0) {
      setResult('Loading exchange rates...');
      fetchRates();
      return;
    }

    setLoading(true);
    setError('');

    try {
      let convertedAmount;
      let exchangeRate;

      if (fromCurrency === 'EUR') {
        // Converting from EUR (base currency)
        exchangeRate = rates[toCurrency];
        convertedAmount = amount * exchangeRate;
      } else if (toCurrency === 'EUR') {
        // Converting to EUR (base currency)
        exchangeRate = 1 / rates[fromCurrency];
        convertedAmount = amount * exchangeRate;
      } else {
        // Converting between two non-EUR currencies
        const toEurRate = 1 / rates[fromCurrency];
        const fromEurRate = rates[toCurrency];
        exchangeRate = toEurRate * fromEurRate;
        convertedAmount = amount * exchangeRate;
      }

      if (isNaN(convertedAmount) || !isFinite(convertedAmount)) {
        throw new Error('Invalid conversion result');
      }

      const formattedResult = `${amount.toFixed(2)} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`;
      const rateText = `Exchange rate: 1 ${fromCurrency} = ${exchangeRate.toFixed(6)} ${toCurrency}`;
      
      setResult(`${formattedResult}\n${rateText}`);
      setError('');

    } catch (err) {
      setResult('');
      setError('Unable to calculate conversion. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [amount, fromCurrency, toCurrency, rates, apiKey]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      convertCurrency();
    }
  };

  const toggleApiKeyVisibility = () => {
    setApiKeyVisible(!apiKeyVisible);
  };

  // Auto-convert when inputs change (with debounce)
  useEffect(() => {
    if (apiKey.trim() && Object.keys(rates).length > 0 && amount > 0) {
      const timeoutId = setTimeout(convertCurrency, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [amount, fromCurrency, toCurrency, convertCurrency]);

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    card: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      width: '100%',
      maxWidth: '480px',
      transition: 'transform 0.3s ease',
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '3rem',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '1.75rem',
      fontWeight: '600',
      color: '#374151',
      margin: '0 0 8px 0'
    },
    badge: {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: 0
    },
    apiSection: {
      marginBottom: '24px',
      padding: '16px',
      background: '#dbeafe',
      borderRadius: '12px',
      borderLeft: '4px solid #3b82f6'
    },
    apiInputContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.2s ease',
      boxSizing: 'border-box'
    },
    toggleButton: {
      position: 'absolute',
      right: '8px',
      background: 'none',
      border: 'none',
      color: '#6b7280',
      cursor: 'pointer',
      fontSize: '12px',
      padding: '4px 8px',
      borderRadius: '4px',
      zIndex: 1
    },
    helpText: {
      fontSize: '0.75rem',
      color: '#6b7280',
      marginTop: '4px'
    },
    inputGroup: {
      marginBottom: '24px'
    },
    currencyGrid: {
      display: 'grid',
      gridTemplateColumns: '2fr 60px 2fr',
      gap: '12px',
      alignItems: 'end',
      marginBottom: '24px'
    },
    swapButton: {
      width: '48px',
      height: '48px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      fontSize: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      justifySelf: 'center'
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '16px',
      background: 'white',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    convertButton: {
      width: '100%',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      color: 'white',
      border: 'none',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '1.125rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginBottom: '24px'
    },
    convertButtonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed',
      transform: 'none'
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid transparent',
      borderTop: '2px solid white',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '8px'
    },
    result: {
      padding: '16px',
      borderRadius: '12px',
      textAlign: 'center',
      minHeight: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'pre-line',
      lineHeight: '1.5'
    },
    resultDefault: {
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      color: '#6b7280'
    },
    resultSuccess: {
      background: '#d1fae5',
      border: '1px solid #a7f3d0',
      color: '#065f46'
    },
    resultError: {
      background: '#fee2e2',
      border: '1px solid #fecaca',
      color: '#991b1b'
    },
    statusInfo: {
      textAlign: 'center',
      fontSize: '0.75rem',
      color: '#6b7280',
      marginTop: '16px'
    },
    successText: {
      color: '#059669',
      marginTop: '4px'
    },
    infoBox: {
      marginTop: '24px',
      padding: '12px',
      background: '#fef3c7',
      borderRadius: '8px',
      border: '1px solid #f59e0b'
    },
    infoText: {
      fontSize: '0.75rem',
      color: '#92400e',
      textAlign: 'center',
      lineHeight: '1.4'
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .currency-card:hover {
            transform: translateY(-2px);
          }
          
          .swap-btn:hover {
            background: #2563eb !important;
            transform: rotate(180deg);
          }
          
          .convert-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
          }
          
          input:focus, select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .toggle-btn:hover {
            background: #f3f4f6;
          }
        `}
      </style>
      
      <div style={styles.card} className="currency-card">
        <div style={styles.header}>
          <h1 style={styles.title}>💱</h1>
          <h2 style={styles.subtitle}>Currency Converter</h2>
          <p style={styles.badge}>Free plan friendly</p>
        </div>

        {/* API Key Input */}
        <div style={styles.apiSection}>
          <label style={styles.label}>
            Fixer.io API Key:
          </label>
          <div style={styles.apiInputContainer}>
            <input
              ref={apiInputRef}
              type={apiKeyVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your free API key"
              style={{...styles.input, paddingRight: '60px'}}
            />
            <button 
              onClick={toggleApiKeyVisibility}
              style={styles.toggleButton}
              className="toggle-btn"
              type="button"
            >
              {apiKeyVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          <p style={styles.helpText}>
            Get your free API key at <a href="https://fixer.io" target="_blank" rel="noopener noreferrer">fixer.io</a> (100 requests/month)
          </p>
        </div>

        {/* Amount Input */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            Amount:
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            onKeyPress={handleKeyPress}
            placeholder="Enter amount"
            min="0"
            max="1000000"
            step="0.01"
            style={{...styles.input, fontSize: '1.125rem'}}
          />
        </div>

        {/* Currency Selection */}
        <div style={styles.currencyGrid}>
          <div>
            <label style={styles.label}>From:</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              style={styles.select}
            >
              {Object.keys(currencies).length > 0 ? (
                Object.entries(currencies).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))
              ) : (
                <>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                </>
              )}
            </select>
          </div>
          
          <button
            onClick={swapCurrencies}
            style={styles.swapButton}
            className="swap-btn"
            title="Swap currencies"
            type="button"
          >
            ⇄
          </button>
          
          <div>
            <label style={styles.label}>To:</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              style={styles.select}
            >
              {Object.keys(currencies).length > 0 ? (
                Object.entries(currencies).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))
              ) : (
                <>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={convertCurrency}
          disabled={loading}
          style={{
            ...styles.convertButton,
            ...(loading ? styles.convertButtonDisabled : {})
          }}
          className="convert-btn"
          type="button"
        >
          {loading ? (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              Converting...
            </div>
          ) : (
            'Convert Currency'
          )}
        </button>

        {/* Result Display */}
        <div style={{
          ...styles.result,
          ...(error ? styles.resultError : 
              result ? styles.resultSuccess : 
              styles.resultDefault)
        }}>
          {error || result || 'Enter your API key and amount to see conversion results'}
        </div>

        {/* Status Info */}
        {lastUpdate && (
          <div style={styles.statusInfo}>
            <p>Rates updated: {lastUpdate}</p>
            <p style={{marginTop: '4px'}}>Using EUR as base currency (Free plan compatible)</p>
            {Object.keys(currencies).length > 0 && (
              <p style={styles.successText}>✓ {Object.keys(currencies).length} currencies loaded</p>
            )}
          </div>
        )}

        {/* Free Plan Info */}
        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            <strong>💡 Free Plan Features:</strong><br/>
            • 100 requests/month limit<br/>
            • EUR base currency conversion<br/>
            • Real-time exchange rates<br/>
            • Auto-refresh every 10 minutes<br/>
            • Support for 150+ currencies
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;