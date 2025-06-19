import React, { useState, useEffect, useCallback } from 'react';

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
  const [timer, setTimer] = useState(falses)

  // Load API key from memory on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('fixerApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to memory when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('fixerApiKey', apiKey);
    }
  }, [apiKey]);

  // Fetch available currencies
  const fetchCurrencies = useCallback(async () => {
    if (!apiKey) return

    try {
      const response = await fetch(`https://data.fixer.io/api/symbols?access_key=${apiKey}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrencies(data.symbols);
        setError('');
      } else {
        setError(getErrorMessage(data.error));
      }
    } catch (err) {
      setError('Failed to fetch currencies. Please check your internet connection.');
    }
  }, [apiKey]);

  // Fetch latest rates (EUR base for free plan)
  const fetchRates = useCallback(async () => {
    if (!apiKey) return;

    try {
      const response = await fetch(`https://data.fixer.io/api/latest?access_key=${apiKey}`);
      const data = await response.json();
      
      if (data.success) {
        setRates(data.rates);
        setLastUpdate(new Date().toLocaleTimeString());
        setError('');
      } else {
        setError(getErrorMessage(data.error));
      }
    } catch (err) {
      setError('Failed to fetch exchange rates. Please check your internet connection.');
    }
  }, [apiKey]);

  // Load currencies and rates when API key is provided
  useEffect(() => {
    if (apiKey) {
      fetchCurrencies();
      fetchRates();
    }
  }, [apiKey, fetchCurrencies, fetchRates]);

  const getErrorMessage = (error) => {
    if (!error) return 'Unknown error occurred';
    
    switch (error.code) {
      case 101:
        return 'Invalid API key. Please check your API key.';
      case 102:
        return 'Account inactive or suspended.';
      case 103:
        return 'This endpoint requires a paid plan. Using free plan workaround.';
      case 104:
        return 'Monthly usage limit exceeded. Try again next month.';
      case 105:
        return 'Current usage limit exceeded.';
      case 201:
        return 'Invalid source currency.';
      case 202:
        return 'Invalid target currency.';
      default:
        return error.info || 'An error occurred';
    }
  };

  // Convert currency using EUR as base (free plan workaround)
  const convertCurrency = () => {
    if (!apiKey.trim()) {
      setResult('Please enter your API key');
      setError('API key required');
      return;
    }

    if (!amount || amount <= 0) {
      setResult('Please enter a valid amount');
      setError('Invalid amount');
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
        // First convert to EUR, then to target currency
        const toEurRate = 1 / rates[fromCurrency];
        const fromEurRate = rates[toCurrency];
        exchangeRate = toEurRate * fromEurRate;
        convertedAmount = amount * exchangeRate;
      }

      if (isNaN(convertedAmount) || !isFinite(convertedAmount)) {
        throw new Error('Invalid conversion result');
      }

      setResult(`${amount.toFixed(2)} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`);
      
      // Show exchange rate
      const rateText = `Exchange rate: 1 ${fromCurrency} = ${exchangeRate.toFixed(6)} ${toCurrency}`;
      setError(''); // Clear any previous errors
      
      // Update result with rate info
      setTimeout(() => {
        setResult(prev => prev + `\n${rateText}`);
      }, 100);

    } catch (err) {
      setResult('Conversion failed');
      setError('Unable to calculate conversion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      convertCurrency();
    }
  };

  // Auto-convert when amount changes (with delay)
  useEffect(() => {
    if (apiKey && Object.keys(rates).length > 0 && amount > 0) {
      const timeoutId = setTimeout(convertCurrency, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [amount, fromCurrency, toCurrency, rates, apiKey]);

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
    inputFocus: {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
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

  useEffect(() => {
    const reloadTimer = setTimeout(() => {
      setTimer(!timer)
    }, 1000*60*10) // 10min
    return clearTimeout(reloadTimer)
  }, [timer])

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
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter your free API key"
            style={styles.input}
          />
          <p style={styles.helpText}>
            Get your free API key at <a href="https://fixer.io" target='_blank'>fixer.io</a> (100 requests/month)
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
                </>
              )}
            </select>
          </div>
          
          <button
            onClick={swapCurrencies}
            style={styles.swapButton}
            className="swap-btn"
            title="Swap currencies"
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
          {error || result || 'Enter your API key and click convert to see results'}
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
            <strong>💡 Free Plan Tips:</strong><br/>
            • 100 requests/month limit<br/>
            • EUR base currency only<br/>
            • Smart conversion between any currencies<br/>
            • All currencies fetched automatically
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;