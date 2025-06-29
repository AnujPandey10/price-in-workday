// content_script.js

function getAmazonPrice() {
    console.log('getAmazonPrice() called for URL:', window.location.href);
    
    // Updated Amazon.in price selectors with more comprehensive coverage
    const selectors = [
        // Primary selectors
        '.a-price .a-offscreen',  // Main price display
        '.a-price-whole',         // Whole number part of price
        '.a-price .a-price-whole', // Price without currency symbol
        
        // Alternative selectors
        '.a-price-range .a-offscreen', // Price range
        '.a-price .a-price-fraction', // Price fraction
        '.a-price .a-price-symbol',   // Price symbol
        
        // Legacy selectors
        '#priceblock_ourprice',   // Legacy price block
        '#priceblock_dealprice',  // Legacy deal price
        '#price_inside_buybox',   // Legacy buybox price
        
        // Newer selectors
        '[data-a-color="price"] .a-offscreen',
        '.a-price-current .a-offscreen',
        '.a-price-current .a-price-whole',
        '.a-price-current .a-price-fraction',
        
        // Generic price selectors
        '[class*="price"] .a-offscreen',
        '[class*="Price"] .a-offscreen',
        
        // Direct price elements
        '.a-price-current',
        '.a-price'
    ];

    console.log('Testing selectors...');
    for (let sel of selectors) {
        const elements = document.querySelectorAll(sel);
        console.log(`Selector "${sel}": found ${elements.length} elements`);
        
        for (let el of elements) {
            const priceText = el.textContent.trim();
            console.log(`  Element text: "${priceText}"`);
            
            // Remove currency symbols, commas, and any other non-numeric characters except decimal point
            const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
            if (!isNaN(price) && price > 0) {
                console.log('Found valid price:', price, 'from selector:', sel);
                return { price, el };
            }
        }
    }
    
    // Fallback: search for any element containing price-like text
    console.log('No price found with selectors, trying fallback search...');
    const allElements = document.querySelectorAll('*');
    const pricePattern = /₹\s*([\d,]+(?:\.\d{2})?)/;
    
    for (let el of allElements) {
        const text = el.textContent;
        if (text && pricePattern.test(text)) {
            const match = text.match(pricePattern);
            if (match) {
                const priceText = match[1];
                const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                if (!isNaN(price) && price > 0) {
                    console.log('Found price via fallback:', price, 'from text:', text.trim());
                    return { price, el };
                }
            }
        }
    }
    
    console.log('No price found on page');
    return null;
}

function getFlipkartPrice() {
   
    const selectors = [
        '.Nx9bqj.CxhGGd', 
        '._30jeq3._16Jk6d',// Old main price
        '._25b18c ._30jeq3', // Offers
        '._1vC4OE._3qQ9m1', 
        '._3qQ9m1' 
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

    const oldBadge = document.getElementById('earn-days-inline');
    if (oldBadge) oldBadge.remove();

 
    const badge = document.createElement('span');
    badge.id = 'earn-days-inline';
    badge.textContent = ` (${days.toFixed(1)} work-days to earn)`;
    badge.style.marginLeft = '8px';
    badge.style.fontSize = '16px';
    badge.style.color = 'red';
    badge.style.fontWeight = 'bold';
    badge.style.background = 'white';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '4px';

    // Try to insert after the closest .a-price parent
    const priceBlock = priceElement.closest('.a-price');
    if (priceBlock && priceBlock.parentNode) {
        priceBlock.parentNode.insertBefore(badge, priceBlock.nextSibling);
    } else if (priceElement.parentNode) {
        priceElement.parentNode.insertBefore(badge, priceElement.nextSibling);
    } else {
        // Fallback: floating badge
        displayDaysBadge(days);
    }
}

function displayDaysBadge(days) {

    let badge = document.getElementById('earn-days-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'earn-days-badge';
   
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


(async () => {
    console.log('Content script started for:', window.location.href);
    
    if (document.readyState === 'loading') {
        console.log('Document still loading, waiting for DOMContentLoaded...');
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    let priceResult = null;
    if (window.location.hostname.includes('amazon.')) {
        console.log('Detected Amazon site, using Amazon price extraction...');
        // Amazon: wait a bit longer for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        priceResult = getAmazonPrice();
        
        // If no price found initially, try again after a longer delay
        if (!priceResult) {
            console.log('No price found initially, waiting longer and trying again...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            priceResult = getAmazonPrice();
        }
    } else if (window.location.hostname.includes('flipkart.')) {
        console.log('Detected Flipkart site, using Flipkart price extraction...');
        // Flipkart: robustly wait for price element
        priceResult = await waitForPriceElement(getFlipkartPrice, 20, 500);
    }
    
    if (!priceResult) {
        console.log('No price found on this page after all attempts');
        return;
    }
    
    const { price, el: priceElement } = priceResult;
    console.log('Price found:', price, 'Element:', priceElement);
    
    chrome.storage.sync.get(['monthlySalary'], ({ monthlySalary }) => {
        if (!monthlySalary || monthlySalary <= 0) {
            console.log('No salary set in storage');
            return;
        }
        const dailyIncome = monthlySalary / 30;
        const daysNeeded = price / dailyIncome;
        console.log('Calculated days needed:', daysNeeded, 'for price:', price, 'with daily income:', dailyIncome);
        
        if (priceElement) {
            insertDaysNextToPrice(daysNeeded, priceElement);
        } else {
            displayDaysBadge(daysNeeded);
        }
    });
})();
  
