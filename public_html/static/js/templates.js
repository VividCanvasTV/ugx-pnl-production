// Construction Job Templates with Real-World Data
const jobTemplates = {
  residential_renovation: {
    name: "Residential Renovation",
    description: "Kitchen/Bathroom renovation template",
    jobType: "Custom Home",
    profitMargin: 20,
    overheadPercent: 15,
    salesTaxPercent: 7,
    contingencyPercent: 10,
    materials: [
      { description: "Kitchen Cabinets (Linear Ft)", quantity: 25, unitCost: 150 },
      { description: "Granite Countertops (Sq Ft)", quantity: 50, unitCost: 75 },
      { description: "Tile Flooring (Sq Ft)", quantity: 200, unitCost: 8 },
      { description: "Plumbing Fixtures (Sink, Faucet)", quantity: 2, unitCost: 450 },
      { description: "Electrical Fixtures & Switches", quantity: 15, unitCost: 35 },
      { description: "Drywall (Sheets)", quantity: 20, unitCost: 15 },
      { description: "Paint (Gallons)", quantity: 10, unitCost: 45 },
      { description: "Insulation (Sq Ft)", quantity: 200, unitCost: 1.25 },
      { description: "Trim & Molding (Linear Ft)", quantity: 150, unitCost: 5 },
      { description: "Appliances Package", quantity: 1, unitCost: 4500 }
    ],
    labor: [
      { description: "Demolition", hours: 16, rate: 45 },
      { description: "Framing/Carpentry", hours: 40, rate: 65 },
      { description: "Plumbing", hours: 24, rate: 85 },
      { description: "Electrical", hours: 20, rate: 85 },
      { description: "Drywall Installation", hours: 24, rate: 55 },
      { description: "Tile Installation", hours: 32, rate: 60 },
      { description: "Cabinet Installation", hours: 16, rate: 65 },
      { description: "Painting", hours: 20, rate: 50 },
      { description: "Finish Carpentry", hours: 16, rate: 70 }
    ],
    other: [
      { category: "Permits & Inspections", cost: 1200 },
      { category: "Dumpster Rental", cost: 600 },
      { category: "Tool Rental", cost: 400 },
      { category: "Delivery Fees", cost: 300 }
    ]
  },
  
  commercial_buildout: {
    name: "Commercial Build-out",
    description: "Office or retail space build-out",
    jobType: "Other",
    profitMargin: 18,
    overheadPercent: 20,
    salesTaxPercent: 7,
    contingencyPercent: 15,
    materials: [
      { description: "Metal Studs (Linear Ft)", quantity: 1000, unitCost: 3.50 },
      { description: "Commercial Drywall (Sheets)", quantity: 150, unitCost: 18 },
      { description: "Acoustic Ceiling Tiles (Sq Ft)", quantity: 2000, unitCost: 3.50 },
      { description: "Commercial Carpet (Sq Ft)", quantity: 1500, unitCost: 4.50 },
      { description: "LVT Flooring (Sq Ft)", quantity: 500, unitCost: 6 },
      { description: "LED Light Fixtures", quantity: 50, unitCost: 125 },
      { description: "Exit Signs & Emergency Lights", quantity: 10, unitCost: 85 },
      { description: "Commercial Doors & Hardware", quantity: 8, unitCost: 650 },
      { description: "Fire-Rated Materials", quantity: 1, unitCost: 2500 },
      { description: "HVAC Modifications", quantity: 1, unitCost: 8500 }
    ],
    labor: [
      { description: "Demolition & Prep", hours: 40, rate: 45 },
      { description: "Framing", hours: 80, rate: 65 },
      { description: "Electrical (Commercial)", hours: 60, rate: 95 },
      { description: "Plumbing", hours: 40, rate: 85 },
      { description: "HVAC", hours: 32, rate: 90 },
      { description: "Drywall & Taping", hours: 60, rate: 60 },
      { description: "Painting", hours: 40, rate: 50 },
      { description: "Flooring Installation", hours: 48, rate: 55 },
      { description: "Ceiling Grid Installation", hours: 32, rate: 60 }
    ],
    other: [
      { category: "Commercial Permits", cost: 3500 },
      { category: "Architectural Drawings", cost: 2500 },
      { category: "Fire Marshall Inspection", cost: 500 },
      { category: "Certificate of Occupancy", cost: 750 },
      { category: "Dumpster (Large)", cost: 1200 }
    ]
  },
  
  asphalt_paving: {
    name: "Asphalt Paving",
    description: "Parking lot or road paving",
    jobType: "Asphalt",
    profitMargin: 15,
    overheadPercent: 18,
    salesTaxPercent: 0,
    contingencyPercent: 8,
    materials: [
      { description: "Asphalt Mix (Tons)", quantity: 150, unitCost: 85 },
      { description: "Base Material (Tons)", quantity: 200, unitCost: 25 },
      { description: "Tack Coat (Gallons)", quantity: 100, unitCost: 3.50 },
      { description: "Crack Sealant (Gallons)", quantity: 20, unitCost: 8 },
      { description: "Striping Paint (Gallons)", quantity: 10, unitCost: 25 },
      { description: "Traffic Cones & Safety", quantity: 1, unitCost: 350 }
    ],
    labor: [
      { description: "Site Preparation", hours: 16, rate: 55 },
      { description: "Excavation Operator", hours: 24, rate: 75 },
      { description: "Paving Crew (4 workers)", hours: 32, rate: 200 },
      { description: "Roller Operator", hours: 24, rate: 70 },
      { description: "Striping Crew", hours: 8, rate: 65 }
    ],
    other: [
      { category: "Equipment Rental (Paver)", cost: 2500 },
      { category: "Equipment Rental (Roller)", cost: 1500 },
      { category: "Equipment Rental (Excavator)", cost: 1800 },
      { category: "Trucking & Delivery", cost: 2200 },
      { category: "Traffic Control", cost: 800 }
    ]
  },

  asphalt_patch_crack_repair: {
    name: "Asphalt Patch Removal & Crack Filling",
    description: "Patch removal, replacement, and hot-pour crack filling",
    jobType: "Asphalt",
    profitMargin: 18,
    overheadPercent: 16,
    salesTaxPercent: 0,
    contingencyPercent: 8,
    materials: [
      { description: "Hot Mix Asphalt Patch Replacement (Tons)", quantity: 6.264, unitCost: 95 },
      { description: "Tack Coat for Patch Edges (Gallons)", quantity: 2.4889, unitCost: 3.50 },
      { description: "Hot Pour Crack Sealant (Gallons)", quantity: 7.1429, unitCost: 24 }
    ],
    labor: [
      { description: "Patch Removal, Cleaning, and Prep", hours: 4, rate: 65 },
      { description: "Crack Routing and Cleaning", hours: 2, rate: 65 },
      { description: "Crack Sealant Application", hours: 1.4286, rate: 65 }
    ],
    other: [
      { category: "Disposal of Removed Asphalt (5.80 tons @ $55)", cost: 319 },
      { category: "Saw / Router / Compactor Equipment", cost: 450 }
    ]
  },
  
  concrete_work: {
    name: "Concrete Work",
    description: "Driveway, sidewalk, or foundation",
    jobType: "Concrete",
    profitMargin: 18,
    overheadPercent: 15,
    salesTaxPercent: 7,
    contingencyPercent: 10,
    materials: [
      { description: "Ready-Mix Concrete 3500 PSI (Cubic Yards)", quantity: 30, unitCost: 150 },
      { description: "Rebar #4 (20ft bars)", quantity: 50, unitCost: 15 },
      { description: "Rebar #3 (20ft bars)", quantity: 30, unitCost: 11 },
      { description: "Wire Mesh 6x6 W2.9/W2.9 (Sheets)", quantity: 40, unitCost: 25 },
      { description: "Rebar Tie Wire (Rolls)", quantity: 5, unitCost: 25 },
      { description: "Rebar Chairs/Supports (Bags)", quantity: 10, unitCost: 35 },
      { description: "Form Lumber 2x12 (Board Ft)", quantity: 400, unitCost: 1.50 },
      { description: "Form Stakes (Each)", quantity: 100, unitCost: 2.50 },
      { description: "Form Oil/Release Agent (Gallons)", quantity: 5, unitCost: 18 },
      { description: "Expansion Joint Material (Linear Ft)", quantity: 150, unitCost: 3.50 },
      { description: "Control Joint Material", quantity: 200, unitCost: 1.25 },
      { description: "Concrete Sealer (5 gal buckets)", quantity: 4, unitCost: 135 },
      { description: "Curing Compound (5 gal)", quantity: 2, unitCost: 85 },
      { description: "Gravel Base Class 5 (Tons)", quantity: 45, unitCost: 28 },
      { description: "Sand Bedding (Tons)", quantity: 10, unitCost: 35 },
      { description: "Vapor Barrier 10mil (Sq Ft)", quantity: 2000, unitCost: 0.15 },
      { description: "Anchor Bolts & Hardware", quantity: 1, unitCost: 250 }
    ],
    labor: [
      { description: "Site Supervisor/Foreman", hours: 32, rate: 75 },
      { description: "Equipment Operator (Excavation)", hours: 16, rate: 70 },
      { description: "Concrete Finisher Lead", hours: 24, rate: 65 },
      { description: "Concrete Finishers (2 workers)", hours: 48, rate: 55 },
      { description: "Form Carpenters (2 workers)", hours: 48, rate: 60 },
      { description: "Rebar Installers (2 workers)", hours: 32, rate: 58 },
      { description: "General Laborers (3 workers)", hours: 72, rate: 35 },
      { description: "Concrete Pump Operator", hours: 8, rate: 65 },
      { description: "Grading/Compaction Crew", hours: 16, rate: 50 }
    ],
    other: [
      { category: "Mini Excavator Rental (3 days)", cost: 1200 },
      { category: "Skid Steer Rental (3 days)", cost: 900 },
      { category: "Plate Compactor Rental", cost: 350 },
      { category: "Concrete Pump Truck (per day)", cost: 1500 },
      { category: "Power Trowel Rental", cost: 200 },
      { category: "Bull Float & Hand Tools", cost: 150 },
      { category: "Concrete Vibrator Rental", cost: 125 },
      { category: "Laser Level Rental", cost: 175 },
      { category: "Power Screeds Rental", cost: 225 },
      { category: "Saw Cutting Equipment", cost: 300 },
      { category: "Water Truck/Tank Rental", cost: 250 },
      { category: "Generator Rental", cost: 200 },
      { category: "Port-a-Potty (1 month)", cost: 150 },
      { category: "Safety Equipment/Barriers", cost: 200 },
      { category: "Concrete Testing (Slump/Cylinder)", cost: 350 },
      { category: "Permits & Inspections", cost: 450 },
      { category: "Concrete Delivery Fees", cost: 600 },
      { category: "Waste Disposal/Dumpster", cost: 400 }
    ]
  },
  
  new_home_construction: {
    name: "New Home Construction",
    description: "2,500 sq ft single-family home",
    jobType: "Custom Home",
    profitMargin: 20,
    overheadPercent: 18,
    salesTaxPercent: 7,
    contingencyPercent: 10,
    materials: [
      { description: "Lumber Package", quantity: 1, unitCost: 25000 },
      { description: "Roofing (Squares)", quantity: 30, unitCost: 350 },
      { description: "Siding (Sq Ft)", quantity: 2000, unitCost: 8 },
      { description: "Windows", quantity: 15, unitCost: 450 },
      { description: "Exterior Doors", quantity: 3, unitCost: 800 },
      { description: "Interior Doors", quantity: 10, unitCost: 150 },
      { description: "Drywall (Sheets)", quantity: 250, unitCost: 15 },
      { description: "Insulation Package", quantity: 1, unitCost: 4500 },
      { description: "Flooring (Sq Ft)", quantity: 2200, unitCost: 6 },
      { description: "Kitchen Package", quantity: 1, unitCost: 15000 },
      { description: "Bathroom Fixtures", quantity: 3, unitCost: 2500 },
      { description: "Electrical Package", quantity: 1, unitCost: 8500 },
      { description: "Plumbing Package", quantity: 1, unitCost: 9500 },
      { description: "HVAC System", quantity: 1, unitCost: 7500 }
    ],
    labor: [
      { description: "Foundation", hours: 80, rate: 75 },
      { description: "Framing Crew", hours: 240, rate: 200 },
      { description: "Roofing", hours: 48, rate: 65 },
      { description: "Plumbing Rough/Finish", hours: 80, rate: 85 },
      { description: "Electrical Rough/Finish", hours: 80, rate: 85 },
      { description: "HVAC Installation", hours: 40, rate: 90 },
      { description: "Insulation", hours: 32, rate: 50 },
      { description: "Drywall & Finishing", hours: 120, rate: 60 },
      { description: "Painting", hours: 80, rate: 50 },
      { description: "Flooring Installation", hours: 64, rate: 60 },
      { description: "Trim Carpentry", hours: 80, rate: 70 },
      { description: "Siding Installation", hours: 64, rate: 60 }
    ],
    other: [
      { category: "Building Permits", cost: 4500 },
      { category: "Site Preparation", cost: 3500 },
      { category: "Utility Connections", cost: 5000 },
      { category: "Inspections", cost: 1500 },
      { category: "Dumpsters", cost: 2000 },
      { category: "Survey & Engineering", cost: 2500 }
    ]
  },
  
  roofing: {
    name: "Roofing Replacement",
    description: "Residential roof replacement",
    jobType: "Other",
    profitMargin: 25,
    overheadPercent: 20,
    salesTaxPercent: 7,
    contingencyPercent: 10,
    materials: [
      { description: "Architectural Shingles (Squares)", quantity: 25, unitCost: 120 },
      { description: "Underlayment (Rolls)", quantity: 10, unitCost: 65 },
      { description: "Ice & Water Shield (Rolls)", quantity: 4, unitCost: 125 },
      { description: "Drip Edge (Linear Ft)", quantity: 200, unitCost: 2.50 },
      { description: "Ridge Vent (Linear Ft)", quantity: 40, unitCost: 8 },
      { description: "Flashing Kit", quantity: 1, unitCost: 350 },
      { description: "Nails & Fasteners", quantity: 1, unitCost: 200 },
      { description: "Ridge Cap Shingles", quantity: 3, unitCost: 45 },
      { description: "Pipe Boots", quantity: 6, unitCost: 25 }
    ],
    labor: [
      { description: "Tear-off Existing Roof", hours: 16, rate: 50 },
      { description: "Roofing Installation (Crew)", hours: 24, rate: 200 },
      { description: "Flashing & Detail Work", hours: 8, rate: 75 },
      { description: "Ridge Vent Installation", hours: 4, rate: 65 },
      { description: "Cleanup", hours: 4, rate: 45 }
    ],
    other: [
      { category: "Dumpster Rental", cost: 500 },
      { category: "Permits", cost: 250 },
      { category: "Delivery", cost: 150 }
    ]
  },
  
  plumbing_remodel: {
    name: "Plumbing Remodel",
    description: "Complete bathroom plumbing",
    jobType: "Other",
    profitMargin: 30,
    overheadPercent: 25,
    salesTaxPercent: 7,
    contingencyPercent: 15,
    materials: [
      { description: "PEX Piping (Linear Ft)", quantity: 100, unitCost: 1.50 },
      { description: "Copper Fittings", quantity: 30, unitCost: 5 },
      { description: "Shut-off Valves", quantity: 4, unitCost: 25 },
      { description: "Toilet", quantity: 1, unitCost: 350 },
      { description: "Vanity & Sink", quantity: 1, unitCost: 600 },
      { description: "Shower/Tub Unit", quantity: 1, unitCost: 800 },
      { description: "Shower Valve & Trim", quantity: 1, unitCost: 250 },
      { description: "Faucets", quantity: 2, unitCost: 200 },
      { description: "P-Traps & Drains", quantity: 3, unitCost: 35 },
      { description: "Vent Pipes & Fittings", quantity: 1, unitCost: 150 }
    ],
    labor: [
      { description: "Demolition & Removal", hours: 8, rate: 65 },
      { description: "Rough-in Plumbing", hours: 16, rate: 85 },
      { description: "Fixture Installation", hours: 12, rate: 85 },
      { description: "Testing & Inspection", hours: 4, rate: 85 }
    ],
    other: [
      { category: "Permits", cost: 350 },
      { category: "Disposal Fees", cost: 200 },
      { category: "Inspection", cost: 150 }
    ]
  },
  
  electrical_upgrade: {
    name: "Electrical Upgrade",
    description: "Service panel upgrade & rewiring",
    jobType: "Other",
    profitMargin: 28,
    overheadPercent: 22,
    salesTaxPercent: 7,
    contingencyPercent: 12,
    materials: [
      { description: "200 Amp Panel", quantity: 1, unitCost: 500 },
      { description: "Circuit Breakers", quantity: 30, unitCost: 25 },
      { description: "12 AWG Romex (250 ft roll)", quantity: 4, unitCost: 125 },
      { description: "14 AWG Romex (250 ft roll)", quantity: 3, unitCost: 95 },
      { description: "Outlets & Switches", quantity: 40, unitCost: 8 },
      { description: "GFCI Outlets", quantity: 6, unitCost: 25 },
      { description: "Light Fixtures", quantity: 10, unitCost: 75 },
      { description: "Conduit & Fittings", quantity: 1, unitCost: 300 },
      { description: "Grounding Equipment", quantity: 1, unitCost: 200 },
      { description: "Wire Nuts & Supplies", quantity: 1, unitCost: 150 }
    ],
    labor: [
      { description: "Panel Replacement", hours: 8, rate: 95 },
      { description: "Circuit Installation", hours: 32, rate: 85 },
      { description: "Device Installation", hours: 16, rate: 75 },
      { description: "Testing & Troubleshooting", hours: 8, rate: 85 }
    ],
    other: [
      { category: "Electrical Permit", cost: 500 },
      { category: "Utility Coordination", cost: 300 },
      { category: "Inspection", cost: 200 },
      { category: "Disposal", cost: 100 }
    ]
  },
  
  pressure_washing_residential: {
    name: "Pressure Washing - Residential",
    description: "Complete home exterior cleaning",
    jobType: "Pressure Washing",
    profitMargin: 35,
    overheadPercent: 20,
    salesTaxPercent: 7,
    contingencyPercent: 10,
    materials: [
      { description: "House Exterior Soft Wash (Sq Ft)", quantity: 2000, unitCost: 0.15, total: 300 },
      { description: "Concrete Driveway (Sq Ft)", quantity: 600, unitCost: 0.10, total: 60 },
      { description: "Sidewalks & Walkways (Sq Ft)", quantity: 200, unitCost: 0.08, total: 16 },
      { description: "Fence Cleaning (Linear Ft)", quantity: 150, unitCost: 2.00, total: 300 },
      { description: "House Wash Chemical Mix (Gallons)", quantity: 5, unitCost: 3.00, total: 15 },
      { description: "Concrete Degreaser (Gallons)", quantity: 6, unitCost: 12.00, total: 72 },
      { description: "Water Usage (Gallons)", quantity: 200, unitCost: 0.005, total: 1 },
      { description: "Surface Cleaner Attachments", quantity: 1, unitCost: 15, total: 15 },
      { description: "Protective Plastic Sheeting (Rolls)", quantity: 2, unitCost: 12.50, total: 25 },
      { description: "Masking Tape", quantity: 3, unitCost: 8, total: 24 }
    ],
    labor: [
      { description: "Lead Pressure Washing Technician", hours: 5, rate: 40, total: 200 },
      { description: "Assistant Technician", hours: 5, rate: 25, total: 125 },
      { description: "Setup & Equipment Prep", hours: 1, rate: 30, total: 30 },
      { description: "Cleanup & Equipment Maintenance", hours: 1, rate: 30, total: 30 }
    ],
    other: [
      { category: "Equipment Usage (4GPM Unit)", cost: 75 },
      { category: "Vehicle & Fuel", cost: 50 },
      { category: "General Liability Insurance", cost: 25 }
    ]
  },
  
  pressure_washing_commercial: {
    name: "Pressure Washing - Commercial",
    description: "Commercial building and parking lot",
    jobType: "Pressure Washing",
    profitMargin: 30,
    overheadPercent: 25,
    salesTaxPercent: 7,
    contingencyPercent: 15,
    materials: [
      { description: "Building Exterior (Sq Ft)", quantity: 5000, unitCost: 0.12, total: 600 },
      { description: "Parking Lot Surface (Sq Ft)", quantity: 15000, unitCost: 0.05, total: 750 },
      { description: "Loading Dock Area (Sq Ft)", quantity: 1000, unitCost: 0.08, total: 80 },
      { description: "Sidewalks (Sq Ft)", quantity: 2000, unitCost: 0.08, total: 160 },
      { description: "Dumpster Pad Cleaning (Sq Ft)", quantity: 400, unitCost: 0.15, total: 60 },
      { description: "Commercial Grade Degreaser (Gallons)", quantity: 120, unitCost: 12.00, total: 1440 },
      { description: "Building Wash Solution (Gallons)", quantity: 15, unitCost: 3.00, total: 45 },
      { description: "Oil Stain Remover (Gallons)", quantity: 10, unitCost: 45.00, total: 450 },
      { description: "Water Usage (Gallons)", quantity: 1500, unitCost: 0.005, total: 7.50 },
      { description: "Waste Water Containment Berms", quantity: 4, unitCost: 75, total: 300 },
      { description: "Safety Cones & Signage", quantity: 12, unitCost: 15, total: 180 },
      { description: "Absorbent Pads", quantity: 2, unitCost: 50, total: 100 }
    ],
    labor: [
      { description: "Project Supervisor", hours: 12, rate: 55, total: 660 },
      { description: "Lead Pressure Wash Technician", hours: 12, rate: 45, total: 540 },
      { description: "Pressure Wash Technicians (2)", hours: 24, rate: 35, total: 840 },
      { description: "Traffic Control/Safety", hours: 12, rate: 25, total: 300 },
      { description: "Equipment Setup/Breakdown", hours: 4, rate: 30, total: 120 }
    ],
    other: [
      { category: "8GPM Hot Water Unit Rental", cost: 400 },
      { category: "Waste Water Recovery System", cost: 250 },
      { category: "Environmental Permits", cost: 200 },
      { category: "After-hours Work Premium", cost: 300 },
      { category: "Commercial Insurance Rider", cost: 100 }
    ]
  },
  
  pressure_washing_stucco: {
    name: "Stucco Soft Wash Special",
    description: "Delicate stucco cleaning with treatment",
    jobType: "Pressure Washing",
    profitMargin: 40,
    overheadPercent: 20,
    salesTaxPercent: 7,
    contingencyPercent: 10,
    materials: [
      { description: "Stucco Wall Surface (Sq Ft)", quantity: 3000, unitCost: 0.20, total: 600 },
      { description: "Stucco Trim & Details (Sq Ft)", quantity: 250, unitCost: 0.35, total: 87.50 },
      { description: "Window Sills & Ledges (Linear Ft)", quantity: 80, unitCost: 3.00, total: 240 },
      { description: "Stucco-Safe Soft Wash Solution (Gallons)", quantity: 10, unitCost: 3.50, total: 35 },
      { description: "Mold/Mildew Treatment (Gallons)", quantity: 8, unitCost: 35.00, total: 280 },
      { description: "pH Neutralizer (Gallons)", quantity: 5, unitCost: 15.00, total: 75 },
      { description: "Protective Sealant (Gallons)", quantity: 15, unitCost: 20.00, total: 300 },
      { description: "Water Usage - Low Pressure (Gallons)", quantity: 150, unitCost: 0.005, total: 0.75 },
      { description: "Window/Door Masking Kit", quantity: 25, unitCost: 5, total: 125 },
      { description: "Plant Protection Plastic (Rolls)", quantity: 4, unitCost: 25, total: 100 },
      { description: "Drop Cloths (Heavy Duty)", quantity: 6, unitCost: 15, total: 90 },
      { description: "pH Testing Strips", quantity: 1, unitCost: 25, total: 25 }
    ],
    labor: [
      { description: "Stucco Specialist/Lead Tech", hours: 8, rate: 55, total: 440 },
      { description: "Soft Wash Technician", hours: 8, rate: 40, total: 320 },
      { description: "Masking & Prep Work", hours: 3, rate: 30, total: 90 },
      { description: "Sealant Application", hours: 4, rate: 45, total: 180 },
      { description: "Final Inspection & Touch-up", hours: 2, rate: 40, total: 80 }
    ],
    other: [
      { category: "Soft Wash System (Low PSI)", cost: 200 },
      { category: "Boom Lift Rental", cost: 350 },
      { category: "Pre & Post pH Testing", cost: 75 },
      { category: "3-Year Warranty Program", cost: 150 },
      { category: "Specialized Insurance", cost: 50 }
    ]
  }
};

function localDateInputValue(date) {
  if (typeof toDateInputValue === 'function') return toDateInputValue(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const CALCULATOR_JOB_TYPES = new Set(['Asphalt', 'Concrete', 'Dirt Moving', 'Custom Home', 'Pressure Washing']);

const PRESSURE_WASHING_TEMPLATE_DEFAULTS = {
  pressure_washing_residential: {
    houseSqft: 2000, houseRate: 0.15,
    drivewaySqft: 600, drivewayRate: 0.10,
    sidewalkSqft: 200, sidewalkRate: 0.08,
    fenceLength: 150, fenceRate: 2.00,
    deckSqft: 250, deckRate: 0.15,
    waterCostPerGallon: 0.005,
    gutterCleaning: false,
    roofCleaning: false,
    windowCleaning: false,
  },
  pressure_washing_commercial: {
    houseSqft: 5000, houseRate: 0.12,
    parkingLotSqft: 15000, parkingLotRate: 0.05,
    drivewaySqft: 1000, drivewayRate: 0.08,
    sidewalkSqft: 2000, sidewalkRate: 0.08,
    graffitiSqft: 100, graffitiRate: 3.00,
    waterCostPerGallon: 0.005,
    gutterCleaning: false,
    roofCleaning: false,
    windowCleaning: false,
  },
  pressure_washing_stucco: {
    stuccoSqft: 3000, stuccoRate: 0.20,
    houseSqft: 0, houseRate: 0.15,
    drivewaySqft: 600, drivewayRate: 0.10,
    sidewalkSqft: 200, sidewalkRate: 0.08,
    waterCostPerGallon: 0.005,
    roofCleaning: false,
    gutterCleaning: false,
    windowCleaning: false,
  },
};

function templateItems(template, key) {
  return Array.isArray(template && template[key]) ? template[key] : [];
}

function lineItemBodyHasValues(bodyId) {
  const body = document.getElementById(bodyId);
  if (!body) return false;
  return Array.from(body.querySelectorAll('tr')).some((row) => (
    Array.from(row.querySelectorAll('input')).some((input) => {
      if (input.readOnly) return false;
      const value = String(input.value || '').trim();
      return value !== '' && value !== '0' && value !== '0.00';
    })
  ));
}

function formHasMeaningfulLineItems() {
  return ['materialsBody', 'laborBody', 'otherBody'].some(lineItemBodyHasValues);
}

function clearLineItemTables() {
  ['materialsBody', 'laborBody', 'otherBody'].forEach((id) => {
    const body = document.getElementById(id);
    if (body) body.replaceChildren();
  });
}

function setTemplateSyncedField(baseId, value) {
  if (value == null) return;
  const field = document.getElementById(baseId);
  const number = document.getElementById(baseId + 'Number');
  const label = document.getElementById(baseId + 'Value');
  if (field) field.value = value;
  if (number) number.value = value;
  if (label) label.textContent = value;
}

function renderTemplateCalculator(jobType, callback) {
  const container = document.getElementById('calculatorContainer');
  if (!CALCULATOR_JOB_TYPES.has(jobType)) {
    if (container) {
      container.innerHTML = '<div class="calculator-empty-state">Template loaded with itemized job costs.</div>';
    }
    if (callback) setTimeout(callback, 0);
    return true;
  }
  if (typeof Calculators === 'undefined' || typeof Calculators.renderCalculator !== 'function') {
    if (typeof showNotification === 'function') {
      showNotification('warning', 'Calculator Loading', 'The calculator is still loading. Try the template again in a moment.');
    }
    return false;
  }
  try {
    Calculators.renderCalculator(jobType);
    if (callback) setTimeout(callback, 50);
    return true;
  } catch (e) {
    console.error('Error rendering calculator:', e);
    if (typeof showNotification === 'function') {
      showNotification('error', 'Calculator Error', 'The calculator could not be rendered.');
    }
    return false;
  }
}

function populateCalculatorForTemplate(templateKey, jobType) {
  if (templateKey === 'asphalt_patch_crack_repair' && typeof Calculators !== 'undefined' && typeof Calculators.populateAsphaltRepair === 'function') {
    Calculators.populateAsphaltRepair({
      patchCount: 4,
      patchLength: 10,
      patchWidth: 8,
      removalDepth: 3,
      replacementDepth: 3,
      repairWaste: 8,
      asphaltDensity: 145,
      asphaltCostPerTon: 95,
      tackRate: 0.07,
      tackCostPerGal: 3.5,
      disposalCostPerTon: 55,
      crackLength: 500,
      crackWidth: 0.5,
      crackDepth: 0.5,
      crackWaste: 10,
      sealantCostPerGal: 24,
      sealantDensityLbPerGal: 9.2,
      patchProductionSfHr: 80,
      crackRoutingFtHr: 250,
      crackFillingFtHr: 350,
      repairLaborRate: 65,
      repairEquipmentCost: 450,
    });
  }

  if (jobType === 'Pressure Washing' && typeof Calculators !== 'undefined' && typeof Calculators.populatePressureWashing === 'function') {
    const defaults = PRESSURE_WASHING_TEMPLATE_DEFAULTS[templateKey];
    if (defaults) {
      Calculators.populatePressureWashing(defaults);
      setTimeout(() => {
        if (typeof Calculators.forcePWRecalc === 'function') Calculators.forcePWRecalc();
      }, 100);
    }
  }
}
	
// Function to apply a template to the current job form
function applyTemplate(templateKey) {
  const template = jobTemplates[templateKey];
  if (!template) return;
  
  // Check if there are existing items
  const hasExistingItems = formHasMeaningfulLineItems();
  
  // Confirm if there are existing items
  if (hasExistingItems) {
    if (!confirm(`This will replace all existing materials, labor, and other items with the ${template.name} template. Continue?`)) {
      return;
    }
  }
  
  // Clear existing items
  clearLineItemTables();
  
  // Set job type
  if (template.jobType) {
    document.getElementById('jobType').value = template.jobType;
    currentJobType = template.jobType;
    renderTemplateCalculator(currentJobType, () => populateCalculatorForTemplate(templateKey, currentJobType));
  }
  
  // Set profit and overhead values
  setTemplateSyncedField('profitMargin', template.profitMargin);
  setTemplateSyncedField('overheadPercent', template.overheadPercent);
  setTemplateSyncedField('salesTaxPercent', template.salesTaxPercent);
  setTemplateSyncedField('contingencyPercent', template.contingencyPercent);
  
  // Add materials
  templateItems(template, 'materials').forEach(item => {
    if (typeof addMaterial === 'function') {
      addMaterial(item);
    }
  });
  
  // Add labor
  templateItems(template, 'labor').forEach(item => {
    if (typeof addLabor === 'function') {
      addLabor(item);
    }
  });
  
  // Add other items
  templateItems(template, 'other').forEach(item => {
    if (typeof addOther === 'function') {
      addOther(item);
    }
  });
  
  // Set default dates (today and 30 days from now for most projects)
  const today = new Date();
  const endDate = new Date(today);
  
  // Set appropriate duration based on template type
  const durationDays = {
    'residential_renovation': 60,
    'commercial_buildout': 90,
    'asphalt_paving': 14,
    'asphalt_patch_crack_repair': 3,
    'concrete_work': 21,
    'new_home_construction': 180,
    'roofing': 7,
    'plumbing_remodel': 14,
    'electrical_upgrade': 7,
    'pressure_washing_residential': 1,
    'pressure_washing_commercial': 2,
    'pressure_washing_stucco': 2
  };
  
  endDate.setDate(today.getDate() + (durationDays[templateKey] || 30));
  
  // Set the dates
  document.getElementById('startDate').value = localDateInputValue(today);
  document.getElementById('endDate').value = localDateInputValue(endDate);
  
  // Trigger duration calculation
  if (typeof calculateProjectDuration === 'function') {
    calculateProjectDuration();
  }
  
  // Recalculate totals
  if (typeof calculateTotals === 'function') {
    calculateTotals();
  }
  
  // Show success notification
  if (typeof showNotification === 'function') {
    showNotification('success', 'Template Applied', `${template.name} template has been loaded successfully!`);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { jobTemplates, applyTemplate };
}

/* =========================================================================
   Custom (user-saved) templates — persisted in localStorage
   ========================================================================= */
const CUSTOM_TPL_KEY = 'ugx_custom_templates';

function loadCustomTemplates() {
  try { const v = JSON.parse(localStorage.getItem(CUSTOM_TPL_KEY)); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function persistCustomTemplates(list) {
  localStorage.setItem(CUSTOM_TPL_KEY, JSON.stringify(list));
}

function captureCalculatorInputs() {
  const container = document.getElementById('calculatorContainer');
  if (!container) return {};
  const values = {};
  container.querySelectorAll('input, select, textarea').forEach((field) => {
    if (!field.id || field.readOnly) return;
    values[field.id] = field.type === 'checkbox' ? !!field.checked : field.value;
  });
  return values;
}

function restoreCalculatorInputs(values = {}) {
  Object.entries(values || {}).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (!field) return;
    if (field.type === 'checkbox') {
      field.checked = !!value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

function saveCurrentAsTemplate() {
  if (typeof collectFormJob !== 'function') { alert('Form is not ready yet.'); return; }
  const name = (prompt('Name this template (e.g. "Standard 3\\" Driveway"):') || '').trim();
  if (!name) return;
  const job = collectFormJob();
  const tpl = {
    id: 'ctpl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name,
    jobType: job.jobType,
    savedAt: new Date().toISOString(),
    data: {
      jobType: job.jobType,
      profitMargin: job.profitMargin, profitMode: job.profitMode, roundingStep: job.roundingStep,
	      overheadCost: job.overheadCost, overheadPercent: job.overheadPercent, overheadBase: job.overheadBase,
	      salesTaxPercent: job.salesTaxPercent, taxBase: job.taxBase, contingencyPercent: job.contingencyPercent,
	      notes: job.notes, materials: job.materials, labor: job.labor, other: job.other,
	      calculatorInputs: captureCalculatorInputs(),
	    },
	  };
  const list = loadCustomTemplates();
  const idx = list.findIndex((t) => t.name.toLowerCase() === name.toLowerCase() && t.jobType === job.jobType);
  if (idx >= 0) {
    if (!confirm('A "' + name + '" template already exists for ' + job.jobType + '. Overwrite it?')) return;
    list[idx] = tpl;
  } else {
    list.push(tpl);
  }
  persistCustomTemplates(list);
  renderCustomTemplates();
  if (typeof showNotification === 'function') showNotification('success', 'Template Saved', '"' + name + '" added to My Templates');
}

function deleteCustomTemplate(id) {
  persistCustomTemplates(loadCustomTemplates().filter((t) => t.id !== id));
  renderCustomTemplates();
}

// Mirror a value into a slider + its number box + its label span.
function setFieldTrio(baseId, val) {
  if (val == null) return;
  const s = document.getElementById(baseId); if (s) s.value = val;
  const n = document.getElementById(baseId + 'Number'); if (n) n.value = val;
  const v = document.getElementById(baseId + 'Value'); if (v) v.textContent = val;
}

function applyCustomTemplate(id) {
  const tpl = loadCustomTemplates().find((t) => t.id === id);
  if (!tpl) return;
  const d = tpl.data || {};
  const hasItems = formHasMeaningfulLineItems();
  if (hasItems && !confirm('Replace current materials, labor, and other items with template "' + tpl.name + '"?')) return;

  clearLineItemTables();

		  if (d.jobType) {
		    const jt = document.getElementById('jobType');
		    if (jt) jt.value = d.jobType;
		    currentJobType = d.jobType;
		    renderTemplateCalculator(d.jobType, () => restoreCalculatorInputs(d.calculatorInputs || {}));
		  }
  setFieldTrio('profitMargin', d.profitMargin);
  setFieldTrio('overheadPercent', d.overheadPercent);
  setFieldTrio('salesTaxPercent', d.salesTaxPercent);
  setFieldTrio('contingencyPercent', d.contingencyPercent);
  if (document.getElementById('overheadCost')) document.getElementById('overheadCost').value = d.overheadCost != null ? d.overheadCost : 0;
  if (document.getElementById('overheadBase')) document.getElementById('overheadBase').value = d.overheadBase || 'matlabor';
  if (document.getElementById('taxBase')) document.getElementById('taxBase').value = d.taxBase || 'materials';
  if (document.getElementById('roundingStep')) document.getElementById('roundingStep').value = d.roundingStep || 0;
  const modeEl = document.getElementById(d.profitMode === 'markup' ? 'profitModeMarkup' : 'profitModeMargin');
  if (modeEl) modeEl.checked = true;
  if (d.notes != null && document.getElementById('notes')) document.getElementById('notes').value = d.notes;

  (d.materials || []).forEach((m) => { if (typeof addMaterial === 'function') addMaterial(m); });
  (d.labor || []).forEach((l) => { if (typeof addLabor === 'function') addLabor(l); });
  (d.other || []).forEach((o) => { if (typeof addOther === 'function') addOther(o); });

  if (typeof calculateTotals === 'function') calculateTotals();
  if (typeof showNotification === 'function') showNotification('success', 'Template Applied', '"' + tpl.name + '" loaded');
}

function renderCustomTemplates() {
  const c = document.getElementById('customTemplatesContainer');
  if (!c) return;
  const list = loadCustomTemplates();
  c.replaceChildren();
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'text-muted small';
    empty.textContent = 'No saved templates yet. Build a job, then click “Save as Template”.';
    c.appendChild(empty);
    return;
  }
  list.forEach((t) => {
    const col = document.createElement('div'); col.className = 'col-md-4 col-lg-3';
    const card = document.createElement('div'); card.className = 'template-card custom-template-card position-relative';
    const icon = document.createElement('i'); icon.className = 'bi bi-bookmark-star template-icon';
    const name = document.createElement('div'); name.className = 'template-name'; name.textContent = t.name;
    const desc = document.createElement('div'); desc.className = 'template-description'; desc.textContent = t.jobType || 'Custom';
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'ctpl-del'; del.title = 'Delete template';
    const di = document.createElement('i'); di.className = 'bi bi-trash'; del.appendChild(di);
    del.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Delete template "' + t.name + '"?')) deleteCustomTemplate(t.id); });
    card.appendChild(icon); card.appendChild(name); card.appendChild(desc); card.appendChild(del);
    card.addEventListener('click', () => applyCustomTemplate(t.id));
    col.appendChild(card); c.appendChild(col);
  });
}

/* =========================================================================
   Worker Rate Book — editable hourly rates, persisted in localStorage
   ========================================================================= */
const RATE_BOOK_KEY = 'ugx_rate_book';
const DEFAULT_RATE_BOOK = [
  { role: 'General Laborer', rate: 22 },
  { role: 'Skilled Laborer', rate: 30 },
  { role: 'Equipment Operator', rate: 40 },
  { role: 'Concrete Finisher', rate: 36 },
  { role: 'Asphalt Raker / Luteman', rate: 32 },
  { role: 'Foreman / Supervisor', rate: 48 },
  { role: 'CDL / Dump Truck Driver', rate: 30 },
  { role: 'Mason', rate: 40 },
  { role: 'Carpenter', rate: 36 },
  { role: 'Pressure Wash Technician', rate: 28 },
  { role: 'Apprentice', rate: 20 },
];

function loadRateBook() {
  try { const v = JSON.parse(localStorage.getItem(RATE_BOOK_KEY)); return (Array.isArray(v) && v.length) ? v : DEFAULT_RATE_BOOK.slice(); }
  catch (e) { return DEFAULT_RATE_BOOK.slice(); }
}
function persistRateBook(list) { localStorage.setItem(RATE_BOOK_KEY, JSON.stringify(list)); }

function populateRateBookSelect() {
  const sel = document.getElementById('rateBookSelect');
  if (!sel) return;
  sel.replaceChildren();
  loadRateBook().forEach((r, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = r.role + ' — $' + r.rate + '/hr';
    sel.appendChild(o);
  });
}

function addWorkerFromRateBook() {
  const sel = document.getElementById('rateBookSelect');
  if (!sel) return;
  const r = loadRateBook()[Number(sel.value)];
  if (!r) return;
  if (typeof addLabor === 'function') {
    addLabor({ description: r.role, hours: 8, rate: r.rate });
    if (typeof calculateTotals === 'function') calculateTotals();
    if (typeof showNotification === 'function') showNotification('success', 'Worker Added', r.role + ' @ $' + r.rate + '/hr');
  }
}

function buildRateRow(role, rate) {
  const row = document.createElement('div');
  row.className = 'rate-row d-flex gap-2 mb-2';
  const roleInput = document.createElement('input');
  roleInput.type = 'text'; roleInput.className = 'form-control rate-role'; roleInput.value = role || ''; roleInput.placeholder = 'Role';
  const rateInput = document.createElement('input');
  rateInput.type = 'number'; rateInput.className = 'form-control rate-rate'; rateInput.style.maxWidth = '120px';
  rateInput.min = '0'; rateInput.step = '0.5'; rateInput.value = (rate != null ? rate : ''); rateInput.placeholder = '$/hr';
  const rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'btn btn-outline-danger';
  const rmi = document.createElement('i'); rmi.className = 'bi bi-x-lg'; rm.appendChild(rmi);
  rm.addEventListener('click', () => row.remove());
  row.appendChild(roleInput); row.appendChild(rateInput); row.appendChild(rm);
  return row;
}
function renderRateBookEditor() {
  const wrap = document.getElementById('rateBookRows');
  if (!wrap) return;
  wrap.replaceChildren();
  loadRateBook().forEach((r) => wrap.appendChild(buildRateRow(r.role, r.rate)));
}
function addRateBookRow() {
  const wrap = document.getElementById('rateBookRows');
  if (wrap) wrap.appendChild(buildRateRow('', ''));
}
function saveRateBookFromEditor() {
  const book = [];
  document.querySelectorAll('#rateBookRows .rate-row').forEach((row) => {
    const role = (row.querySelector('.rate-role').value || '').trim();
    const rate = parseFloat(row.querySelector('.rate-rate').value);
    if (role && !isNaN(rate)) book.push({ role: role, rate: rate });
  });
  if (book.length) persistRateBook(book);
  populateRateBookSelect();
  if (typeof showNotification === 'function') showNotification('success', 'Rate Book Saved', book.length + ' worker rates saved');
}
function resetRateBook() {
  if (!confirm('Reset worker rates to the built-in defaults?')) return;
  persistRateBook(DEFAULT_RATE_BOOK.slice());
  renderRateBookEditor();
  populateRateBookSelect();
}

/* =========================================================================
   Equipment & Machine Rental — editable catalog, persisted in localStorage.
   Added machines flow into the "Other" line items so totals stay correct.
   ========================================================================= */
const EQUIPMENT_BOOK_KEY = 'ugx_equipment_book';
const DEFAULT_EQUIPMENT_BOOK = [
  { name: 'Mini Excavator (3-4 ton)', day: 350, week: 1100, hour: 65 },
  { name: 'Excavator (20 ton)', day: 650, week: 2200, hour: 120 },
  { name: 'Backhoe Loader', day: 400, week: 1300, hour: 75 },
  { name: 'Skid Steer Loader', day: 300, week: 950, hour: 55 },
  { name: 'Compact Track Loader', day: 350, week: 1100, hour: 65 },
  { name: 'Bulldozer (D5)', day: 800, week: 2800, hour: 150 },
  { name: 'Wheel Loader', day: 600, week: 2000, hour: 110 },
  { name: 'Motor Grader', day: 900, week: 3200, hour: 170 },
  { name: 'Dump Truck (tandem)', day: 500, week: 1800, hour: 90 },
  { name: 'Water Truck', day: 450, week: 1500, hour: 80 },
  { name: 'Plate Compactor', day: 90, week: 300, hour: 20 },
  { name: 'Jumping Jack Rammer', day: 95, week: 320, hour: 22 },
  { name: 'Ride-On Roller (smooth drum)', day: 350, week: 1100, hour: 65 },
  { name: 'Asphalt Roller (double drum)', day: 400, week: 1300, hour: 75 },
  { name: 'Asphalt Paver', day: 1500, week: 5500, hour: 280 },
  { name: 'Asphalt Milling Machine', day: 1800, week: 6500, hour: 320 },
  { name: 'Sealcoat Spray Rig', day: 250, week: 800, hour: 45 },
  { name: 'Crack Router', day: 120, week: 380, hour: 25 },
  { name: 'Concrete Mixer (towable)', day: 90, week: 280, hour: 20 },
  { name: 'Concrete Power Trowel', day: 110, week: 350, hour: 25 },
  { name: 'Concrete Pump Truck', day: 1200, week: 4200, hour: 220 },
  { name: 'Power Screed', day: 80, week: 250, hour: 18 },
  { name: 'Generator (20 kW)', day: 150, week: 480, hour: 28 },
  { name: 'Light Tower', day: 120, week: 380, hour: 22 },
  { name: 'Air Compressor (185 cfm)', day: 130, week: 420, hour: 25 },
  { name: 'Trench Box', day: 200, week: 650, hour: 30 },
  { name: 'Boom Lift (40 ft)', day: 350, week: 1100, hour: 65 },
  { name: 'Scissor Lift (26 ft)', day: 180, week: 550, hour: 35 },
  { name: 'Hydraulic Breaker / Hammer', day: 300, week: 950, hour: 55 },
  { name: 'Skid Steer Sweeper Attachment', day: 120, week: 380, hour: 25 },
  { name: 'Street Sweeper', day: 600, week: 2000, hour: 110 },
  { name: 'Stump Grinder', day: 350, week: 1100, hour: 65 },
  { name: 'Trencher', day: 280, week: 900, hour: 50 },
  { name: 'Equipment Trailer (tandem)', day: 90, week: 280, hour: 15 },
];

function loadEquipmentBook() {
  try { const v = JSON.parse(localStorage.getItem(EQUIPMENT_BOOK_KEY)); return (Array.isArray(v) && v.length) ? v : DEFAULT_EQUIPMENT_BOOK.slice(); }
  catch (e) { return DEFAULT_EQUIPMENT_BOOK.slice(); }
}
function persistEquipmentBook(list) { localStorage.setItem(EQUIPMENT_BOOK_KEY, JSON.stringify(list)); }

function populateEquipmentSelect() {
  const sel = document.getElementById('equipmentSelect');
  if (!sel) return;
  sel.replaceChildren();
  loadEquipmentBook().forEach((m, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = m.name + ' ($' + m.day + '/day)';
    sel.appendChild(o);
  });
}

function currentEquipmentSelection() {
  const sel = document.getElementById('equipmentSelect');
  if (!sel) return null;
  const m = loadEquipmentBook()[Number(sel.value)];
  if (!m) return null;
  const basisEl = document.getElementById('equipmentBasis');
  const basis = basisEl ? basisEl.value : 'day';
  const rate = Number(m[basis]) || 0;
  const dur = parseNumber(document.getElementById('equipmentDuration').value) || 0;
  const qty = parseNumber(document.getElementById('equipmentQty').value) || 0;
  const delivery = parseNumber(document.getElementById('equipmentDelivery').value) || 0;
  return { machine: m, basis: basis, rate: rate, dur: dur, qty: qty, delivery: delivery, cost: rate * dur * qty + delivery };
}

function updateEquipmentEstimate() {
  const s = currentEquipmentSelection();
  const est = document.getElementById('equipmentEstimate');
  const note = document.getElementById('equipmentRateNote');
  if (!s) { if (est) est.textContent = '0.00'; if (note) note.textContent = 'Rate: —'; return; }
  const unit = { day: 'day', week: 'week', hour: 'hr' }[s.basis];
  if (note) note.textContent = 'Rate: $' + formatNumber(s.rate) + '/' + unit;
  if (est) est.textContent = formatNumber(s.cost);
}

function addEquipmentToJob() {
  const s = currentEquipmentSelection();
  if (!s || s.cost <= 0) { if (typeof showNotification === 'function') showNotification('warning', 'Nothing to add', 'Pick a machine and enter a duration.'); return; }
  const unit = { day: 'day(s)', week: 'week(s)', hour: 'hr' }[s.basis];
  let label = 'Equipment: ' + s.machine.name + ' — ' + formatNumber(s.dur) + ' ' + unit + ' @ $' + formatNumber(s.rate);
  if (s.qty > 1) label += ' x' + s.qty;
  if (s.delivery > 0) label += ' + $' + formatNumber(s.delivery) + ' delivery';
  if (typeof addOther === 'function') {
    addOther({ category: label, cost: Number(s.cost.toFixed(2)) });
    if (typeof calculateTotals === 'function') calculateTotals();
    if (typeof showNotification === 'function') showNotification('success', 'Equipment Added', s.machine.name + ' — $' + formatNumber(s.cost));
  }
}

function buildEquipmentRow(name, day, week, hour) {
  const row = document.createElement('div');
  row.className = 'equip-row d-flex gap-2 mb-2 align-items-center';
  const n = document.createElement('input'); n.type = 'text'; n.className = 'form-control equip-name'; n.value = name || ''; n.placeholder = 'Machine';
  const mk = (cls, val, ph) => { const e = document.createElement('input'); e.type = 'number'; e.className = 'form-control ' + cls; e.style.maxWidth = '80px'; e.min = '0'; e.step = '1'; e.placeholder = ph; e.title = ph; e.value = (val != null ? val : ''); return e; };
  const d = mk('equip-day', day, 'Day $'), w = mk('equip-week', week, 'Week $'), h = mk('equip-hour', hour, 'Hr $');
  const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn btn-outline-danger';
  const i = document.createElement('i'); i.className = 'bi bi-x-lg'; rm.appendChild(i);
  rm.addEventListener('click', () => row.remove());
  row.append(n, d, w, h, rm);
  return row;
}
function renderEquipmentEditor() {
  const wrap = document.getElementById('equipmentRows');
  if (!wrap) return;
  wrap.replaceChildren();
  loadEquipmentBook().forEach((m) => wrap.appendChild(buildEquipmentRow(m.name, m.day, m.week, m.hour)));
}
function addEquipmentRow() {
  const wrap = document.getElementById('equipmentRows');
  if (wrap) wrap.appendChild(buildEquipmentRow('', '', '', ''));
}
function saveEquipmentFromEditor() {
  const book = [];
  document.querySelectorAll('#equipmentRows .equip-row').forEach((row) => {
    const name = (row.querySelector('.equip-name').value || '').trim();
    const day = parseFloat(row.querySelector('.equip-day').value) || 0;
    const week = parseFloat(row.querySelector('.equip-week').value) || 0;
    const hour = parseFloat(row.querySelector('.equip-hour').value) || 0;
    if (name) book.push({ name: name, day: day, week: week, hour: hour });
  });
  if (book.length) persistEquipmentBook(book);
  populateEquipmentSelect();
  updateEquipmentEstimate();
  if (typeof showNotification === 'function') showNotification('success', 'Equipment Rates Saved', book.length + ' machines saved');
}
function resetEquipmentBook() {
  if (!confirm('Reset equipment rates to the built-in defaults?')) return;
  persistEquipmentBook(DEFAULT_EQUIPMENT_BOOK.slice());
  renderEquipmentEditor();
  populateEquipmentSelect();
  updateEquipmentEstimate();
}

Object.assign(window, {
  jobTemplates,
  applyTemplate,
  saveCurrentAsTemplate,
  deleteCustomTemplate,
  applyCustomTemplate,
  addWorkerFromRateBook,
  addRateBookRow,
  saveRateBookFromEditor,
  resetRateBook,
  addEquipmentToJob,
  addEquipmentRow,
  saveEquipmentFromEditor,
  resetEquipmentBook,
});

// Initialize custom templates, rate book, and equipment once the page is ready.
document.addEventListener('DOMContentLoaded', function () {
  try {
    renderCustomTemplates();
    populateRateBookSelect();
    const rbModal = document.getElementById('rateBookModal');
    if (rbModal) rbModal.addEventListener('show.bs.modal', renderRateBookEditor);

    populateEquipmentSelect();
    updateEquipmentEstimate();
    ['equipmentSelect', 'equipmentBasis', 'equipmentDuration', 'equipmentQty', 'equipmentDelivery'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateEquipmentEstimate);
        el.addEventListener('change', updateEquipmentEstimate);
      }
    });
    const eqModal = document.getElementById('equipmentBookModal');
    if (eqModal) eqModal.addEventListener('show.bs.modal', renderEquipmentEditor);
  } catch (e) { /* non-fatal */ }
});
