document.addEventListener('DOMContentLoaded', function() {
    // Load from URL params
    const urlParams = new URLSearchParams(window.location.search);
    document.getElementById('product_id').value = urlParams.get('product_id') || 'PP-AC-CRT-ELT-001';
    document.getElementById('final_price_usd').value = urlParams.get('final_price_usd') || '25';
    document.getElementById('customer_email').value = urlParams.get('email') || '';
    document.getElementById('chain').value = urlParams.get('chain') || 'polygon';
    document.getElementById('app_type').value = urlParams.get('app_type') || 'alpha_certsig';

    // App-specific branding
    const appType = urlParams.get('app_type') || 'alpha_certsig';
    const appConfig = {
        alpha_certsig: {
            logo: '/static/alpha-logo.png', // Placeholder
            title: 'Alpha CertSig Checkout',
            description: 'Securely mint your cryptographic certificate.'
        },
        truemark_mint: {
            logo: '/static/truemark-logo.png',
            title: 'TrueMark Mint Checkout',
            description: 'Mint your provenance certificate on the blockchain.'
        },
        other: {
            logo: '',
            title: 'Pro Prime Checkout',
            description: 'Complete your purchase securely.'
        }
    };

    const config = appConfig[appType] || appConfig.other;
    const logoEl = document.getElementById('app-logo');
    if (config.logo) {
        logoEl.src = config.logo;
        logoEl.style.display = 'block';
    } else {
        logoEl.style.display = 'none';
    }
    document.getElementById('app-title').textContent = config.title;
    document.getElementById('app-description').textContent = config.description;

    const paymentMethodSelect = document.getElementById('payment_method');
    const chainSection = document.getElementById('chain-section');
    const walletSection = document.getElementById('wallet-section');
    const form = document.getElementById('checkout-form');
    const resultDiv = document.getElementById('result');
    const resultJson = document.getElementById('result-json');

    paymentMethodSelect.addEventListener('change', function() {
        if (this.value === 'crypto') {
            chainSection.style.display = 'block';
            walletSection.style.display = 'block';
        } else {
            chainSection.style.display = 'none';
            walletSection.style.display = 'none';
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {
            product_id: formData.get('product_id'),
            final_price_usd: parseFloat(formData.get('final_price_usd')),
            customer_email: formData.get('customer_email'),
            payment_method: formData.get('payment_method'),
            chain_tier: formData.get('chain') || 'polygon',
            wallet_address: formData.get('wallet_address') || null,
            coupon_code: formData.get('coupon_code') || null,
            source_app: formData.get('source_app') || null,
            metadata: {}  // For demo
        };

        try {
            const response = await fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            resultJson.textContent = JSON.stringify(result, null, 2);
            resultDiv.style.display = 'block';

            // For fiat, redirect to Stripe checkout
            if (result.payment_details.checkout_url) {
                window.location.href = result.payment_details.checkout_url;
            }

        } catch (error) {
            console.error('Error:', error);
            resultJson.textContent = `Error: ${error.message}`;
            resultDiv.style.display = 'block';
        }
    });
});