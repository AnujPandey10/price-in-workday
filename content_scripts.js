// content_script.js

function getAmazonPrice() {
   
    const selectors = [
        '.a-price .a-offscreen',  
        '.a-price-whole',         
        '#priceblock_ourprice',   
        '#priceblock_dealprice',  
        '#price_inside_buybox',   
        '.a-price .a-offscreen',  
        '.a-price .a-price-whole' 
    ];

    for (let sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (let el of elements) {
            const priceText = el.textContent.trim();
       
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

  
    priceElement.parentNode.insertBefore(badge, priceElement.nextSibling);
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
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    let priceResult = null;
    if (window.location.hostname.includes('amazon.')) {
       
        await new Promise(resolve => setTimeout(resolve, 1000));
        priceResult = getAmazonPrice();
    } else if (window.location.hostname.includes('flipkart.')) {
    
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
  
