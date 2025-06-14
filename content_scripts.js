// content_script.js

function getAmazonPrice() {
    // Updated Amazon.in price selectors
    const selectors = [
        '.a-price .a-offscreen',  // Main price display
        '.a-price-whole',         // Whole number part of price
        '#priceblock_ourprice',   // Legacy price block
        '#priceblock_dealprice',  // Legacy deal price
        '#price_inside_buybox',   // Legacy buybox price
        '.a-price .a-offscreen',  // Price with currency symbol
        '.a-price .a-price-whole' // Price without currency symbol
    ];

    for (let sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (let el of elements) {
            const priceText = el.textContent.trim();
            // Remove currency symbols, commas, and any other non-numeric characters except decimal point
            const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
            if (!isNaN(price) && price > 0) {
                console.log('Found price:', price, 'from selector:', sel);
                return { price, el };
            }
        }
    }
    console.log('No price found on page');
    return null;
}

function getFlipkartPrice() {
    // Flipkart price selectors
    const selectors = [
        '.Nx9bqj.CxhGGd', // New main price selector
        '._30jeq3._16Jk6d', // Old main price
        '._25b18c ._30jeq3', // Offers
        '._1vC4OE._3qQ9m1', // Legacy
        '._3qQ9m1' // Fallback
    ];
    for (let sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (let el of elements) {
            const priceText = el.textContent.trim();
            const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
            if (!isNaN(price) && price > 0) {
                return { price, el };
            }
        }
    }
    return null;
}

function insertDaysNextToPrice(days, priceElement) {
    // Remove any previous badge
    const oldBadge = document.getElementById('earn-days-inline');
    if (oldBadge) oldBadge.remove();

    // Create a new span
    const badge = document.createElement('span');
    badge.id = 'earn-days-inline';
    badge.textContent = ` (${days.toFixed(1)} work-days to earn)`;
    badge.style.marginLeft = '8px';
    badge.style.fontSize = '16px';
    badge.style.color = 'red';
    badge.style.fontWeight = 'bold';

    // Insert after the price element
    priceElement.parentNode.insertBefore(badge, priceElement.nextSibling);
}

function displayDaysBadge(days) {
    // Create or update our badge (fallback)
    let badge = document.getElementById('earn-days-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'earn-days-badge';
        // Enhanced styling
        badge.style.position = 'fixed';
        badge.style.bottom = '20px';
        badge.style.right = '20px';
        badge.style.background = 'rgba(0,0,0,0.8)';
        badge.style.color = 'white';
        badge.style.padding = '12px 20px';
        badge.style.borderRadius = '8px';
        badge.style.zIndex = '10000';
        badge.style.fontFamily = 'Arial, sans-serif';
        badge.style.fontSize = '14px';
        badge.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        document.body.appendChild(badge);
    }
    badge.textContent = `≈ ${days.toFixed(1)} work-days to earn`;
}

function waitForPriceElement(getPriceFn, maxAttempts = 20, interval = 500) {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            const priceResult = getPriceFn();
            if (priceResult) {
                console.log('Price element found:', priceResult);
                resolve(priceResult);
            } else if (++attempts < maxAttempts) {
                setTimeout(check, interval);
            } else {
                console.log('Price element not found after waiting.');
                resolve(null);
            }
        };
        check();
    });
}

// Main flow
(async () => {
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    let priceResult = null;
    if (window.location.hostname.includes('amazon.')) {
        // Amazon: use original logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        priceResult = getAmazonPrice();
    } else if (window.location.hostname.includes('flipkart.')) {
        // Flipkart: robustly wait for price element
        priceResult = await waitForPriceElement(getFlipkartPrice, 20, 500);
    }
    if (!priceResult) {
        console.log('No price found on this page');
        return;
    }
    const { price, el: priceElement } = priceResult;
    chrome.storage.sync.get(['monthlySalary'], ({ monthlySalary }) => {
        if (!monthlySalary || monthlySalary <= 0) {
            console.log('No salary set in storage');
            return;
        }
        const dailyIncome = monthlySalary / 30;
        const daysNeeded = price / dailyIncome;
        if (priceElement) {
            insertDaysNextToPrice(daysNeeded, priceElement);
        } else {
            displayDaysBadge(daysNeeded);
        }
    });
})();
  