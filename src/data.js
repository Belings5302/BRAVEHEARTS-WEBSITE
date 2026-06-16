// Bravehearts Basketball Club - Data Core

export const teamInfo = {
  name: "Bravehearts Basketball Club",
  location: "Lilongwe, Malawi",
  founded: 2015,
  founder: "Griffin Kalua",
  homeArena: "ABC Blue Gym, Lilongwe",
  colors: ["Green", "White"],
  mission: "Changing lives through basketball by empowering youth through elite sports development and academic scholarship programs."
};


export const tournaments = [
  {
    id: "t1",
    name: "BASMAL National Championship",
    year: 2025,
    category: "Men's Division",
    result: "Champions",
    location: "Lilongwe, Malawi",
    highlight: "Bravehearts completed the season unbeaten and lifted the national trophy."
  },
  {
    id: "t2",
    name: "Central Zone Basketball League (CZBL)",
    year: 2025,
    category: "Men's & Women's Combined",
    result: "Champions",
    location: "Lilongwe, Malawi",
    highlight: "Both senior squads won regional league crowns across the 2025 campaign."
  },
  {
    id: "t3",
    name: "Women's Basketball League Africa",
    year: 2025,
    category: "Women's Continental Cup",
    result: "Debut Campaign",
    location: "Cairo, Egypt",
    highlight: "Bravehearts Ladies made their first continental appearance and gained valuable experience."
  },
  {
    id: "t4",
    name: "Road to BAL Elite 16",
    year: 2025,
    category: "Men's Continental Qualifiers",
    result: "Elite 16 Stage",
    location: "Cairo, Egypt",
    highlight: "Bravehearts became the first Malawian club to reach the Elite 16 in Road to BAL."
  }
];

export const internationalTours = [
  {
    id: "i1",
    tournament: "Road to BAL Elite 16",
    year: 2025,
    host: "Cairo, Egypt",
    record: "2-1",
    outcome: "Historic finish in continental qualifiers.",
    notes: "Traveled to Egypt for the Elite 16 and recorded wins over Mozambique and South Sudan opposition."
  },
  {
    id: "i2",
    tournament: "Women's Basketball League Africa",
    year: 2025,
    host: "Cairo, Egypt",
    record: "1-2",
    outcome: "Continental debut for Bravehearts Ladies.",
    notes: "The ladies squad competed against North African and East African clubs in their first international tour."
  },
  {
    id: "i3",
    tournament: "Friendly Tour",
    year: 2024,
    host: "Maputo, Mozambique",
    record: "2-1",
    outcome: "Winning warm-up series abroad.",
    notes: "The squads traveled to Mozambique for preparation matches before the 2025 continental campaign."
  }
];


export const trophies = [
  {
    id: "t1",
    title: "BASMAL National Championship",
    subtitle: "Men's Division",
    count: 5,
    icon: "trophy",
    description: "Undisputed champions of Malawi, securing 5 domestic titles including the most recent in 2025."
  },
  {
    id: "t2",
    title: "CZBL Regional League Title",
    subtitle: "Men & Women Combined",
    count: 8,
    icon: "award",
    description: "Dominating the Lilongwe Central Zone league structure year after year with superior squad depth."
  },
  {
    id: "t3",
    title: "Road to BAL Elite 16",
    subtitle: "First Malawian Club Ever",
    count: 1,
    icon: "globe",
    description: "Made historic progress in continental qualifiers in 2025, reaching the elite final phase."
  },
  {
    id: "t4",
    title: "Women's Basketball League Africa",
    subtitle: "Continental Debut in Cairo",
    count: 1,
    icon: "star",
    description: "Debuted on Africa's biggest stage in Cairo 2025, laying a foundation for women's development."
  }
];

export const impactMetrics = [
  { label: "Scholarships Funded", value: "50+" },
  { label: "Graduation Rate", value: "100%" },
  { label: "University Placement", value: "15+" },
  { label: "Years Active", value: "11" }
];

export const products = [
  {
    id: "p1",
    title: "Bravehearts Home Jersey 2026",
    price: 45000,
    priceUSD: 15.00,
    category: "Apparel",
    description: "Official 2026 home kit in vibrant Malawian forest green with neon lime side accents.",
    isNew: true
  },
  {
    id: "p2",
    title: "Bravehearts Away Jersey 2026",
    price: 45000,
    priceUSD: 15.00,
    category: "Apparel",
    description: "Official white away kit featuring green outlines and breathable lightweight fabrics."
  },
  {
    id: "p3",
    title: "Elite Road to BAL Hoodie",
    price: 40000,
    priceUSD: 22.00,
    category: "Apparel",
    description: "Heavyweight premium cotton hoodie with the historic Elite 16 Road to BAL print.",
    isNew: true
  },
  {
    id: "p4",
    title: "Classic Club Snapback Cap",
    price: 20000,
    priceUSD: 8.00,
    category: "Headwear",
    description: "Adjustable forest green cap featuring an embroidered bold Bravehearts crest."
  },
  {
    id: "p5",
    title: "VIP Match Ticket vs Wolves",
    price: 5000,
    priceUSD: 3.00,
    category: "Tickets",
    description: "Premium seating at ABC Blue Gym for the clash on June 12, includes complimentary drink."
  },
  {
    id: "p6",
    title: "Bravehearts Fan Club Membership",
    price: 50000,
    priceUSD: 30.00,
    category: "Membership",
    description: "Annual support membership. Includes member scarf, 10% shop discount, and priority tickets."
  },
  {
    id: "p7",
    title: "Bravehearts Annual Subscription Fee",
    price: 15000,
    priceUSD: 10.00,
    category: "Subscription",
    description: "Support the club's coaching, travel, and scholarship programs with an annual subscription fee.",
    isNew: true
  }
];
