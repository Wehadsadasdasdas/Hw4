const startDateInput = document.getElementById('start-date-input');
const endDateInput = document.getElementById('end-date-input');
const queryButton = document.getElementById('query-button');
const infoDiv = document.getElementById('info');

// Function to format date from YYYY-MM-DD to YYYY/MM/DD
function formatDateForAPI(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

// Function to add days to a date
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Main event listener for the query button
queryButton.addEventListener('click', async () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        infoDiv.innerHTML = '<span class="error">請選擇開始和結束日期。</span>';
        infoDiv.className = '';
        return;
    }

    // Convert to Date objects for comparison and iteration
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        infoDiv.innerHTML = '<span class="error">開始日期不能晚於結束日期。</span>';
        infoDiv.className = '';
        return;
    }

    infoDiv.innerHTML = '載入中...';
    infoDiv.className = 'loading';

    let resultsHtml = '';
    let hasData = false;

    // Loop through each day from start to end
    for (let d = start; d <= end; d = addDays(d, 1)) {
        const currentDateISO = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const formattedDate = formatDateForAPI(currentDateISO);
        const apiUrl = `http://localhost:3000/prices?date=${formattedDate}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (response.ok) {
                if (data.data && data.data.length > 0) {
                    const price = data.data[0]["鴨蛋(新蛋)(台南)"];
                    if (price !== undefined && price !== null) {
                        resultsHtml += `<div class="price-entry">${formattedDate} 的鴨蛋(新蛋)(台南)價格：<span style="font-weight: bold;">${price} 元</span></div>`;
                        hasData = true;
                    } else {
                        resultsHtml += `<div class="price-entry info-no-price">${formattedDate} 沒有找到鴨蛋價格。</div>`;
                    }
                } else {
                    resultsHtml += `<div class="price-entry info-not-found">${formattedDate} 沒有找到任何資料。</div>`;
                }
            } else {
                resultsHtml += `<div class="price-entry error">查詢 ${formattedDate} 失敗: ${data.message || '未知錯誤'}</div>`;
            }
        } catch (error) {
            console.error(`Error fetching data for ${formattedDate}:`, error);
            resultsHtml += `<div class="price-entry error">無法連接到伺服器查詢 ${formattedDate}。</div>`;
        }
    }

    if (hasData) {
        infoDiv.innerHTML = resultsHtml;
        infoDiv.className = ''; // Clear loading/error class
    } else {
        // If no prices found for any day but no server errors
        if (!resultsHtml.includes('error')) {
            infoDiv.innerHTML = resultsHtml || '在所選日期範圍內沒有找到任何鴨蛋價格數據。';
            infoDiv.className = 'info-not-found';
        } else {
            infoDiv.innerHTML = resultsHtml; // Show errors if present
            infoDiv.className = 'error';
        }
    }
});