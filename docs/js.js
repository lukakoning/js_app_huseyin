let dataset = [];
let chartInstance;
const rowsPerPage = 10;
let currentPage = 1;

// Fetch base64-encoded CSV data, decode, and return the CSV content as text
async function fetchBase64Data() {
  const response = await fetch('data.txt');
  const base64String = await response.text();
  return atob(base64String.trim());
}

// Parse CSV data with PapaParse
function parseCSVData(csvData) {
  return new Promise(resolve => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
    });
  });
}

// Initialize ECharts instance
function initializeChart() {
  chartInstance = echarts.init(document.getElementById('chart'), null, {
    renderer: 'svg'  // Specify SVG renderer instead of default canvas
  });
  
  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category' },
    yAxis: {
      type: 'value',
      scale: true
    }
  });

  // Ensure the chart resizes with window size
  window.addEventListener('resize', () => {
    chartInstance.resize();
  });
}

// Update the chart based on user selections
function updateChart(startYear, endYear, areas, sector, yCol, showIndex) {
  let filteredData = dataset.filter(row =>
    row.Jaar >= startYear &&
    row.Jaar <= endYear &&
    areas.includes(row.Gebied) &&
    row.Type.includes(sector)
  );

  let groupedData = {};
  filteredData.forEach(row => {
    if (!groupedData[row.Gebied]) {
      groupedData[row.Gebied] = [];
    }
    groupedData[row.Gebied].push([row.Jaar, parseFloat(row[yCol])]);
  });

  let seriesData = Object.keys(groupedData).map(area => {
    let sortedSeries = groupedData[area].sort((a, b) => a[0] - b[0]);
    let baseline = sortedSeries[0][1];
    let series = sortedSeries.map(pair => {
      let value = showIndex ? (baseline ? (pair[1] / baseline) * 100 : 0) : pair[1];
      return { year: pair[0], value, rawValue: pair[1] };
    });

    return {
      name: area, // The legend will use this name
      type: 'line',
      data: series.map(item => [item.year, item.value]),
      tooltip: {
        valueFormatter: value => showIndex ? value.toFixed(2) + "%" : value.toFixed(2),
      },
      emphasis: {
        focus: 'series', // Highlight the selected series when hovered
      },
      label: { show: false }, // Hide labels on data points
    };
  });

  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { show: true }, // Enable legend to identify areas
    xAxis: {
      type: 'category',
      data: Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    },
    yAxis: {
      type: 'value',
      scale: true,
    },
    aria: {
      enabled: true
    },
    series: seriesData,
  }, true); // Don't merge with previous options
  
  // Wait until ECharts finishes rendering
  chartInstance.on('finished', () => {
    const legendTextElements = document.querySelectorAll('#chart text[dominant-baseline]');
    legendTextElements.forEach(textEl => {
      if (textEl.getAttribute('text-anchor') === 'start') {
        textEl.style.pointerEvents = 'all';
        textEl.setAttribute('tabindex', '0');
        textEl.setAttribute('role', 'button');
        textEl.setAttribute('aria-pressed', 'false');
  
        textEl.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const legendName = textEl.dataset?.legendName || textEl.textContent;
  
            // Toggle the legend item
            chartInstance.dispatchAction({
              type: 'legendToggleSelect',
              name: legendName
            });
  
            // Update aria-pressed state
            const isSelected = textEl.getAttribute('aria-pressed') === 'true';
            textEl.setAttribute('aria-pressed', (!isSelected).toString());
  
            // Wait for chart to update, then find and focus the corresponding legend element
            setTimeout(() => {
              const updatedLegendElements = document.querySelectorAll('#chart text[dominant-baseline]');
              const matchingElement = Array.from(updatedLegendElements)
                .find(el => (el.dataset?.legendName || el.textContent) === legendName);
  
              if (matchingElement) {
                matchingElement.focus();
                matchingElement.blur(); // Add this line to remove focus after focusing
              }
            }, 100); // Small delay to ensure chart has updated
          }
        });
      }
    });
  });
}

function updateTable(startYear, endYear, areas, sector, yCol) {
  let tableBody = document.querySelector('#dataTable tbody');
  let pagination = document.querySelector('#pagination');
  tableBody.innerHTML = '';
  pagination.innerHTML = '';

  let filteredData = dataset.filter(row =>
    row.Jaar >= startYear &&
    row.Jaar <= endYear &&
    areas.includes(row.Gebied) &&
    row.Type.includes(sector)
  );

  let groupedData = {};
  filteredData.forEach(row => {
    if (!groupedData[row.Gebied]) {
      groupedData[row.Gebied] = [];
    }
    groupedData[row.Gebied].push(row);
  });

  let allRows = [];
  Object.keys(groupedData).forEach(area => {
    let rows = groupedData[area].sort((a, b) => a.Jaar - b.Jaar);
    let baseline = parseFloat(rows[0][yCol]);
    rows.forEach(row => {
      let value = parseFloat(row[yCol]);
      let indexedValue = baseline ? (value / baseline) * 100 : 0;
      allRows.push({ year: row.Jaar, area: row.Gebied, sector: row.Type, rawValue: value, indexedValue: indexedValue.toFixed(2) });
    });
  });

  // Pagination logic
  let totalPages = Math.ceil(allRows.length / rowsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  let start = (currentPage - 1) * rowsPerPage;
  let end = start + rowsPerPage;
  let paginatedRows = allRows.slice(start, end);

  paginatedRows.forEach(row => {
    let tr = `
      <tr>
        <td>${row.year}</td>
        <td>${row.area}</td>
        <td>${row.sector}</td>
        <td>${row.rawValue}</td>
        <td>${row.indexedValue}%</td>
      </tr>
    `;
    tableBody.innerHTML += tr;
  });

  // Pagination buttons
  for (let i = 1; i <= totalPages; i++) {
    let button = document.createElement('button');
    button.innerText = i;
    button.classList.add('btn', 'btn-sm', 'mx-1');
    if (i === currentPage) button.classList.add('btn-primary');
    else button.classList.add('btn-outline-primary');

    button.addEventListener('click', () => {
      currentPage = i;
      updateTable(startYear, endYear, areas, sector, yCol);
    });

    pagination.appendChild(button);
  }
}

// Handle user inputs and refresh UI
function handleUserInput() {
  let startYear = parseInt(document.getElementById('startYearRange').value, 10);
  let endYear = parseInt(document.getElementById('endYearRange').value, 10);
  let areas = Array.from(document.getElementById('areaSelect').selectedOptions).map(opt => opt.value);
  let sector = document.getElementById('sectorSelect').value;
  let yCol = document.getElementById('dienstverbandSelect').value;
  let showIndex = document.getElementById('showIndexToggle').checked;

  if (startYear > endYear) [startYear, endYear] = [endYear, startYear];

  document.getElementById('startYearValue').textContent = startYear;
  document.getElementById('endYearValue').textContent = endYear;

  updateChart(startYear, endYear, areas, sector, yCol, showIndex);
  updateTable(startYear, endYear, areas, sector, yCol);
}

// Initialize and fetch data
document.addEventListener('DOMContentLoaded', () => {
  initializeChart();

  // Add direct event listener for the toggle
  document.getElementById('showIndexToggle').addEventListener('change', handleUserInput);
  document.getElementById('showNumberToggle').addEventListener('change', handleUserInput);

  fetchBase64Data()
    .then(csvData => parseCSVData(csvData))
    .then(data => {
      dataset = data;

      let areaSelect = document.getElementById('areaSelect');
      let sectorSelect = document.getElementById('sectorSelect');
      let startYearRange = document.getElementById('startYearRange');
      let endYearRange = document.getElementById('endYearRange');

      let uniqueYears = [...new Set(data.map(row => parseInt(row.Jaar, 10)))];
      let uniqueAreas = [...new Set(data.map(row => row.Gebied))];
      let uniqueSectors = [...new Set(data.map(row => row.Type))];

      let minYear = Math.min(...uniqueYears);
      let maxYear = Math.max(...uniqueYears);

      startYearRange.min = minYear;
      startYearRange.max = maxYear;
      startYearRange.value = minYear;
      endYearRange.min = minYear;
      endYearRange.max = maxYear;
      endYearRange.value = maxYear;

      document.getElementById('startYearValue').textContent = minYear;
      document.getElementById('endYearValue').textContent = maxYear;

      uniqueAreas.forEach(area => {
        let option = new Option(area, area);
        areaSelect.appendChild(option);
      });
      areaSelect.value = 'Almelo';

      uniqueSectors.forEach(sec => {
        let option = new Option(sec, sec);
        sectorSelect.appendChild(option);
      });
      sectorSelect.value = 'Totaal';

      startYearRange.addEventListener('input', handleUserInput);
      endYearRange.addEventListener('input', handleUserInput);
      areaSelect.addEventListener('change', handleUserInput);
      sectorSelect.addEventListener('change', handleUserInput);
      document.getElementById('dienstverbandSelect').addEventListener('change', handleUserInput);
      
      handleUserInput();
    });
});
