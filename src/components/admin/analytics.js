// Admin Payment Analytics Component

export function renderAnalyticsDashboard(data = {}) {
  const { revenueTrend = [], paymentMethods = [], salesByCategory = [] } = data;

  // Calculate totals
  const totalRevenueMWK = revenueTrend.reduce((sum, day) => sum + (day.mwk || 0), 0);
  const totalRevenueUSD = revenueTrend.reduce((sum, day) => sum + (day.usd || 0), 0);
  const totalOrders = revenueTrend.reduce((sum, day) => sum + (day.order_count || 0), 0);

  // Payment methods totals
  const methodStats = paymentMethods.map(m => ({
    ...m,
    conversionRate: m.order_count > 0 ? Math.round((m.paid_orders / m.order_count) * 100) : 0
  }));

  return `
    <div class="admin-analytics" style="animation: fadeIn 0.4s ease-out;">
      <div class="section-header" style="margin-bottom: 20px;">
        <div>
          <h2 class="section-title">Payment Analytics</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 4px;">Revenue trends, payment methods, and sales breakdown</p>
        </div>
      </div>

      <div class="analytics-tiles-grid">
        <!-- Tile 1: Total Revenue -->
        <div class="analytics-tile tile-span-4 tile-glow-green">
          <div class="tile-header">
            <span class="tile-title">Total Revenue (30 Days)</span>
            <div class="tile-icon-wrapper green">
              <i data-lucide="trending-up" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">MWK ${totalRevenueMWK.toLocaleString()}</div>
            <div class="tile-meta">
              <i data-lucide="dollar-sign" style="width: 14px; height: 14px; color: var(--color-accent);"></i>
              <span>$${totalRevenueUSD.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        <!-- Tile 2: Total Orders -->
        <div class="analytics-tile tile-span-4 tile-glow-blue">
          <div class="tile-header">
            <span class="tile-title">Total Orders (30 Days)</span>
            <div class="tile-icon-wrapper blue">
              <i data-lucide="shopping-bag" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">${totalOrders}</div>
            <div class="tile-meta">
              <i data-lucide="check-circle-2" style="width: 14px; height: 14px; color: #64c8ff;"></i>
              <span>Completed transactions</span>
            </div>
          </div>
        </div>

        <!-- Tile 3: Avg Order Value -->
        <div class="analytics-tile tile-span-4 tile-glow-orange">
          <div class="tile-header">
            <span class="tile-title">Avg Order Value</span>
            <div class="tile-icon-wrapper orange">
              <i data-lucide="credit-card" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            <div class="tile-value">MWK ${totalOrders > 0 ? Math.round(totalRevenueMWK / totalOrders).toLocaleString() : 0}</div>
            <div class="tile-meta">
              <i data-lucide="arrow-up-right" style="width: 14px; height: 14px; color: #ff9664;"></i>
              <span>$${totalOrders > 0 ? (totalRevenueUSD / totalOrders).toFixed(2) : 0} USD avg</span>
            </div>
          </div>
        </div>

        <!-- Tile 4: Revenue Trend Chart -->
        <div class="analytics-tile tile-span-12">
          <div class="tile-header" style="margin-bottom: 24px;">
            <span class="tile-title">Revenue Trend (Last 30 Days)</span>
            <div class="tile-icon-wrapper">
              <i data-lucide="activity" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content" style="height: 350px;">
            ${revenueTrend.length > 0 ? `
              <canvas id="revenue-trend-chart"></canvas>
            ` : `
              <div class="empty-state" style="padding: 60px 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <i data-lucide="trending-up" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>No revenue data available</p>
              </div>
            `}
          </div>
        </div>

        <!-- Tile 5: Payment Methods Breakdown -->
        <div class="analytics-tile tile-span-6">
          <div class="tile-header" style="margin-bottom: 24px;">
            <span class="tile-title">Payment Methods</span>
            <div class="tile-icon-wrapper">
              <i data-lucide="wallet" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            ${paymentMethods.length > 0 ? `
              <div class="tile-list">
                ${methodStats.map((method) => `
                  <div class="tile-list-item">
                    <div>
                      <div class="tile-list-label">
                        ${method.payment_method === 'Airtel Money' ? '📱 Airtel Money' : method.payment_method === 'TNM Mpamba' ? '📱 TNM Mpamba' : '💳 ' + method.payment_method}
                      </div>
                      <div class="tile-list-sublabel">
                        ${method.paid_orders}/${method.order_count} paid orders (${method.conversionRate}%)
                      </div>
                    </div>
                    <div class="tile-list-value">
                      <div class="tile-list-value-main">MWK ${(method.total_mwk || 0).toLocaleString()}</div>
                      <div class="tile-list-value-sub">$${(method.total_usd || 0).toFixed(2)} USD</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-state" style="padding: 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <i data-lucide="wallet" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>No payment data available</p>
              </div>
            `}
          </div>
        </div>

        <!-- Tile 6: Sales by Category -->
        <div class="analytics-tile tile-span-6">
          <div class="tile-header" style="margin-bottom: 24px;">
            <span class="tile-title">Sales by Category</span>
            <div class="tile-icon-wrapper">
              <i data-lucide="layers" style="width: 20px; height: 20px;"></i>
            </div>
          </div>
          <div class="tile-content">
            ${salesByCategory.length > 0 ? `
              <div class="tile-list">
                ${salesByCategory.map((cat) => `
                  <div class="tile-list-item">
                    <div>
                      <div class="tile-list-label">${cat.category}</div>
                      <div class="tile-list-sublabel">
                        ${cat.total_units} units sold across ${cat.order_count} orders
                      </div>
                    </div>
                    <div class="tile-list-value">
                      <div class="tile-list-value-main">MWK ${(cat.total_mwk || 0).toLocaleString()}</div>
                      <div class="tile-list-value-sub">$${(cat.total_usd || 0).toFixed(2)} USD</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-state" style="padding: 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <i data-lucide="layers" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>No sales data available</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Mount a premium Chart.js dual-line chart on the #revenue-trend-chart canvas.
 * Call this AFTER the DOM has been updated with renderAnalyticsDashboard().
 */
export function initTrendChart(revenueTrendData = []) {
  const canvas = document.getElementById('revenue-trend-chart');
  if (!canvas || revenueTrendData.length === 0) return;

  const ctx = canvas.getContext('2d');

  // Detect light/dark theme
  const isLight = document.body.classList.contains('light-theme');

  // Format dates for labels
  const labels = revenueTrendData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const mwkData = revenueTrendData.map(d => d.mwk || 0);
  const usdData = revenueTrendData.map(d => d.usd || 0);

  // Create gradients for area fills
  const mwkGradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 360);
  mwkGradient.addColorStop(0, 'rgba(15, 168, 88, 0.35)');
  mwkGradient.addColorStop(0.6, 'rgba(15, 168, 88, 0.08)');
  mwkGradient.addColorStop(1, 'rgba(15, 168, 88, 0)');

  const usdGradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 360);
  usdGradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
  usdGradient.addColorStop(0.6, 'rgba(100, 200, 255, 0.06)');
  usdGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

  const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
  const tickColor = isLight ? '#666' : 'rgba(255, 255, 255, 0.5)';
  const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(18, 20, 28, 0.95)';
  const tooltipText = isLight ? '#1a1a1a' : '#e0e0e0';
  const tooltipBorder = isLight ? '#e0e0e0' : 'rgba(30, 255, 0, 0.3)';

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue (MWK)',
          data: mwkData,
          borderColor: '#0FA858',
          backgroundColor: mwkGradient,
          borderWidth: 2.5,
          pointBackgroundColor: '#0FA858',
          pointBorderColor: '#0FA858',
          pointBorderWidth: 0,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#1eff00',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Revenue (USD)',
          data: usdData,
          borderColor: '#64c8ff',
          backgroundColor: usdGradient,
          borderWidth: 2,
          pointBackgroundColor: '#64c8ff',
          pointBorderColor: '#64c8ff',
          pointBorderWidth: 0,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#a0e0ff',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: tickColor,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { family: 'Inter, sans-serif', size: 12, weight: 500 }
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: tooltipText,
          borderColor: tooltipBorder,
          borderWidth: 1,
          cornerRadius: 10,
          padding: 14,
          titleFont: { family: 'Inter, sans-serif', size: 13, weight: 600 },
          bodyFont: { family: 'Inter, sans-serif', size: 12 },
          displayColors: true,
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              const val = context.parsed.y;
              if (context.dataset.label.includes('MWK')) {
                return ` MWK ${val.toLocaleString()}`;
              }
              return ` $${val.toFixed(2)} USD`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: tickColor,
            font: { family: 'Inter, sans-serif', size: 11 },
            maxRotation: 45,
            maxTicksLimit: 15
          },
          border: { display: false }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: '#0FA858',
            font: { family: 'Inter, sans-serif', size: 11, weight: 500 },
            callback: function (value) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
              return value;
            }
          },
          border: { display: false },
          title: {
            display: true,
            text: 'MWK',
            color: '#0FA858',
            font: { family: 'Inter, sans-serif', size: 12, weight: 600 }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#64c8ff',
            font: { family: 'Inter, sans-serif', size: 11, weight: 500 },
            callback: function (value) {
              return '$' + value.toFixed(0);
            }
          },
          border: { display: false },
          title: {
            display: true,
            text: 'USD',
            color: '#64c8ff',
            font: { family: 'Inter, sans-serif', size: 12, weight: 600 }
          }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      }
    }
  });
}
