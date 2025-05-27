const startDateInput = document.getElementById('start-date-input');
const endDateInput = document.getElementById('end-date-input');
const queryButton = document.getElementById('query-button');
const infoDiv = document.getElementById('info');

// New elements for manual input
const inputDate = document.getElementById('input-date');
const inputPrice = document.getElementById('input-price');
const submitButton = document.getElementById('submit-button');
const inputStatusDiv = document.getElementById('input-status');

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

// --- Query functionality ---
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

// Assume inputDate, inputPrice, submitButton, inputStatusDiv, and formatDateForAPI are already defined and working.

// --- New submission functionality ---
submitButton.addEventListener('click', async () => {
    const dateToSubmit = inputDate.value;
    const priceToSubmit = inputPrice.value;

    if (!dateToSubmit || !priceToSubmit) {
        inputStatusDiv.innerHTML = '<span class="error">請輸入日期和價格。</span>';
        inputStatusDiv.className = '';
        return;
    }

    const formattedDate = formatDateForAPI(dateToSubmit);
    // Base URL for checking existence is still /prices
    const checkApiUrl = `http://localhost:3000/prices`;
    // Base URL for adding new data (POST)
    const addApiUrl = `http://localhost:3000/add-price`;
    // Base URL for updating existing data (PUT)
    const updateApiBaseUrl = `http://localhost:3000/prices`; // This will be appended with the ID

    inputStatusDiv.innerHTML = '送出中...';
    inputStatusDiv.className = 'loading';

    try {
        // First, check if the date already exists using the GET /prices?date=... endpoint
        const checkResponse = await fetch(`${checkApiUrl}?date=${formattedDate}`);
        const checkData = await checkResponse.json();

        let method;
        let targetUrl;
        let existingId = null;

        if (checkResponse.ok && checkData.data && checkData.data.length > 0) {
            // Data for this date exists, so we'll update (PUT)
            method = 'PUT';
            existingId = checkData.data[0].id; // Get the ID of the existing record
            targetUrl = `${updateApiBaseUrl}/${existingId}`; // Construct the URL for PUT
        } else {
            // Data for this date does NOT exist, so we'll add (POST)
            method = 'POST';
            targetUrl = addApiUrl; // Use the /add-price URL for POST
        }

        const bodyData = {
            日期: formattedDate,
            "鴨蛋(新蛋)(台南)": parseFloat(priceToSubmit) // Ensure price is a number
        };

        const response = await fetch(targetUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        const responseData = await response.json();

        if (response.ok) {
            inputStatusDiv.innerHTML = `<span class="success">鴨蛋價格已成功${method === 'POST' ? '新增' : '更新'}！</span>`;
            inputStatusDiv.className = '';
            inputPrice.value = ''; // Clear price input after successful submission
            // Optionally, refresh the displayed prices here if you have a display function
        } else {
            // If the backend returns an error message, display it
            inputStatusDiv.innerHTML = `<span class="error">送出失敗: ${responseData.message || response.statusText || '未知錯誤'}</span>`;
            inputStatusDiv.className = '';
        }

    } catch (error) {
        console.error('Error submitting data:', error);
        inputStatusDiv.innerHTML = '<span class="error">無法連接到伺服器。</span>';
        inputStatusDiv.className = '';
    }
});