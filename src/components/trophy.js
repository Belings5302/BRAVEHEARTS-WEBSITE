// Trophy Component
import { trophies, tournaments, internationalTours } from '../data.js';

export function renderTrophy() {
  const trophiesHTML = trophies.map(item => {
    let iconName = "trophy";
    if (item.icon === "award") iconName = "award";
    else if (item.icon === "globe") iconName = "globe";
    else if (item.icon === "star") iconName = "star";

    return `
      <div class="trophy-card glass">
        <div class="trophy-icon-wrapper">
          <i data-lucide="${iconName}" style="width: 38px; height: 38px;"></i>
        </div>
        <div class="trophy-count">${item.count}x</div>
        <h3 class="trophy-title">${item.title}</h3>
        <p style="color: var(--color-accent); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
          ${item.subtitle}
        </p>
        <p class="trophy-desc">${item.description}</p>
      </div>
    `;
  }).join('');

  const tournamentsHTML = tournaments.map(item => `
    <div class="history-card glass">
      <h3>${item.name}</h3>
      <p class="history-meta">${item.category} • ${item.year}</p>
      <p class="history-status">${item.result} • ${item.location}</p>
      <p class="history-note">${item.highlight}</p>
    </div>
  `).join('');

  const toursHTML = internationalTours.map(item => `
    <div class="history-card glass">
      <h3>${item.tournament}</h3>
      <p class="history-meta">${item.host} • ${item.year}</p>
      <p class="history-status">Record: ${item.record}</p>
      <p class="history-note">${item.outcome}</p>
      <p class="history-note">${item.notes}</p>
    </div>
  `).join('');

  return `
    <section class="trophy-sec" id="trophy">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tagline">Roll of Honour</span>
          <h2 class="section-title text-gradient-green">Trophy Cabinet & Tournament History</h2>
          <p class="section-desc">
            A testament to our domestic dominance and our competitive journey across national and international basketball tournaments.
          </p>
        </div>
        
        <div class="trophy-grid">
          ${trophiesHTML}
        </div>

        <div class="section-subsection">
          <div class="section-subheader">
            <h3>Championships & Completed Tournaments</h3>
            <p>Every Bravehearts tournament campaign and title-winning performance recorded for the club.</p>
          </div>
          <div class="history-grid">
            ${tournamentsHTML}
          </div>
        </div>

        <div class="section-subsection">
          <div class="section-subheader">
            <h3>International Tours & Results</h3>
            <p>Bravehearts travel history and performances at international qualifiers and continental competitions.</p>
          </div>
          <div class="history-grid">
            ${toursHTML}
          </div>
        </div>
      </div>
    </section>
  `;
}
