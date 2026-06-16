// Impact Component
import { impactMetrics } from '../data.js';

export function renderImpact() {
  const statsHTML = impactMetrics.map(stat => {
    return `
      <div class="impact-stat-card glass">
        <div class="impact-number">${stat.value}</div>
        <div class="impact-label">${stat.label}</div>
      </div>
    `;
  }).join('');

  return `
    <section class="impact-sec" id="impact">
      <div class="section-container">
        <div class="impact-layout">
          <!-- Text Story -->
          <div class="impact-story">
            <span class="section-tagline">More Than A Game</span>
            <h2 class="section-title text-gradient" style="margin-bottom: 24px;">Our Community Impact</h2>
            <p style="font-size: 1.1rem; margin-bottom: 20px; color: var(--color-text-main);">
              Founded by Griffin Kalua, Bravehearts Basketball Club operates on a fundamental belief: <strong>basketball can change lives.</strong>
            </p>
            <p style="color: var(--color-text-muted); margin-bottom: 24px;">
              The club runs a dedicated academic scholarship program funded through partnership sponsorships and team revenues. We recruit talented young student-athletes from challenging backgrounds and fully fund their tuition fees for high school and tertiary education.
            </p>
            <p style="color: var(--color-text-muted); margin-bottom: 30px;">
              By combining elite athletic coaching with strict academic accountability, we ensure that every player has a pathway to professional success, whether on the court or in the classroom.
            </p>
            <div style="display: flex; gap: 16px; align-items: center; background: rgba(var(--color-accent-rgb), 0.08); padding: 16px 20px; border-radius: var(--radius-md); border-left: 4px solid var(--color-accent);">
              <i data-lucide="graduation-cap" style="color: var(--color-accent); width: 32px; height: 32px;"></i>
              <p style="font-size: 0.9rem; font-style: italic; color: var(--color-text-main);">
                "We don't just build basketball champions; we empower the future leaders of Malawi." — Griffin Kalua, Founder
              </p>
            </div>
          </div>
          
          <!-- Impact Stats Grid -->
          <div class="impact-stats-grid">
            ${statsHTML}
          </div>
        </div>
      </div>
    </section>
  `;
}
